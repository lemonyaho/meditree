"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminActionRail } from "@/components/ActionRail";
import AdminFormModal from "@/components/AdminFormModal";
import { readContentFile, readContentTree, writeContentTree } from "@/components/useContentTree";
import {
  MODULE_HREFS,
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
  createTxtTemplate,
  metadataFromTxt,
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
  if (moduleId === "drugs") {
    return `# 엽산 합성 저해제
@english Folic Acid Synthesis Inhibitor

01 Sulfonamide계열
@mechanism
DHPS(Dihydropteroate synthetase)에 결합해 엽산 합성을 억제

## Sulfamethoxazole
@brand
Bactrim, Septra
@target
Gram +, Gram - bacteria
@indi
하부 요로 감염 등,
@contra
내성균
@side
충분한 수분 섭취 필요`;
  }

  if (moduleId === "microbiology") {
    return `# 그람양성구균
@english Gram-Positive Cocci
@gram +
@morph Coccus

01 Catalase (+)
01.1 Staphylococcus spp.
01.1.1 Coagulase (+)
## Staphylococcus aureus
@o2 facultative anaerobe`;
  }

  if (moduleId === "lectures") {
    return `# 감염성 설사 (TBL)
@english Infectious Diarrhea
@date 26.08.27.23
@prof 김봉영
@color yellow

01 설사
@def
1일 3회 이상 unformed stool

02 원인균 추정
02.1 설사의 양상
@염증성 설사
Shigella, Yerisina, Salmonella, Campylobacter, EHEC, EIEC, Vibrio parahemolyticus, Clostridioides difficile
@비염증성 설사
Vibrio cholerae, Clostridium perfringens, Bacillus cereus, Staphylococcus aureus`;
  }

  return `# 급성 설사
@english Acute Diarrhea

01 정의
@def
1일 3회 이상 unformed stool

02 임상 양상
@sx
복통, 발열, 설사`;
}

function normalizeEditableBlockKey(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "_");
}

