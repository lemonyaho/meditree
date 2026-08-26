"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function Content() {
  const params = useSearchParams();
  const folderId = params.get("slug");
  const library = useTxtLibrary();
  const folder = library.drugs.folders.find(
    (item) => item.id === folderId,
  );

  const [mode, setMode] = useState<Mode>("study");
  const [query, setQuery] = useState("");
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);

  const parsedFiles = useMemo(
    () =>
      folder
        ? folder.files.map((file) => ({
            file,
            parsed: parseDrugTxt(file.id, file.content),
          }))
        : [],
    [folder],
  );

  const normalized = query.trim().toLowerCase();

  const visibleFiles = useMemo(
    () =>
      normalized
        ? parsedFiles.filter(({ file, parsed }) =>
            `${file.name} ${drugCategorySearchText(parsed)}`
              .toLowerCase()
              .includes(normalized),
          )
        : parsedFiles,
    [parsedFiles, normalized],
  );

  const quizPool = useMemo(
    () =>
      parsedFiles.flatMap(({ file, parsed }) =>
        flattenDrugCategory(parsed).map((entry) => ({
          ...entry,
          fileId: file.id,
          path: [parsed.name, ...entry.path],
        })),
      ),
    [parsedFiles],
  );

  useEffect(() => {
    if (mode === "quiz" && quizPool.length) {
      setQuizIndex(randomIndex(quizPool.length));
      setAnswerVisible(false);
    }
  }, [mode, quizPool.length]);

  if (!folder) return null;

  const current = quizPool.length
    ? quizPool[quizIndex % quizPool.length]
    : null;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <Link href="/drugs">약물 공부 도구</Link>
          <span>›</span>
          <span>{folder.name}</span>
        </nav>

        <header className="mb-8">
          {folder.english && (
            <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
              {folder.english}
            </p>
          )}
          <h1 className="mt-2 text-[clamp(40px,6vw,58px)] font-bold">
            {folder.name}
          </h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${folder.name} 안에서 검색`}
              className="w-full text-[15px] outline-none"
            />
          </div>

          <div className="mt-4 inline-flex rounded-[12px] border bg-white p-1">
            <button
              onClick={() => setMode("study")}
              className={`rounded-[9px] px-5 py-2.5 text-[14px] ${
                mode === "study"
                  ? "bg-[#eaf4e8] font-bold text-[#075f4e]"
                  : ""
              }`}
            >
              공부
            </button>
            <button
              onClick={() => setMode("quiz")}
              className={`rounded-[9px] px-5 py-2.5 text-[14px] ${
                mode === "quiz"
                  ? "bg-[#eaf4e8] font-bold text-[#075f4e]"
                  : ""
              }`}
            >
              퀴즈
            </button>
          </div>
        </header>

        {mode === "study" ? (
          <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
            {visibleFiles.map(({ file, parsed }) => (
              <Link
                key={file.id}
                href={`/drugs/group?category=${encodeURIComponent(
                  folder.id,
                )}&file=${encodeURIComponent(file.id)}`}
                className="flex min-h-[130px] flex-col justify-between rounded-[18px] border bg-white p-5"
              >
                <div>
                  {parsed.english && (
                    <span className="text-[12px] font-bold tracking-[0.1em] text-[#168269]">
                      {parsed.english}
                    </span>
                  )}
                  <h2 className="mt-3 text-[21px] font-semibold">
                    {parsed.name}
                  </h2>
                </div>
                <span className="self-end text-[22px] text-[#075f4e]">
                  →
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <section className="rounded-[22px] border bg-white p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold">퀴즈</h2>
              <span className="text-[14px] font-semibold text-[#168269]">
                퀴즈 범위선택 : {folder.name}
              </span>
            </div>

            {current ? (
              <>
                <div className="flex min-h-[240px] items-center justify-center">
                  <strong className="text-[42px] font-semibold">
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
                    <div className="grid gap-3">
                      <p>
                        <span className="mr-5 text-[#7f8a84]">
                          계열
                        </span>
                        <strong>{folder.name}</strong>
                      </p>
                      {current.path.map((name, index) => (
                        <p key={`${name}-${index}`}>
                          <span className="mr-5 text-[#7f8a84]">
                            계층 {index + 1}
                          </span>
                          <strong>{name}</strong>
                        </p>
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

      <FloatingNav />
    </main>
  );
}

export default function DrugCategoryPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
