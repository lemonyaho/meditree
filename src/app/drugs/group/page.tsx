"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import useTxtLibrary from "@/components/useTxtLibrary";
import {
  flattenDrugCategory,
  parseDrugTxt,
  type Drug,
  type DrugHierarchyNode,
} from "@/lib/txt-content";

const DEPTH_TONES = [
  {
    shell: "border-[#cbded1] bg-[#eef6ef]",
    body: "border-[#dce7df] bg-[#f8fbf8]",
  },
  {
    shell: "border-[#d6dfec] bg-[#f1f5fb]",
    body: "border-[#e0e6ef] bg-[#fafbfd]",
  },
  {
    shell: "border-[#eadfcf] bg-[#fbf7ef]",
    body: "border-[#ece3d6] bg-[#fdfbf7]",
  },
  {
    shell: "border-[#e6d9df] bg-[#faf5f7]",
    body: "border-[#eadfe4] bg-[#fdfafb]",
  },
];

function filterTree(
  nodes: DrugHierarchyNode[],
  normalized: string,
): DrugHierarchyNode[] {
  if (!normalized) return nodes;

  return nodes.flatMap((node) => {
    const children = filterTree(node.children, normalized);
    const ownDrugMatch = node.drugs.some((drug) =>
      [
        drug.generic,
        drug.brand ?? "",
        ...(drug.indications ?? []),
        ...(drug.contraindications ?? []),
        ...(drug.adverseEffects ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );

    const ownMatch = [node.name, node.mechanism ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized);

    if (ownMatch || ownDrugMatch || children.length) {
      return [{ ...node, children }];
    }

    return [];
  });
}

function DrugRow({ drug }: { drug: Drug }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[62px] w-full items-center justify-between gap-4 px-4 text-left"
      >
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] gap-4">
          <strong className="truncate text-[16px]">
            {drug.generic}
          </strong>
          <span className="truncate text-[14px] text-[#818b85]">
            {drug.brand || "—"}
          </span>
        </div>
        <span>{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="grid gap-3 border-t bg-[#fbfcfb] p-4">
          {[
            ["적응증", drug.indications],
            ["금기 · 주의", drug.contraindications],
            ["주요 부작용", drug.adverseEffects],
          ].map(([label, values]) => (
            <details
              key={label as string}
              className="rounded-[11px] border bg-white"
            >
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-semibold">
                <span>{label as string}</span>
                <span className="text-[#168269]">보기</span>
              </summary>
              <div className="border-t px-4 py-3 text-[14px] leading-6 text-[#5f6b64]">
                {(values as string[] | undefined)?.length
                  ? (values as string[]).join(", ")
                  : "비어있음"}
              </div>
            </details>
          ))}

          <p className="text-[13px] leading-6 text-[#69716c]">
            <strong className="font-semibold">근거자료:</strong>{" "}
            {drug.sources?.length
              ? drug.sources
                  .map(
                    (source, index) =>
                      `${index + 1}. ${source}`,
                  )
                  .join("  ")
              : "비어있음"}
          </p>
        </div>
      )}
    </div>
  );
}

function Node({
  node,
  depth,
}: {
  node: DrugHierarchyNode;
  depth: number;
}) {
  const tone =
    DEPTH_TONES[
      Math.min(depth, DEPTH_TONES.length - 1)
    ];

  return (
    <details
      className={`overflow-hidden rounded-[15px] border ${tone.shell}`}
    >
      <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-4">
        <strong className="text-[17px]">{node.name}</strong>
        <span>↓</span>
      </summary>

      <div className={`border-t p-3 ${tone.body}`}>
        {node.mechanism && (
          <details className="mb-3 rounded-[11px] border bg-white">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-[14px] font-semibold">
              <span>기전</span>
              <span className="text-[#168269]">보기</span>
            </summary>
            <div className="border-t px-4 py-3 text-[14px] leading-6 text-[#5f6b64]">
              {node.mechanism}
            </div>
          </details>
        )}

        {node.drugs.length > 0 && (
          <div className="overflow-hidden rounded-[12px] border bg-white">
            {node.drugs.map((drug) => (
              <DrugRow key={drug.generic} drug={drug} />
            ))}
          </div>
        )}

        {node.children.length > 0 && (
          <div className="mt-3 grid gap-3">
            {node.children.map((child) => (
              <Node
                key={child.id}
                node={child}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function Content() {
  const params = useSearchParams();
  const categoryId = params.get("category");
  const fileId = params.get("file");
  const library = useTxtLibrary();

  const folder = library.drugs.folders.find(
    (item) => item.id === categoryId,
  );
  const file = folder?.files.find(
    (item) => item.id === fileId,
  );

  const [query, setQuery] = useState("");

  const parsed = useMemo(
    () =>
      file
        ? parseDrugTxt(file.id, file.content)
        : undefined,
    [file],
  );

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      parsed
        ? filterTree(parsed.hierarchy, normalized)
        : [],
    [parsed, normalized],
  );

  if (!folder || !file || !parsed) return null;

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-12 text-[#17211d]">
      <div className="mx-auto w-[min(1120px,100%)]">
        <nav className="mb-9 flex flex-wrap gap-2 text-[14px] text-[#7d8781]">
          <Link href="/">MediTree</Link>
          <span>›</span>
          <Link href="/drugs">약물 공부 도구</Link>
          <span>›</span>
          <Link
            href={`/drugs/category?slug=${encodeURIComponent(
              folder.id,
            )}`}
          >
            {folder.name}
          </Link>
          <span>›</span>
          <span>{parsed.name}</span>
        </nav>

        <header className="mb-8">
          {parsed.english && (
            <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
              {parsed.english}
            </p>
          )}
          <h1 className="mt-2 text-[clamp(38px,6vw,56px)] font-bold">
            {parsed.name}
          </h1>

          <div className="mt-7 flex min-h-[56px] items-center rounded-[14px] border bg-white px-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="계층 · 기전 · 성분명 · 상품명 · 적응증 검색"
              className="w-full text-[15px] outline-none"
            />
          </div>
        </header>

        <section className="grid gap-3">
          {filtered.map((node) => (
            <Node key={node.id} node={node} depth={0} />
          ))}
        </section>

        {flattenDrugCategory(parsed).length === 0 && (
          <div className="mt-4 rounded-[15px] border border-dashed bg-white px-5 py-10 text-center text-[15px] text-[#89938d]">
            등록된 약물이 없습니다.
          </div>
        )}
      </div>

      <FloatingNav />
    </main>
  );
}

export default function DrugGroupPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
