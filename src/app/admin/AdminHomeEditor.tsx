"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminSaveBar from "@/components/AdminSaveBar";
import {
  cloneDefaultHomeContent,
  type HomeContent,
  type HomeModule,
} from "@/lib/home-content";
import {
  readHomeContent,
  writeHomeContent,
} from "@/components/useHomeContent";

const MODULE_ADMIN_HREF: Partial<Record<HomeModule["id"], string>> = {
  lectures: "/admin/lectures",
  drugs: "/admin/drugs",
  microbiology: "/admin/microbiology",
};

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function EditableModuleText({
  item,
  large = false,
  onChange,
}: {
  item: HomeModule;
  large?: boolean;
  onChange: (next: HomeModule) => void;
}) {
  return (
    <div className="min-w-0">
      <input
        value={item.english}
        onChange={(event) =>
          onChange({ ...item, english: event.target.value })
        }
        aria-label={`${item.title} 영문명`}
        className="w-full bg-transparent text-[13px] font-bold tracking-[0.13em] text-[#168269] outline-none"
      />

      <input
        value={item.title}
        onChange={(event) =>
          onChange({ ...item, title: event.target.value })
        }
        aria-label={`${item.title} 제목`}
        className={`mt-7 w-full bg-transparent font-semibold tracking-[-0.04em] outline-none ${
          large ? "text-[31px]" : "text-[25px]"
        }`}
      />

      <textarea
        rows={large ? 2 : 3}
        value={item.description}
        onChange={(event) =>
          onChange({ ...item, description: event.target.value })
        }
        aria-label={`${item.title} 설명`}
        className={`mt-3 w-full resize-none bg-transparent leading-6 text-[#7a8580] outline-none ${
          large ? "text-[16px]" : "text-[15px]"
        }`}
      />
    </div>
  );
}

function OrderControls({
  index,
  total,
  title,
  onMove,
}: {
  index: number;
  total: number;
  title: string;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="absolute bottom-5 right-5 flex gap-2">
      <span className="mr-1 self-center text-[12px] font-semibold tabular-nums text-[#a0aaa4]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border bg-white/90 text-[15px] text-[#5f6b64] transition hover:bg-white disabled:opacity-25"
        title="앞으로"
        aria-label={`${title} 앞으로 이동`}
      >
        ←
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        className="flex h-9 w-9 items-center justify-center rounded-[9px] border bg-white/90 text-[15px] text-[#5f6b64] transition hover:bg-white disabled:opacity-25"
        title="뒤로"
        aria-label={`${title} 뒤로 이동`}
      >
        →
      </button>
    </div>
  );
}

