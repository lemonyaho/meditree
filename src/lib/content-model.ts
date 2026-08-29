export const APP_VERSION = "2.7.2";

export type ModuleId =
  | "clinical"
  | "lectures"
  | "drugs"
  | "microbiology";

export type ThemeColor = "red" | "yellow" | "blue" | "green";

export type BlockLabelMap = Record<string, string>;

export const BLOCK_LABELS_REVISION = 4;

export type SystemBlockDefinition = {
  key: string;
  label: string;
  functional?: boolean;
};

export const SYSTEM_BLOCK_DEFINITIONS: Record<
  ModuleId,
  SystemBlockDefinition[]
> = {
  clinical: [
    { key: "def", label: "정의" },
    { key: "etiol", label: "역학" },
    { key: "patho", label: "병리기전" },
    { key: "sx", label: "증상·징후" },
    { key: "imaging", label: "영상 소견" },
    { key: "dx", label: "진단" },
    { key: "tx", label: "치료" },
    { key: "prog", label: "예후" },
    { key: "tf", label: "T/F 문항", functional: true },
    { key: "memo", label: "특이사항" },
  ],
  lectures: [
    { key: "def", label: "정의" },
    { key: "etiol", label: "역학" },
    { key: "patho", label: "병리기전" },
    { key: "sx", label: "증상·징후" },
    { key: "imaging", label: "영상 소견" },
    { key: "dx", label: "진단" },
    { key: "tx", label: "치료" },
    { key: "prog", label: "예후" },
    { key: "tf", label: "T/F 문항", functional: true },
    { key: "memo", label: "특이사항" },
  ],
  drugs: [
    { key: "brand", label: "상품명" },
    { key: "mech", label: "기전" },
    { key: "indi", label: "적응증" },
    { key: "contra", label: "금기증" },
    { key: "side", label: "부작용" },
    { key: "caution", label: "주의사항" },
    { key: "memo", label: "특이사항" },
  ],
  microbiology: [
    { key: "o2", label: "산소요구도" },
    { key: "dz", label: "연관질환" },
    { key: "memo", label: "특이사항" },
  ],
};

export const DEFAULT_BLOCK_LABELS: Record<
  ModuleId,
  BlockLabelMap
> = Object.fromEntries(
  Object.entries(SYSTEM_BLOCK_DEFINITIONS).map(
    ([moduleId, definitions]) => [
      moduleId,
      Object.fromEntries(
        definitions.map(({ key, label }) => [
          key,
          label,
        ]),
      ),
    ],
  ),
) as Record<ModuleId, BlockLabelMap>;

export function systemBlockKeys(
  moduleId: ModuleId,
) {
  return new Set(
    SYSTEM_BLOCK_DEFINITIONS[moduleId].map(
      ({ key }) => key,
    ),
  );
}

export type FileMeta = {
  title: string;
  english?: string;
  date?: string;
  professor?: string;
  color?: ThemeColor;
  verified?: boolean;
  verifiedHash?: string;
};

export type ContentFile = {
  id: string;
  name: string;
  objectPath?: string;
  meta: FileMeta;
};

export type ContentFolder = {
  id: string;
  name: string;
  english: string;
  description: string;
  folders: ContentFolder[];
  files: ContentFile[];
};

export type ContentModule = {
  id: ModuleId;
  storageRoot: string;
  title: string;
  english: string;
  description: string;
  blockLabels: BlockLabelMap;
  blockLabelsRevision: number;
  customBlockOrder: string[];
  folders: ContentFolder[];
  files: ContentFile[];
};

export type SiteSettings = {
  eyebrow: string;
  brandTitle: string;
  subtitle: string;
  footerCopyright: string;
  moduleOrder: ModuleId[];
};

export type ContentTree = {
  schemaVersion: 2;
  site: SiteSettings;
  modules: Record<ModuleId, ContentModule>;
};

export const MODULE_IDS: ModuleId[] = [
  "clinical",
  "lectures",
  "drugs",
  "microbiology",
];

export const MODULE_HREFS: Record<ModuleId, string> = {
  clinical: "/clinical",
  lectures: "/lectures",
  drugs: "/drugs",
  microbiology: "/microbiology",
};

