"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import useHomeContent from "@/components/useHomeContent";

function getAdminHref(
  pathname: string,
  params: URLSearchParams,
) {
  if (pathname === "/lectures") {
    return "/admin/lectures";
  }

  if (pathname === "/lectures/system") {
    const slug = params.get("slug");

    return slug
      ? `/admin/lectures/folder?id=${encodeURIComponent(slug)}`
      : "/admin/lectures";
  }

  if (pathname === "/lectures/lecture") {
    const system = params.get("system");
    const file = params.get("file");

    if (system && file) {
      return `/admin/lectures/folder?id=${encodeURIComponent(
        system,
      )}&file=${encodeURIComponent(file)}`;
    }

    if (system) {
      return `/admin/lectures/folder?id=${encodeURIComponent(
        system,
      )}`;
    }

    return "/admin/lectures";
  }

  if (pathname === "/drugs") {
    return "/admin/drugs";
  }

  if (pathname === "/drugs/category") {
    const slug = params.get("slug");

    return slug
      ? `/admin/drugs/folder?id=${encodeURIComponent(slug)}`
      : "/admin/drugs";
  }

  if (pathname === "/drugs/group") {
    const category = params.get("category");
    const file = params.get("file");

    if (category && file) {
      return `/admin/drugs/folder?id=${encodeURIComponent(
        category,
      )}&file=${encodeURIComponent(file)}`;
    }

    if (category) {
      return `/admin/drugs/folder?id=${encodeURIComponent(
        category,
      )}`;
    }

    return "/admin/drugs";
  }

  if (pathname === "/microbiology") {
    return "/admin/microbiology";
  }

  if (pathname === "/microbiology/category") {
    const domain = params.get("domain");

    return domain
      ? `/admin/microbiology/folder?id=${encodeURIComponent(
          domain,
        )}`
      : "/admin/microbiology";
  }

  if (pathname === "/microbiology/group") {
    const domain = params.get("domain");
    const file = params.get("file");

    if (domain && file) {
      return `/admin/microbiology/folder?id=${encodeURIComponent(
        domain,
      )}&file=${encodeURIComponent(file)}`;
    }

    if (domain) {
      return `/admin/microbiology/folder?id=${encodeURIComponent(
        domain,
      )}`;
    }

    return "/admin/microbiology";
  }

  return "/admin";
}

export default function AppFooter() {
  const content = useHomeContent();
  const pathname = usePathname();
  const params = useSearchParams();

  const adminHref = getAdminHref(pathname, params);

  return (
    <footer className="mx-auto flex w-[min(1120px,calc(100%-44px))] flex-wrap items-center justify-center gap-x-2 gap-y-1 py-8 text-center text-[14px] text-[#929b96] max-[720px]:w-[calc(100%-28px)]">
      <Link
        href={adminHref}
        className="transition hover:text-[#075f4e]"
      >
        {content.footerAdminLabel}
      </Link>
      <span className="text-[#b0b7b3]">·</span>
      <span>{content.footerCopyright}</span>
    </footer>
  );
}
