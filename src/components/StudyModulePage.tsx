"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ViewActionRail } from "@/components/ActionRail";
import StudyShell from "@/components/StudyShell";
import UniversalDocument, {
  DocumentQuiz,
  EntityRecallQuiz,
  LectureRandomQuiz,
  type QuizSource,
} from "@/components/UniversalDocument";
import useContentTree, { readContentFile } from "@/components/useContentTree";
import {
  MODULE_HREFS,
  findFolderByPath,
  getContainer,
  getFolderTrail,
  parsePathParam,
  pathParam,
  type BlockLabelMap,
  type ContentFile,
  type ContentFolder,
  type ModuleId,
  type ThemeColor,
} from "@/lib/content-model";
import {
  compareLectureFiles,
  contentFingerprint,
  parseLectureDate,
  parseUniversalTxt,
} from "@/lib/universal-txt";

const LED: Record<ThemeColor, { color: string; glow: string }> = {
  red: { color: "#d55d66", glow: "rgba(213,93,102,0.30)" },
  yellow: { color: "#d9aa35", glow: "rgba(217,170,53,0.30)" },
  blue: { color: "#5d8fe0", glow: "rgba(93,143,224,0.30)" },
  green: { color: "#55ae76", glow: "rgba(85,174,118,0.28)" },
};

function pathHref(moduleId: ModuleId, path: string[], fileId?: string) {
  const params = new URLSearchParams();
  if (path.length) params.set("path", pathParam(path));
  if (fileId) params.set("file", fileId);
  const query = params.toString();
  return `${MODULE_HREFS[moduleId]}${query ? `?${query}` : ""}`;
}

function adminHref(moduleId: ModuleId, path: string[], fileId?: string) {
  const params = new URLSearchParams({ module: moduleId });
  if (path.length) params.set("path", pathParam(path));
  if (fileId) {
    params.set("mode", "manage");
    params.set("file", fileId);
  }
  return `/admin/content?${params.toString()}`;
}

function folderSearchText(folder: { name: string; english: string; description: string }) {
  return `${folder.name} ${folder.english} ${folder.description}`.toLowerCase();
}

function fileSearchText(file: ContentFile) {
  return `${file.name} ${file.meta.title} ${file.meta.english ?? ""} ${file.meta.professor ?? ""} ${file.meta.date ?? ""}`.toLowerCase();
}

function FolderCard({ href, english, title, description, index }: { href: string; english: string; title: string; description: string; index: number }) {
  return (
    <Link href={href} className="flex min-h-[178px] flex-col justify-between rounded-[20px] border border-[#dfe6e2] bg-white p-6 shadow-[0_9px_24px_rgba(20,42,32,0.035)] transition hover:-translate-y-0.5 hover:border-[#cbd8cf]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-[12px] font-normal tracking-[0.11em] text-[#168269]">{english || "FOLDER"}</span>
          <span className="font-mono text-[12px] font-semibold text-[#9aa39e]">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <h2 className="mt-7 text-[23px] font-semibold tracking-[-0.035em]">{title}</h2>
        {description && <p className="mt-3 line-clamp-2 text-[14px] leading-6 text-[#7a8580]">{description}</p>}
      </div>
      <span className="self-end text-[23px] text-[#075f4e]">→</span>
    </Link>
  );
}

function FileCard({ href, file, index }: { href: string; file: ContentFile; index: number }) {
  return (
    <Link href={href} className="flex min-h-[178px] flex-col justify-between rounded-[20px] border border-[#dfe6e2] bg-white p-6 shadow-[0_9px_24px_rgba(20,42,32,0.035)] transition hover:-translate-y-0.5 hover:border-[#cbd8cf]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-[12px] font-bold tracking-[0.11em] text-[#168269]">{file.meta.english || "TXT"}</span>
          <span className="font-mono text-[12px] font-semibold text-[#9aa39e]">{String(index + 1).padStart(2, "0")}</span>
        </div>
        <h2 className="mt-7 text-[22px] font-semibold tracking-[-0.035em]">{file.meta.title}</h2>
      </div>
      <span className="self-end text-[23px] text-[#075f4e]">→</span>
    </Link>
  );
}

