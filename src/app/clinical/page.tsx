import Link from "next/link";
import FloatingNav from "@/components/FloatingNav";

export default function ClinicalPage() {
  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-10 flex gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <span>임상 단권화</span>
        </nav>

        <p className="text-[13px] font-bold tracking-[0.13em] text-[#168269]">
          CLINICAL
        </p>
        <h1 className="mt-2 text-[clamp(42px,7vw,60px)] font-bold tracking-[-0.05em]">
          임상 단권화
        </h1>

        <div className="mt-8 flex min-h-[58px] items-center rounded-[15px] border border-[#dfe6e2] bg-white px-4">
          <input
            placeholder="질환 · 증상 · 상황 검색"
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </div>

        <section className="mt-7 rounded-[22px] border border-dashed border-[#d4ddd7] bg-white p-10 text-center">
          <p className="text-[18px] font-semibold">임상 단권화 준비 중</p>
          <p className="mt-3 text-[15px] text-[#818b86]">
            이후 임상 모듈을 이 구조에 연결하면 됩니다.
          </p>
        </section>
      </div>

      <FloatingNav />
    </main>
  );
}
