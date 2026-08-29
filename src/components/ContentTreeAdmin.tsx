"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminActionRail } from "@/components/ActionRail";
import AdminFormModal from "@/components/AdminFormModal";
import { readContentFile, readContentTree, writeContentTree } from "@/components/useContentTree";
import {
  MODULE_HREFS,
  SYSTEM_BLOCK_DEFINITIONS,
  ensureTxtName,
  findFolderByPath,
  getContainer,
  getContainerKind,
  getFolderTrail,
  makeContentId,
  parsePathParam,
  pathParam,
  updateContainer,
  updateFolder,
  type ContentFile,
  type ContentFolder,
  type ContentModule,
  type BlockLabelMap,
  type ContentTree,
  type ModuleId,
  type ThemeColor,
} from "@/lib/content-model";
import {
  compareLectureFiles,
  contentFingerprint,
  createTxtTemplate,
  metadataFromTxt,
  stripLegacyVerifiedMetadata,
  replaceTxtTitle,
  txtTitleFromContent,
} from "@/lib/universal-txt";

type ModalState =
  | { type: "addFolder" }
  | { type: "editFolder"; folder: ContentFolder; targetPath: string[] }
  | { type: "deleteFolder"; folder: ContentFolder; targetPath: string[] }
  | { type: "addFile" }
  | { type: "renameFile"; file: ContentFile }
  | { type: "deleteFile"; file: ContentFile }
  | null;

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function adminUrl(
  moduleId: ModuleId,
  path: string[],
  options: { mode?: "manage"; fileId?: string } = {},
) {
  const params = new URLSearchParams({ module: moduleId });
  if (path.length) params.set("path", pathParam(path));
  if (options.mode) params.set("mode", options.mode);
  if (options.fileId) params.set("file", options.fileId);
  return `/admin/content?${params.toString()}`;
}

function viewUrl(moduleId: ModuleId, path: string[], fileId?: string) {
  const params = new URLSearchParams();
  if (path.length) params.set("path", pathParam(path));
  if (fileId) params.set("file", fileId);
  const query = params.toString();
  return `${MODULE_HREFS[moduleId]}${query ? `?${query}` : ""}`;
}

function moduleTxtExample(moduleId: ModuleId) {
  if (moduleId === "lectures") {
    return `# 감염성 설사 (TBL)
@english Infectious Diarrhea
@date 26.08.27.23
@prof 김봉영
@color yellow

01 원인균 추정
01.1 설사의 양상
@염증성 설사
Shigella, Yerisina, Salmonella, Campylobacter, EHEC, EIEC, Vibrio parahemolyticus, Clostridioides difficile
@비염증성 설사
Vibrio cholerae, Clostridium perfringens, Bacillus cereus, Staphylococcus aureus`;
  }

  if (moduleId === "clinical") {
    return `# 감염성 설사
@english Infectious Diarrhea

01 원인균 추정
01.1 설사의 양상
@염증성 설사
Shigella, Yerisina, Salmonella, Campylobacter, EHEC, EIEC
@비염증성 설사
Vibrio cholerae, Clostridium perfringens, Bacillus cereus`;
  }

  if (moduleId === "drugs") {
    return `# 엽산 합성 저해제
@english Folate Synthesis Inhibitors 

01 Sulfonamides
@mech
PABA 구조 유사체로 DHPS(Dihydropteroate synthase)에 경쟁적 결합
@side
알레르기 반응(발진 등), 혈액학적 이상, 결정뇨 및 신장 손상 가능

## Sulfisoxazole
@indi
급성 요로감염, 소아 시럽제
@memo
수용성이 높아 결정뇨/신장 손상 부작용이 비교적 적음`;
  }

  return `# 그람양성구균
@english Gram-Positive Cocci

01 Catalase (+)
01.1 Staphylococcus spp.
01.1.1 Coagulase (+)
## Staphylococcus aureus
@o2 facultative anaerobe`;
}

function syntaxDescription(moduleId: ModuleId) {
  if (
    moduleId === "clinical" ||
    moduleId === "lectures"
  ) {
    return "숫자는 내용의 계층을 나타내고, @key는 현재 계층에 정보 블록을 추가합니다. @tf t/f 문장은 눌러서 정답을 확인하는 T/F 문항으로 표시됩니다.";
  }

  if (moduleId === "drugs") {
    return "숫자는 약물 계열의 분류 계층, ##는 실제 학습 약물입니다. @key는 현재 계층 또는 ## 약물의 정보를 기록합니다.";
  }

  return "숫자는 미생물의 분류 계층, ##는 실제 학습 미생물입니다. 상위 계층의 @특성은 하위 ##에 상속되며 더 가까운 계층의 값이 우선합니다.";
}

function normalizeEditableBlockKey(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_");
}

