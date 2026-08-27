"use client";

import useContentTree from "@/components/useContentTree";
import { APP_VERSION } from "@/lib/content-model";

export default function AppFooter() {
  const tree = useContentTree();

  return (
    <footer className="mx-auto flex w-[min(1120px,calc(100%_-_44px))] flex-wrap items-center justify-center gap-x-3 gap-y-1 py-8 text-center text-[13px] font-normal text-[#929b96] max-[720px]:w-[calc(100%-28px)] max-[720px]:pb-24">
      <span>MediTree v{APP_VERSION}</span>
      <span>{tree.site.footerCopyright}</span>
    </footer>
  );
}
