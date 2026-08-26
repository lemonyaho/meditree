"use client";

import { useEffect, useState } from "react";
import {
  cloneDefaultTxtLibrary,
  normalizeTxtLibraryShape,
  TXT_LIBRARY_KEY,
  type TxtLibrary,
} from "@/lib/txt-content";

const LOCAL_BACKUP_KEY = `${TXT_LIBRARY_KEY}-backup`;

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

export async function readTxtLibrary(): Promise<TxtLibrary> {
  if (typeof window === "undefined") {
    return cloneDefaultTxtLibrary();
  }

  const response = await fetch("/api/content/library", {
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | LibraryResponse
    | null;

  if (response.ok && data?.library) {
    const library = normalizeTxtLibraryShape(data.library);

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
    return readMigrationBackup();
  }

  throw new Error(
    data?.message ||
      `Supabase TXT 읽기에 실패했습니다. (${response.status})`,
  );
}

export async function writeTxtLibrary(library: TxtLibrary) {
  if (typeof window === "undefined") {
    throw new Error("브라우저에서만 저장할 수 있습니다.");
  }

  const cleaned = normalizeTxtLibraryShape(library);

  const response = await fetch("/api/content/library", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ library: cleaned }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        message?: string;
        fileCount?: number;
      }
    | null;

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.message ||
        `실제 TXT 저장에 실패했습니다. (${response.status})`,
    );
  }

  // Local copy is emergency backup only.
  window.localStorage.setItem(
    LOCAL_BACKUP_KEY,
    JSON.stringify(cleaned),
  );

  // Remove old pre-Supabase source key so it can never become
  // an accidental second source of truth again.
  window.localStorage.removeItem(TXT_LIBRARY_KEY);

  window.dispatchEvent(
    new Event("meditree:txt-library-updated"),
  );

  return data;
}

export default function useTxtLibrary() {
  const [library, setLibrary] = useState<TxtLibrary>(
    cloneDefaultTxtLibrary(),
  );

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const current = await readTxtLibrary();

        if (active) {
          setLibrary(current);
        }
      } catch (error) {
        // Important: keep the last successfully loaded Supabase state.
        // Do not replace it with stale local/default data.
        console.error("MediTree TXT refresh failed:", error);
      }
    };

    void refresh();

    const handleUpdate = () => {
      void refresh();
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
