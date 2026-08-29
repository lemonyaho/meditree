"use client";

import Link from "next/link";
import useContentTree from "@/components/useContentTree";
import { ViewActionRail } from "@/components/ActionRail";
import {
  MODULE_HREFS,
  type ModuleId,
} from "@/lib/content-model";

function homeCardStyle(moduleId: ModuleId) {
  if (moduleId === "clinical") {
    return {
      card: "border-[#c7dfbd] bg-[linear-gradient(145deg,#f1f9ed,#e9f5e3)]",
      accent: "#0e765f",
    };
  }

  if (moduleId === "cases") {
    return {
      card: "border-[#cee2c7] bg-[linear-gradient(145deg,#f5faef,#edf7e8)]",
      accent: "#168269",
    };
  }

  if (moduleId === "lectures") {
    return {
      card: "border-[#d7e6d0] bg-[linear-gradient(145deg,#f8fbf4,#f1f8ed)]",
      accent: "#2b826b",
    };
  }

  return {
    card: "border-[#e0e6e2] bg-white",
    accent: "#168269",
  };
}

export default function Home() {
  const tree = useContentTree();
  const modules = tree.site.moduleOrder.map(
    (id) => tree.modules[id],
  );

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f8faf8] px-5 pb-12 pt-8 text-[#17211d] max-[620px]:px-4 max-[620px]:pt-6">
      <div className="mx-auto w-[min(1120px,100%)]">
        <header className="mb-12 text-center max-[620px]:mb-9">
          <p className="text-[12px] font-bold leading-none tracking-[0.17em] text-[#168269]">
            {tree.site.eyebrow}
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-3">
            <img
              src="/meditree-logo.png"
              alt="MediTree"
              className="h-[70px] w-[70px] object-contain max-[620px]:h-[54px] max-[620px]:w-[54px]"
            />
            <h1 className="m-0 text-[clamp(48px,8vw,72px)] font-bold leading-[0.92] tracking-[-0.062em]">
              {tree.site.brandTitle}
            </h1>
          </div>
          <p className="mt-3.5 text-[16px] leading-6 text-[#7a8580] max-[620px]:mt-3 max-[620px]:text-[15px]">
            {tree.site.subtitle}
          </p>
        </header>

        <section className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
          {modules.map((module) => {
            const style = homeCardStyle(module.id);

            return (
              <Link
                key={module.id}
                href={MODULE_HREFS[module.id]}
                className={`flex min-h-[210px] flex-col justify-between rounded-[22px] border p-7 shadow-[0_10px_28px_rgba(19,40,31,0.04)] transition hover:-translate-y-0.5 ${style.card}`}
              >
                <div>
                  <span
                    className="text-[13px] font-bold tracking-[0.12em]"
                    style={{ color: style.accent }}
                  >
                    {module.english}
                  </span>
                  <h2 className="mt-7 text-[26px] font-semibold tracking-[-0.035em]">
                    {module.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-6 text-[#75817b]">
                    {module.description}
                  </p>
                </div>
                <span
                  className="self-end text-[25px]"
                  style={{ color: style.accent }}
                >
                  →
                </span>
              </Link>
            );
          })}
        </section>
      </div>

      <ViewActionRail adminHref="/admin" />
    </main>
  );
}
