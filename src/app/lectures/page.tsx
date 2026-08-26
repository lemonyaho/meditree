"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FloatingNav from "@/components/FloatingNav";
import useTxtLibrary from "@/components/useTxtLibrary";
import { parseLectureTxt } from "@/lib/txt-content";

export default function LecturesPage() {
  const library = useTxtLibrary();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const folders = useMemo(() => {
    if (!normalized) return library.lectures.folders;

    return library.lectures.folders.filter((folder) => {
      const fileText = folder.files
        .map((file) => {
          const parsed = parseLectureTxt(file.content);
          return [
            file.name,
            parsed.title,
            parsed.professor ?? "",
            ...parsed.topics.map((topic) => topic.title),
          ].join(" ");
        })
        .join(" ");

      return `${folder.name} ${folder.english} ${fileText}`
        .toLowerCase()
        .includes(normalized);
    });
  }, [library, normalized]);

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <span>강의 단권화</span>
        </nav>

        <header className="mb-8">
          <p className="text-[13px] font-bold tracking-[0.13em] text-[#168269]">
            LECTURE ARCHIVE
          </p>
          <h1 className="mt-2 text-[clamp(42px,7vw,60px)] font-bold tracking-[-0.05em]">
            강의 단권화
          </h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="계통 · 강의명 · 교수 · 목차 검색"
              className="w-full text-[15px] outline-none"
            />
          </div>
        </header>

        <section className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
          {folders.map((folder, index) => (
            <Link
              key={folder.id}
              href={`/lectures/system?slug=${encodeURIComponent(folder.id)}`}
              className="flex min-h-[145px] flex-col justify-between rounded-[18px] border bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#bcd0c2]"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12px] font-bold tracking-[0.1em] text-[#168269]">
                    {folder.english}
                  </span>
                  <span className="text-[13px] font-semibold text-[#87918c]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h2 className="mt-4 text-[23px] font-semibold tracking-[-0.035em]">
                  {folder.name}
                </h2>
              </div>

              <span className="self-end text-[23px] text-[#075f4e]">→</span>
            </Link>
          ))}
        </section>
      </div>

      <FloatingNav />
    </main>
  );
}
