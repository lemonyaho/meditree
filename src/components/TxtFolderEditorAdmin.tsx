"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminSaveBar from "@/components/AdminSaveBar";
import AdminFormModal from "@/components/AdminFormModal";
import TxtEditor from "@/components/TxtEditor";
import TxtFileList from "@/components/TxtFileList";
import {
  TXT_TEMPLATES,
  cloneDefaultTxtLibrary,
  type TxtFile,
  type TxtFolder,
  compareLectureDates,
  parseLectureDate,
  parseLectureTxt,
  type TxtLibrary,
} from "@/lib/txt-content";
import {
  readTxtLibrary,
  writeTxtLibrary,
} from "@/components/useTxtLibrary";

type Kind = "lectures" | "drugs" | "microbiology";

const LECTURE_LED = {
  red: {
    color: "#ef6b72",
    glow: "rgba(239,107,114,0.35)",
  },
  yellow: {
    color: "#e2b84d",
    glow: "rgba(226,184,77,0.33)",
  },
  blue: {
    color: "#5d8ff0",
    glow: "rgba(93,143,240,0.35)",
  },
  green: {
    color: "#55b978",
    glow: "rgba(85,185,120,0.35)",
  },
} as const;

function safeId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\.txt$/i, "")
      .replace(/[^a-z0-9가-힣β]+/g, "-")
      .replace(/^-|-$/g, "") || `txt-${Date.now()}`
  );
}