export const DEFAULT_CONTENT_TREE: ContentTree = {
  schemaVersion: 2,
  site: {
    eyebrow: "MEDICAL STUDY ARCHIVE",
    brandTitle: "MediTree",
    subtitle: "공부한 내용을 하나씩 쌓고, 필요할 때 다시 꺼내보세요.",
    footerCopyright: "©2026 LMYH. All Rights Reserved.",
    moduleOrder: ["clinical", "lectures", "drugs", "microbiology"],
  },
  modules: {
    clinical: {
      id: "clinical",
      storageRoot: "clinical",
      title: "임상 단권화",
      english: "CLINICAL",
      description: "임상에서 다시 찾아볼 핵심 내용을 질환과 상황 중심으로 정리합니다.",
      blockLabels: { ...DEFAULT_BLOCK_LABELS.clinical },
      blockLabelsRevision: BLOCK_LABELS_REVISION,
      customBlockOrder: [],
      folders: [],
      files: [],
    },
    lectures: {
      id: "lectures",
      storageRoot: "lectures",
      title: "강의 핵심 단권화",
      english: "LECTURE",
      description: "강의별 핵심 구조와 내용을 한곳에서 정리합니다.",
      blockLabels: { ...DEFAULT_BLOCK_LABELS.lectures },
      blockLabelsRevision: BLOCK_LABELS_REVISION,
      customBlockOrder: [],
      folders: [],
      files: [],
    },
    drugs: {
      id: "drugs",
      storageRoot: "ToolDrugs",
      title: "약물 학습 도구",
      english: "DRUG TOOL",
      description: "약물 계열과 세부 정보를 계층적으로 연결해 학습합니다.",
      blockLabels: { ...DEFAULT_BLOCK_LABELS.drugs },
      blockLabelsRevision: BLOCK_LABELS_REVISION,
      customBlockOrder: [],
      folders: [],
      files: [],
    },
    microbiology: {
      id: "microbiology",
      storageRoot: "ToolMicrobiology",
      title: "미생물 학습 도구",
      english: "MICROBE TOOL",
      description: "미생물의 분류와 핵심 특성을 계층적으로 정리하고 학습합니다.",
      blockLabels: { ...DEFAULT_BLOCK_LABELS.microbiology },
      blockLabelsRevision: BLOCK_LABELS_REVISION,
      customBlockOrder: [],
      folders: [],
      files: [],
    },
  },
};

export function cloneDefaultContentTree(): ContentTree {
  return JSON.parse(JSON.stringify(DEFAULT_CONTENT_TREE)) as ContentTree;
}

function normalizeFile(input: unknown): ContentFile | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<ContentFile>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;

  const meta = raw.meta && typeof raw.meta === "object"
    ? raw.meta as FileMeta
    : { title: raw.name.replace(/\.txt$/i, "") };

  return {
    id: raw.id,
    name: raw.name,
    objectPath: typeof raw.objectPath === "string" ? raw.objectPath : undefined,
    meta: {
      title: typeof meta.title === "string" && meta.title.trim()
        ? meta.title.trim()
        : raw.name.replace(/\.txt$/i, ""),
      english: typeof meta.english === "string" ? meta.english : undefined,
      date: typeof meta.date === "string" ? meta.date : undefined,
      professor: typeof meta.professor === "string" ? meta.professor : undefined,
      color:
        meta.color === "red" ||
        meta.color === "yellow" ||
        meta.color === "blue" ||
        meta.color === "green"
          ? meta.color
          : undefined,
      verified:
        typeof meta.verified === "boolean"
          ? meta.verified
          : undefined,
      verifiedHash:
        typeof meta.verifiedHash === "string" &&
        meta.verifiedHash.trim()
          ? meta.verifiedHash.trim()
          : undefined,
    },
  };
}

function normalizeFolder(input: unknown): ContentFolder | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<ContentFolder>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;

  return {
    id: raw.id,
    name: raw.name,
    english: typeof raw.english === "string" ? raw.english : "",
    description: typeof raw.description === "string" ? raw.description : "",
    folders: Array.isArray(raw.folders)
      ? raw.folders.map(normalizeFolder).filter((item): item is ContentFolder => Boolean(item))
      : [],
    files: Array.isArray(raw.files)
      ? raw.files.map(normalizeFile).filter((item): item is ContentFile => Boolean(item))
      : [],
  };
}


