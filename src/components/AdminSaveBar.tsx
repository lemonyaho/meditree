"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

function getViewHref(
  pathname: string,
  params: URLSearchParams,
): string {
  if (pathname === "/admin") return "/";
  if (pathname === "/admin/lectures") return "/lectures";

  if (pathname === "/admin/lectures/folder") {
    const id = params.get("id");
    return id
      ? `/lectures/system?slug=${encodeURIComponent(id)}`
      : "/lectures";
  }

  if (pathname === "/admin/drugs") return "/drugs";

  if (pathname === "/admin/drugs/folder") {
    const id = params.get("id");
    const file = params.get("file");

    if (id && file) {
      return `/drugs/group?category=${encodeURIComponent(
        id,
      )}&file=${encodeURIComponent(file)}`;
    }

    return id
      ? `/drugs/category?slug=${encodeURIComponent(id)}`
      : "/drugs";
  }

  if (pathname === "/admin/microbiology") return "/microbiology";

  if (pathname === "/admin/microbiology/folder") {
    const id = params.get("id");
    return id
      ? `/microbiology/category?domain=${encodeURIComponent(id)}`
      : "/microbiology";
  }

  return "/";
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M4.5 10.5 12 4l7.5 6.5v8.25a1.25 1.25 0 0 1-1.25 1.25H5.75a1.25 1.25 0 0 1-1.25-1.25V10.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M9.5 20v-6h5v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M8 7H4v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.7 7.3A8 8 0 1 1 4.9 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5V4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M8 4v6h8V4M8 20v-6h8v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M2.8 12s3.2-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.2 5.5-9.2 5.5S2.8 12 2.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/>
    </svg>
  );
}

export default function AdminSaveBar({
  dirty,
  onSave,
  onReset,
  label,
  showStatus = false,
}: {
  dirty: boolean;
  onSave: () => void | Promise<void>;
  onReset: () => void;
  label: string;
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const viewHref = getViewHref(pathname, params);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<
    | { type: "success" | "error"; text: string }
    | null
  >(null);

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    setNotice(null);

    try {
      await onSave();
      setNotice({
        type: "success",
        text: "실제 TXT 저장 완료",
      });
      window.setTimeout(() => setNotice(null), 2600);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSaving(false);
    }
  }

  const baseButton =
    "grid h-[58px] w-[58px] place-items-center border-b border-[#edf0ee] bg-white text-[#66736c] transition hover:bg-[#f5f8f6] max-[720px]:border-b-0 max-[720px]:border-r";

  return (
    <>
      {showStatus && (
        <div className="mb-5 flex items-center gap-2 text-[14px] text-[#758079]">
          <span
            className={`h-2 w-2 rounded-full ${dirty ? "bg-[#e1a33d]" : "bg-[#bfc8c2]"}`}
          />
          <span>{dirty ? "저장되지 않은 변경사항" : label}</span>
        </div>
      )}

      <aside className="fixed right-5 top-1/2 z-50 flex -translate-y-1/2 flex-col overflow-hidden rounded-[18px] border border-[#dfe6e2] bg-white/96 shadow-[0_14px_40px_rgba(19,40,31,0.09)] backdrop-blur-xl max-[720px]:bottom-4 max-[720px]:left-1/2 max-[720px]:right-auto max-[720px]:top-auto max-[720px]:-translate-x-1/2 max-[720px]:translate-y-0 max-[720px]:flex-row">
        <button
          type="button"
          onClick={() => router.push("/")}
          className={baseButton}
          title="Home"
          aria-label="Home"
        >
          <HomeIcon />
        </button>

        <button
          type="button"
          disabled={!dirty}
          onClick={onReset}
          className={`${baseButton} disabled:cursor-default disabled:text-[#c7ceca] disabled:hover:bg-white`}
          title="되돌리기"
          aria-label="되돌리기"
        >
          <UndoIcon />
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="grid h-[58px] w-[58px] place-items-center border-b border-[#075f4e] bg-[#075f4e] text-white transition hover:bg-[#064f42] disabled:opacity-70 max-[720px]:border-b-0 max-[720px]:border-r"
          title={saving ? "저장 중" : "저장"}
          aria-label={saving ? "저장 중" : "저장"}
        >
          {saving ? (
            <span className="text-[12px] font-bold">•••</span>
          ) : (
            <SaveIcon />
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push(viewHref)}
          className="grid h-[58px] w-[58px] place-items-center bg-[#eef6eb] text-[#075f4e] transition hover:bg-[#e5f1e1]"
          title="View"
          aria-label="View"
        >
          <ViewIcon />
        </button>
      </aside>

      {notice && (
        <div
          className={`fixed bottom-6 left-1/2 z-[210] max-w-[min(620px,calc(100%-32px))] -translate-x-1/2 rounded-[12px] border px-4 py-3 text-[13px] font-semibold shadow-[0_12px_34px_rgba(20,38,30,0.12)] ${
            notice.type === "success"
              ? "border-[#cfe1d4] bg-[#f2f9f1] text-[#075f4e]"
              : "border-[#efd1d1] bg-[#fff6f6] text-[#9a4f4f]"
          }`}
        >
          {notice.text}
        </div>
      )}
    </>
  );
}
