"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminActionRail } from "@/components/ActionRail";
import { readContentTree, writeContentTree } from "@/components/useContentTree";
import { APP_VERSION, type ContentTree, type ModuleId } from "@/lib/content-model";

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const editInput = "w-full min-w-0 rounded-[9px] border border-transparent bg-transparent px-1 py-0.5 outline-none transition hover:border-[#dce6e0] hover:bg-white/70 focus:border-[#9fc9b8] focus:bg-white";

function OrderControls({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex gap-1.5">
      <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="grid h-9 w-9 place-items-center rounded-[9px] border bg-white/90 text-[13px] disabled:opacity-30" title="위로">↑</button>
      <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="grid h-9 w-9 place-items-center rounded-[9px] border bg-white/90 text-[13px] disabled:opacity-30" title="아래로">↓</button>
    </div>
  );
}

export default function SiteAdminEditor() {
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void readContentTree().then((current) => {
      if (!active) return;
      setTree(current);
      setSaved(JSON.stringify(current));
    });
    return () => {
      active = false;
    };
  }, []);

  const orderedModules = useMemo(
    () => (tree ? tree.site.moduleOrder.map((id) => tree.modules[id]) : []),
    [tree],
  );

  if (!tree) {
    return <div className="rounded-[16px] border border-dashed bg-white p-8 text-center text-[14px] text-[#7d8781]">설정 불러오는 중…</div>;
  }

  const patchSite = (patch: Partial<ContentTree["site"]>) =>
    setTree((current) => current ? { ...current, site: { ...current.site, ...patch } } : current);

  const patchModule = (id: ModuleId, patch: Partial<ContentTree["modules"][ModuleId]>) =>
    setTree((current) =>
      current
        ? { ...current, modules: { ...current.modules, [id]: { ...current.modules[id], ...patch } } }
        : current,
    );

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await writeContentTree(tree);
      setTree(result.tree);
      setSaved(JSON.stringify(result.tree));
      setNotice("홈 · UI 설정 저장 완료");
      window.setTimeout(() => setNotice(""), 2200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const [featured, ...others] = orderedModules;

  return (
    <>
      <section className="rounded-[22px] border border-[#e1e7e3] bg-white p-5 shadow-[0_10px_28px_rgba(19,40,31,0.035)] max-[620px]:p-4">
        <div className="rounded-[18px] bg-[#f8faf8] px-5 pb-7 pt-6 text-center max-[620px]:px-3">
          <input
            aria-label="상단 영문 문구"
            value={tree.site.eyebrow}
            onChange={(e) => patchSite({ eyebrow: e.target.value })}
            className={`${editInput} mx-auto max-w-[420px] text-center text-[12px] font-bold leading-none tracking-[0.17em] text-[#168269]`}
          />
          <div className="mt-2.5 flex items-center justify-center gap-3">
            <img src="/meditree-logo.png" alt="MediTree" className="h-[64px] w-[64px] object-contain max-[620px]:h-[50px] max-[620px]:w-[50px]" />
            <input
              aria-label="브랜드명"
              value={tree.site.brandTitle}
              onChange={(e) => patchSite({ brandTitle: e.target.value })}
              className={`${editInput} max-w-[520px] text-[clamp(42px,7vw,66px)] font-bold leading-[0.95] tracking-[-0.06em]`}
            />
          </div>
          <input
            aria-label="홈 설명"
            value={tree.site.subtitle}
            onChange={(e) => patchSite({ subtitle: e.target.value })}
            className={`${editInput} mx-auto mt-3 max-w-[760px] text-center text-[15px] leading-6 text-[#7a8580]`}
          />
        </div>

        <div className="mt-5">
          {featured && (
            <article className="relative mb-4 flex min-h-[220px] flex-col justify-between rounded-[24px] border border-[#c8dfbf] bg-[linear-gradient(135deg,#f3faef,#e8f4df)] p-8 shadow-[0_12px_34px_rgba(32,76,48,0.06)] max-[620px]:p-6">
              <div className="absolute right-5 top-5 flex items-center gap-2">
                <OrderControls index={0} count={orderedModules.length} onMove={(direction) => patchSite({ moduleOrder: move(tree.site.moduleOrder, 0, direction) })} />
                <Link href={`/admin/content?module=${featured.id}&mode=manage`} className="flex h-9 items-center rounded-[9px] border border-[#bcd8cd] bg-white/90 px-3 text-[12px] font-semibold text-[#075f4e]">콘텐츠 관리 →</Link>
              </div>
              <div className="pr-[210px] max-[720px]:pr-0 max-[720px]:pt-12">
                <input value={featured.english} onChange={(e) => patchModule(featured.id, { english: e.target.value })} className={`${editInput} text-[13px] font-bold tracking-[0.13em] text-[#168269]`} aria-label={`${featured.title} 영문명`} />
                <input value={featured.title} onChange={(e) => patchModule(featured.id, { title: e.target.value })} className={`${editInput} mt-7 text-[31px] font-semibold tracking-[-0.04em]`} aria-label="모듈 제목" />
                <textarea value={featured.description} onChange={(e) => patchModule(featured.id, { description: e.target.value })} className={`${editInput} mt-3 min-h-[58px] resize-none text-[15px] leading-7 text-[#728078]`} aria-label="모듈 설명" />
              </div>
              <span className="self-end text-[28px] text-[#075f4e]">→</span>
            </article>
          )}

          <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
            {others.map((module, otherIndex) => {
              const index = otherIndex + 1;
              return (
                <article key={module.id} className="relative flex min-h-[220px] flex-col justify-between rounded-[22px] border border-[#e0e6e2] bg-white p-6 shadow-[0_10px_28px_rgba(19,40,31,0.04)]">
                  <div className="absolute right-4 top-4 flex items-center gap-1.5">
                    <OrderControls index={index} count={orderedModules.length} onMove={(direction) => patchSite({ moduleOrder: move(tree.site.moduleOrder, index, direction) })} />
                  </div>
                  <div className="pt-9">
                    <input value={module.english} onChange={(e) => patchModule(module.id, { english: e.target.value })} className={`${editInput} text-[13px] font-bold tracking-[0.12em] text-[#168269]`} aria-label={`${module.title} 영문명`} />
                    <input value={module.title} onChange={(e) => patchModule(module.id, { title: e.target.value })} className={`${editInput} mt-6 text-[25px] font-semibold tracking-[-0.035em]`} aria-label="모듈 제목" />
                    <textarea value={module.description} onChange={(e) => patchModule(module.id, { description: e.target.value })} className={`${editInput} mt-2 min-h-[72px] resize-none text-[14px] leading-6 text-[#7a8580]`} aria-label="모듈 설명" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <Link href={`/admin/content?module=${module.id}&mode=manage`} className="flex h-9 items-center rounded-[9px] border border-[#cfe1d8] bg-[#eef6eb] px-3 text-[12px] font-semibold text-[#075f4e]">콘텐츠 관리 →</Link>
                    <span className="text-[25px] text-[#075f4e]">→</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t pt-6 text-[13px] font-normal text-[#929b96]">
          <span>MediTree v{APP_VERSION}</span>
          <input
            aria-label="Footer 저작권"
            value={tree.site.footerCopyright}
            onChange={(e) => patchSite({ footerCopyright: e.target.value })}
            className="min-w-[260px] max-w-[520px] flex-1 rounded-[8px] border border-transparent bg-transparent px-2 py-1 text-center font-normal outline-none hover:border-[#dfe6e2] focus:border-[#9fc9b8] focus:bg-white"
          />
        </div>
      </section>

      <AdminActionRail saving={saving} onSave={() => void save()} viewHref="/" />

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-[220] -translate-x-1/2 rounded-[12px] border bg-white px-4 py-3 text-[13px] font-semibold shadow-[0_12px_34px_rgba(20,38,30,0.12)]">{notice}</div>
      )}
    </>
  );
}