function LectureRow({ href, file }: { href: string; file: ContentFile }) {
  const led = file.meta.color ? LED[file.meta.color] : { color: "#9aa39e", glow: "rgba(154,163,158,0.12)" };
  return (
    <Link href={href} className="flex min-h-[72px] items-center justify-between gap-5 rounded-[15px] border border-[#dfe6e2] bg-white px-5 py-3 shadow-[0_7px_20px_rgba(20,42,32,0.03)] transition hover:border-[#cbd8cf]">
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="h-[9px] w-[9px] shrink-0 rounded-full" style={{ background: led.color, boxShadow: `0 0 12px 3px ${led.glow}` }} />
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <strong className="truncate text-[16px] font-semibold">{file.meta.title}</strong>
          {file.meta.professor && <span className="text-[14px] text-[#7c8781]">{file.meta.professor}</span>}
        </div>
      </div>
      <span className="shrink-0 text-[21px]" style={{ color: led.color }}>→</span>
    </Link>
  );
}

type QuizFileRef = { id: string; file: ContentFile };
type QuizScope = { id: string; label: string; detail: string; files: QuizFileRef[] };

function collectFolderQuizFiles(folder: ContentFolder): QuizFileRef[] {
  const output: QuizFileRef[] = folder.files.map((file) => ({ id: file.id, file }));
  for (const child of folder.folders) output.push(...collectFolderQuizFiles(child));
  return output;
}

function buildQuizScopes(folders: ContentFolder[], files: ContentFile[]): QuizScope[] {
  const scopes: QuizScope[] = [];
  for (const folder of folders) {
    const folderFiles = collectFolderQuizFiles(folder);
    if (!folderFiles.length) continue;
    scopes.push({ id: `folder:${folder.id}`, label: folder.name, detail: `${folderFiles.length} TXT`, files: folderFiles });
  }
  for (const file of files) {
    scopes.push({ id: `file:${file.id}`, label: file.meta.title || file.name, detail: "1 TXT", files: [{ id: file.id, file }] });
  }
  return scopes;
}

function QuizModeTabs({ mode, setMode }: { mode: "study" | "quiz"; setMode: (next: "study" | "quiz") => void }) {
  return (
    <div className="mb-4 flex gap-2">
      <button type="button" onClick={() => setMode("study")} className={`rounded-[10px] border px-4 py-2 text-[13px] font-semibold ${mode === "study" ? "border-[#bcd8cd] bg-[#eef6eb] text-[#075f4e]" : "bg-white"}`}>학습</button>
      <button type="button" onClick={() => setMode("quiz")} className={`rounded-[10px] border px-4 py-2 text-[13px] font-semibold ${mode === "quiz" ? "border-[#bcd8cd] bg-[#eef6eb] text-[#075f4e]" : "bg-white"}`}>퀴즈</button>
    </div>
  );
}