function TxtSyntaxGuide({
  moduleId,
  blockLabels,
  onChangeBlockLabels,
}: {
  moduleId: ModuleId;
  blockLabels: BlockLabelMap;
  onChangeBlockLabels: (next: BlockLabelMap) => void;
}) {
  const entries = Object.entries(blockLabels);

  const patchEntry = (
    oldKey: string,
    nextKey: string,
    nextLabel: string,
  ) => {
    const normalizedKey =
      normalizeEditableBlockKey(nextKey);
    const label = nextLabel.trimStart();
    const next: BlockLabelMap = {};

    for (const [key, value] of entries) {
      if (key === oldKey) continue;
      next[key] = value;
    }

    if (normalizedKey) {
      next[normalizedKey] = label;
    }

    onChangeBlockLabels(next);
  };

  const removeEntry = (key: string) => {
    const next = { ...blockLabels };
    delete next[key];
    onChangeBlockLabels(next);
  };

  const addEntry = () => {
    let index = 1;
    let key = "newblock";
    while (blockLabels[key]) {
      index += 1;
      key = `newblock${index}`;
    }

    onChangeBlockLabels({
      ...blockLabels,
      [key]: "새 블록",
    });
  };

  return (
    <section className="rounded-[16px] border border-[#dfe8e3] bg-[#f8faf8] p-4">
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] gap-4 max-[900px]:grid-cols-1">
        <div className="min-w-0">
          <strong className="text-[13px] text-[#4f5c55]">
            TXT 형식 예시
          </strong>
          <p className="mt-1 text-[12px] leading-5 text-[#7b8680]">
            {moduleId === "microbiology"
              ? "숫자는 분류 계층, ##는 실제 학습 미생물입니다. TXT 상단이나 숫자 계층에 둔 @특성은 하위 ##에 자동 상속되고, 더 가까운 계층 또는 ##의 값이 우선합니다."
              : "숫자는 계층, ##는 약물·미생물 개체, @는 현재 계층 또는 ## 개체의 정보 블록입니다."}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-[11px] border bg-white p-3 font-mono text-[12px] leading-5 text-[#53615a]">
            {moduleTxtExample(moduleId)}
          </pre>
        </div>

        <div className="min-w-0 rounded-[12px] border bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <strong className="text-[13px] text-[#4f5c55]">
                등록 블록
              </strong>
              <p className="mt-1 text-[11px] leading-5 text-[#89938d]">
                이 모듈 전체에서 @key가 어떤 이름으로 보일지 정합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="shrink-0 rounded-[8px] border border-[#cfe1d8] bg-[#eef6eb] px-2.5 py-1.5 text-[11px] font-semibold text-[#075f4e]"
            >
              + 블록
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {entries.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-[minmax(90px,0.8fr)_minmax(110px,1fr)_30px] items-center gap-1.5"
              >
                <div className="flex min-w-0 items-center rounded-[8px] border bg-[#fafcfb] pl-2">
                  <span className="shrink-0 font-mono text-[11px] text-[#168269]">
                    @
                  </span>
                  <input
                    value={key}
                    onChange={(event) =>
                      patchEntry(
                        key,
                        event.target.value,
                        label,
                      )
                    }
                    className="min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-[11px] outline-none"
                    aria-label={`${key} 블록 키`}
                  />
                </div>

                <input
                  value={label}
                  onChange={(event) =>
                    patchEntry(
                      key,
                      key,
                      event.target.value,
                    )
                  }
                  className="min-w-0 rounded-[8px] border bg-[#fafcfb] px-2 py-2 text-[11px] outline-none"
                  aria-label={`${key} 표시명`}
                />

                <button
                  type="button"
                  onClick={() => removeEntry(key)}
                  className="grid h-[30px] w-[30px] place-items-center rounded-[8px] border border-[#efd4d4] bg-white text-[12px] text-[#9b5555]"
                  title="블록 삭제"
                >
                  ×
                </button>
              </div>
            ))}

            {entries.length === 0 && (
              <div className="rounded-[9px] border border-dashed p-4 text-center text-[11px] text-[#89938d]">
                등록된 블록이 없습니다. + 블록으로 추가할 수 있습니다.
              </div>
            )}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-[#9aa39e]">
            등록하지 않은 @라벨도 사용할 수 있으며, 그 경우 작성한 라벨이 그대로 표시됩니다.
          </p>
        </div>
      </div>
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
        setDrafts((current) => ({ ...current, [selectedFile.id]: content }));
        setOriginals((current) => ({ ...current, [selectedFile.id]: content }));
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
    const file: ContentFile = { id, name: displayName, meta: metadataFromTxt(content, title) };
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
      const nextMeta = metadataFromTxt(nextContent, rawTitle);

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

  const updateDraft = (file: ContentFile, content: string) => {
    setDrafts((current) => ({ ...current, [file.id]: content }));
    const explicitTitle = txtTitleFromContent(content);
    const fallbackTitle = file.name.replace(/\.txt$/i, "");
    const meta = metadataFromTxt(content, fallbackTitle);
    replaceContainer((current) => ({
      ...current,
      files: current.files.map((item) =>
        item.id === file.id
          ? {
              ...item,
              name: explicitTitle ? ensureTxtName(explicitTitle) : item.name,
              meta,
            }
          : item,
      ),
    }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await writeContentTree(tree, pendingEdits);
      setTree(result.tree);
      setSavedTree(JSON.stringify(result.tree));
      setOriginals((current) => ({ ...current, ...drafts }));
      setNotice(`저장 완료 · TXT ${result.uploadedFileCount ?? 0}개 업로드`);
      window.setTimeout(() => setNotice(""), 2400);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setSaving(false);
    }
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
        <section className={`grid min-w-0 grid-cols-[260px_minmax(0,1fr)] items-start gap-4 max-[860px]:grid-cols-1 ${kind === "mixed" ? "mt-4" : ""}`}>
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
          </aside>

          <div className="min-w-0 space-y-4">
            <TxtSyntaxGuide
              moduleId={moduleId}
              blockLabels={module.blockLabels}
              onChangeBlockLabels={replaceBlockLabels}
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
                        const content = drafts[selectedFile.id] ?? "";
                        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
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