function normalizeBlockLabels(
  input: unknown,
  fallback: BlockLabelMap,
  moduleId: ModuleId,
  rawRevision: unknown,
): { labels: BlockLabelMap; revision: number } {
  const revision = typeof rawRevision === "number" && Number.isFinite(rawRevision)
    ? Math.max(0, Math.floor(rawRevision))
    : 0;

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { labels: { ...fallback }, revision: BLOCK_LABELS_REVISION };
  }

  const labels: BlockLabelMap = {};
  for (const [rawKey, rawLabel] of Object.entries(input as Record<string, unknown>)) {
    const key = rawKey.trim().replace(/^@+/, "");
    const label = typeof rawLabel === "string" ? rawLabel.trim() : "";
    if (!key || !label) continue;
    labels[key] = label;
  }

  // v2.1.0: preserve user edits/deletions, add only the new @brand.
  if (revision < 1 && moduleId === "drugs" && !("brand" in labels)) {
    labels.brand = "상품명";
  }

  // v2.2.0: microbiology key를 @oxygen -> @o2로 정리한다.
  // 사용자가 기존 @oxygen 표시명을 수정했다면 그 표시명도 그대로 옮긴다.
  if (revision < 2 && moduleId === "microbiology") {
    if (!("o2" in labels)) {
      labels.o2 =
        typeof labels.oxygen === "string" && labels.oxygen.trim()
          ? labels.oxygen
          : "산소요구도";
    }
    delete labels.oxygen;
  }

  // v2.2.4: drugs에 @memo를 1회 추가한다.
  // 이후 사용자가 삭제/수정한 값은 다시 강제로 복구하지 않는다.
  if (revision < 3 && moduleId === "drugs" && !("memo" in labels)) {
    labels.memo = "메모";
  }

  // v2.6.0: system blocks are fixed per module.
  // Custom blocks are preserved, but system keys/labels cannot
  // be renamed or removed from Admin.
  for (const definition of SYSTEM_BLOCK_DEFINITIONS[moduleId]) {
    labels[definition.key] = definition.label;
  }

  return {
    labels,
    revision: Math.max(revision, BLOCK_LABELS_REVISION),
  };
}

function normalizeCustomBlockOrder(
  input: unknown,
  labels: BlockLabelMap,
  moduleId: ModuleId,
) {
  const systemKeys = systemBlockKeys(moduleId);
  const customKeys = Object.keys(labels).filter(
    (key) => !systemKeys.has(key),
  );

  const requested = Array.isArray(input)
    ? input
        .filter(
          (value): value is string =>
            typeof value === "string",
        )
        .map((value) =>
          value.trim().replace(/^@+/, ""),
        )
        .filter(Boolean)
    : [];

  const ordered: string[] = [];
  for (const key of requested) {
    if (
      customKeys.includes(key) &&
      !ordered.includes(key)
    ) {
      ordered.push(key);
    }
  }

  for (const key of customKeys) {
    if (!ordered.includes(key)) {
      ordered.push(key);
    }
  }

  return ordered;
}

export function normalizeContentTree(input: unknown): ContentTree {
  const fallback = cloneDefaultContentTree();
  if (!input || typeof input !== "object") return fallback;

  const raw = input as Partial<ContentTree> & {
    modules?: Partial<Record<ModuleId, Partial<ContentModule>>>;
  };

  const siteRaw = raw.site && typeof raw.site === "object" ? raw.site : {};
  const order = Array.isArray((siteRaw as SiteSettings).moduleOrder)
    ? (siteRaw as SiteSettings).moduleOrder.filter(
        (id): id is ModuleId => MODULE_IDS.includes(id as ModuleId),
      )
    : [];

  fallback.site = {
    eyebrow:
      typeof (siteRaw as SiteSettings).eyebrow === "string"
        ? (siteRaw as SiteSettings).eyebrow
        : fallback.site.eyebrow,
    brandTitle:
      typeof (siteRaw as SiteSettings).brandTitle === "string"
        ? (siteRaw as SiteSettings).brandTitle
        : fallback.site.brandTitle,
    subtitle:
      typeof (siteRaw as SiteSettings).subtitle === "string"
        ? (siteRaw as SiteSettings).subtitle
        : fallback.site.subtitle,
    footerCopyright:
      typeof (siteRaw as SiteSettings).footerCopyright === "string"
        ? (siteRaw as SiteSettings).footerCopyright
        : fallback.site.footerCopyright,
    moduleOrder: [
      ...order,
      ...MODULE_IDS.filter((id) => !order.includes(id)),
    ],
  };

  for (const id of MODULE_IDS) {
    const moduleRaw = raw.modules?.[id];
    if (!moduleRaw || typeof moduleRaw !== "object") continue;
    const base = fallback.modules[id];

    fallback.modules[id] = {
      ...base,
      title: typeof moduleRaw.title === "string" ? moduleRaw.title : base.title,
      english: typeof moduleRaw.english === "string" ? moduleRaw.english : base.english,
      description:
        typeof moduleRaw.description === "string"
          ? moduleRaw.description
          : base.description,
      ...(() => {
        const normalizedBlocks = normalizeBlockLabels(
          (moduleRaw as Partial<ContentModule>).blockLabels,
          DEFAULT_BLOCK_LABELS[id],
          id,
          (moduleRaw as Partial<ContentModule>).blockLabelsRevision,
        );
        return {
          blockLabels: normalizedBlocks.labels,
          blockLabelsRevision: normalizedBlocks.revision,
          customBlockOrder: normalizeCustomBlockOrder(
            (moduleRaw as Partial<ContentModule>)
              .customBlockOrder,
            normalizedBlocks.labels,
            id,
          ),
        };
      })(),
      folders: Array.isArray(moduleRaw.folders)
        ? moduleRaw.folders
            .map(normalizeFolder)
            .filter((item): item is ContentFolder => Boolean(item))
        : [],
      files: Array.isArray(moduleRaw.files)
        ? moduleRaw.files
            .map(normalizeFile)
            .filter((item): item is ContentFile => Boolean(item))
        : [],
    };
  }

  return fallback;
}