function ScopeQuizPanel({
  moduleId,
  blockLabels,
  customBlockOrder,
  scopes,
  searchQuery,
}: {
  moduleId: "lectures" | "drugs" | "microbiology";
  blockLabels: BlockLabelMap;
  customBlockOrder: string[];
  scopes: QuizScope[];
  searchQuery: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [sources, setSources] = useState<QuizSource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lectureQuestionMode, setLectureQuestionMode] =
    useState<"all" | "tf">("all");
  const signature = scopes.map((scope) => scope.id).join("|");

  useEffect(() => {
    setSelectedIds(new Set(scopes.map((scope) => scope.id)));
    setSources(null);
    setError("");
  }, [signature]);

  const q = searchQuery.trim().toLowerCase();
  const visibleScopes = useMemo(() => scopes.filter((scope) => !q || `${scope.label} ${scope.detail}`.toLowerCase().includes(q)), [scopes, q]);
  const selectedScopes = scopes.filter((scope) => selectedIds.has(scope.id));
  const selectedFiles = useMemo(() => {
    const byId = new Map<string, QuizFileRef>();
    for (const scope of selectedScopes) for (const fileRef of scope.files) byId.set(fileRef.id, fileRef);
    return [...byId.values()];
  }, [selectedScopes]);

  const resetLoadedQuiz = () => { setSources(null); setError(""); };
  const toggleScope = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    resetLoadedQuiz();
  };
  const selectAll = () => { setSelectedIds(new Set(scopes.map((scope) => scope.id))); resetLoadedQuiz(); };
  const clearAll = () => { setSelectedIds(new Set()); resetLoadedQuiz(); };

  const changeLectureQuestionMode = (
    next: "all" | "tf",
  ) => {
    setLectureQuestionMode(next);
    resetLoadedQuiz();
  };

  const startQuiz = async () => {
    if (!selectedFiles.length || loading) return;
    setLoading(true); setError(""); setSources(null);
    try {
      const loaded = await Promise.all(selectedFiles.map(async (fileRef) => {
        if (!fileRef.file.objectPath) return null;
        const content = await readContentFile(fileRef.file.objectPath);
        const parsed = parseUniversalTxt(content, blockLabels);
        return { id: fileRef.file.id, title: parsed.title || fileRef.file.meta.title || fileRef.file.name, parsed } satisfies QuizSource;
      }));
      setSources(loaded.filter((item): item is QuizSource => Boolean(item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "퀴즈 범위를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!scopes.length) return <div className="rounded-[16px] border border-dashed bg-white p-10 text-center text-[14px] text-[#7d8781]">퀴즈에 포함할 TXT가 없습니다.</div>;

  return (
    <div className="grid gap-4">
      <section className="rounded-[18px] border border-[#dfe6e2] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold">퀴즈 범위</h2>
            <p className="mt-1 text-[13px] leading-5 text-[#7d8781]">
              {moduleId === "lectures"
                ? "여러 강의를 동시에 선택한 뒤 출제 유형을 전체 또는 T/F만으로 정할 수 있습니다. 퀴즈 시작 후에도 유형을 바꿀 수 있습니다."
                : "여러 범위를 동시에 선택할 수 있습니다. 선택 범위의 모든 ## 항목을 한 문제씩 섞어서 출제합니다."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={selectAll} className="rounded-[9px] border bg-white px-3 py-2 text-[12px] font-semibold">전체 선택</button>
            <button type="button" onClick={clearAll} className="rounded-[9px] border bg-white px-3 py-2 text-[12px] font-semibold">전체 해제</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
          {visibleScopes.map((scope) => {
            const checked = selectedIds.has(scope.id);
            return (
              <label key={scope.id} className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 ${checked ? "border-[#bfd8ce] bg-[#f0f7ed]" : "bg-[#fafcfb]"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleScope(scope.id)} className="h-4 w-4 accent-[#075f4e]" />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px]">{scope.label}</strong>
                  <span className="mt-0.5 block text-[11px] text-[#8a948f]">{scope.detail}</span>
                </span>
              </label>
            );
          })}
        </div>

        {visibleScopes.length === 0 && <div className="mt-4 rounded-[12px] border border-dashed p-6 text-center text-[13px] text-[#8a948f]">검색되는 퀴즈 범위가 없습니다.</div>}

        {moduleId === "lectures" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <strong className="text-[13px] font-semibold text-[#4f5c55]">
                출제 유형
              </strong>
              <p className="mt-0.5 text-[11px] text-[#8a948f]">
                선택한 강의 범위에서 어떤 문제를 출제할지 정합니다.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-[10px] border border-[#dfe6e2] bg-[#fafcfb] p-1">
              <button
                type="button"
                onClick={() =>
                  changeLectureQuestionMode("all")
                }
                className={`rounded-[7px] px-3.5 py-2 text-[12px] font-semibold ${
                  lectureQuestionMode === "all"
                    ? "bg-white text-[#075f4e] shadow-sm"
                    : "text-[#7f8a84]"
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() =>
                  changeLectureQuestionMode("tf")
                }
                className={`rounded-[7px] px-3.5 py-2 text-[12px] font-semibold ${
                  lectureQuestionMode === "tf"
                    ? "bg-white text-[#075f4e] shadow-sm"
                    : "text-[#7f8a84]"
                }`}
              >
                T/F만
              </button>
            </div>
          </div>
        )}

        <div className={`mt-4 flex flex-wrap items-center gap-3 ${
          moduleId === "lectures"
            ? ""
            : "border-t pt-4"
        }`}>
          <button type="button" disabled={!selectedFiles.length || loading} onClick={startQuiz} className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[14px] font-semibold text-[#075f4e] disabled:cursor-not-allowed disabled:opacity-40">
            {loading
              ? "불러오는 중…"
              : moduleId === "lectures" &&
                  lectureQuestionMode === "tf"
                ? "선택 범위로 T/F 퀴즈 시작"
                : "선택 범위로 퀴즈 시작"}
          </button>
          <span className="text-[12px] text-[#87918c]">선택 {selectedIds.size}범위 · {selectedFiles.length} TXT</span>
        </div>

        {error && <div className="mt-4 rounded-[11px] border border-[#efd1d1] bg-[#fff6f6] p-3 text-[13px] text-[#9a4f4f]">{error}</div>}
      </section>

      {sources &&
        (moduleId === "lectures" ? (
          <LectureRandomQuiz
            sources={sources}
            initialQuestionMode={lectureQuestionMode}
          />
        ) : (
          <EntityRecallQuiz
            sources={sources}
            moduleId={moduleId}
            customBlockOrder={customBlockOrder}
          />
        ))}
    </div>
  );
}

export default function StudyModulePage({ moduleId }: { moduleId: ModuleId }) {
  const params = useSearchParams();
  const tree = useContentTree();
  const module = tree.modules[moduleId];
  const path = parsePathParam(params.get("path"));
  const fileId = params.get("file");
  const trail = getFolderTrail(module, path);
  const currentFolder = path.length ? findFolderByPath(module, path) : undefined;
  const container = getContainer(module, path);
  const selectedFile = container?.files.find((file) => file.id === fileId);

  const [query, setQuery] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"study" | "quiz">("study");
  const quizModuleId =
    moduleId === "lectures" ||
    moduleId === "drugs" ||
    moduleId === "microbiology"
      ? moduleId
      : null;
  const isQuizModule = Boolean(quizModuleId);
  const entityQuizModuleId =
    moduleId === "drugs" ||
    moduleId === "microbiology"
      ? moduleId
      : null;

  useEffect(() => { setQuery(""); setMode("study"); }, [moduleId, pathParam(path), fileId]);

  useEffect(() => {
    let active = true;
    setLoadError("");
    if (!selectedFile?.objectPath) {
      setContent(null);
      return () => { active = false; };
    }
    setContent(null);
    void readContentFile(selectedFile.objectPath)
      .then((value) => { if (active) setContent(value); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "TXT를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, [selectedFile?.objectPath]);

  const q = query.trim().toLowerCase();
  const folders = useMemo(() => (container?.folders ?? []).filter((folder) => !q || folderSearchText(folder).includes(q)), [container?.folders, q]);
  const files = useMemo(() => {
    const filtered = (container?.files ?? []).filter((file) => !q || fileSearchText(file).includes(q));
    return moduleId === "lectures" ? [...filtered].sort(compareLectureFiles) : filtered;
  }, [container?.files, moduleId, q]);
  const quizScopes = useMemo(() => isQuizModule ? buildQuizScopes(container?.folders ?? [], container?.files ?? []) : [], [isQuizModule, container?.folders, container?.files]);

  const folderBreadcrumbs = [
    { label: module.title, href: path.length ? MODULE_HREFS[moduleId] : undefined },
    ...trail.map((folder, index) => ({ label: folder.name, href: index === trail.length - 1 ? undefined : pathHref(moduleId, path.slice(0, index + 1)) })),
  ];
  const fileBreadcrumbs = [
    { label: module.title, href: MODULE_HREFS[moduleId] },
    ...trail.map((folder, index) => ({ label: folder.name, href: pathHref(moduleId, path.slice(0, index + 1)) })),
  ];

  if (selectedFile) {
    const parsed = content ? parseUniversalTxt(content, module.blockLabels) : null;
    const metaParts: string[] = [];
    if (selectedFile.meta.professor) metaParts.push(selectedFile.meta.professor);
    if (selectedFile.meta.date) metaParts.push(parseLectureDate(selectedFile.meta.date)?.label ?? selectedFile.meta.date);

    return (
      <>
        <StudyShell
          breadcrumbs={fileBreadcrumbs}
          eyebrow={selectedFile.meta.english || currentFolder?.english || module.english}
          title={selectedFile.meta.title}
          verified={
            content !== null &&
            (
              (
                selectedFile.meta.verified === true &&
                Boolean(
                  selectedFile.meta.verifiedHash,
                ) &&
                selectedFile.meta.verifiedHash ===
                  contentFingerprint(content)
              ) ||
              parsed?.legacyVerified === true
            )
          }
          meta={metaParts.length ? metaParts.join("  ·  ") : currentFolder?.description || module.description}
          search={{ value: query, onChange: setQuery, placeholder: "이 TXT 안에서 검색" }}
          accent={selectedFile.meta.color ?? "green"}
        >
          {isQuizModule && parsed && <QuizModeTabs mode={mode} setMode={setMode} />}
          {loadError ? (
            <div className="rounded-[15px] border border-[#efd1d1] bg-[#fff6f6] p-6 text-[14px] text-[#9a4f4f]">{loadError}</div>
          ) : content === null ? (
            <div className="rounded-[15px] border border-dashed bg-white p-8 text-center text-[14px] text-[#7d8781]">TXT 불러오는 중…</div>
          ) : mode === "quiz" && parsed && isQuizModule ? (
            moduleId === "lectures" ? (
              <LectureRandomQuiz
                sources={[
                  {
                    id: selectedFile.id,
                    title: parsed.title,
                    parsed,
                  },
                ]}
              />
            ) : (
              <DocumentQuiz
                parsed={parsed}
                moduleId={entityQuizModuleId!}
                customBlockOrder={
                  module.customBlockOrder
                }
              />
            )
          ) : (
            <UniversalDocument
              content={content}
              query={query}
              blockLabels={module.blockLabels}
              moduleId={moduleId}
              customBlockOrder={
                module.customBlockOrder
              }
            />
          )}
        </StudyShell>
        <ViewActionRail parentHref={pathHref(moduleId, path)} adminHref={adminHref(moduleId, path, selectedFile.id)} />
      </>
    );
  }

  const pageTitle = currentFolder?.name ?? module.title;
  const pageEnglish = currentFolder?.english || module.english;
  const pageDescription = currentFolder?.description || module.description;
  const parentHref = path.length ? pathHref(moduleId, path.slice(0, -1)) : "/";

  return (
    <>
      <StudyShell
        breadcrumbs={folderBreadcrumbs}
        eyebrow={pageEnglish}
        title={pageTitle}
        meta={pageDescription}
        search={{ value: query, onChange: setQuery, placeholder: mode === "quiz" && isQuizModule ? "퀴즈 범위 검색" : "폴더 · TXT · 제목 검색" }}
      >
        {isQuizModule && <QuizModeTabs mode={mode} setMode={setMode} />}

        {isQuizModule && mode === "quiz" ? (
          <ScopeQuizPanel
            moduleId={quizModuleId!}
            blockLabels={module.blockLabels}
            customBlockOrder={
              module.customBlockOrder
            }
            scopes={quizScopes}
            searchQuery={query}
          />
        ) : (
          <>
            {folders.length > 0 && (
              <section className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
                {folders.map((folder, index) => <FolderCard key={folder.id} href={pathHref(moduleId, [...path, folder.id])} english={folder.english} title={folder.name} description={folder.description} index={index} />)}
              </section>
            )}
            {files.length > 0 && (
              <section className={folders.length ? "mt-4" : ""}>
                {moduleId === "lectures" ? (
                  <div className="grid gap-3">{files.map((file) => <LectureRow key={file.id} href={pathHref(moduleId, path, file.id)} file={file} />)}</div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">{files.map((file, index) => <FileCard key={file.id} href={pathHref(moduleId, path, file.id)} file={file} index={folders.length + index} />)}</div>
                )}
              </section>
            )}
            {folders.length === 0 && files.length === 0 && (
              <div className="rounded-[16px] border border-dashed bg-white p-10 text-center text-[14px] text-[#7d8781]">{q ? "검색 결과가 없습니다." : "아직 등록된 폴더나 TXT가 없습니다."}</div>
            )}
          </>
        )}
      </StudyShell>
      <ViewActionRail parentHref={parentHref} adminHref={adminHref(moduleId, path)} />
    </>
  );
}
