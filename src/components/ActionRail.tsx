"use client";

import { useRouter } from "next/navigation";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M4.5 10.5 12 4l7.5 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25H5.75a1.25 1.25 0 0 1-1.25-1.25V10.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 20v-6h5v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ParentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M19 12H5M10 7l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="m8 9 4-4 4 4M8 15l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19.1 13.6a7.3 7.3 0 0 0 .05-3.2l2-1.5-2-3.4-2.45 1a7.5 7.5 0 0 0-2.75-1.6L13.6 2h-4l-.35 2.9A7.5 7.5 0 0 0 6.5 6.5l-2.45-1-2 3.4 2 1.5a7.3 7.3 0 0 0 .05 3.2l-2.05 1.5 2 3.4 2.45-1a7.5 7.5 0 0 0 2.75 1.6L9.6 22h4l.35-2.9a7.5 7.5 0 0 0 2.75-1.6l2.45 1 2-3.4-2.05-1.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5V4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 4v6h8V4M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M2.8 12s3.2-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

const railClass = "fixed right-5 top-[68%] z-50 flex -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-[#dfe6e2] bg-white/96 shadow-[0_14px_40px_rgba(19,40,31,0.09)] backdrop-blur-xl max-[720px]:bottom-4 max-[720px]:left-1/2 max-[720px]:right-auto max-[720px]:top-auto max-[720px]:-translate-x-1/2 max-[720px]:translate-y-0 max-[720px]:flex-row";
const baseButton = "grid h-[58px] w-[58px] place-items-center border-b border-[#edf0ee] bg-white text-[#66736c] transition hover:bg-[#f5f8f6] disabled:cursor-default disabled:text-[#c7ceca] disabled:hover:bg-white max-[720px]:border-b-0 max-[720px]:border-r";

export function ViewActionRail({
  adminHref,
  parentHref,
}: {
  adminHref: string;
  parentHref?: string;
}) {
  const router = useRouter();
  return (
    <nav aria-label="빠른 이동" className={railClass}>
      <button type="button" onClick={() => router.push("/")} className={baseButton} title="홈" aria-label="홈"><HomeIcon /></button>
      <button type="button" disabled={!parentHref} onClick={() => parentHref && router.push(parentHref)} className={baseButton} title="상위 페이지" aria-label="상위 페이지"><ParentIcon /></button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("meditree:collapse-all"))} className={baseButton} title="토글 전체 닫기" aria-label="토글 전체 닫기"><CollapseIcon /></button>
      <button type="button" onClick={() => router.push(adminHref)} className="grid h-[58px] w-[58px] place-items-center bg-[#eef6eb] text-[#075f4e] transition hover:bg-[#e5f1e1]" title="관리자" aria-label="관리자"><AdminIcon /></button>
    </nav>
  );
}

export function AdminActionRail({
  saving,
  onSave,
  viewHref,
  parentHref,
  onNavigate,
}: {
  saving: boolean;
  onSave: () => void;
  viewHref: string;
  parentHref?: string;
  onNavigate?: (href: string) => void;
}) {
  const router = useRouter();

  const navigate = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
      return;
    }

    router.push(href);
  };
  return (
    <aside className={railClass} aria-label="관리자 빠른 이동">
      <button type="button" onClick={() => navigate("/")} className={baseButton} title="홈" aria-label="홈"><HomeIcon /></button>
      <button type="button" disabled={!parentHref} onClick={() => parentHref && navigate(parentHref)} className={baseButton} title="상위 관리자 페이지" aria-label="상위 관리자 페이지"><ParentIcon /></button>
      <button type="button" disabled={saving} onClick={onSave} className="grid h-[58px] w-[58px] place-items-center border-b border-[#075f4e] bg-[#075f4e] text-white transition hover:bg-[#064f42] disabled:opacity-70 max-[720px]:border-b-0 max-[720px]:border-r" title={saving ? "저장 중" : "저장"} aria-label={saving ? "저장 중" : "저장"}>
        {saving ? <span className="text-[12px] font-bold">•••</span> : <SaveIcon />}
      </button>
      <button type="button" onClick={() => navigate(viewHref)} className="grid h-[58px] w-[58px] place-items-center bg-[#eef6eb] text-[#075f4e] transition hover:bg-[#e5f1e1]" title="View" aria-label="View"><ViewIcon /></button>
    </aside>
  );
}
