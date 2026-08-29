import {
  cloneDefaultContentTree,
  ensureTxtName,
  MODULE_IDS,
  normalizeContentTree,
  type ContentFile,
  type ContentFolder,
  type ContentModule,
  type ContentTree,
  type ModuleId,
} from "@/lib/content-model";
import { metadataFromTxt, txtTitleFromContent } from "@/lib/universal-txt";

const INDEX_PATH = "content/index.json";
const CONTENT_PREFIX = "content/";

type ManifestFile = {
  id: string;
  name: string;
  path: string;
  meta: ContentFile["meta"];
  refs?: ContentFile["refs"];
};

type ManifestFolder = {
  id: string;
  name: string;
  english: string;
  description: string;
  folders: ManifestFolder[];
  files: ManifestFile[];
};

type ManifestModule = {
  id: ModuleId;
  storageRoot: string;
  title: string;
  english: string;
  description: string;
  blockLabels: ContentModule["blockLabels"];
  blockLabelsRevision?: number;
  customBlockOrder?: string[];
  folders: ManifestFolder[];
  files: ManifestFile[];
};

type StorageManifest = {
  schemaVersion: 2;
  updatedAt: string;
  site: ContentTree["site"];
  modules: Record<ModuleId, ManifestModule>;
};

export class ContentStorageError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "STORAGE_ERROR", status = 500) {
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
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || "meditree-content";

  if (!url || !key) {
    throw new ContentStorageError(
      "Supabase Storage 설정이 없습니다. SUPABASE_URL과 SUPABASE_SECRET_KEY를 확인하세요.",
      "NOT_CONFIGURED",
      503,
    );
  }

  return { url: url.replace(/\/+$/, ""), key, bucket };
}

function headers(extra?: HeadersInit) {
  const { key } = config();
  const base: Record<string, string> = { apikey: key };

  if (!key.startsWith("sb_secret_") && !key.startsWith("sb_publishable_")) {
    base.Authorization = `Bearer ${key}`;
  }

  return { ...base, ...extra };
}

function encodeObjectPath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

async function storageRequest(path: string, init: RequestInit = {}) {
  const { url } = config();
  return fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: headers(init.headers),
    cache: "no-store",
  });
}

async function uploadText(
  path: string,
  content: string,
  contentType = "text/plain;charset=UTF-8",
) {
  const { bucket } = config();
  const response = await storageRequest(
    `/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
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
      `저장 실패: ${path} (${response.status}) ${detail}`.trim(),
      "UPLOAD_FAILED",
      502,
    );
  }
}

export async function downloadContentText(path: string) {
  if (!path.startsWith(CONTENT_PREFIX) || path === INDEX_PATH) {
    throw new ContentStorageError("허용되지 않은 파일 경로입니다.", "BAD_PATH", 400);
  }

  const { bucket } = config();
  const response = await storageRequest(
    `/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
    { method: "GET" },
  );

  if (response.ok) return response.text();

  const detail = await response.text().catch(() => "");
  if (response.status === 400 || response.status === 404) {
    throw new ContentStorageError(
      `파일을 찾을 수 없습니다: ${path}`,
      "OBJECT_NOT_FOUND",
      404,
    );
  }

  throw new ContentStorageError(
    `파일 읽기 실패: ${path} (${response.status}) ${detail}`.trim(),
    "DOWNLOAD_FAILED",
    502,
  );
}

