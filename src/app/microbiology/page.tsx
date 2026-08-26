"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FloatingNav from "@/components/FloatingNav";
import ScientificName from "@/components/ScientificName";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  oxygenRequirements,
  parseMicrobiologyTxt,
  type MicrobeDomain,
} from "@/lib/txt-content";

type Mode = "study" | "quiz";

function randomIndex(length: number, current = -1) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

export default function MicrobiologyPage() {
  const library = useTxtLibrary();
  const [mode, setMode] = useState<Mode>("study");
  const [query, setQuery] = useState("");
  const [quizScopes, setQuizScopes] = useState<string[]>([]);
  const [draftScopes, setDraftScopes] = useState<string[]>([]);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);

  const parsedFolders = useMemo(
    () =>
      library.microbiology.folders.map((folder) => ({
        folder,
        files: folder.files.map((file) => ({
          file,
          parsed: parseMicrobiologyTxt(
            file.id,
            file.content,
            folder.id as MicrobeDomain,
          ),
        })),
      })),
    [library],
  );

  const allOrganisms = useMemo(
    () =>
      parsedFolders.flatMap(({ folder, files }) =>
        files.flatMap(({ file, parsed }) =>
          parsed.organisms.map((organism) => ({
            organism,
            folder,
            file,
            subgroup: parsed.title,
          })),
        ),
      ),
    [parsedFolders],
  );

  const normalized = query.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    if (!normalized) return parsedFolders;

    return parsedFolders.filter(({ folder, files }) =>
      [
        folder.name,
        folder.english,
        ...files.flatMap(({ file, parsed }) => [
          file.name,
          parsed.title,
          ...parsed.organisms.flatMap((organism) => [
            organism.name,
            organism.gram ?? "",
            organism.morphology ?? "",
            organism.oxygen ?? "",
            ...organism.keyFacts,
          ]),
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [parsedFolders, normalized]);

  const quizPool = useMemo(() => {
    if (!quizScopes.length) return allOrganisms;

    return allOrganisms.filter(({ organism, folder, file }) =>
      quizScopes.some((scope) => {
        if (scope.startsWith("domain:")) {
          return folder.id === scope.slice("domain:".length);
        }
        if (scope.startsWith("file:")) {
          return file.id === scope.slice("file:".length);
        }
        if (scope.startsWith("oxygen:")) {
          return organism.oxygen === scope.slice("oxygen:".length);
        }
        return false;
      }),
    );
  }, [allOrganisms, quizScopes]);

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
      ? "전체 미생물"
      : quizScopes.length === 1
        ? "1개 범위"
        : `${quizScopes.length}개 범위`;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link><span>›</span><span>미생물 공부 도구</span>
        </nav>

        <header className="mb-9">
          <p className="text-[13px] font-bold tracking-[0.13em] text-[#168269]">MICROBE TOOL</p>
          <h1 className="mt-2 text-[clamp(42px,7vw,60px)] font-bold tracking-[-0.05em]">미생물 공부 도구</h1>

          <div className="mt-8 flex min-h-[58px] items-center rounded-[15px] border bg-white px-4">
            <input value={query} onChange={(e)=>setQuery(e.target.value)}
              placeholder="미생물명 · 분류 · 형태 · 산소 요구도 · 특징 검색"
              className="w-full text-[15px] outline-none"/>
          </div>

          <div className="mt-4 inline-flex rounded-[13px] border bg-white p-1">
            <button onClick={()=>setMode("study")} className={`rounded-[9px] px-6 py-3 text-[15px] ${mode==="study"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>공부</button>
            <button onClick={()=>setMode("quiz")} className={`rounded-[9px] px-6 py-3 text-[15px] ${mode==="quiz"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>퀴즈</button>
          </div>
        </header>

        {mode === "study" ? (
          <section>
            <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">DOMAIN</p>
            <h2 className="mb-5 mt-1 text-[25px] font-semibold">큰 분류 선택</h2>
            <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
              {visibleFolders.map(({folder})=>(
                <Link key={folder.id} href={`/microbiology/category?domain=${encodeURIComponent(folder.id)}`}
                  className="flex min-h-[145px] flex-col justify-between rounded-[18px] border bg-white p-5">
                  <div>
                    <span className="text-[12px] font-bold tracking-[0.11em] text-[#168269]">{folder.english}</span>
                    <h3 className="mt-3 text-[23px] font-semibold">{folder.name}</h3>
                  </div>
                  <span className="self-end text-[23px] text-[#075f4e]">→</span>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[22px] border bg-white p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-[24px] font-semibold">퀴즈</h2>
              <button onClick={()=>{setDraftScopes(quizScopes);setScopeModalOpen(true);}}
                className="rounded-[12px] border bg-[#f4f8f3] px-4 py-3 text-[14px] font-semibold text-[#075f4e]">
                퀴즈 범위선택 : {scopeLabel}
              </button>
            </div>

            {current ? (
              <>
                <div className="flex min-h-[250px] items-center justify-center text-center">
                  <ScientificName name={current.organism.name} domain={current.organism.domain}
                    className="text-[clamp(32px,5vw,46px)] font-semibold"/>
                </div>
                {!answerVisible ? (
                  <button onClick={()=>setAnswerVisible(true)}
                    className="w-full rounded-[13px] bg-[#075f4e] py-4 text-[15px] font-bold text-white">답 보기</button>
                ) : (
                  <div className="rounded-[15px] bg-[#f4f7f5] p-6 text-[15px]">
                    <div className="grid gap-3">
                      <p><span className="mr-5 text-[#7f8a84]">분류</span><strong>{current.subgroup}</strong></p>
                      {current.organism.gram && <p><span className="mr-5 text-[#7f8a84]">Gram</span><strong>{current.organism.gram}</strong></p>}
                      {current.organism.morphology && <p><span className="mr-5 text-[#7f8a84]">형태</span><strong>{current.organism.morphology}</strong></p>}
                      {current.organism.oxygen && <p><span className="mr-5 text-[#7f8a84]">산소</span><strong>{current.organism.oxygen}</strong></p>}
                    </div>
                    <button onClick={()=>{setQuizIndex((i)=>randomIndex(quizPool.length,i));setAnswerVisible(false);}}
                      className="mt-6 w-full rounded-[11px] bg-white py-3.5 text-[14px] font-bold text-[#075f4e]">
                      랜덤 다음 문제 →
                    </button>
                  </div>
                )}
              </>
            ) : <div className="py-16 text-center">출제할 미생물이 없습니다.</div>}
          </section>
        )}
      </div>

      {scopeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-5"
          onMouseDown={(e)=>{if(e.target===e.currentTarget)setScopeModalOpen(false);}}>
          <section className="max-h-[86vh] w-[min(620px,100%)] overflow-y-auto rounded-[22px] bg-white p-6">
            <h2 className="text-[26px] font-semibold">퀴즈 범위선택</h2>

            <h3 className="mb-2 mt-5 text-[16px] font-semibold">큰 분류</h3>
            <div className="grid grid-cols-2 gap-2">
              {parsedFolders.map(({folder})=>{
                const value=`domain:${folder.id}`;
                const checked=draftScopes.includes(value);
                return <label key={value} className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[15px] ${checked?"bg-[#eef6eb]":""}`}>
                  <input type="checkbox" checked={checked} className="h-5 w-5"
                    onChange={()=>setDraftScopes(cur=>checked?cur.filter(x=>x!==value):[...cur,value])}/>
                  <strong>{folder.name}</strong>
                </label>;
              })}
            </div>

            <h3 className="mb-2 mt-5 text-[16px] font-semibold">TXT 분류</h3>
            <div className="grid gap-2">
              {parsedFolders.flatMap(({folder,files})=>files.map(({file,parsed})=>{
                const value=`file:${file.id}`;
                const checked=draftScopes.includes(value);
                return <label key={`${folder.id}-${file.id}`} className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[15px] ${checked?"bg-[#eef6eb]":""}`}>
                  <input type="checkbox" checked={checked} className="h-5 w-5"
                    onChange={()=>setDraftScopes(cur=>checked?cur.filter(x=>x!==value):[...cur,value])}/>
                  <strong>{folder.name} · {parsed.title}</strong>
                </label>;
              }))}
            </div>

            <h3 className="mb-2 mt-5 text-[16px] font-semibold">산소 요구도</h3>
            <div className="grid gap-2">
              {oxygenRequirements.map((oxygen)=>{
                const value=`oxygen:${oxygen}`;
                const checked=draftScopes.includes(value);
                return <label key={value} className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[15px] ${checked?"bg-[#eef6eb]":""}`}>
                  <input type="checkbox" checked={checked} className="h-5 w-5"
                    onChange={()=>setDraftScopes(cur=>checked?cur.filter(x=>x!==value):[...cur,value])}/>
                  <strong>{oxygen}</strong>
                </label>;
              })}
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button onClick={()=>setDraftScopes([])} className="rounded-[10px] border px-4 py-2.5 text-[13px]">전체 범위</button>
              <button onClick={()=>{setQuizScopes(draftScopes);setScopeModalOpen(false);}}
                className="rounded-[10px] bg-[#075f4e] px-5 py-2.5 text-[13px] font-bold text-white">적용</button>
            </div>
          </section>
        </div>
      )}

      <FloatingNav />
    </main>
  );
}
