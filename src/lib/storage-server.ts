import {
  normalizeTxtLibraryShape,
  type TxtFile,
  type TxtFolder,
  type TxtLibrary,
} from "@/lib/txt-content";

const INDEX_PATH = "index.json";

type ManifestFile = {
  id: string;
  name: string;
  path: string;
};

type ManifestFolder = {
  id: string;
  name: string;
  english: string;
  files: ManifestFile[];
};

type StorageManifest = {
  schemaVersion: 2;
  updatedAt: string;
  lectures: {
    folders: ManifestFolder[];
  };
  drugs: {
    folders: ManifestFolder[];
  };
  microbiology: {
    folders: ManifestFolder[];
  };
};

type LegacyStorageManifest = {
  schemaVersion: 1;
  updatedAt?: string;
  lectures?: {
    folders?: ManifestFolder[];
  };
  drugs?: {
    files?: ManifestFile[];
  };
  microbiology?: {
    folders?: ManifestFolder[];
  };
};

export class ContentStorageError extends Error {
  code: string;
  status: number;

  constructor(
    message: string,
    code = "STORAGE_ERROR",
    status = 500,
  ) {
    super(message);
    this.name = "ContentStorageError";
    this.code = code;
    this.status = status;
  }
}

function config() {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    "meditree-content";

  if (!url || !key) {
    throw new ContentStorageError(
      "Supabase Storage 설정이 없습니다. SUPABASE_URL과 SUPABASE_SECRET_KEY를 .env.local에 추가하세요.",
      "NOT_CONFIGURED",
      503,
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    key,
    bucket,
  };
}

function headers(extra?: HeadersInit) {
  const { key } = config();

  const base: Record<string, string> = {
    apikey: key,
  };

  // Legacy service_role keys are JWTs and may also be used as Bearer tokens.
  // New sb_secret_... keys are opaque API keys, not JWTs.
  if (!key.startsWith("sb_secret_") && !key.startsWith("sb_publishable_")) {
    base.Authorization = `Bearer ${key}`;
  }

  return {
    ...base,
    ...extra,
  };
}

function encodeObjectPath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function asciiKeyPart(
  value: string,
  fallbackPrefix: string,
) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);

  if (normalized) return normalized;

  // Stable small hash fallback for IDs made only of Korean/non-ASCII text.
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return `${fallbackPrefix}-${(hash >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

function txtObjectName(file: TxtFile) {
  const stem = asciiKeyPart(file.id, "file");
  return `${stem}.txt`;
}

function lecturePath(folder: TxtFolder, file: TxtFile) {
  return `lectures/${asciiKeyPart(
    folder.id,
    "system",
  )}/${txtObjectName(file)}`;
}

function drugPath(folder: TxtFolder, file: TxtFile) {
  return `drugs/${asciiKeyPart(
    folder.id,
    "category",
  )}/${txtObjectName(file)}`;
}

function microbiologyPath(folder: TxtFolder, file: TxtFile) {
  return `microbiology/${asciiKeyPart(
    folder.id,
    "domain",
  )}/${txtObjectName(file)}`;
}

function toManifest(library: TxtLibrary): StorageManifest {
  const manifest: StorageManifest = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    lectures: {
      folders: library.lectures.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        english: folder.english,
        files: folder.files.map((file) => ({
          id: file.id,
          name: file.name,
          path: lecturePath(folder, file),
        })),
      })),
    },
    drugs: {
      folders: library.drugs.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        english: folder.english,
        files: folder.files.map((file) => ({
          id: file.id,
          name: file.name,
          path: drugPath(folder, file),
        })),
      })),
    },
    microbiology: {
      folders: library.microbiology.folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        english: folder.english,
        files: folder.files.map((file) => ({
          id: file.id,
          name: file.name,
          path: microbiologyPath(folder, file),
        })),
      })),
    },
  };

  const paths = collectPaths(manifest);
  const duplicates = paths.filter(
    (path, index) => paths.indexOf(path) !== index,
  );

  if (duplicates.length) {
    throw new ContentStorageError(
      `같은 Storage 위치에 중복된 TXT ID가 있습니다: ${[
        ...new Set(duplicates),
      ].join(", ")}`,
      "DUPLICATE_PATH",
      400,
    );
  }

  return manifest;
}

function collectPaths(manifest: StorageManifest) {
  return [
    ...manifest.lectures.folders.flatMap((folder) =>
      folder.files.map((file) => file.path),
    ),
    ...manifest.drugs.folders.flatMap((folder) =>
      folder.files.map((file) => file.path),
    ),
    ...manifest.microbiology.folders.flatMap((folder) =>
      folder.files.map((file) => file.path),
    ),
  ];
}

async function storageRequest(
  path: string,
  init: RequestInit = {},
) {
  const { url } = config();

  return fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: headers(init.headers),
    cache: "no-store",
  });
}

async function assertBucketExists() {
  const { bucket } = config();

  const response = await storageRequest(
    `/bucket/${encodeURIComponent(bucket)}`,
    { method: "GET" },
  );

  if (response.ok) return;

  if (response.status === 404) {
    throw new ContentStorageError(
      `Supabase Storage에 "${bucket}" bucket이 없습니다. Dashboard > Storage에서 private bucket을 먼저 만들어주세요.`,
      "BUCKET_MISSING",
      503,
    );
  }

  const detail = await response.text().catch(() => "");

  throw new ContentStorageError(
    `Supabase bucket 확인 실패 (${response.status})${
      detail ? ` · ${detail}` : ""
    }`,
    "BUCKET_CHECK_FAILED",
    502,
  );
}

async function uploadText(
  path: string,
  content: string,
  contentType = "text/plain;charset=UTF-8",
) {
  const { bucket } = config();

  const response = await storageRequest(
    `/object/${encodeURIComponent(
      bucket,
    )}/${encodeObjectPath(path)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "cache-control": "max-age=0",
        "x-upsert": "true",
      },
      body: content,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ContentStorageError(
      `TXT 저장 실패: ${path} (${response.status}) ${
        detail || ""
      }`.trim(),
      "UPLOAD_FAILED",
      502,
    );
  }
}

