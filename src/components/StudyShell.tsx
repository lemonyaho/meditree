"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ThemeColor } from "@/lib/content-model";

const ACCENTS: Record<ThemeColor, { accent: string; border: string }> = {
  red: { accent: "#c85c63", border: "#ecd7d8" },
  yellow: { accent: "#b88a22", border: "#eadfbd" },
  blue: { accent: "#527fcb", border: "#d7e0ef" },
  green: { accent: "#168269", border: "#d6e8df" },
};

export type Crumb = { label: string; href?: string };

export default function StudyShell({
  breadcrumbs,
  eyebrow,
  title,
  meta,
  search,
  children,
  accent = "green",
}: {
  breadcrumbs: Crumb[];
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  children: ReactNode;
  accent?: ThemeColor;
}) {
  const theme = ACCENTS[accent];
  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f8faf8] px-5 pb-24 pt-9 text-[#17211d] min-[1220px]:pr-[118px] max-[720px]:px-4 max-[720px]:pt-6">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="flex min-h-[22px] flex-wrap items-center gap-2 text-[13px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="contents">
              <span className="text-[#aeb6b1]">›</span>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
            </span>
          ))}
        </nav>

        <header className="mt-10 max-[720px]:mt-7">
          <p className="text-[13px] font-bold tracking-[0.13em]" style={{ color: theme.accent }}>{eyebrow}</p>
          <h1 className="mt-3 min-h-[58px] text-[clamp(38px,5.2vw,52px)] font-bold leading-[1.06] tracking-[-0.052em] max-[720px]:min-h-0">
            {title}
          </h1>
          <div className="mt-3 min-h-[26px] text-[15px] leading-6 text-[#7a8580]">{meta}</div>

          {search && (
            <div className="mt-7 flex h-[58px] items-center rounded-[14px] border bg-white px-4" style={{ borderColor: theme.border }}>
              <input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder}
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#9ca49f]"
              />
            </div>
          )}
        </header>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
