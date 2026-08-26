"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import ScientificName from "@/components/ScientificName";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  parseMicrobiologyTxt,
  type MicrobeDomain,
} from "@/lib/txt-content";

type Mode="study"|"quiz";

function randomIndex(length:number,current=-1){
  if(length<=1)return 0;
  let next=Math.floor(Math.random()*length);
  while(next===current)next=Math.floor(Math.random()*length);
  return next;
}

const oxygenStyles:Record<string,string>={
  "Obligate aerobe":"bg-[#e8f2ff] text-[#315f92]",
  "Microaerophile":"bg-[#f2ecff] text-[#69509a]",
  "Facultative anaerobe":"bg-[#fff3dd] text-[#956516]",
  "Obligate anaerobe":"bg-[#fdebed] text-[#994e58]",
};

function Content(){
  const params=useSearchParams();
  const domainId=params.get("domain");
  const fileId=params.get("file");
  const oxygen=params.get("oxygen");
  const library=useTxtLibrary();
  const folder=library.microbiology.folders.find((item)=>item.id===domainId);

  const [mode,setMode]=useState<Mode>("study");
  const [query,setQuery]=useState("");
  const [quizIndex,setQuizIndex]=useState(0);
  const [answerVisible,setAnswerVisible]=useState(false);

  const allFiles=useMemo(
    ()=>folder?folder.files.map((file)=>({
      file,
      parsed:parseMicrobiologyTxt(file.id,file.content,folder.id as MicrobeDomain),
    })):[],
    [folder],
  );

  const selectedFile=allFiles.find(({file})=>file.id===fileId);
  const title=oxygen??selectedFile?.parsed.title??"";

  const organisms=useMemo(()=>{
    const base=fileId&&selectedFile
      ? selectedFile.parsed.organisms
      : allFiles.flatMap(({parsed})=>parsed.organisms);

    return base.filter((organism)=>{
      if(oxygen&&organism.oxygen!==oxygen)return false;
      const normalized=query.trim().toLowerCase();
      return !normalized||[
        organism.name,organism.gram??"",organism.morphology??"",organism.oxygen??"",...organism.keyFacts
      ].join(" ").toLowerCase().includes(normalized);
    });
  },[allFiles,fileId,selectedFile,oxygen,query]);

  useEffect(()=>{
    if(mode==="quiz"&&organisms.length){
      setQuizIndex(randomIndex(organisms.length));
      setAnswerVisible(false);
    }
  },[mode,organisms.length]);

  if(!folder||(!fileId&&!oxygen))return null;
  const current=organisms.length?organisms[quizIndex%organisms.length]:null;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1020px,100%)]">
        <nav className="mb-10 flex flex-wrap gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link><span>›</span><Link href="/microbiology">미생물 공부 도구</Link><span>›</span>
          <Link href={`/microbiology/category?domain=${encodeURIComponent(folder.id)}`}>{folder.name}</Link><span>›</span><span>{title}</span>
        </nav>

        <header className="mb-8">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">{oxygen?"OXYGEN GROUP":"TXT GROUP"}</p>
          <h1 className="mt-2 text-[clamp(36px,6vw,52px)] font-bold">{title}</h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input value={query} onChange={(e)=>setQuery(e.target.value)}
              placeholder="미생물명 · 형태 · 특징 검색" className="w-full text-[15px] outline-none"/>
          </div>

          <div className="mt-4 inline-flex rounded-[12px] border bg-white p-1">
            <button onClick={()=>setMode("study")} className={`rounded-[9px] px-5 py-2.5 text-[14px] ${mode==="study"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>공부</button>
            <button onClick={()=>setMode("quiz")} className={`rounded-[9px] px-5 py-2.5 text-[14px] ${mode==="quiz"?"bg-[#eaf4e8] font-bold text-[#075f4e]":""}`}>퀴즈</button>
          </div>
        </header>

        {mode==="study"?(
          <section className="grid gap-3">
            {organisms.map((microbe)=>(
              <details key={microbe.id} className="overflow-hidden rounded-[16px] border bg-white">
                <summary className="flex min-h-[68px] cursor-pointer list-none items-center justify-between px-5">
                  <ScientificName name={microbe.name} domain={microbe.domain} className="text-[19px] font-semibold"/><span>↓</span>
                </summary>
                <div className="border-t bg-[#fafcfb] p-5">
                  <div className="flex flex-wrap gap-3">
                    {microbe.gram&&<div className="rounded-[12px] bg-[#eaf5ed] px-4 py-3 text-[#385f43]"><span className="block text-[12px] font-semibold">GRAM</span><strong className="mt-1 block text-[15px]">{microbe.gram}</strong></div>}
                    {microbe.morphology&&<div className="rounded-[12px] bg-[#eef2ff] px-4 py-3 text-[#52678d]"><span className="block text-[12px] font-semibold">MORPHOLOGY</span><strong className="mt-1 block text-[15px]">{microbe.morphology}</strong></div>}
                    {microbe.oxygen&&<div className={`rounded-[12px] px-4 py-3 ${oxygenStyles[microbe.oxygen]??"bg-[#f1f3f2] text-[#59635e]"}`}><span className="block text-[12px] font-semibold">OXYGEN</span><strong className="mt-1 block text-[15px]">{microbe.oxygen}</strong></div>}
                  </div>

                  {microbe.keyFacts.length>0&&(
                    <details className="mt-4 rounded-[12px] border bg-white">
                      <summary className="flex min-h-[46px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-semibold"><span>추가 특징</span><span className="text-[#168269]">보기</span></summary>
                      <div className="border-t px-4 py-4 text-[14px] leading-6">{microbe.keyFacts.join(" · ")}</div>
                    </details>
                  )}
                </div>
              </details>
            ))}
          </section>
        ):(
          <section className="rounded-[22px] border bg-white p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[24px] font-semibold">퀴즈</h2>
              <span className="text-[14px] font-semibold text-[#168269]">퀴즈 범위선택 : {title}</span>
            </div>

            {current?(
              <>
                <div className="flex min-h-[240px] items-center justify-center">
                  <ScientificName name={current.name} domain={current.domain} className="text-[42px] font-semibold"/>
                </div>
                {!answerVisible?(
                  <button onClick={()=>setAnswerVisible(true)} className="w-full rounded-[13px] bg-[#075f4e] py-4 text-[15px] font-bold text-white">답 보기</button>
                ):(
                  <div className="rounded-[15px] bg-[#f4f7f5] p-6 text-[15px]">
                    {current.gram&&<p><span className="mr-5 text-[#7f8a84]">Gram</span><strong>{current.gram}</strong></p>}
                    {current.morphology&&<p className="mt-3"><span className="mr-5 text-[#7f8a84]">형태</span><strong>{current.morphology}</strong></p>}
                    {current.oxygen&&<p className="mt-3"><span className="mr-5 text-[#7f8a84]">산소</span><strong>{current.oxygen}</strong></p>}
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

export default function MicrobiologyGroupPage(){
  return <Suspense fallback={null}><Content/></Suspense>;
}
