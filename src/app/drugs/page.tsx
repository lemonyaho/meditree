"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/components/FloatingNav";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  drugCategorySearchText,
  flattenDrugCategory,
  parseDrugTxt,
} from "@/lib/txt-content";

type Mode = "study" | "quiz";

function randomIndex(length: number, current = -1) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

export default function DrugsPage() {
  const library = useTxtLibrary();
  const [mode, setMode] = useState<Mode>("study");
  const [query, setQuery] = useState("");
  const [quizScopes, setQuizScopes] = useState<string[]>([]);
  const [draftScopes, setDraftScopes] = useState<string[]>([]);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);

  const categories = useMemo(
    () =>
      library.drugs.folders.map((folder) => {
        const parsedFiles = folder.files.map((file) => ({
          file,
          parsed: parseDrugTxt(file.id, file.content),
        }));

        return { folder, parsedFiles };
      }),
    [library],
  );

  const normalized = query.trim().toLowerCase();

  const visibleCategories = useMemo(
    () =>
      normalized
        ? categories.filter(({ folder, parsedFiles }) =>
            [
              folder.name,
              folder.english,
              ...parsedFiles.map(({ file, parsed }) =>
                `${file.name} ${drugCategorySearchText(parsed)}`,
              ),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalized),
          )
        : categories,
    [categories, normalized],
  );

  const quizPool = useMemo(() => {
    const selected =
      quizScopes.length === 0
        ? categories
        : categories.filter(({ folder }) =>
            quizScopes.includes(folder.id),
          );

    return selected.flatMap(({ folder, parsedFiles }) =>
      parsedFiles.flatMap(({ parsed }) =>
        flattenDrugCategory(parsed).map((entry) => ({
          ...entry,
          categoryId: folder.id,
          categoryName: folder.name,
          path: [parsed.name, ...entry.path],
        })),
      ),
    );
  }, [categories, quizScopes]);

  useEffect(() => {
    if (mode === "quiz" && quizPool.length) {
      setQuizIndex(randomIndex(quizPool.length));
      setAnswerVisible(false);
    }
  }, [mode, quizScopes, quizPool.length]);

  const current = quizPool.length
    ? quizPool[quizIndex % quizPool.length]
    : null;

  const scopeLabel =
    quizScopes.length === 0
      ? "전체 약물"
      : quizScopes.length === 1
        ? categories.find(({ folder }) =>
            folder.id === quizScopes[0]
          )?.folder.name ?? "1개 계열"
        : `${quizScopes.length}개 계열`;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <span>약물 공부 도구</span>
        </nav>

        <header className="mb-9">
          <p className="text-[13px] font-bold tracking-[0.13em] text-[#168269]">
            DRUG TOOL
          </p>
          <h1 className="mt-2 text-[clamp(42px,7vw,60px)] font-bold tracking-[-0.05em]">
            약물 공부 도구
          </h1>

          <div className="mt-8 flex min-h-[58px] items-center rounded-[15px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="계열 · 분류 · 계층 · 성분명 · 상품명 검색"
              className="w-full text-[15px] outline-none"
            />
          </div>

          <div className="mt-4 inline-flex rounded-[13px] border bg-white p-1">
            {(["study", "quiz"] as Mode[]).map((item) => (
              <button
                key={item}
                onClick={() => setMode(item)}
                className={`rounded-[9px] px-6 py-3 text-[15px] ${
                  mode === item
                    ? "bg-[#eaf4e8] font-bold text-[#075f4e]"
                    : ""
                }`}
              >
                {item === "study" ? "공부" : "퀴즈"}
              </button>
            ))}
          </div>
        </header>

        {mode === "study" ? (
          <section>
            <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
              CATEGORY
            </p>
            <h2 className="mb-5 mt-1 text-[25px] font-semibold">
              계열 선택
            </h2>

            <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
              {visibleCategories.map(({ folder }) => (
                <Link
                  key={folder.id}
                  href={`/drugs/category?slug=${encodeURIComponent(
                    folder.id,
                  )}`}
                  className="flex min-h-[145px] flex-col justify-between rounded-[18px] border bg-white p-5"
                >
                  <div>
                    {folder.english && (
                      <span className="text-[12px] font-bold tracking-[0.11em] text-[#168269]">
                        {folder.english}
                      </span>
                    )}
                    <h3 className="mt-3 text-[23px] font-semibold">
                      {folder.name}
                    </h3>
                  </div>
                  <span className="self-end text-[23px] text-[#075f4e]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[22px] border bg-white p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[24px] font-semibold">퀴즈</h2>
              <button
                onClick={() => {
                  setDraftScopes(quizScopes);
                  setScopeModalOpen(true);
                }}
                className="rounded-[12px] border bg-[#f4f8f3] px-4 py-3 text-[14px] font-semibold text-[#075f4e]"
              >
                퀴즈 범위선택 : {scopeLabel}
              </button>
            </div>

            {current ? (
              <>
                <div className="flex min-h-[250px] items-center justify-center text-center">
                  <strong className="text-[clamp(32px,5vw,46px)]">
                    {current.drug.generic}
                  </strong>
                </div>

                {!answerVisible ? (
                  <button
                    onClick={() => setAnswerVisible(true)}
                    className="w-full rounded-[13px] bg-[#075f4e] py-4 text-[15px] font-bold text-white"
                  >
                    답 보기
                  </button>
                ) : (
                  <div className="rounded-[15px] bg-[#f4f7f5] p-6 text-[15px]">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-[100px_1fr] gap-4">
                        <span className="text-[#7f8a84]">계열</span>
                        <strong>{current.categoryName}</strong>
                      </div>

                      {current.path.map((name, index) => (
                        <div
                          key={`${name}-${index}`}
                          className="grid grid-cols-[100px_1fr] gap-4"
                        >
                          <span className="text-[#7f8a84]">
                            계층 {index + 1}
                          </span>
                          <strong>{name}</strong>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setQuizIndex((index) =>
                          randomIndex(quizPool.length, index),
                        );
                        setAnswerVisible(false);
                      }}
                      className="mt-6 w-full rounded-[11px] bg-white py-3.5 text-[14px] font-bold text-[#075f4e]"
                    >
                      랜덤 다음 문제 →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                출제할 약물이 없습니다.
              </div>
            )}
          </section>
        )}
      </div>

      {scopeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setScopeModalOpen(false);
            }
          }}
        >
          <section className="w-[min(520px,100%)] rounded-[22px] bg-white p-6">
            <h2 className="text-[26px] font-semibold">
              퀴즈 범위선택
            </h2>

            <div className="mt-5 grid gap-2">
              {categories.map(({ folder }) => {
                const checked = draftScopes.includes(folder.id);

                return (
                  <label
                    key={folder.id}
                    className={`flex items-center gap-3 rounded-[13px] border px-4 py-3.5 text-[15px] ${
                      checked ? "bg-[#eef6eb]" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setDraftScopes((current) =>
                          checked
                            ? current.filter(
                                (id) => id !== folder.id,
                              )
                            : [...current, folder.id],
                        )
                      }
                      className="h-5 w-5"
                    />
                    <strong>{folder.name}</strong>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button
                onClick={() => setDraftScopes([])}
                className="rounded-[10px] border px-4 py-2.5 text-[13px]"
              >
                전체 범위
              </button>
              <button
                onClick={() => {
                  setQuizScopes(draftScopes);
                  setScopeModalOpen(false);
                }}
                className="rounded-[10px] bg-[#075f4e] px-5 py-2.5 text-[13px] font-bold text-white"
              >
                적용
              </button>
            </div>
          </section>
        </div>
      )}

      <FloatingNav />
    </main>
  );
}