async function objectExists(path: string) {
  const { bucket } = config();

  const response = await storageRequest(
    `/object/${encodeURIComponent(
      bucket,
    )}/${encodeObjectPath(path)}`,
    { method: "HEAD" },
  );

  if (response.ok) return true;

  // Supabase storage-js itself treats 400 and 404 from HEAD as "not found".
  if (response.status === 400 || response.status === 404) {
    return false;
  }

  const detail = await response.text().catch(() => "");

  throw new ContentStorageError(
    `TXT 존재 확인 실패: ${path} (${response.status})${
      detail ? ` · ${detail}` : ""
    }`,
    "EXISTS_CHECK_FAILED",
    502,
  );
}

async function downloadText(path: string) {
  const { bucket } = config();

  const response = await storageRequest(
    `/object/${encodeURIComponent(
      bucket,
    )}/${encodeObjectPath(path)}`,
    { method: "GET" },
  );

  if (response.ok) {
    return response.text();
  }

  const detail = await response.text().catch(() => "");
  let code = "";
  let message = detail;

  try {
    const parsed = JSON.parse(detail) as {
      code?: string;
      error?: string;
      message?: string;
      statusCode?: string | number;
    };

    code = String(parsed.code ?? parsed.error ?? "");
    message = String(parsed.message ?? detail);
  } catch {
    // Keep raw response text.
  }

  const normalized = `${code} ${message}`.toLowerCase();

  // Supabase has returned both 404 and legacy 400 responses for a missing
  // object, depending on Storage/API version.
  const isMissing =
    response.status === 404 ||
    code === "NoSuchKey" ||
    normalized.includes("not_found") ||
    normalized.includes("object not found") ||
    normalized.includes("no such key");

  if (isMissing) {
    throw new ContentStorageError(
      `파일을 찾을 수 없습니다: ${path}`,
      "OBJECT_NOT_FOUND",
      404,
    );
  }

  throw new ContentStorageError(
    `TXT 읽기 실패: ${path} (${response.status})${
      message ? ` · ${message}` : ""
    }`,
    "DOWNLOAD_FAILED",
    502,
  );
}

async function readManifest(): Promise<StorageManifest> {
  const exists = await objectExists(INDEX_PATH);

  if (!exists) {
    throw new ContentStorageError(
      "Supabase Storage가 아직 초기화되지 않았습니다. 기존 Admin 내용을 연 뒤 저장 버튼을 한 번 누르면 실제 TXT 파일이 생성됩니다.",
      "NOT_INITIALIZED",
      404,
    );
  }

  const raw = await downloadText(INDEX_PATH);

  let parsed: StorageManifest | LegacyStorageManifest;

  try {
    parsed = JSON.parse(raw) as
      | StorageManifest
      | LegacyStorageManifest;
  } catch {
    throw new ContentStorageError(
      "index.json 형식이 올바르지 않습니다.",
      "BAD_INDEX_JSON",
      500,
    );
  }

  if (parsed.schemaVersion === 2) {
    return parsed as StorageManifest;
  }

  if (parsed.schemaVersion === 1) {
    const legacy = parsed as LegacyStorageManifest;

    return {
      schemaVersion: 2,
      updatedAt:
        legacy.updatedAt ?? new Date().toISOString(),
      lectures: {
        folders: legacy.lectures?.folders ?? [],
      },
      drugs: {
        folders: (legacy.drugs?.files ?? []).map(
          (file) => ({
            id: `legacy-${file.id}`,
            name: file.name.replace(/\.txt$/i, ""),
            english: "",
            files: [file],
          }),
        ),
      },
      microbiology: {
        folders: legacy.microbiology?.folders ?? [],
      },
    };
  }

  throw new ContentStorageError(
    "지원하지 않는 index.json schemaVersion입니다.",
    "BAD_SCHEMA",
    500,
  );
}

