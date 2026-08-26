"use client";

import { useRouter } from "next/navigation";

export default function FloatingNav() {
  const router = useRouter();

  return (
    <nav
      aria-label="빠른 이동"
      className="fixed right-5 top-1/2 z-40 flex -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-[#dfe6e2] bg-white/95 shadow-[0_14px_40px_rgba(19,40,31,0.09)] backdrop-blur-xl max-[720px]:bottom-4 max-[720px]:left-1/2 max-[720px]:right-auto max-[720px]:top-auto max-[720px]:-translate-x-1/2 max-[720px]:translate-y-0 max-[720px]:flex-row"
    >
      <button
        type="button"
        onClick={() => router.push("/")}
        title="홈"
        className="h-14 w-14 border-b border-[#edf0ee] text-[21px] text-[#66736c] hover:bg-[#f5f8f6] max-[720px]:border-b-0 max-[720px]:border-r"
      >
        ⌂
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        title="뒤로"
        className="h-14 w-14 border-b border-[#edf0ee] text-[24px] text-[#66736c] hover:bg-[#f5f8f6] max-[720px]:border-b-0 max-[720px]:border-r"
      >
        ←
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("meditree:collapse-all"))}
        title="모두 접기"
        className="h-14 w-14 border-b border-[#edf0ee] text-[20px] text-[#66736c] hover:bg-[#f5f8f6] max-[720px]:border-b-0 max-[720px]:border-r"
      >
        ↕
      </button>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        title="맨 위로"
        className="h-14 w-14 text-[24px] text-[#66736c] hover:bg-[#f5f8f6]"
      >
        ↑
      </button>
    </nav>
  );
}