export type ContentContainer = {
  folders: ContentFolder[];
  files: ContentFile[];
};

export type ContainerKind = "empty" | "folders" | "files" | "mixed";

export function getContainerKind(container: ContentContainer): ContainerKind {
  const hasFolders = container.folders.length > 0;
  const hasFiles = container.files.length > 0;
  if (hasFolders && hasFiles) return "mixed";
  if (hasFolders) return "folders";
  if (hasFiles) return "files";
  return "empty";
}

export function findFolderByPath(
  module: ContentModule,
  path: string[],
): ContentFolder | undefined {
  let folders = module.folders;
  let current: ContentFolder | undefined;

  for (const id of path) {
    current = folders.find((folder) => folder.id === id);
    if (!current) return undefined;
    folders = current.folders;
  }

  return current;
}

export function getContainer(
  module: ContentModule,
  path: string[],
): ContentContainer | undefined {
  if (!path.length) {
    return { folders: module.folders, files: module.files };
  }

  const folder = findFolderByPath(module, path);
  if (!folder) return undefined;
  return { folders: folder.folders, files: folder.files };
}

export function getFolderTrail(
  module: ContentModule,
  path: string[],
): ContentFolder[] {
  const trail: ContentFolder[] = [];
  let folders = module.folders;

  for (const id of path) {
    const folder = folders.find((item) => item.id === id);
    if (!folder) break;
    trail.push(folder);
    folders = folder.folders;
  }

  return trail;
}

export function updateContainer(
  module: ContentModule,
  path: string[],
  updater: (container: ContentContainer) => ContentContainer,
): ContentModule {
  if (!path.length) {
    const updated = updater({ folders: module.folders, files: module.files });
    return { ...module, ...updated };
  }

  const [head, ...rest] = path;
  return {
    ...module,
    folders: module.folders.map((folder) => {
      if (folder.id !== head) return folder;
      if (!rest.length) {
        const updated = updater({ folders: folder.folders, files: folder.files });
        return { ...folder, ...updated };
      }
      const nextModule: ContentModule = {
        ...module,
        folders: folder.folders,
        files: folder.files,
      };
      const updated = updateContainer(nextModule, rest, updater);
      return { ...folder, folders: updated.folders, files: updated.files };
    }),
  };
}

export function updateFolder(
  module: ContentModule,
  path: string[],
  updater: (folder: ContentFolder) => ContentFolder,
): ContentModule {
  if (!path.length) return module;
  const parentPath = path.slice(0, -1);
  const id = path[path.length - 1];
  return updateContainer(module, parentPath, (container) => ({
    ...container,
    folders: container.folders.map((folder) =>
      folder.id === id ? updater(folder) : folder,
    ),
  }));
}

export function collectFiles(
  module: ContentModule,
): ContentFile[] {
  const output: ContentFile[] = [...module.files];
  const walk = (folders: ContentFolder[]) => {
    for (const folder of folders) {
      output.push(...folder.files);
      walk(folder.folders);
    }
  };
  walk(module.folders);
  return output;
}

export function ensureTxtName(name: string) {
  const trimmed = name.trim();
  return trimmed.toLowerCase().endsWith(".txt") ? trimmed : `${trimmed}.txt`;
}

export function makeContentId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function parsePathParam(value: string | null): string[] {
  return value
    ? value.split("/").map((item) => item.trim()).filter(Boolean)
    : [];
}

export function pathParam(path: string[]) {
  return path.join("/");
}
