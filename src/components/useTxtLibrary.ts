"use client";

import { useEffect, useState } from "react";
import {
  cloneDefaultTxtLibrary,
  normalizeTxtLibraryShape,
  TXT_LIBRARY_KEY,
  type TxtLibrary,
} from "@/lib/txt-content";

const LOCAL_BACKUP_KEY = `${TXT_LIBRARY_KEY}-backup`;

// Browser-session cache. It survives client-side route changes, so moving
// between MediTree pages does not download every TXT file again.
let memoryCache: TxtLibrary | null = null;
let inflightRead: Promise<TxtLibrary> | null = null;

function cloneLibrary(library: TxtLibrary): TxtLibrary {
  return JSON.parse(JSON.stringify(library)) as TxtLibrary;
}

function cachedOrDefault() {
  return memoryCache
    ? cloneLibrary(memoryCache)
    : cloneDefaultTxtLibrary();
}

function readMigrationBackup(): TxtLibrary {
  if (typeof window === "undefined") {
    return cloneDefaultTxtLibrary();
  }

  const raw =
    window.localStorage.getItem(TXT_LIBRARY_KEY) ||
    window.localStorage.getItem(LOCAL_BACKUP_KEY);

  if (!raw) return cloneDefaultTxtLibrary();

  try {
    return normalizeTxtLibraryShape(
      JSON.parse(raw) as TxtLibrary,
    );
  } catch {
    return cloneDefaultTxtLibrary();
  }
}

type LibraryResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  library?: TxtLibrary;
};

export async function readTxtLibrary(
  options: { force?: boolean } = {},
): Promise<TxtLibrary> {
  if (typeof window === "undefined") {
    return cloneDefaultTxtLibrary();
  }

  if (!options.force && memoryCache) {
    return cloneLibrary(memoryCache);
  }

  if (!options.force && inflightRead) {
    return cloneLibrary(await inflightRead);
  }

  const request = (async () => {
    const response = await fetch("/api/content/library", {
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as
      | LibraryResponse
      | null;

    if (response.ok && data?.library) {
      const library = normalizeTxtLibraryShape(data.library);

      memoryCache = cloneLibrary(library);

      // Backup only. Never used over a functioning Supabase source.
      window.localStorage.setItem(
        LOCAL_BACKUP_KEY,
        JSON.stringify(library),
      );

      return library;
    }

    // Before the very first Supabase upload only, use the previous
    // localStorage content once as migration input.
    if (
      response.status === 404 &&
      data?.code === "NOT_INITIALIZED"
    ) {
      const migrated = readMigrationBackup();
      memoryCache = cloneLibrary(migrated);
      return migrated;
    }

    throw new Error(
      data?.message ||
        `Supabase TXT 읽기에 실패했습니다. (${response.status})`,
    );
  })();

  inflightRead = request;

  try {
    return cloneLibrary(await request);
  } finally {
    if (inflightRead === request) {
      inflightRead = null;
    }
  }
}

export async function writeTxtLibrary(library: TxtLibrary) {
  if (typeof window === "undefined") {
    throw new Error("브라우저에서만 저장할 수 있습니다.");
  }

  const cleaned = normalizeTxtLibraryShape(library);
  const previousLibrary = memoryCache
    ? cloneLibrary(memoryCache)
    : undefined;

  const response = await fetch("/api/content/library", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      library: cleaned,
      previousLibrary,
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        message?: string;
        fileCount?: number;
        uploadedFileCount?: number;
      }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.message ||
        `실제 TXT 저장에 실패했습니다. (${response.status})`,
    );
  }

  // The just-saved state becomes the authoritative session cache.
  memoryCache = cloneLibrary(cleaned);

  // Local copy is emergency backup only.
  window.localStorage.setItem(
    LOCAL_BACKUP_KEY,
    JSON.stringify(cleaned),
  );

  // Remove old pre-Supabase source key so it can never become
  // an accidental second source of truth again.
  window.localStorage.removeItem(TXT_LIBRARY_KEY);

  // Other mounted MediTree views update from memory immediately instead of
  // making another full Supabase request after every save.
  window.dispatchEvent(
    new CustomEvent("meditree:txt-library-updated", {
      detail: cloneLibrary(cleaned),
    }),
  );

  return data;
}

export default function useTxtLibrary() {
  const [library, setLibrary] = useState<TxtLibrary>(
    cachedOrDefault,
  );

  useEffect(() => {
    let active = true;

    const refresh = async (force = false) => {
      try {
        const current = await readTxtLibrary({ force });

        if (active) {
          setLibrary(current);
        }
      } catch (error) {
        // Important: keep the last successfully loaded Supabase state.
        // Do not replace it with stale local/default data.
        console.error("MediTree TXT refresh failed:", error);
      }
    };

    // First mount in a browser session fetches once. Later route changes use
    // the module-level memory cache and return immediately.
    void refresh(false);

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<TxtLibrary>).detail;

      if (detail) {
        setLibrary(cloneLibrary(detail));
        return;
      }

      void refresh(false);
    };

    window.addEventListener(
      "meditree:txt-library-updated",
      handleUpdate,
    );

    return () => {
      active = false;
      window.removeEventListener(
        "meditree:txt-library-updated",
        handleUpdate,
      );
    };
  }, []);

  return library;
}