async function downloadManifestFile(
  file: ManifestFile,
): Promise<TxtFile | null> {
  try {
    return {
      id: file.id,
      name: file.name,
      content: await downloadText(file.path),
    };
  } catch (error) {
    if (
      error instanceof ContentStorageError &&
      error.code === "OBJECT_NOT_FOUND"
    ) {
      console.warn(
        `index.json에서 참조하지만 실제 TXT가 없어 건너뜁니다: ${file.path}`,
      );
      return null;
    }

    throw error;
  }
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => worker(),
    ),
  );

  return results;
}

export async function loadTxtLibraryFromStorage(): Promise<TxtLibrary> {
  await assertBucketExists();
  const manifest = await readManifest();

  async function loadFolder(folder: ManifestFolder): Promise<TxtFolder> {
    const loaded = await mapWithLimit(
      folder.files,
      6,
      downloadManifestFile,
    );

    return {
      id: folder.id,
      name: folder.name,
      english: folder.english,
      files: loaded.filter(
        (file): file is TxtFile => file !== null,
      ),
    };
  }

  const lectureFolders = await Promise.all(
    manifest.lectures.folders.map(loadFolder),
  );

  const drugFolders = await Promise.all(
    manifest.drugs.folders.map(loadFolder),
  );

  const microFolders = await Promise.all(
    manifest.microbiology.folders.map(loadFolder),
  );

  return normalizeTxtLibraryShape({
    lectures: { folders: lectureFolders },
    drugs: { folders: drugFolders },
    microbiology: { folders: microFolders },
  });
}

async function removeObjects(paths: string[]) {
  if (!paths.length) return;

  const { bucket } = config();

  const response = await storageRequest(
    `/object/${encodeURIComponent(bucket)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: paths }),
    },
  );

  if (!response.ok) {
    throw new ContentStorageError(
      `삭제된 TXT 정리 실패 (${response.status})`,
      "DELETE_FAILED",
      502,
    );
  }
}

export async function saveTxtLibraryToStorage(
  library: TxtLibrary,
) {
  await assertBucketExists();

  const manifest = toManifest(library);
  let previousPaths: string[] = [];

  try {
    const previous = await readManifest();
    previousPaths = collectPaths(previous);
  } catch (error) {
    if (
      !(
        error instanceof ContentStorageError &&
        error.code === "NOT_INITIALIZED"
      )
    ) {
      throw error;
    }
  }

  const jobs: Array<{ path: string; content: string }> = [
    ...library.lectures.folders.flatMap((folder) =>
      folder.files.map((file) => ({
        path: lecturePath(folder, file),
        content: file.content,
      })),
    ),
    ...library.drugs.folders.flatMap((folder) =>
      folder.files.map((file) => ({
        path: drugPath(folder, file),
        content: file.content,
      })),
    ),
    ...library.microbiology.folders.flatMap((folder) =>
      folder.files.map((file) => ({
        path: microbiologyPath(folder, file),
        content: file.content,
      })),
    ),
  ];

  await mapWithLimit(jobs, 6, (job) =>
    uploadText(job.path, job.content),
  );

  // Write index last so it only points at successfully uploaded TXT files.
  await uploadText(
    INDEX_PATH,
    JSON.stringify(manifest, null, 2),
    "application/json;charset=UTF-8",
  );

  const nextPaths = new Set(collectPaths(manifest));
  const obsolete = previousPaths.filter(
    (path) => !nextPaths.has(path),
  );

  if (obsolete.length) {
    await removeObjects(obsolete);
  }

  return {
    bucket: config().bucket,
    fileCount: jobs.length,
    updatedAt: manifest.updatedAt,
  };
}

export function storageErrorResponse(error: unknown) {
  if (error instanceof ContentStorageError) {
    return Response.json(
      {
        ok: false,
        code: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  console.error(error);

  return Response.json(
    {
      ok: false,
      code: "UNKNOWN",
      message: "TXT 저장소 처리 중 오류가 발생했습니다.",
    },
    { status: 500 },
  );
}