function TxtSyntaxGuide({
  moduleId,
}: {
  moduleId: ModuleId;
}) {
  return (
    <section className="rounded-[16px] border border-[#dfe8e3] bg-[#f8faf8] p-4">
      <strong className="text-[13px] text-[#4f5c55]">
        TXT 형식 예시
      </strong>
      <p className="mt-1 text-[12px] leading-5 text-[#7b8680]">
        {syntaxDescription(moduleId)}
      </p>
      <pre className="mt-3 overflow-x-auto rounded-[11px] border bg-white p-4 font-mono text-[12px] leading-5 text-[#53615a]">
        {moduleTxtExample(moduleId)}
      </pre>
    </section>
  );
}

type EditableBlockRow = {
  id: string;
  key: string;
  label: string;
};

const SYSTEM_ROW_PALETTE = [
  {
    background: "#fff5f4",
    border: "#f1deda",
    dot: "#c8786f",
  },
  {
    background: "#fff7f0",
    border: "#f1e1d1",
    dot: "#c58a59",
  },
  {
    background: "#fffbea",
    border: "#eee3ba",
    dot: "#b49a43",
  },
  {
    background: "#f5faef",
    border: "#dce9cf",
    dot: "#77965f",
  },
  {
    background: "#f0f9f7",
    border: "#d5e9e4",
    dot: "#5e9587",
  },
  {
    background: "#f1f8fc",
    border: "#d8e8f1",
    dot: "#668da2",
  },
  {
    background: "#f3f5fc",
    border: "#dce1f0",
    dot: "#6b7ea6",
  },
  {
    background: "#f8f3fb",
    border: "#e7dcf0",
    dot: "#8870a0",
  },
];

function systemRowStyle(
  key: string,
  index: number,
) {
  if (key === "memo") {
    return {
      background: "#f5f7f8",
      border: "#dfe5e7",
      dot: "#7d898f",
    };
  }

  if (key === "tf") {
    return {
      background: "#f5f8fb",
      border: "#dce6ed",
      dot: "#5d82a2",
    };
  }

  return SYSTEM_ROW_PALETTE[
    index % SYSTEM_ROW_PALETTE.length
  ];
}