export default function AdminHomeEditor() {
  const [content, setContent] = useState<HomeContent>(
    cloneDefaultHomeContent(),
  );
  const [saved, setSaved] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = readHomeContent();
    setContent(current);
    setSaved(JSON.stringify(current));
    setReady(true);
  }, []);

  const snapshot = useMemo(() => JSON.stringify(content), [content]);
  const dirty = ready && Boolean(saved) && snapshot !== saved;
  const [featured, ...lower] = content.modules;

  function updateModule(next: HomeModule) {
    setContent((current) => ({
      ...current,
      modules: current.modules.map((item) =>
        item.id === next.id ? next : item,
      ),
    }));
  }

  function moveModule(index: number, direction: -1 | 1) {
    setContent((current) => ({
      ...current,
      modules: move(current.modules, index, direction),
    }));
  }

  return (
    <div>
      <AdminSaveBar
        dirty={dirty}
        label="홈페이지 편집"
        showStatus={false}
        onReset={() => {
          if (!saved) return;
          setContent(JSON.parse(saved));
        }}
        onSave={() => {
          writeHomeContent(content);
          setSaved(snapshot);
        }}
      />

      <section className="mb-10 rounded-[22px] border bg-white px-6 py-7 text-center shadow-[0_8px_24px_rgba(19,40,31,0.025)]">
        <input
          value={content.eyebrow}
          onChange={(event) =>
            setContent((current) => ({
              ...current,
              eyebrow: event.target.value,
            }))
          }
          aria-label="홈 상단 영문 문구"
          className="mx-auto block w-full bg-transparent text-center text-[13px] font-bold tracking-[0.18em] text-[#168269] outline-none"
        />

        <div className="mt-4 flex items-center justify-center gap-4">
          <img
            src="/meditree-logo.png"
            alt="MediTree"
            className="h-[68px] w-[68px] object-contain"
          />
          <input
            value={content.brandTitle}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                brandTitle: event.target.value,
              }))
            }
            aria-label="홈 브랜드명"
            className="w-[min(520px,70%)] bg-transparent text-[clamp(42px,7vw,66px)] font-bold tracking-[-0.06em] outline-none"
          />
        </div>

        <input
          value={content.subtitle}
          onChange={(event) =>
            setContent((current) => ({
              ...current,
              subtitle: event.target.value,
            }))
          }
          aria-label="홈 소개문구"
          className="mx-auto mt-5 block w-[min(760px,100%)] bg-transparent text-center text-[16px] text-[#7a8580] outline-none"
        />
      </section>

      {featured && (
        <article className="relative mb-4 min-h-[220px] rounded-[24px] border border-[#c8dfbf] bg-[linear-gradient(135deg,#f3faef,#e8f4df)] p-8 pb-20 shadow-[0_12px_34px_rgba(32,76,48,0.055)]">
          <EditableModuleText
            item={featured}
            onChange={updateModule}
            large
          />

          {MODULE_ADMIN_HREF[featured.id] && (
            <Link
              href={MODULE_ADMIN_HREF[featured.id]!}
              className="absolute bottom-6 left-8 rounded-[10px] border border-[#d9e4dc] bg-white/85 px-4 py-2.5 text-[13px] font-semibold text-[#075f4e] shadow-[0_3px_10px_rgba(19,40,31,0.035)] transition hover:bg-white"
            >
              TXT 편집 →
            </Link>
          )}

          <OrderControls
            index={0}
            total={content.modules.length}
            title={featured.title}
            onMove={(direction) => moveModule(0, direction)}
          />
        </article>
      )}

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        {lower.map((item, lowerIndex) => {
          const index = lowerIndex + 1;
          return (
            <article
              key={item.id}
              className="relative min-h-[225px] rounded-[22px] border border-[#e0e6e2] bg-white p-7 pb-20 shadow-[0_10px_28px_rgba(19,40,31,0.04)]"
            >
              <EditableModuleText
                item={item}
                onChange={updateModule}
              />

              {MODULE_ADMIN_HREF[item.id] && (
                <Link
                  href={MODULE_ADMIN_HREF[item.id]!}
                  className="absolute bottom-5 left-7 rounded-[10px] border border-[#dfe6e2] bg-[#f7faf8] px-3.5 py-2 text-[13px] font-semibold text-[#075f4e] transition hover:bg-[#eef6eb]"
                >
                  TXT 편집 →
                </Link>
              )}

              <OrderControls
                index={index}
                total={content.modules.length}
                title={item.title}
                onMove={(direction) => moveModule(index, direction)}
              />
            </article>
          );
        })}
      </div>

      <section className="mt-8 rounded-[18px] border bg-white p-5">
        <p className="mb-4 text-[13px] font-bold tracking-[0.11em] text-[#168269]">
          FOOTER
        </p>
        <div className="grid grid-cols-[180px_1fr] gap-3 max-[640px]:grid-cols-1">
          <input
            value={content.footerAdminLabel}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                footerAdminLabel: event.target.value,
              }))
            }
            aria-label="Footer 관리자 링크 문구"
            className="rounded-[10px] border bg-[#fafcfb] px-3 py-3 text-[14px] outline-none"
          />
          <input
            value={content.footerCopyright}
            onChange={(event) =>
              setContent((current) => ({
                ...current,
                footerCopyright: event.target.value,
              }))
            }
            aria-label="Footer 저작권 문구"
            className="rounded-[10px] border bg-[#fafcfb] px-3 py-3 text-[14px] outline-none"
          />
        </div>
      </section>
    </div>
  );
}
