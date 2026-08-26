import Link from "next/link";

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

export default function AdminBreadcrumbs({
  items = [],
}: {
  items?: AdminBreadcrumbItem[];
}) {
  return (
    <nav
      aria-label="Admin breadcrumb"
      className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#7d8781]"
    >
      <Link
        href="/"
        className="transition hover:text-[#075f4e]"
      >
        MediTree
      </Link>

      <span className="text-[#aab2ad]">›</span>

      {items.length > 0 ? (
        <>
          <Link
            href="/admin"
            className="transition hover:text-[#075f4e]"
          >
            관리자
          </Link>

          {items.map((item, index) => (
            <span
              key={`${item.label}-${index}`}
              className="contents"
            >
              <span className="text-[#aab2ad]">›</span>
              {item.href ? (
                <Link
                  href={item.href}
                  className="transition hover:text-[#075f4e]"
                >
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </>
      ) : (
        <span>관리자</span>
      )}
    </nav>
  );
}
