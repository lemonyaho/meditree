"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import ScientificName from "@/components/ScientificName";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  oxygenRequirements,
  parseMicrobiologyTxt,
  type MicrobeDomain,
} from "@/lib/txt-content";

type Mode = "study" | "quiz";
type ViewMode = "subgroup" | "oxygen";

function randomIndex(length: number, current = -1) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

function Content() {
  const params = useSearchParams();
  const domainId = params.get("domain");
  const library = useTxtLibrary();
  const folder = library.microbiology.folders.find((item)=>item.id===domainId);

  const [mode,setMode]=useState<Mode>("study");
  const [viewMode,setViewMode]=useState<ViewMode>("subgroup");
  const [query,setQuery]=useState("");
  const [quizIndex,setQuizIndex]=useState(0);
  const [answerVisible,setAnswerVisible]=useState(false);

  const parsedFiles = useMemo(
    () =>
      folder
        ? folder.files.map((file)=>({
            file,
            parsed: parseMicrobiologyTxt(file.id,file.content,folder.id as MicrobeDomain),
          }))
        : [],
    [folder],
  );

  const organisms = useMemo(
    ()=>parsedFiles.flatMap(({file,parsed})=>parsed.organisms.map((organism)=>({organism,file,subgroup:parsed.title}))),
    [parsedFiles],
  );

  const normalized=query.trim().toLowerCase();
  const visibleFiles=useMemo(
    ()=>normalized
      ? parsedFiles.filter(({file,parsed})=>[
          file.name,parsed.title,
          ...parsed.organisms.flatMap((o)=>[o.name,o.gram??"",o.morphology??"",o.oxygen??"",...o.keyFacts])
        ].join(" ").toLowerCase().includes(normalized))
      : parsedFiles,
    [parsedFiles,normalized],
  );

  const oxygenGroups=useMemo(
    ()=>domainId==="bacteria"
      ? oxygenRequirements.filter((oxygen)=>organisms.some(({organism})=>organism.oxygen===oxygen))
      : [],
    [domainId,organisms],
  );

  useEffect(()=>{
    if(mode==="quiz"&&organisms.length){
      setQuizIndex(randomIndex(organisms.length));
      setAnswerVisible(false);
    }
  },[mode,organisms.length]);

  if(!folder)return null;
  const current=organisms.length?organisms[quizIndex%organisms.length]:null;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link><span>›</span><Link href="/microbiology">미생물 공부 도구</Link><span>›</span><span>{folder.name}</span>
        </nav>

        <header className="mb-8">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">{folder.english}</p>
          <h1 className="mt-2 text-[clamp(40px,6vw,58px)] font-bold">{folder.name}</h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input value={query} onChange={(e)=>setQuery(e.target.value)}
              placeholder={`${folder.name} 안에서 검색`} className="w-full text-[15px] outline-none"/>
          </div>

          <div className="mt-4 inline-flex rounded-[12px] border bg-white p-1">
            <button onClick={()=>setMode("study")} className={`rounded-[9px] px-5 py-2.5 text-[14px] ${mode==="study"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>공부</button>
            <button onClick={()=>setMode("quiz")} className={`rounded-[9px] px-5 py-2.5 text-[14px] ${mode==="quiz"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>퀴즈</button>
          </div>
        </header>

        {mode==="study" ? (
          <>
            {domainId==="bacteria"&&(
              <div className="mb-6 inline-flex rounded-[12px] border bg-white p-1">
                <button onClick={()=>setViewMode("subgroup")} className={`rounded-[9px] px-4 py-2.5 text-[14px] ${viewMode==="subgroup"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>Gram · 특수군 기준</button>
                <button onClick={()=>setViewMode("oxygen")} className={`rounded-[9px] px-4 py-2.5 text-[14px] ${viewMode==="oxygen"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>산소 요구도 기준</button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-3 max-[760px]:grid-cols-2 max-[520px]:grid-cols-1">
              {viewMode==="oxygen"&&domainId==="bacteria"
                ? oxygenGroups.map((oxygen)=>(
                    <Link key={oxygen} href={`/microbiology/group?domain=${encodeURIComponent(folder.id)}&oxygen=${encodeURIComponent(oxygen)}`}
                      className="flex min-h-[130px] flex-col justify-between rounded-[18px] border bg-white p-5">
                      <div><span className="text-[12px] font-bold tracking-[0.1em] text-[#168269]">OXYGEN</span><h2 className="mt-3 text-[21px] font-semibold">{oxygen}</h2></div>
                      <span className="self-end text-[22px] text-[#075f4e]">→</span>
                    </Link>
                  ))
                : visibleFiles.map(({file,parsed})=>(
                    <Link key={file.id} href={`/microbiology/group?domain=${encodeURIComponent(folder.id)}&file=${encodeURIComponent(file.id)}`}
                      className="flex min-h-[130px] flex-col justify-between rounded-[18px] border bg-white p-5">
                      <div><span className="text-[12px] font-bold tracking-[0.1em] text-[#168269]">TXT GROUP</span><h2 className="mt-3 text-[21px] font-semibold">{parsed.title}</h2></div>
                      <span className="self-end text-[22px] text-[#075f4e]">→</span>
                    </Link>
                  ))}
            </div>
          </>
        ) : (
          <section className="rounded-[22px] border bg-white p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold">퀴즈</h2>
              <span className="text-[14px] font-semibold text-[#168269]">퀴즈 범위선택 : {folder.name}</span>
            </div>

            {current?(
              <>
                <div className="flex min-h-[240px] items-center justify-center">
                  <ScientificName name={current.organism.name} domain={current.organism.domain} className="text-[42px] font-semibold"/>
                </div>
                {!answerVisible?(
                  <button onClick={()=>setAnswerVisible(true)} className="w-full rounded-[13px] bg-[#075f4e] py-4 text-[15px] font-bold text-white">답 보기</button>
                ):(
                  <div className="rounded-[15px] bg-[#f4f7f5] p-6 text-[15px]">
                    <p><span className="mr-5 text-[#7f8a84]">분류</span><strong>{current.subgroup}</strong></p>
                    {current.organism.gram&&<p className="mt-3"><span className="mr-5 text-[#7f8a84]">Gram</span><strong>{current.organism.gram}</strong></p>}
                    {current.organism.morphology&&<p className="mt-3"><span className="mr-5 text-[#7f8a84]">형태</span><strong>{current.organism.morphology}</strong></p>}
                    {current.organism.oxygen&&<p className="mt-3"><span className="mr-5 text-[#7f8a84]">산소</span><strong>{current.organism.oxygen}</strong></p>}
                    <button onClick={()=>{setQuizIndex((i)=>randomIndex(organisms.length,i));setAnswerVisible(false);}}
                      className="mt-6 w-full rounded-[11px] bg-white py-3.5 text-[14px] font-bold text-[#075f4e]">랜덤 다음 문제 →</button>
                  </div>
                )}
              </>
            ):<div className="py-16 text-center">출제할 미생물이 없습니다.</div>}
          </section>
        )}
      </div>
      <FloatingNav/>
    </main>
  );
}

export default function MicrobiologyCategoryPage(){
  return <Suspense fallback={null}><Content/></Suspense>;
}
