"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  compareLectureDates,
  parseLectureTxt,
} from "@/lib/txt-content";

const led = {
  red: { bar: "#ef6b72", glow: "rgba(239,107,114,0.38)" },
  yellow: { bar: "#e2b84d", glow: "rgba(226,184,77,0.36)" },
  blue: { bar: "#5d8ff0", glow: "rgba(93,143,240,0.40)" },
  green: { bar: "#55b978", glow: "rgba(85,185,120,0.40)" },
} as const;

function Content() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const library = useTxtLibrary();
  const folder = library.lectures.folders.find((item) => item.id === slug);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const lectures = useMemo(() => {
    if (!folder) return [];

    return folder.files
      .map((file, fileIndex) => ({
        file,
        fileIndex,
        parsed: parseLectureTxt(file.content),
      }))
      .filter(({ file, parsed }) => {
        if (!normalized) return true;
        return [
          file.name,
          parsed.title,
          parsed.professor ?? "",
          parsed.date ?? "",
          ...parsed.topics.map((topic) => topic.title),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => {
        const byDate = compareLectureDates(a.parsed.date, b.parsed.date);
        return byDate !== 0 ? byDate : a.fileIndex - b.fileIndex;
      });
  }, [folder, normalized]);

  if (!folder) return null;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1000px,100%)]">
        <nav className="mb-10 flex flex-wrap gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <Link href="/lectures">강의 단권화</Link>
          <span>›</span>
          <span>{folder.name}</span>
        </nav>

        <header className="mb-8">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
            {folder.english}
          </p>
          <h1 className="mt-2 text-[clamp(38px,6vw,52px)] font-bold tracking-[-0.05em]">
            {folder.name}
          </h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="강의명 · 교수 · 목차 검색"
              className="w-full text-[15px] outline-none"
            />
          </div>
        </header>

        <section className="grid gap-2.5">
          {lectures.map(({ file, parsed }) => {
            const color = led[parsed.color];

            return (
              <Link
                key={file.id}
                href={`/lectures/lecture?system=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(file.id)}`}
                className="group relative flex min-h-[76px] items-center justify-between gap-4 rounded-[15px] border border-[#e1e7e3] bg-white px-5 py-3.5 shadow-[0_6px_18px_rgba(19,40,31,0.025)] transition hover:-translate-y-[1px] hover:border-[#cfdad3] hover:bg-[#fcfdfc]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="h-[10px] w-[10px] shrink-0 rounded-full"
                    style={{
                      background: color.bar,
                      boxShadow: `0 0 13px 4px ${color.glow}`,
                    }}
                  />

                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                      {parsed.title}
                      {parsed.professor && (
                        <span className="ml-2 font-normal text-[#7c8781]">
                          ({parsed.professor})
                        </span>
                      )}
                    </h2>
                  </div>
                </div>

                <span
                  className="shrink-0 text-[21px] transition group-hover:translate-x-0.5"
                  style={{
                    color: color.bar,
                    textShadow: `0 0 10px ${color.glow}`,
                  }}
                >
                  →
                </span>
              </Link>
            );
          })}

          {lectures.length === 0 && (
            <div className="rounded-[15px] border border-dashed bg-white p-8 text-center text-[15px] text-[#7c8781]">
              등록된 강의가 없습니다.
            </div>
          )}
        </section>
      </div>

      <FloatingNav />
    </main>
  );
}

export default function LectureSystemPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
