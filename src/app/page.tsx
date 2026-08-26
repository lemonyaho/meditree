"use client";

import Link from "next/link";
import useHomeContent from "@/components/useHomeContent";
import { HOME_MODULE_META } from "@/lib/home-content";

export default function Home() {
  const content = useHomeContent();
  const [featured, ...lower] = content.modules;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-10 pt-8 text-[#17211d] max-[620px]:pt-7">
      <div className="mx-auto w-[min(1120px,100%)]">
        <header className="mb-12 text-center max-[620px]:mb-10">
          <p className="text-[12px] font-bold leading-none tracking-[0.17em] text-[#168269]">
            {content.eyebrow}
          </p>

          <div className="mt-2.5 flex items-center justify-center gap-3">
            <img
              src="/meditree-logo.png"
              alt="MediTree"
              className="h-[70px] w-[70px] object-contain max-[620px]:h-[54px] max-[620px]:w-[54px]"
            />
            <h1 className="m-0 text-[clamp(48px,8vw,72px)] font-bold leading-[0.92] tracking-[-0.062em]">
              {content.brandTitle}
            </h1>
          </div>

          <p className="mt-3.5 text-[16px] leading-6 text-[#7a8580] max-[620px]:mt-3 max-[620px]:text-[15px]">
            {content.subtitle}
          </p>
        </header>

        {featured && (
          <Link
            href={HOME_MODULE_META[featured.id].href}
            className="mb-4 flex min-h-[220px] flex-col justify-between rounded-[24px] border border-[#c8dfbf] bg-[linear-gradient(135deg,#f3faef,#e8f4df)] p-8 shadow-[0_12px_34px_rgba(32,76,48,0.06)] transition hover:-translate-y-0.5"
          >
            <div>
              <span className="text-[13px] font-bold tracking-[0.13em] text-[#168269]">
                {featured.english}
              </span>
              <h2 className="mt-8 text-[31px] font-semibold tracking-[-0.04em]">
                {featured.title}
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-[#728078]">
                {featured.description}
              </p>
            </div>
            <span className="self-end text-[28px] text-[#075f4e]">→</span>
          </Link>
        )}

        <section className="grid grid-cols-3 gap-4 max-[800px]:grid-cols-1">
          {lower.map((item) => (
            <Link
              key={item.id}
              href={HOME_MODULE_META[item.id].href}
              className="flex min-h-[205px] flex-col justify-between rounded-[22px] border border-[#e0e6e2] bg-white p-7 shadow-[0_10px_28px_rgba(19,40,31,0.04)] transition hover:-translate-y-0.5 hover:border-[#cbd8cf]"
            >
              <div>
                <span className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
                  {item.english}
                </span>
                <h2 className="mt-7 text-[26px] font-semibold tracking-[-0.035em]">
                  {item.title}
                </h2>
                <p className="mt-3 text-[15px] leading-6 text-[#7a8580]">
                  {item.description}
                </p>
              </div>
              <span className="self-end text-[25px] text-[#075f4e]">→</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