function BlockManager({
  moduleId,
  blockLabels,
  onChangeBlockLabels,
}: {
  moduleId: ModuleId;
  blockLabels: BlockLabelMap;
  onChangeBlockLabels: (next: BlockLabelMap) => void;
}) {
  const systemDefinitions =
    SYSTEM_BLOCK_DEFINITIONS[moduleId];
  const systemKeys = new Set(
    systemDefinitions.map(({ key }) => key),
  );

  const customFromProps = () =>
    Object.entries(blockLabels)
      .filter(([key]) => !systemKeys.has(key))
      .map(([key, label], index) => ({
        id: `custom-${moduleId}-${index}-${key}`,
        key,
        label,
      }));

  const [rows, setRows] =
    useState<EditableBlockRow[]>(
      customFromProps,
    );

  useEffect(() => {
    setRows(customFromProps());
    // System definitions and stored custom blocks are
    // re-initialized only when switching module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  const commitRows = (
    nextRows: EditableBlockRow[],
  ) => {
    setRows(nextRows);

    const next: BlockLabelMap = {};
    for (const definition of systemDefinitions) {
      next[definition.key] = definition.label;
    }

    for (const row of nextRows) {
      const key = normalizeEditableBlockKey(
        row.key,
      );
      const label = row.label.trim();
      if (
        !key ||
        !label ||
        systemKeys.has(key)
      ) {
        continue;
      }
      next[key] = label;
    }

    onChangeBlockLabels(next);
  };

  const patchRow = (
    id: string,
    patch: Partial<
      Pick<EditableBlockRow, "key" | "label">
    >,
  ) => {
    commitRows(
      rows.map((row) =>
        row.id === id
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  const addEntry = () => {
    commitRows([
      ...rows,
      {
        id: `custom-new-${Date.now()}-${rows.length}`,
        key: "",
        label: "새 블록",
      },
    ]);
  };

  const removeEntry = (id: string) => {
    commitRows(
      rows.filter((row) => row.id !== id),
    );
  };

  return (
    <section className="mt-4 rounded-[16px] border bg-white p-3">
      <div>
        <strong className="text-[15px] text-[#4f5c55]">
          시스템 블록
        </strong>
        <p className="mt-1 text-[12px] leading-5 text-[#8b9690]">
          고정 블록은 수정하거나 삭제할 수 없습니다.
        </p>
      </div>

      <div className="mt-3 grid gap-1.5">
        {systemDefinitions.map(
          (definition, index) => {
            const style = systemRowStyle(
              definition.key,
              index,
            );

            return (
              <div
                key={definition.key}
                className="flex min-h-[43px] items-center gap-2.5 rounded-[9px] border px-3"
                style={{
                  background: style.background,
                  borderColor: style.border,
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: style.dot,
                  }}
                />
                <span className="font-mono text-[12px] font-semibold text-[#4f6258]">
                  @{definition.key}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#58645e]">
                  {definition.label}
                </span>
                {definition.functional && (
                  <details className="group relative shrink-0">
                    <summary
                      className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-full border border-[#d8e4eb] bg-white/85 text-[15px] font-semibold text-[#5d7484] [&::-webkit-details-marker]:hidden"
                      title="T/F 문항 사용법"
                      aria-label="T/F 문항 사용법"
                    >
                      ⓘ
                    </summary>
                    <div className="absolute right-0 top-9 z-30 w-[300px] rounded-[12px] border border-[#dce6e1] bg-white p-4 text-left shadow-[0_12px_32px_rgba(24,45,36,0.14)]">
                      <strong className="text-[13px] text-[#33433b]">
                        T/F 문항 사용법
                      </strong>
                      <div className="mt-3 space-y-2 font-mono text-[12px] leading-5 text-[#53615a]">
                        <div>@tf T 문장 → 정답 T</div>
                        <div>@tf F 문장 → 정답 F</div>
                        <div className="pt-1">@tfexp 해설</div>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-[#7c8982]">
                        @tfexp는 바로 앞 T/F 문항의 선택적 해설입니다.
                        한 줄 또는 여러 줄로 작성할 수 있고, 정답 공개 시 T/F와 함께 표시됩니다.
                      </p>
                      <p className="mt-3 text-[11px] leading-5 text-[#7c8982]">
                        영문 key와 T/F 표시는 대소문자를 구분하지 않습니다.
                        예: @Patho = @patho, @TF t = @tf T
                      </p>
                      <p className="mt-2 text-[11px] leading-5 text-[#7c8982]">
                        학습 화면에서는 눌러 정답을 확인하고, 강의 퀴즈에서는 일반 문제와 함께 랜덤 출제하거나 T/F만 선택할 수 있습니다.
                      </p>
                    </div>
                  </details>
                )}
                <span
                  className="shrink-0 text-[12px]"
                  title="시스템 고정"
                  aria-label="시스템 고정"
                >
                  🔒
                </span>
              </div>
            );
          },
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <div>
          <strong className="text-[14px] text-[#4f5c55]">
            개별 블록
          </strong>
          <p className="mt-1 text-[12px] leading-5 text-[#929c97]">
            필요한 블록만 직접 추가합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="shrink-0 rounded-[8px] border border-[#cfe1d8] bg-[#eef6eb] px-2.5 py-2 text-[11px] font-semibold text-[#075f4e]"
        >
          + 블록
        </button>
      </div>

      <div className="mt-2 grid gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_28px] items-center gap-1.5"
          >
            <div className="flex min-w-0 items-center rounded-[8px] border bg-[#fafcfb] pl-2">
              <span className="shrink-0 font-mono text-[12px] text-[#168269]">
                @
              </span>
              <input
                value={row.key}
                onChange={(event) =>
                  patchRow(row.id, {
                    key: event.target.value,
                  })
                }
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 font-mono text-[12px] outline-none"
                aria-label="개별 블록 키"
                placeholder="key"
              />
            </div>

            <input
              value={row.label}
              onChange={(event) =>
                patchRow(row.id, {
                  label: event.target.value,
                })
              }
              className="min-w-0 rounded-[8px] border bg-[#fafcfb] px-2.5 py-2.5 text-[12px] outline-none"
              aria-label="개별 블록 표시명"
              placeholder="표시명"
            />

            <button
              type="button"
              onClick={() =>
                removeEntry(row.id)
              }
              className="grid h-7 w-7 place-items-center rounded-[7px] border border-[#efd4d4] bg-white text-[11px] text-[#9b5555]"
              title="블록 삭제"
            >
              ×
            </button>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-[9px] border border-dashed p-3 text-center text-[11px] leading-5 text-[#929c97]">
            추가한 개별 블록이 없습니다.
          </div>
        )}
      </div>

      <p className="mt-3 text-[10px] leading-4 text-[#a0a9a4]">
        시스템 key와 같은 이름은 개별 블록으로 등록되지 않습니다.
      </p>
    </section>
  );
}

const TXT_COLOR_THEMES: Record<
  ThemeColor,
  { accent: string; soft: string; border: string; glow: string }
> = {
  red: {
    accent: "#c85c63",
    soft: "#fff5f5",
    border: "#ecd7d8",
    glow: "rgba(200,92,99,0.16)",
  },
  yellow: {
    accent: "#b88a22",
    soft: "#fff9ec",
    border: "#eadfbd",
    glow: "rgba(184,138,34,0.16)",
  },
  blue: {
    accent: "#527fcb",
    soft: "#f4f7ff",
    border: "#d7e0ef",
    glow: "rgba(82,127,203,0.16)",
  },
  green: {
    accent: "#168269",
    soft: "#f2f9f4",
    border: "#d4e5dd",
    glow: "rgba(22,130,105,0.15)",
  },
};

function txtColorTheme(color?: ThemeColor) {
  return color ? TXT_COLOR_THEMES[color] : undefined;
}

export default function ContentTreeAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const moduleParam = params.get("module") as ModuleId | null;
  const moduleId: ModuleId =
    moduleParam === "clinical" || moduleParam === "lectures" || moduleParam === "drugs" || moduleParam === "microbiology"
      ? moduleParam
      : "lectures";
  const path = parsePathParam(params.get("path"));
  const requestedFileId = params.get("file");
  const manageMode = true;

  const [tree, setTree] = useState<ContentTree | null>(null);
  const [savedTree, setSavedTree] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>(requestedFileId ?? undefined);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [verifyPromptOpen, setVerifyPromptOpen] =
    useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void readContentTree().then((current) => {
      if (!active) return;
      setTree(current);
      setSavedTree(JSON.stringify(current));
    });
    return () => {
      active = false;
    };
  }, []);

  const module = tree?.modules[moduleId];
  const currentFolder = module && path.length ? findFolderByPath(module, path) : undefined;
  const container = module ? getContainer(module, path) : undefined;
  const trail = module ? getFolderTrail(module, path) : [];

  useEffect(() => {
    if (!container || !manageMode || container.files.length === 0) {
      setSelectedId(undefined);
      return;
    }
    const requested = requestedFileId ? container.files.find((file) => file.id === requestedFileId) : undefined;
    setSelectedId(requested?.id ?? container.files[0]?.id);
  }, [requestedFileId, manageMode, container?.files]);

  const selectedFile = container?.files.find((file) => file.id === selectedId);

  useEffect(() => {
    let active = true;
    if (!selectedFile?.objectPath || drafts[selectedFile.id] !== undefined) {
      return () => {
        active = false;
      };
    }

    void readContentFile(selectedFile.objectPath)
      .then((content) => {
        if (!active) return;
        const cleanContent =
          stripLegacyVerifiedMetadata(content);
        setDrafts((current) => ({
          ...current,
          [selectedFile.id]: cleanContent,
        }));
        setOriginals((current) => ({
          ...current,
          [selectedFile.id]: cleanContent,
        }));
      })
      .catch((error) => {
        if (active) setNotice(error instanceof Error ? error.message : "TXT 읽기 실패");
      });

    return () => {
      active = false;
    };
  }, [selectedFile?.id, selectedFile?.objectPath, drafts]);

  const pendingEdits = useMemo(() => {
    const edits: Record<string, string> = {};
    for (const [id, content] of Object.entries(drafts)) {
      if (originals[id] !== content) edits[id] = content;
    }
    return edits;
  }, [drafts, originals]);

  if (!tree || !module || !container) {
    return <div className="rounded-[16px] border border-dashed bg-white p-8 text-center text-[14px] text-[#7d8781]">콘텐츠 구조 불러오는 중…</div>;
  }

  const replaceModule = (nextModule: ContentModule) => {
    setTree((current) => current ? { ...current, modules: { ...current.modules, [moduleId]: nextModule } } : current);
  };

  const replaceBlockLabels = (blockLabels: BlockLabelMap) => {
    replaceModule({
      ...module,
      blockLabels,
      blockLabelsRevision: module.blockLabelsRevision,
    });
  };

  const replaceContainer = (updater: Parameters<typeof updateContainer>[2]) => {
    replaceModule(updateContainer(module, path, updater));
  };

  const orderedFiles =
    moduleId === "lectures"
      ? [...container.files].sort(compareLectureFiles)
      : container.files;

  const filteredFiles = orderedFiles.filter((file) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${file.name} ${file.meta.title} ${file.meta.professor ?? ""} ${file.meta.date ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  const selectFile = (id: string) => {
    setSelectedId(id);
    router.replace(adminUrl(moduleId, path, { mode: "manage", fileId: id }));
  };

  const createFolder = (values: Record<string, string>) => {
    if (container.files.length > 0) {
      setNotice("이 위치는 TXT 전용입니다. TXT가 있는 위치에는 폴더를 함께 만들 수 없습니다.");
      setModal(null);
      return;
    }
    const name = values.name.trim();
    if (!name) return;
    const folder: ContentFolder = {
      id: makeContentId("folder"),
      name,
      english: values.english.trim(),
      description: values.description.trim(),
      folders: [],
      files: [],
    };
    replaceContainer((current) => ({ ...current, folders: [...current.folders, folder] }));
    setModal(null);
  };

  const editFolder = (folder: ContentFolder, targetPath: string[], values: Record<string, string>) => {
    const name = values.name.trim();
    if (!name) return;
    replaceModule(
      updateFolder(module, targetPath, (current) => ({
        ...current,
        name,
        english: values.english.trim(),
        description: values.description.trim(),
      })),
    );
    setModal(null);
  };

  const deleteFolder = (folder: ContentFolder, targetPath: string[]) => {
    const parentPath = targetPath.slice(0, -1);
    const targetId = targetPath[targetPath.length - 1];
    replaceModule(updateContainer(module, parentPath, (current) => ({ ...current, folders: current.folders.filter((item) => item.id !== targetId) })));
    setModal(null);
    if (targetPath.join("/") === path.join("/")) router.replace(adminUrl(moduleId, parentPath));
  };

  const createFile = (values: Record<string, string>) => {
    if (container.folders.length > 0) {
      setNotice("이 위치는 폴더 전용입니다. 하위 폴더가 있는 위치에는 TXT를 함께 만들 수 없습니다.");
      setModal(null);
      return;
    }
    const raw = values.name.trim();
    if (!raw) return;
    const displayName = ensureTxtName(raw);
    const title = raw.replace(/\.txt$/i, "");
    const id = makeContentId("file");
    const content = createTxtTemplate(moduleId, title);
    const file: ContentFile = {
      id,
      name: displayName,
      meta: {
        ...metadataFromTxt(content, title),
        verified: false,
      },
    };
    replaceContainer((current) => ({ ...current, files: [...current.files, file] }));
    setDrafts((current) => ({ ...current, [id]: content }));
    setOriginals((current) => ({ ...current, [id]: "" }));
    setSelectedId(id);
    setModal(null);
    router.replace(adminUrl(moduleId, path, { mode: "manage", fileId: id }));
  };

  const renameFile = async (file: ContentFile, values: Record<string, string>) => {
    const rawTitle = values.name.trim().replace(/\.txt$/i, "");
    if (!rawTitle) return;

    setNotice("");
    try {
      let currentContent = drafts[file.id];
      if (currentContent === undefined && file.objectPath) {
        currentContent = await readContentFile(file.objectPath);
        setOriginals((current) =>
          current[file.id] === undefined
            ? { ...current, [file.id]: currentContent! }
            : current,
        );
      }
      if (currentContent === undefined) {
        currentContent = createTxtTemplate(moduleId, rawTitle);
        setOriginals((current) =>
          current[file.id] === undefined
            ? { ...current, [file.id]: "" }
            : current,
        );
      }

      const nextContent = replaceTxtTitle(currentContent, rawTitle);
      const nextName = ensureTxtName(rawTitle);
      const nextMeta = {
        ...metadataFromTxt(nextContent, rawTitle),
        verified: file.meta.verified,
        verifiedHash: file.meta.verifiedHash,
      };

      setDrafts((current) => ({ ...current, [file.id]: nextContent }));
      replaceContainer((current) => ({
        ...current,
        files: current.files.map((item) =>
          item.id === file.id
            ? { ...item, name: nextName, meta: nextMeta }
            : item,
        ),
      }));
      setModal(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "TXT 이름 변경 실패");
    }
  };

  const deleteFile = (file: ContentFile) => {
    replaceContainer((current) => ({ ...current, files: current.files.filter((item) => item.id !== file.id) }));
    setDrafts((current) => {
      const next = { ...current };
      delete next[file.id];
      return next;
    });
    setOriginals((current) => {
      const next = { ...current };
      delete next[file.id];
      return next;
    });
    setSelectedId(undefined);
    setModal(null);
    router.replace(adminUrl(moduleId, path, { mode: "manage" }));
  };

  const updateDraft = (
    file: ContentFile,
    content: string,
  ) => {
    const cleanContent =
      stripLegacyVerifiedMetadata(content);

    setDrafts((current) => ({
      ...current,
      [file.id]: cleanContent,
    }));

    const explicitTitle =
      txtTitleFromContent(cleanContent);
    const fallbackTitle =
      file.name.replace(/\.txt$/i, "");
    const parsedMeta =
      metadataFromTxt(cleanContent, fallbackTitle);

    replaceContainer((current) => ({
      ...current,
      files: current.files.map((item) =>
        item.id === file.id
          ? {
              ...item,
              name: explicitTitle
                ? ensureTxtName(explicitTitle)
                : item.name,
              meta: {
                ...parsedMeta,
                verified: item.meta.verified,
                verifiedHash:
                  item.meta.verifiedHash,
              },
            }
          : item,
      ),
    }));
  };

  const performSave = async (
    selectedVerifiedChoice?: boolean,
  ) => {
    if (saving) return;

    setSaving(true);
    setNotice("");

    try {
      const cleanEdits: Record<string, string> = {};

      for (const [id, value] of Object.entries(
        pendingEdits,
      )) {
        cleanEdits[id] =
          stripLegacyVerifiedMetadata(value);
      }

      let nextTree = tree;
      const editedIds = new Set(
        Object.keys(cleanEdits),
      );

      if (editedIds.size > 0) {
        const nextModule = updateContainer(
          tree.modules[moduleId],
          path,
          (current) => ({
            ...current,
            files: current.files.map((file) => {
              if (!editedIds.has(file.id)) {
                return file;
              }

              const editedContent =
                cleanEdits[file.id];
              const appliesChoice =
                file.id === selectedFile?.id &&
                typeof selectedVerifiedChoice ===
                  "boolean";
              const isVerified =
                appliesChoice
                  ? selectedVerifiedChoice
                  : false;

              return {
                ...file,
                meta: {
                  ...file.meta,
                  ...metadataFromTxt(
                    editedContent,
                    file.name.replace(
                      /\.txt$/i,
                      "",
                    ),
                  ),
                  verified: isVerified,
                  verifiedHash: isVerified
                    ? contentFingerprint(
                        editedContent,
                      )
                    : undefined,
                },
              };
            }),
          }),
        );

        nextTree = {
          ...tree,
          modules: {
            ...tree.modules,
            [moduleId]: nextModule,
          },
        };
      }

      const result = await writeContentTree(
        nextTree,
        cleanEdits,
      );

      setTree(result.tree);
      setSavedTree(JSON.stringify(result.tree));
      setOriginals((current) => ({
        ...current,
        ...cleanEdits,
      }));
      setDrafts((current) => ({
        ...current,
        ...cleanEdits,
      }));

      setNotice(
        `저장 완료 · TXT ${
          result.uploadedFileCount ?? 0
        }개 업로드`,
      );
      window.setTimeout(
        () => setNotice(""),
        2400,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "저장 실패",
      );
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (saving) return;

    const selectedTxtChanged =
      Boolean(
        selectedFile &&
          pendingEdits[selectedFile.id] !==
            undefined,
      );

    if (selectedTxtChanged) {
      setVerifyPromptOpen(true);
      return;
    }

    await performSave();
  };

  const currentTitle = currentFolder?.name ?? module.title;
  const currentEnglish = currentFolder?.english || module.english;
  const currentDescription = currentFolder?.description || module.description;
  const kind = getContainerKind(container);
  const parentAdminHref = path.length
    ? adminUrl(moduleId, path.slice(0, -1), { mode: "manage" })
    : "/admin";
  const currentViewHref = viewUrl(moduleId, path, selectedFile?.id);
  const compactActionClass = "inline-flex h-8 min-w-[48px] items-center justify-center rounded-[8px] border bg-white px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] [font-family:inherit]";
  const compactDangerClass = `${compactActionClass} border-[#efd4d4] text-[#9b5555]`;

  const breadcrumbs = (
    <nav className="flex flex-wrap items-center gap-2 text-[13px] text-[#7d8781]">
      <Link href="/">MediTree</Link><span>›</span><Link href="/admin">관리자</Link><span>›</span>
      <Link href={adminUrl(moduleId, [], { mode: "manage" })}>{module.title}</Link>
      {trail.map((folder, index) => (
        <span key={folder.id} className="contents">
          <span>›</span>
          <Link href={adminUrl(moduleId, path.slice(0, index + 1), { mode: "manage" })}>{folder.name}</Link>
        </span>
      ))}
      <><span>›</span><span>콘텐츠 관리</span></>
    </nav>
  );


  return (
    <>
      <header className="mb-7">
        {breadcrumbs}
        <p className="mt-9 text-[13px] font-bold tracking-[0.12em] text-[#168269]">CONTENT ADMIN · {currentEnglish}</p>
        <h1 className="mt-2 text-[clamp(36px,5vw,48px)] font-bold tracking-[-0.05em]">{currentTitle}</h1>
        <p className="mt-3 min-h-[24px] text-[14px] text-[#748079]">{currentDescription}</p>
      </header>

      {(kind === "folders" || kind === "mixed") && (
        <>
          <section className="mb-5 flex flex-wrap items-center gap-2">
            {kind === "folders" && (
              <button
                type="button"
                onClick={() => setModal({ type: "addFolder" })}
                className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[13px] font-semibold text-[#075f4e]"
              >
                + 폴더
              </button>
            )}
            {kind === "mixed" && (
              <span className="rounded-[9px] border border-[#efd4d4] bg-[#fff7f7] px-3 py-2 text-[12px] leading-5 text-[#9b5555]">
                폴더와 TXT가 혼합되어 있습니다. 한 종류만 남긴 뒤 저장해주세요.
              </span>
            )}
          </section>

          <section className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
            {container.folders.map((folder, index) => (
              <article key={folder.id} className="relative rounded-[16px] border bg-white p-4">
                <Link
                  href={adminUrl(moduleId, [...path, folder.id], { mode: "manage" })}
                  className="absolute right-4 top-4 inline-flex h-8 items-center rounded-[8px] border border-[#cfe1d8] bg-[#eef6eb] px-2.5 text-[11px] font-semibold leading-none text-[#075f4e]"
                >
                  콘텐츠 관리 →
                </Link>
                <div className="block min-h-[100px] pr-[132px] max-[620px]:pr-0 max-[620px]:pt-10">
                  <span className="text-[11px] font-bold tracking-[0.1em] text-[#168269]">{folder.english || "FOLDER"}</span>
                  <h2 className="mt-3 text-[18px] font-semibold">{folder.name}</h2>
                  {folder.description && (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#7a8580]">{folder.description}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => replaceContainer((current) => ({ ...current, folders: move(current.folders, index, -1) }))}
                    className={`${compactActionClass} disabled:opacity-30`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === container.folders.length - 1}
                    onClick={() => replaceContainer((current) => ({ ...current, folders: move(current.folders, index, 1) }))}
                    className={`${compactActionClass} disabled:opacity-30`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "editFolder", folder, targetPath: [...path, folder.id] })}
                    className={compactActionClass}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ type: "deleteFolder", folder, targetPath: [...path, folder.id] })}
                    className={compactDangerClass}
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {kind === "empty" && (
        <>
          <section className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModal({ type: "addFolder" })}
              className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[13px] font-semibold text-[#075f4e]"
            >
              + 폴더
            </button>
            <button
              type="button"
              onClick={() => setModal({ type: "addFile" })}
              className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[13px] font-semibold text-[#075f4e]"
            >
              + TXT
            </button>
            <span className="ml-1 text-[12px] text-[#84908a]">처음 선택한 종류로 이 위치의 구조가 고정됩니다.</span>
          </section>

          <div className="rounded-[16px] border border-dashed bg-white p-10 text-center text-[14px] text-[#7d8781]">
            아직 내용이 없습니다. 이 위치를 하위 폴더 구조로 만들지, TXT 목록으로 만들지 선택하세요.
          </div>
        </>
      )}

      {(kind === "files" || (kind === "mixed" && container.files.length > 0)) && (
        <section className={`grid min-w-0 grid-cols-[300px_minmax(0,1fr)] items-start gap-4 max-[860px]:grid-cols-1 ${kind === "mixed" ? "mt-4" : ""}`}>
          <aside className="min-w-0 self-start">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {kind === "files" && (
                <button
                  type="button"
                  onClick={() => setModal({ type: "addFile" })}
                  className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[13px] font-semibold text-[#075f4e]"
                >
                  + TXT
                </button>
              )}
              {kind === "mixed" && (
                <span className="w-full rounded-[9px] border border-[#efd4d4] bg-[#fff7f7] px-3 py-2 text-[12px] leading-5 text-[#9b5555]">
                  폴더와 TXT가 혼합되어 있습니다. 한 종류만 남긴 뒤 저장해주세요.
                </span>
              )}
            </div>

            <div className="min-w-0 rounded-[16px] border bg-white p-3">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <strong className="text-[14px]">TXT</strong>
                <span className="text-[12px] text-[#8b9590]">{container.files.length}개</span>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이 폴더에서 검색"
                className="mb-3 h-11 w-full rounded-[10px] border bg-[#fafcfb] px-3 text-[14px] outline-none"
              />
              <div className="grid gap-1.5">
                {filteredFiles.map((file, displayIndex) => {
                  const actualIndex = container.files.findIndex(
                    (item) => item.id === file.id,
                  );
                  const colorTheme = txtColorTheme(file.meta.color);
                  const selected = file.id === selectedId;
                  return (
                    <div
                      key={file.id}
                      className="overflow-hidden rounded-[10px] border"
                      style={{
                        background: selected ? colorTheme?.soft ?? "#f4f6f5" : "#fafcfb",
                        borderColor: selected ? colorTheme?.border ?? "#dfe6e2" : "transparent",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => selectFile(file.id)}
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {colorTheme && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background: colorTheme.accent,
                                boxShadow: `0 0 9px 2px ${colorTheme.glow}`,
                              }}
                            />
                          )}
                          <span className="min-w-0 truncate text-[13px] font-semibold">{file.name}</span>
                        </span>
                        <span
                          className="text-[11px]"
                          style={{ color: colorTheme?.accent ?? "#9aa39e" }}
                        >
                          {displayIndex + 1}
                        </span>
                      </button>
                      {selected && (
                        <div
                          className="flex flex-wrap gap-1 border-t px-2 py-2"
                          style={{ borderColor: colorTheme?.border ?? "#dfe6e2" }}
                        >
                          {moduleId !== "lectures" && (
                            <>
                              <button
                                type="button"
                                disabled={actualIndex === 0}
                                onClick={() =>
                                  replaceContainer((current) => ({
                                    ...current,
                                    files: move(
                                      current.files,
                                      actualIndex,
                                      -1,
                                    ),
                                  }))
                                }
                                className="inline-flex h-7 items-center justify-center rounded-[7px] border bg-white px-2 text-[11px] font-medium leading-none disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={
                                  actualIndex ===
                                  container.files.length - 1
                                }
                                onClick={() =>
                                  replaceContainer((current) => ({
                                    ...current,
                                    files: move(
                                      current.files,
                                      actualIndex,
                                      1,
                                    ),
                                  }))
                                }
                                className="inline-flex h-7 items-center justify-center rounded-[7px] border bg-white px-2 text-[11px] font-medium leading-none disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setModal({ type: "renameFile", file })}
                            className="inline-flex h-7 items-center justify-center rounded-[7px] border bg-white px-2 text-[11px] font-medium leading-none"
                          >
                            이름 수정
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ type: "deleteFile", file })}
                            className="inline-flex h-7 items-center justify-center rounded-[7px] border border-[#efd4d4] bg-white px-2 text-[11px] font-medium leading-none text-[#9b5555]"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredFiles.length === 0 && <div className="py-8 text-center text-[12px] text-[#9aa39e]">TXT 없음</div>}
              </div>
            </div>

            <BlockManager
              moduleId={moduleId}
              blockLabels={module.blockLabels}
              onChangeBlockLabels={replaceBlockLabels}
            />
          </aside>

          <div className="min-w-0 space-y-4">
            <TxtSyntaxGuide
              moduleId={moduleId}
            />

            <div
              className="min-w-0 overflow-hidden rounded-[16px] border bg-white"
              style={{
                borderColor: selectedFile
                  ? txtColorTheme(selectedFile.meta.color)?.border ?? "#dfe6e2"
                  : "#dfe6e2",
              }}
            >
              {selectedFile ? (
                <>
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
                    style={{
                      borderColor: txtColorTheme(selectedFile.meta.color)?.border ?? "#dfe6e2",
                      background: txtColorTheme(selectedFile.meta.color)?.soft ?? "#ffffff",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#89938d]">
                        {[module.title, ...trail.map((item) => item.name)].join(" / ")}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-2.5">
                        {txtColorTheme(selectedFile.meta.color) && (
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              background: txtColorTheme(selectedFile.meta.color)!.accent,
                              boxShadow: `0 0 10px 2px ${txtColorTheme(selectedFile.meta.color)!.glow}`,
                            }}
                          />
                        )}
                        <h2 className="truncate text-[18px] font-bold">{selectedFile.name}</h2>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const content =
                          stripLegacyVerifiedMetadata(
                            drafts[selectedFile.id] ?? "",
                          );
                        const blob = new Blob(
                          [content],
                          {
                            type: "text/plain;charset=utf-8",
                          },
                        );
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = selectedFile.name;
                        anchor.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[13px] font-semibold text-[#075f4e]"
                    >
                      Export TXT ↓
                    </button>
                  </div>
                  <textarea
                    value={drafts[selectedFile.id] ?? ""}
                    onChange={(event) => updateDraft(selectedFile, event.target.value)}
                    spellCheck={false}
                    className="min-h-[600px] w-full resize-y bg-white p-5 font-mono text-[15px] leading-7 outline-none max-[720px]:min-h-[500px]"
                  />
                </>
              ) : (
                <div className="grid min-h-[420px] place-items-center p-8 text-center text-[14px] text-[#8b9590]">
                  TXT를 선택하거나 + TXT로 새 파일을 추가하세요.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <AdminActionRail saving={saving} onSave={() => void save()} parentHref={parentAdminHref} viewHref={currentViewHref} />

      {verifyPromptOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-[380px] rounded-[18px] border border-[#dfe6e2] bg-white p-5 shadow-[0_24px_70px_rgba(20,42,32,0.18)]">
            <h3 className="text-[22px] font-bold tracking-[-0.035em]">
              검수 완료?
            </h3>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  setVerifyPromptOpen(false);
                  await performSave(true);
                }}
                className="rounded-[11px] border border-[#bcd9ca] bg-[#eef7f1] px-4 py-3 text-[14px] font-semibold text-[#086653]"
              >
                검수 완료 저장
              </button>

              <button
                type="button"
                onClick={async () => {
                  setVerifyPromptOpen(false);
                  await performSave(false);
                }}
                className="rounded-[11px] border border-[#dfe6e2] bg-white px-4 py-3 text-[14px] font-semibold text-[#46524b]"
              >
                검수 미완료 저장
              </button>

              <button
                type="button"
                onClick={() =>
                  setVerifyPromptOpen(false)
                }
                className="px-4 py-2 text-[13px] font-medium text-[#8a948e]"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <div className="fixed bottom-6 left-1/2 z-[220] max-w-[min(640px,calc(100%-32px))] -translate-x-1/2 rounded-[12px] border bg-white px-4 py-3 text-[13px] font-semibold shadow-[0_12px_34px_rgba(20,38,30,0.12)]">{notice}</div>}

      {modal?.type === "addFolder" && <AdminFormModal title="폴더 추가" fields={[{ key: "name", label: "폴더명", required: true }, { key: "english", label: "영문명" }, { key: "description", label: "회색 설명", multiline: true }]} onClose={() => setModal(null)} onSubmit={createFolder} />}
      {modal?.type === "editFolder" && <AdminFormModal title="폴더 수정" fields={[{ key: "name", label: "폴더명", value: modal.folder.name, required: true }, { key: "english", label: "영문명", value: modal.folder.english }, { key: "description", label: "회색 설명", value: modal.folder.description, multiline: true }]} confirmLabel="수정" onClose={() => setModal(null)} onSubmit={(values) => editFolder(modal.folder, modal.targetPath, values)} />}
      {modal?.type === "deleteFolder" && <AdminFormModal title={`“${modal.folder.name}” 폴더와 내부 내용을 삭제할까요?`} fields={[]} confirmLabel="삭제" danger onClose={() => setModal(null)} onSubmit={() => deleteFolder(modal.folder, modal.targetPath)} />}
      {modal?.type === "addFile" && <AdminFormModal title="TXT 추가" fields={[{ key: "name", label: "파일명", placeholder: "예: 감염성 설사", required: true }]} onClose={() => setModal(null)} onSubmit={createFile} />}
      {modal?.type === "renameFile" && <AdminFormModal title="TXT 이름 변경" fields={[{ key: "name", label: "파일명", value: modal.file.name.replace(/\.txt$/i, ""), required: true }]} onClose={() => setModal(null)} onSubmit={(values) => { void renameFile(modal.file, values); }} />}
      {modal?.type === "deleteFile" && <AdminFormModal title={`“${modal.file.name}”을 삭제할까요?`} fields={[]} confirmLabel="삭제" danger onClose={() => setModal(null)} onSubmit={() => deleteFile(modal.file)} />}
    </>
  );
}