async function downloadAnyText(path: string) {
  const { bucket } = config();
  const response = await storageRequest(
    `/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
    { method: "GET" },
  );

  if (response.ok) return response.text();
  if (response.status === 400 || response.status === 404) return null;

  const detail = await response.text().catch(() => "");
  throw new ContentStorageError(
    `Storage 읽기 실패: ${path} (${response.status}) ${detail}`.trim(),
    "DOWNLOAD_FAILED",
    502,
  );
}

function asciiKeyPart(value: string, fallbackPrefix: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 80);

  if (normalized) return normalized;

  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `${fallbackPrefix}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function fileObjectPath(
  module: ContentModule,
  folderIds: string[],
  file: ContentFile,
) {
  const parts = [
    "content",
    module.storageRoot,
    ...folderIds.map((id) => asciiKeyPart(id, "folder")),
    `${asciiKeyPart(file.id, "file")}.txt`,
  ];
  return parts.join("/");
}

function folderToManifest(
  module: ContentModule,
  folder: ContentFolder,
  parentIds: string[],
): ManifestFolder {
  const folderIds = [...parentIds, folder.id];
  return {
    id: folder.id,
    name: folder.name,
    english: folder.english,
    description: folder.description,
    folders: folder.folders.map((child) =>
      folderToManifest(module, child, folderIds),
    ),
    files: folder.files.map((file) => ({
      id: file.id,
      name: file.name,
      path: fileObjectPath(module, folderIds, file),
      meta: file.meta,
      refs: file.refs ?? [],
    })),
  };
}

function toManifest(tree: ContentTree): StorageManifest {
  const normalized = normalizeContentTree(tree);
  const modules = {} as Record<ModuleId, ManifestModule>;

  for (const id of MODULE_IDS) {
    const module = normalized.modules[id];
    modules[id] = {
      id,
      storageRoot: module.storageRoot,
      title: module.title,
      english: module.english,
      description: module.description,
      blockLabels: module.blockLabels,
      blockLabelsRevision: module.blockLabelsRevision,
      customBlockOrder: module.customBlockOrder,
      folders: module.folders.map((folder) =>
        folderToManifest(module, folder, []),
      ),
      files: module.files.map((file) => ({
        id: file.id,
        name: file.name,
        path: fileObjectPath(module, [], file),
        meta: file.meta,
        refs: file.refs,
      })),
    };
  }

  return {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    site: normalized.site,
    modules,
  };
}

function folderFromManifest(folder: ManifestFolder): ContentFolder {
  return {
    id: folder.id,
    name: folder.name,
    english: folder.english,
    description: folder.description,
    folders: folder.folders.map(folderFromManifest),
    files: folder.files.map((file) => ({
      id: file.id,
      name: file.name,
      objectPath: file.path,
      meta: file.meta,
      refs: file.refs ?? [],
    })),
  };
}

function manifestToTree(manifest: StorageManifest): ContentTree {
  const raw: ContentTree = {
    schemaVersion: 2,
    site: manifest.site,
    modules: {} as Record<ModuleId, ContentModule>,
  };

  for (const id of MODULE_IDS) {
    const module = manifest.modules[id];
    if (!module) continue;

    raw.modules[id] = {
      id,
      storageRoot: module.storageRoot,
      title: module.title,
      english: module.english,
      description: module.description,
      blockLabels: module.blockLabels,
      blockLabelsRevision: module.blockLabelsRevision ?? 0,
      customBlockOrder:
        module.customBlockOrder ?? [],
      folders: module.folders.map(folderFromManifest),
      files: module.files.map((file) => ({
        id: file.id,
        name: file.name,
        objectPath: file.path,
        meta: file.meta,
        refs: file.refs ?? [],
      })),
    };
  }

  return normalizeContentTree(raw);
}

async function readManifest(): Promise<StorageManifest | null> {
  const raw = await downloadAnyText(INDEX_PATH);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StorageManifest;
    if (parsed.schemaVersion !== 2 || !parsed.modules || !parsed.site) {
      throw new Error("bad schema");
    }
    return parsed;
  } catch {
    throw new ContentStorageError(
      "MediTree content/index.json 형식이 올바르지 않습니다.",
      "BAD_INDEX_JSON",
      500,
    );
  }
}

export async function loadContentTreeFromStorage(): Promise<ContentTree> {
  const manifest = await readManifest();
  return manifest ? manifestToTree(manifest) : cloneDefaultContentTree();
}

function collectManifestFiles(manifest: StorageManifest) {
  const output: ManifestFile[] = [];
  const walk = (folders: ManifestFolder[]) => {
    for (const folder of folders) {
      output.push(...folder.files);
      walk(folder.folders);
    }
  };
  for (const id of MODULE_IDS) {
    const module = manifest.modules[id];
    if (!module) continue;
    output.push(...module.files);
    walk(module.folders);
  }
  return output;
}

function collectTreeFiles(tree: ContentTree) {
  const output: ContentFile[] = [];
  const walk = (folders: ContentFolder[]) => {
    for (const folder of folders) {
      output.push(...folder.files);
      walk(folder.folders);
    }
  };
  for (const id of MODULE_IDS) {
    output.push(...tree.modules[id].files);
    walk(tree.modules[id].folders);
  }
  return output;
}

function updateFileMetaByEdits(
  tree: ContentTree,
  edits: Record<string, string>,
) {
  const next = normalizeContentTree(tree);
  const walkFolders = (folders: ContentFolder[]): ContentFolder[] =>
    folders.map((folder): ContentFolder => ({
      ...folder,
      folders: walkFolders(folder.folders),
      files: folder.files.map((file) => {
        const content = edits[file.id];
        if (content === undefined) return file;
        const explicitTitle = txtTitleFromContent(content);
        const parsedMeta = metadataFromTxt(
          content,
          file.name.replace(/\.txt$/i, ""),
        );

        return {
          ...file,
          name: explicitTitle
            ? ensureTxtName(explicitTitle)
            : file.name,
          meta: {
            ...parsedMeta,
            verified: file.meta.verified,
            verifiedHash: file.meta.verifiedHash,
          },
        };
      }),
    }));

  for (const id of MODULE_IDS) {
    const module = next.modules[id];
    next.modules[id] = {
      ...module,
      folders: walkFolders(module.folders),
      files: module.files.map((file) => {
        const content = edits[file.id];
        if (content === undefined) return file;
        const explicitTitle = txtTitleFromContent(content);
        const parsedMeta = metadataFromTxt(
          content,
          file.name.replace(/\.txt$/i, ""),
        );

        return {
          ...file,
          name: explicitTitle
            ? ensureTxtName(explicitTitle)
            : file.name,
          meta: {
            ...parsedMeta,
            verified: file.meta.verified,
            verifiedHash: file.meta.verifiedHash,
          },
        };
      }),
    };
  }

  return next;
}

async function removeObjects(paths: string[]) {
  if (!paths.length) return;
  const { bucket } = config();
  const response = await storageRequest(`/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  });

  if (!response.ok) {
    throw new ContentStorageError(
      `삭제된 TXT 정리 실패 (${response.status})`,
      "DELETE_FAILED",
      502,
    );
  }
}

function assertNoMixedContainers(tree: ContentTree) {
  const check = (label: string, folders: ContentFolder[], files: ContentFile[]) => {
    if (folders.length > 0 && files.length > 0) {
      throw new ContentStorageError(
        `${label}에는 하위 폴더와 TXT를 함께 둘 수 없습니다. 한 종류만 남겨주세요.`,
        "MIXED_CONTAINER",
        400,
      );
    }
    for (const folder of folders) {
      check(folder.name, folder.folders, folder.files);
    }
  };

  for (const id of MODULE_IDS) {
    const module = tree.modules[id];
    check(module.title, module.folders, module.files);
  }
}

async function mapWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await task(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
}

export async function saveContentTreeToStorage(
  inputTree: ContentTree,
  fileEdits: Record<string, string> = {},
) {
  const tree = updateFileMetaByEdits(inputTree, fileEdits);
  assertNoMixedContainers(tree);
  const previousManifest = await readManifest();
  const manifest = toManifest(tree);

  const nextFiles = collectManifestFiles(manifest);
  const pathById = new Map(nextFiles.map((file) => [file.id, file.path]));
  const treeIds = new Set(collectTreeFiles(tree).map((file) => file.id));

  const uploadJobs = Object.entries(fileEdits)
    .filter(([id]) => treeIds.has(id) && pathById.has(id))
    .map(([id, content]) => ({ path: pathById.get(id)!, content }));

  await mapWithLimit(uploadJobs, 6, (job) => uploadText(job.path, job.content));

  await uploadText(
    INDEX_PATH,
    JSON.stringify(manifest, null, 2),
    "application/json;charset=UTF-8",
  );

  const previousPaths = previousManifest
    ? collectManifestFiles(previousManifest).map((file) => file.path)
    : [];
  const nextPaths = new Set(nextFiles.map((file) => file.path));
  const obsolete = previousPaths.filter((path) => !nextPaths.has(path));
  await removeObjects(obsolete);

  return {
    tree: manifestToTree(manifest),
    uploadedFileCount: uploadJobs.length,
    fileCount: nextFiles.length,
    updatedAt: manifest.updatedAt,
  };
}

export function storageErrorResponse(error: unknown) {
  if (error instanceof ContentStorageError) {
    return Response.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.status },
    );
  }

  console.error(error);
  return Response.json(
    {
      ok: false,
      code: "UNKNOWN",
      message: "MediTree 저장소 처리 중 오류가 발생했습니다.",
    },
    { status: 500 },
  );
}
