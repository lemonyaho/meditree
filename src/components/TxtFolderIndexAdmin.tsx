"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminSaveBar from "@/components/AdminSaveBar";
import AdminFormModal from "@/components/AdminFormModal";
import {
  cloneDefaultTxtLibrary,
  type TxtFolder,
  type TxtLibrary,
} from "@/lib/txt-content";
import {
  readTxtLibrary,
  writeTxtLibrary,
} from "@/components/useTxtLibrary";

type Kind = "lectures" | "drugs" | "microbiology";

const TONES = [
  "border-[#d7e5d8] bg-[#f7fbf6]",
  "border-[#d8e1ed] bg-[#f6f9fd]",
  "border-[#eadfc9] bg-[#fdfaf4]",
  "border-[#ead8dc] bg-[#fcf7f8]",
];

function safeId(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣β]+/g, "-")
      .replace(/^-|-$/g, "") || `folder-${Date.now()}`
  );
}

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function TxtFolderIndexAdmin({
  kind,
}: {
  kind: Kind;
}) {
  const [library, setLibrary] = useState<TxtLibrary>(
    cloneDefaultTxtLibrary(),
  );
  const [saved, setSaved] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<
    | { type: "addFolder" }
    | { type: "renameFolder"; folderId: string }
    | null
  >(null);

  useEffect(() => {
    let active = true;

    void readTxtLibrary().then((current) => {
      if (!active) return;
      setLibrary(current);
      setSaved(JSON.stringify(current));
    });

    return () => {
      active = false;
    };
  }, []);

  const folders =
    kind === "lectures"
      ? library.lectures.folders
      : kind === "drugs"
        ? library.drugs.folders
        : library.microbiology.folders;

  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      normalized
        ? folders.filter((folder) =>
            [
              folder.name,
              folder.english,
              ...folder.files.map((file) => file.name),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized),
          )
        : folders,
    [folders, normalized],
  );

  const snapshot = JSON.stringify(library);
  const dirty = Boolean(saved) && snapshot !== saved;

  function setFolders(next: TxtFolder[]) {
    setLibrary((current) => {
      if (kind === "lectures") {
        return {
          ...current,
          lectures: { folders: next },
        };
      }

      if (kind === "drugs") {
        return {
          ...current,
          drugs: { folders: next },
        };
      }

      return {
        ...current,
        microbiology: { folders: next },
      };
    });
  }

  function addFolder() {
    setModal({ type: "addFolder" });
  }

  function createFolder(name: string, english: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setFolders([
      ...folders,
      {
        id: safeId(`${trimmedName}-${Date.now()}`),
        name: trimmedName,
        english: english.trim(),
        files: [],
      },
    ]);
  }

  return (
    <div>
      <AdminSaveBar
        dirty={dirty}
        label={
          kind === "lectures"
            ? "강의 계통 관리"
            : kind === "drugs"
              ? "약물 계열 관리"
              : "미생물 큰 분류 관리"
        }
        onReset={() => {
          if (!saved) return;
          setLibrary(JSON.parse(saved));
        }}
        onSave={async () => {
          await writeTxtLibrary(library);
          setSaved(snapshot);
        }}
      />

      <div className="mb-6 flex min-h-[54px] items-center rounded-[14px] border bg-white px-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            kind === "lectures"
              ? "계통 검색"
              : kind === "drugs"
                ? "약물 계열 검색"
                : "큰 분류 검색"
          }
          className="w-full min-w-0 text-[15px] outline-none"
        />
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
            TXT ADMIN
          </p>
          <h2 className="mt-1 text-[28px] font-semibold">
            {kind === "lectures"
              ? "계통 선택"
              : kind === "drugs"
                ? "계열 선택"
                : "큰 분류 선택"}
          </h2>
        </div>

        <button
          type="button"
          onClick={addFolder}
          className="rounded-[10px] bg-[#eef7ea] px-4 py-2.5 text-[13px] font-bold text-[#075f4e]"
        >
          + 폴더 추가
        </button>
      </div>

      <section className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        {visible.map((folder) => {
          const index = folders.findIndex(
            (entry) => entry.id === folder.id,
          );

          const href =
            kind === "lectures"
              ? `/admin/lectures/folder?id=${encodeURIComponent(folder.id)}`
              : kind === "drugs"
                ? `/admin/drugs/folder?id=${encodeURIComponent(folder.id)}`
                : `/admin/microbiology/folder?id=${encodeURIComponent(folder.id)}`;

          return (
            <article
              key={folder.id}
              className={`relative rounded-[18px] border p-5 ${
                TONES[index % TONES.length]
              }`}
            >
              <span className="absolute right-5 top-4 text-[12px] font-bold tabular-nums text-[#9aa39e]">
                {String(index + 1).padStart(2, "0")}
              </span>

              {folder.english && (
                <p className="pr-10 text-[12px] font-bold tracking-[0.1em] text-[#168269]">
                  {folder.english}
                </p>
              )}

              <h3 className="mt-3 pr-8 text-[23px] font-semibold">
                {folder.name}
              </h3>

              <p className="mt-2 text-[13px] text-[#7d8781]">
                {folder.files.length} TXT
              </p>

              <Link
                href={href}
                className="mt-5 inline-block text-[14px] font-semibold text-[#168269]"
              >
                열기 →
              </Link>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() =>
                    setFolders(move(folders, index, -1))
                  }
                  className="rounded-[8px] border px-3 py-2 text-[13px] disabled:opacity-30"
                >
                  ↑
                </button>

                <button
                  type="button"
                  disabled={index === folders.length - 1}
                  onClick={() =>
                    setFolders(move(folders, index, 1))
                  }
                  className="rounded-[8px] border px-3 py-2 text-[13px] disabled:opacity-30"
                >
                  ↓
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setModal({
                      type: "renameFolder",
                      folderId: folder.id,
                    })
                  }
                  className="rounded-[8px] border px-3 py-2 text-[13px]"
                >
                  이름 변경
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `${folder.name} 폴더와 내부 TXT를 모두 삭제할까요?`,
                      )
                    )
                      return;

                    setFolders(
                      folders.filter(
                        (entry) => entry.id !== folder.id,
                      ),
                    );
                  }}
                  className="rounded-[8px] border border-[#ead5d5] px-3 py-2 text-[13px] text-[#a15b5b]"
                >
                  삭제
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <AdminFormModal
        open={modal?.type === "addFolder"}
        title={
          kind === "lectures"
            ? "새 계통 폴더 추가"
            : kind === "drugs"
              ? "새 약물 계열 폴더 추가"
              : "새 미생물 분류 폴더 추가"
        }
        fields={[
          {
            name: "name",
            label:
              kind === "lectures"
                ? "계통 이름"
                : kind === "drugs"
                  ? "약물 계열 이름"
                  : "분류 이름",
            placeholder:
              kind === "lectures"
                ? "예: 감염"
                : kind === "drugs"
                  ? "예: 항생제"
                  : "예: 세균",
            required: true,
          },
          {
            name: "english",
            label: "영문명",
            placeholder:
              kind === "lectures"
                ? "예: INFECTIOUS DISEASE"
                : kind === "drugs"
                  ? "예: ANTIBIOTICS"
                  : "예: BACTERIA",
          },
        ]}
        submitLabel="추가"
        onClose={() => setModal(null)}
        onSubmit={(values) => {
          createFolder(values.name, values.english ?? "");
          setModal(null);
        }}
      />

      <AdminFormModal
        open={modal?.type === "renameFolder"}
        title="이름 변경"
        fields={[
          {
            name: "name",
            label: "새 이름",
            defaultValue:
              folders.find(
                (folder) =>
                  modal?.type === "renameFolder" &&
                  folder.id === modal.folderId,
              )?.name ?? "",
            required: true,
          },
        ]}
        onClose={() => setModal(null)}
        onSubmit={(values) => {
          if (modal?.type !== "renameFolder") return;

          setFolders(
            folders.map((folder) =>
              folder.id === modal.folderId
                ? { ...folder, name: values.name.trim() }
                : folder,
            ),
          );
          setModal(null);
        }}
      />
    </div>
  );
}