function ensureTxt(name: string) {
  return name.toLowerCase().endsWith(".txt")
    ? name
    : `${name}.txt`;
}

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function TxtFolderEditorAdmin({
  kind,
}: {
  kind: Kind;
}) {
  const params = useSearchParams();
  const folderId = params.get("id");
  const requestedFileId = params.get("file");

  const [library, setLibrary] = useState<TxtLibrary>(
    cloneDefaultTxtLibrary(),
  );
  const [saved, setSaved] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    | { type: "addTxt" }
    | { type: "renameFolder" }
    | { type: "renameFile" }
    | null
  >(null);

  useEffect(() => {
    let active = true;

    void readTxtLibrary().then((current) => {
      if (!active) return;

      setLibrary(current);
      setSaved(JSON.stringify(current));

      const folders =
        kind === "lectures"
          ? current.lectures.folders
          : kind === "drugs"
            ? current.drugs.folders
            : current.microbiology.folders;

      const folder = folders.find(
        (item) => item.id === folderId,
      );
      const requestedFile = requestedFileId
        ? folder?.files.find(
            (file) => file.id === requestedFileId,
          )
        : undefined;

      setSelectedId(
        requestedFile?.id ?? folder?.files[0]?.id,
      );
    });

    return () => {
      active = false;
    };
  }, [folderId, kind, requestedFileId]);

  const folders =
    kind === "lectures"
      ? library.lectures.folders
      : kind === "drugs"
        ? library.drugs.folders
        : library.microbiology.folders;

  const folder = folders.find((item) => item.id === folderId);

  const displayedFiles = useMemo(() => {
    if (!folder) return [];

    if (kind !== "lectures") return folder.files;

    return folder.files
      .map((file, originalIndex) => ({
        file,
        originalIndex,
        date: parseLectureTxt(file.content).date,
      }))
      .sort((a, b) => {
        const byDate = compareLectureDates(a.date, b.date);
        return byDate !== 0
          ? byDate
          : a.originalIndex - b.originalIndex;
      })
      .map(({ file }) => file);
  }, [folder, kind]);

  const selectedFile = folder?.files.find(
    (file) => file.id === selectedId,
  );

  const selectedLecture =
    kind === "lectures" && selectedFile
      ? parseLectureTxt(selectedFile.content)
      : undefined;

  const selectedLectureDate = parseLectureDate(
    selectedLecture?.date,
  );

  const snapshot = JSON.stringify(library);
  const dirty = Boolean(saved) && snapshot !== saved;

  function replaceFolder(nextFolder: TxtFolder) {
    setLibrary((current) => {
      if (kind === "lectures") {
        return {
          ...current,
          lectures: {
            folders: current.lectures.folders.map((entry) =>
              entry.id === nextFolder.id ? nextFolder : entry,
            ),
          },
        };
      }

      if (kind === "drugs") {
        return {
          ...current,
          drugs: {
            folders: current.drugs.folders.map((entry) =>
              entry.id === nextFolder.id ? nextFolder : entry,
            ),
          },
        };
      }

      return {
        ...current,
        microbiology: {
          folders: current.microbiology.folders.map((entry) =>
            entry.id === nextFolder.id ? nextFolder : entry,
          ),
        },
      };
    });
  }

  function updateSelectedFile(
    updater: (file: TxtFile) => TxtFile,
  ) {
    if (!folder || !selectedFile) return;

    replaceFolder({
      ...folder,
      files: folder.files.map((file) =>
        file.id === selectedFile.id ? updater(file) : file,
      ),
    });
  }

  function addTxt() {
    if (!folder) return;
    setModal({ type: "addTxt" });
  }

  function createTxt(rawName: string) {
    if (!folder) return;

    const base = rawName.replace(/\.txt$/i, "").trim();
    if (!base) return;

    const next: TxtFile = {
      id: safeId(`${base}-${Date.now()}`),
      name: ensureTxt(base),
      content:
        kind === "lectures"
          ? TXT_TEMPLATES.lecture.replace(
              "# 강의명",
              `# ${base}`,
            )
          : kind === "drugs"
            ? TXT_TEMPLATES.drug.replace(
                "# 제목",
                `# ${base}`,
              )
            : TXT_TEMPLATES.microbiology
                .replace("# 제목", `# ${base}`)
                .replace(
                  "@domain bacteria",
                  `@domain ${
                    folder.id === "virus"
                      ? "virus"
                      : folder.id === "fungus"
                        ? "fungus"
                        : folder.id === "parasite"
                          ? "parasite"
                          : "bacteria"
                  }`,
                ),
    };

    replaceFolder({
      ...folder,
      files: [...folder.files, next],
    });
    setSelectedId(next.id);
  }

  if (!folder) {
    return (
      <div className="rounded-[16px] border border-dashed bg-white p-8 text-center text-[15px] text-[#7d8781]">
        폴더를 찾을 수 없습니다.
      </div>
    );
  }

  const selectedIndex = selectedFile
    ? folder.files.findIndex((file) => file.id === selectedFile.id)
    : -1;

  return (
    <div className="min-w-0">
      <AdminSaveBar
        dirty={dirty}
        label={
          kind === "lectures"
            ? `${folder.name} TXT 관리`
            : `${folder.name} TXT 관리`
        }
        onReset={() => {
          if (!saved) return;
          const restored = JSON.parse(saved) as TxtLibrary;
          setLibrary(restored);

          const restoredFolders =
            kind === "lectures"
              ? restored.lectures.folders
              : kind === "drugs"
                ? restored.drugs.folders
                : restored.microbiology.folders;
          const restoredFolder = restoredFolders.find(
            (item) => item.id === folderId,
          );

          if (
            selectedId &&
            restoredFolder?.files.some(
              (file) => file.id === selectedId,
            )
          ) {
            return;
          }

          setSelectedId(restoredFolder?.files[0]?.id);
        }}
        onSave={async () => {
          await writeTxtLibrary(library);
          setSaved(snapshot);
        }}
      />

      <header className="mb-6">
        <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
          TXT ADMIN
        </p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-bold tracking-[-0.04em]">
              {folder.name}
            </h1>
            {folder.english && (
              <p className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[#8a948e]">
                {folder.english}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModal({ type: "renameFolder" })}
            className="rounded-[9px] border bg-white px-3 py-2 text-[13px]"
          >
            폴더 이름 변경
          </button>
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-[250px_minmax(0,1fr)] gap-4 max-[820px]:grid-cols-1">
        <TxtFileList
          title={folder.name}
          files={displayedFiles}
          selectedId={selectedId}
          query={query}
          onQueryChange={setQuery}
          onSelect={setSelectedId}
          onAdd={addTxt}
          getIndicator={
            kind === "lectures"
              ? (file) => {
                  const lecture = parseLectureTxt(file.content);
                  const led = LECTURE_LED[lecture.color];

                  return {
                    color: led.color,
                    glow: led.glow,
                    label: lecture.color,
                  };
                }
              : undefined
          }
        />

        <div className="min-w-0">
          {kind === "drugs" && (
            <details className="mb-4 overflow-hidden rounded-[14px] border bg-white">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-4">
                <div>
                  <strong className="text-[14px]">형식 예시</strong>
                  <span className="ml-2 text-[12px] text-[#8b9590]">
                    계열 폴더 안의 약물 TXT
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-[#168269]">
                  보기
                </span>
              </summary>

              <div className="border-t bg-[#fafcfb] p-4">
                <div className="mb-3 grid gap-1 text-[13px] leading-5 text-[#69746e]">
                  <p>
                    폴더는 큰 계열입니다. 예: <strong>항생제</strong>
                  </p>
                  <p>
                    TXT 하나는 그 안의 분류입니다. 예: <strong>세포벽 합성 억제제.txt</strong>
                  </p>
                  <p>
                    <code className="font-mono font-semibold">01 / 01.1 / 01.1.1 ...</code>
                    {" = TXT 내부 계층"}
                  </p>
                  <p>
                    <code className="font-mono font-semibold">##</code>
                    {" = 개별 약물 시작"}
                  </p>
                  <p>
                    <code className="font-mono font-semibold">@indication / @contra / @adverse</code>
                    {" = 여러 항목은 쉼표로 구분"}
                  </p>
                </div>

                <pre className="overflow-x-auto rounded-[11px] border bg-white p-4 font-mono text-[13px] leading-6 text-[#39443e]">{`# 세포벽 합성 억제제
@english CELL WALL SYNTHESIS INHIBITORS

01 Penicillin
@mechanism 세균 세포벽 합성 억제

01.1 Natural penicillin

## Penicillin G
@brand 상품명
@indication 적응증1, 적응증2
@contra 금기·주의1, 금기·주의2
@adverse 부작용1, 부작용2
@ref 1: 근거자료`}</pre>
              </div>
            </details>
          )}

          {kind === "microbiology" && (
            <details className="mb-4 overflow-hidden rounded-[14px] border bg-white">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-4">
                <div>
                  <strong className="text-[14px]">형식 예시</strong>
                  <span className="ml-2 text-[12px] text-[#8b9590]">
                    한 번 입력 → Gram/산소 기준 자동 재분류
                  </span>
                </div>
                <span className="text-[13px] font-semibold text-[#168269]">
                  보기
                </span>
              </summary>

              <div className="border-t bg-[#fafcfb] p-4">
                <div className="mb-3 grid gap-1 text-[13px] leading-5 text-[#69746e]">
                  <p>
                    <code className="font-mono font-semibold"># Gram (+)</code>
                    {" / "}
                    <code className="font-mono font-semibold"># Gram (-)</code>
                    {" / "}
                    <code className="font-mono font-semibold"># Atypical</code>
                    {" = TXT 분류"}
                  </p>
                  <p>
                    Gram (+)/(-) 파일은 각 균에{" "}
                    <code className="font-mono font-semibold">@gram</code>
                    을 반복 입력하지 않아도 자동 판정됩니다.
                  </p>
                  <p>
                    <code className="font-mono font-semibold">##</code>
                    {" = 개별 미생물 시작"}
                  </p>
                  <p>
                    <code className="font-mono font-semibold">@oxygen</code>
                    {" = obligate aerobe / microaerophile / facultative anaerobe / obligate anaerobe"}
                  </p>
                  <p>
                    산소 요구도 View는 모든 Bacteria TXT를 합쳐{" "}
                    <code className="font-mono font-semibold">@oxygen</code>
                    값으로 자동 재분류합니다.
                  </p>
                  <p>
                    <code className="font-mono font-semibold">@feature</code>
                    의 여러 특징은 쉼표로 구분할 수 있습니다.
                  </p>
                </div>

                <pre className="overflow-x-auto rounded-[11px] border bg-white p-4 font-mono text-[13px] leading-6 text-[#39443e]">{`# Gram (+)
@domain bacteria

## 
@morphology 
@oxygen 
@feature `}</pre>
              </div>
            </details>
          )}

          {selectedFile ? (
            <>
              {kind === "lectures" && (
                <div
                  className={`mb-3 rounded-[11px] border px-4 py-3 text-[13px] leading-5 ${
                    selectedLecture?.date &&
                    selectedLectureDate?.valid === false
                      ? "border-[#ecd8b9] bg-[#fff9ed] text-[#8b6528]"
                      : "bg-[#fafcfb] text-[#758079]"
                  }`}
                >
                  날짜 형식:{" "}
                  <code className="font-mono font-semibold">
                    YY.MM.DD.X
                  </code>
                  {" · "}
                  X는 교시를 이어서 입력 (예: 6, 67, 123)
                  {selectedLecture?.date &&
                    selectedLectureDate?.valid === false && (
                      <strong className="ml-2">
                        · 현재 @date 형식을 확인하세요.
                      </strong>
                    )}
                </div>
              )}

              <TxtEditor
              pathLabel={`${folder.name} / ${selectedFile.name}`}
              fileName={selectedFile.name}
              content={selectedFile.content}
              onContentChange={(content) =>
                updateSelectedFile((file) => ({
                  ...file,
                  content,
                }))
              }
              onRename={() =>
                setModal({ type: "renameFile" })
              }
              onDelete={() => {
                if (
                  !window.confirm(
                    `${selectedFile.name} 파일을 삭제할까요?`,
                  )
                )
                  return;

                const nextFiles = folder.files.filter(
                  (file) => file.id !== selectedFile.id,
                );
                replaceFolder({ ...folder, files: nextFiles });
                setSelectedId(nextFiles[0]?.id);
              }}
              onMoveUp={
                kind !== "lectures"
                  ? () => {
                      if (selectedIndex < 1) return;
                      const nextFiles = move(
                        folder.files,
                        selectedIndex,
                        -1,
                      );
                      replaceFolder({
                        ...folder,
                        files: nextFiles,
                      });
                    }
                  : undefined
              }
              onMoveDown={
                kind !== "lectures"
                  ? () => {
                      if (
                        selectedIndex < 0 ||
                        selectedIndex >=
                          folder.files.length - 1
                      )
                        return;

                      const nextFiles = move(
                        folder.files,
                        selectedIndex,
                        1,
                      );
                      replaceFolder({
                        ...folder,
                        files: nextFiles,
                      });
                    }
                  : undefined
              }
              canMoveUp={
                kind !== "lectures" && selectedIndex > 0
              }
              canMoveDown={
                kind !== "lectures" &&
                selectedIndex >= 0 &&
                selectedIndex < folder.files.length - 1
              }
            />
            </>
          ) : (
            <div className="flex min-h-[620px] items-center justify-center rounded-[18px] border border-dashed bg-white text-[15px] text-[#8b9590]">
              TXT를 선택하거나 새로 추가하세요.
            </div>
          )}
        </div>
      </section>

      <AdminFormModal
        open={modal?.type === "addTxt"}
        title="새 TXT 추가"
        description={
          kind === "lectures"
            ? "강의명을 입력하면 기본 강의 TXT 템플릿이 자동으로 생성됩니다."
            : kind === "drugs"
              ? "이 계열 폴더 안에 만들 약물 분류 TXT 이름을 입력하세요."
              : "새 TXT 파일 이름을 입력하세요."
        }
        fields={[
          {
            name: "name",
            label:
              kind === "lectures"
                ? "강의명"
                : kind === "drugs"
                  ? "약물 분류 TXT 이름"
                  : "TXT 파일 이름",
            placeholder:
              kind === "lectures"
                ? "예: 감염학 개론"
                : kind === "drugs"
                  ? "예: 세포벽 합성 억제제"
                  : "예: Gram (-)",
            required: true,
          },
        ]}
        submitLabel="추가"
        onClose={() => setModal(null)}
        onSubmit={(values) => {
          createTxt(values.name);
          setModal(null);
        }}
      />

      <AdminFormModal
        open={modal?.type === "renameFolder"}
        title="폴더 이름 변경"
        fields={[
          {
            name: "name",
            label: "새 이름",
            defaultValue: folder.name,
            required: true,
          },
        ]}
        onClose={() => setModal(null)}
        onSubmit={(values) => {
          replaceFolder({
            ...folder,
            name: values.name.trim(),
          });
          setModal(null);
        }}
      />

      <AdminFormModal
        open={modal?.type === "renameFile"}
        title="파일 이름 변경"
        fields={[
          {
            name: "name",
            label: "새 파일 이름",
            defaultValue: selectedFile?.name ?? "",
            required: true,
          },
        ]}
        onClose={() => setModal(null)}
        onSubmit={(values) => {
          updateSelectedFile((file) => ({
            ...file,
            name: ensureTxt(values.name.trim()),
          }));
          setModal(null);
        }}
      />
    </div>
  );
}
