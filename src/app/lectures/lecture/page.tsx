"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import useTxtLibrary from "@/components/useTxtLibrary";
import { formatLectureDate, parseLectureTxt } from "@/lib/txt-content";

const depthPadding = ["pl-5", "pl-10", "pl-16", "pl-20", "pl-24"];

function Content() {
  const params = useSearchParams();
  const systemId = params.get("system");
  const fileId = params.get("file");
  const library = useTxtLibrary();

  const folder = library.lectures.folders.find(
    (item) => item.id === systemId,
  );
  const file = folder?.files.find((item) => item.id === fileId);
  const lecture = useMemo(
    () => (file ? parseLectureTxt(file.content) : null),
    [file],
  );
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  if (!folder || !file || !lecture) return null;

  const topics = lecture.topics.filter((topic) =>
    normalized ? topic.title.toLowerCase().includes(normalized) : true,
  );

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(960px,100%)]">
        <nav className="mb-10 flex flex-wrap gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <Link href="/lectures">강의 단권화</Link>
          <span>›</span>
          <Link href={`/lectures/system?slug=${folder.id}`}>
            {folder.name}
          </Link>
          <span>›</span>
          <span>{lecture.title}</span>
        </nav>

        <header className="mb-8">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
            {folder.english}
          </p>
          <h1 className="mt-2 text-[clamp(36px,6vw,50px)] font-bold tracking-[-0.05em]">
            {lecture.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-[#758079]">
            <span>{lecture.professor || "교수 정보 비어있음"}</span>
            {lecture.date && (
              <>
                <span className="text-[#b0b7b3]">·</span>
                <span>{formatLectureDate(lecture.date)}</span>
              </>
            )}
          </div>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이 강의 안에서 검색"
              className="w-full text-[15px] outline-none"
            />
          </div>
        </header>

        <section className="overflow-hidden rounded-[16px] border bg-white">
          {topics.map((topic, index) => {
            const nextTopic = topics[index + 1];
            const hasChildren =
              Boolean(nextTopic) &&
              nextTopic.depth > topic.depth;

            const rowClass = `flex min-h-[58px] items-center justify-between gap-4 pr-5 ${
              depthPadding[
                Math.min(
                  topic.depth,
                  depthPadding.length - 1,
                )
              ]
            }`;

            const content = (
              <div className="flex min-w-0 items-center gap-4">
                <span className="shrink-0 font-mono text-[12px] font-bold text-[#168269]">
                  {topic.number}
                </span>
                <strong className="truncate text-[16px]">
                  {topic.title}
                </strong>
              </div>
            );

            if (!hasChildren) {
              return (
                <div
                  key={`${topic.number}-${topic.title}`}
                  className={`${rowClass} ${
                    index !== topics.length - 1
                      ? "border-b"
                      : ""
                  }`}
                >
                  {content}
                </div>
              );
            }

            return (
              <details
                key={`${topic.number}-${topic.title}`}
                className={
                  index !== topics.length - 1
                    ? "border-b"
                    : ""
                }
              >
                <summary
                  className={`${rowClass} cursor-pointer list-none`}
                >
                  {content}
                  <span>↓</span>
                </summary>
              </details>
            );
          })}
        </section>

        {lecture.refs.length > 0 && (
          <section className="mt-5 rounded-[14px] border bg-white p-5">
            <h2 className="text-[15px] font-semibold">근거자료</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] leading-6 text-[#67726c]">
              {lecture.refs.map((ref, index) => (
                <li key={`${ref}-${index}`}>{ref}</li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <FloatingNav />
    </main>
  );
}

export default function LecturePage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
