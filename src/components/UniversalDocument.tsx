"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BlockLabelMap,
  ModuleId,
  ThemeColor,
} from "@/lib/content-model";
import {
  parseUniversalTxt,
  type ParsedUniversalTxt,
  type TxtBlock,
  type TxtEntity,
  type TxtNode,
  type TxtTfItem,
} from "@/lib/universal-txt";

const THEMES: Record<
  ThemeColor,
  {
    accent: string;
    soft: string;
    soft2: string;
    border: string;
    glow: string;
  }
> = {
  red: {
    accent: "#c85c63",
    soft: "#fff5f5",
    soft2: "#fff9f9",
    border: "#ecd7d8",
    glow: "rgba(200,92,99,0.10)",
  },
  yellow: {
    accent: "#b88a22",
    soft: "#fff9ec",
    soft2: "#fffdf6",
    border: "#eadfbd",
    glow: "rgba(184,138,34,0.10)",
  },
  blue: {
    accent: "#527fcb",
    soft: "#f4f7ff",
    soft2: "#f9fbff",
    border: "#d7e0ef",
    glow: "rgba(82,127,203,0.10)",
  },
  green: {
    accent: "#168269",
    soft: "#f2f9f4",
    soft2: "#f8fbf9",
    border: "#d4e5dd",
    glow: "rgba(22,130,105,0.09)",
  },
};

type Theme = (typeof THEMES)[ThemeColor];

function entitySearchText(entity: TxtEntity) {
  return [
    entity.name,
    ...entity.blocks.flatMap((block) => [
      block.label,
      block.value,
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function filterEntities(
  entities: TxtEntity[],
  query: string,
) {
  if (!query) return entities;
  const q = query.toLowerCase();
  return entities.filter((entity) =>
    entitySearchText(entity).includes(q),
  );
}

function filterNodes(
  nodes: TxtNode[],
  query: string,
): TxtNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();

  return nodes.flatMap((node) => {
    const children = filterNodes(node.children, query);
    const entities = filterEntities(node.entities, query);

    const ownText = [
      node.number,
      node.title,
      ...node.blocks.flatMap((block) => [
        block.label,
        block.value,
      ]),
      ...node.tfItems.flatMap((item) => [
        "T/F",
        item.statement,
      ]),
    ]
      .join(" ")
      .toLowerCase();

    if (
      ownText.includes(q) ||
      entities.length ||
      children.length
    ) {
      return [{ ...node, entities, children }];
    }

    return [];
  });
}

const MODULE_BLOCK_ORDER: Record<
  ModuleId,
  string[]
> = {
  clinical: [
    "def",
    "etiol",
    "patho",
    "sx",
    "imaging",
    "dx",
    "tx",
    "prog",
  ],
  lectures: [
    "def",
    "etiol",
    "patho",
    "sx",
    "imaging",
    "dx",
    "tx",
    "prog",
  ],
  drugs: [
    "mech",
    "indi",
    "contra",
    "side",
    "caution",
  ],
  microbiology: [
    "o2",
    "dz",
  ],
};

function orderBlocksForModule(
  blocks: TxtBlock[],
  moduleId?: ModuleId,
) {
  if (!moduleId) return blocks;

  const rank = new Map(
    MODULE_BLOCK_ORDER[moduleId].map(
      (key, index) => [key, index],
    ),
  );

  return blocks
    .map((block, originalIndex) => {
      const key = normalizedBlockKey(block.key);
      const isMemo = key === "memo";
      const knownRank = rank.get(key);

      return {
        block,
        originalIndex,
        rank: isMemo
          ? 20_000
          : knownRank !== undefined
            ? knownRank
            : 10_000,
      };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ block }) => block);
}

function blocksWithoutMemo(
  blocks: TxtBlock[],
) {
  return blocks.filter(
    (block) =>
      normalizedBlockKey(block.key) !== "memo",
  );
}

function memoBlocks(
  blocks: TxtBlock[],
) {
  return blocks.filter(
    (block) =>
      normalizedBlockKey(block.key) === "memo",
  );
}

function clinicalSemanticTint(key: string) {
  const normalized = normalizedBlockKey(key);

  const palette: Record<
    string,
    {
      background: string;
      border: string;
      label: string;
    }
  > = {
    def: {
      background: "#fff5f4",
      border: "#f1deda",
      label: "#8a5c56",
    },
    etiol: {
      background: "#fff7f0",
      border: "#f1e1d1",
      label: "#886449",
    },
    patho: {
      background: "#fffbea",
      border: "#eee3ba",
      label: "#7d6b35",
    },
    sx: {
      background: "#f5faef",
      border: "#dce9cf",
      label: "#5f7550",
    },
    imaging: {
      background: "#f0f9f7",
      border: "#d5e9e4",
      label: "#4f746b",
    },
    dx: {
      background: "#f1f8fc",
      border: "#d8e8f1",
      label: "#4f7082",
    },
    tx: {
      background: "#f3f5fc",
      border: "#dce1f0",
      label: "#58698a",
    },
    prog: {
      background: "#f8f3fb",
      border: "#e7dcf0",
      label: "#705f82",
    },
    memo: {
      background: "#f5f7f8",
      border: "#dfe5e7",
      label: "#627077",
    },
  };

  return palette[normalized] ?? null;
}

function drugSemanticTint(key: string) {
  const normalized = normalizedBlockKey(key);

  const palette: Record<
    string,
    {
      background: string;
      border: string;
      label: string;
    }
  > = {
    mech: {
      background: "#f2f7fb",
      border: "#d9e6ef",
      label: "#4f6e80",
    },
    indi: {
      background: "#f2f9f5",
      border: "#d8eadf",
      label: "#3f6f54",
    },
    contra: {
      background: "#fff4f5",
      border: "#f0dadd",
      label: "#8a5058",
    },
    side: {
      background: "#fff8ee",
      border: "#eee0c6",
      label: "#82643c",
    },
    caution: {
      background: "#fffbea",
      border: "#eee4bd",
      label: "#796b3e",
    },
    memo: {
      background: "#f3f7fb",
      border: "#dbe6f0",
      label: "#4d6981",
    },
  };

  return palette[normalized] ?? null;
}

function microbiologySemanticTint(key: string) {
  const normalized = normalizedBlockKey(key);

  const palette: Record<
    string,
    {
      background: string;
      border: string;
      label: string;
    }
  > = {
    o2: {
      background: "#f1f8fc",
      border: "#d8e8f1",
      label: "#4f7082",
    },
    dz: {
      background: "#f2f9f5",
      border: "#d8eadf",
      label: "#3f6f54",
    },
    memo: {
      background: "#f5f7f8",
      border: "#dfe5e7",
      label: "#627077",
    },
  };

  return palette[normalized] ?? null;
}

function CompositeBlockValue({
  value,
  inheritedValue,
  localValue,
  inheritanceScope,
  largeText = false,
}: {
  value: string;
  inheritedValue?: string;
  localValue?: string;
  inheritanceScope?: string;
  largeText?: boolean;
}) {
  if (inheritedValue && localValue) {
    return (
      <div className="space-y-4">
        <div>
          <div className={`mb-1.5 inline-flex rounded-full border border-[#dce5e0] bg-[#f7faf8] px-2.5 py-1 font-semibold text-[#69766f] ${
              largeText ? "text-[12px]" : "text-[11px]"
            }`}>
            공통 · {inheritanceScope}
          </div>
          <div className={`whitespace-pre-wrap text-[#53615a] ${
              largeText
                ? "text-[17px] leading-8"
                : "text-[15px] leading-7"
            }`}>
            {inheritedValue}
          </div>
        </div>

        <div className="border-t border-[#e8eeea] pt-3">
          <div className={`mb-1.5 inline-flex rounded-full border border-[#dfe6e2] bg-white/75 px-2.5 py-1 font-semibold text-[#69766f] ${
              largeText ? "text-[12px]" : "text-[11px]"
            }`}>
            개별
          </div>
          <div className={`whitespace-pre-wrap text-[#53615a] ${
              largeText
                ? "text-[17px] leading-8"
                : "text-[15px] leading-7"
            }`}>
            {localValue}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {inheritanceScope && (
        <div className={`mb-2 inline-flex rounded-full border border-[#dce5e0] bg-[#f7faf8] px-2.5 py-1 font-semibold text-[#69766f] ${
          largeText ? "text-[12px]" : "text-[11px]"
        }`}>
          공통 · {inheritanceScope}
        </div>
      )}

      <div className={`whitespace-pre-wrap text-[#53615a] ${
          largeText
            ? "text-[17px] leading-8"
            : "text-[15px] leading-7"
        }`}>
        {value || "내용 없음"}
      </div>
    </div>
  );
}

function TfQuizItem({
  item,
  largeText = false,
}: {
  item: TxtTfItem;
  largeText?: boolean;
}) {
  const [revealed, setRevealed] =
    useState(false);

  const led = item.answer
    ? {
        color: "#4d84d8",
        glow: "rgba(77,132,216,0.38)",
        label: "T",
      }
    : {
        color: "#cf6269",
        glow: "rgba(207,98,105,0.36)",
        label: "F",
      };

  return (
    <button
      type="button"
      aria-expanded={revealed}
      onClick={() =>
        setRevealed((current) => !current)
      }
      className="flex min-h-[58px] w-full items-center gap-3 rounded-[12px] border border-[#dfe6e2] bg-white px-4 py-3 text-left transition-colors hover:bg-[#fafcfb]"
    >
      <span className="shrink-0 rounded-full border border-[#d9e3de] bg-[#f5f8f6] px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[#607069]">
        T/F QUIZ
      </span>

      <span
        className={`min-w-0 flex-1 font-medium text-[#26332d] ${
          largeText
            ? "text-[17px] leading-7"
            : "text-[15px] leading-6"
        }`}
      >
        {item.statement}
      </span>

      {revealed ? (
        <span className="flex shrink-0 items-center gap-2 font-bold">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              background: led.color,
              boxShadow: `0 0 10px 3px ${led.glow}`,
            }}
          />
          <span
            className="text-[16px]"
            style={{ color: led.color }}
          >
            {led.label}
          </span>
        </span>
      ) : (
        <span className="shrink-0 text-[12px] font-semibold text-[#7d8983]">
          정답 보기
        </span>
      )}
    </button>
  );
}

function TfQuizList({
  items,
  moduleId,
}: {
  items: TxtTfItem[];
  moduleId?: ModuleId;
}) {
  if (!items.length) return null;

  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <TfQuizItem
          key={item.id}
          item={item}
          largeText={moduleId === "lectures"}
        />
      ))}
    </div>
  );
}

function BlockCards({
  scopeId,
  blocks,
  theme,
  openBlocks,
  setOpenBlocks,
  forceOpen,
  semanticTint = false,
  moduleId,
}: {
  scopeId: string;
  blocks: TxtBlock[];
  theme: Theme;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
  semanticTint?: boolean;
  moduleId?: ModuleId;
}) {
  if (!blocks.length) return null;

  const orderedBlocks =
    orderBlocksForModule(
      blocks,
      moduleId,
    );

  return (
    <div className="grid gap-2.5">
      {orderedBlocks.map((block) => {
        const id = `${scopeId}:${block.id}`;
        const open =
          forceOpen || openBlocks.has(id);
        const tint =
          semanticTint
            ? drugSemanticTint(block.key)
            : moduleId === "clinical" ||
                moduleId === "lectures"
              ? clinicalSemanticTint(block.key)
              : moduleId === "microbiology"
                ? microbiologySemanticTint(
                    block.key,
                  )
                : null;

        return (
          <div
            key={id}
            className="overflow-hidden rounded-[12px] border"
            style={{
              borderColor: tint?.border ?? "#e0e6e2",
              background: tint?.background ?? "#ffffff",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (forceOpen) return;
                setOpenBlocks((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              className={`flex w-full items-center justify-between gap-3 px-4 text-left ${
                moduleId === "lectures"
                  ? "min-h-[56px]"
                  : "min-h-[50px]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`font-semibold ${
                    moduleId === "lectures"
                      ? "text-[17px]"
                      : "text-[15px]"
                  }`}
                  style={{
                    color: tint?.label ?? "#111713",
                  }}
                >
                  {block.label}
                </span>


              </div>
              <span
                className={`font-semibold ${
                  moduleId === "lectures"
                    ? "text-[14px]"
                    : "text-[13px]"
                }`}
                style={{ color: theme.accent }}
              >
                {open ? "닫기" : "보기"}
              </span>
            </button>

            {open && (
              <div
                className="border-t px-4 py-4"
                style={{
                  borderColor: tint?.border ?? "#edf1ee",
                }}
              >
                <CompositeBlockValue
                  value={block.value}
                  inheritedValue={block.inheritedValue}
                  localValue={block.localValue}
                  inheritanceScope={block.inheritanceScope}
                  largeText={moduleId === "lectures"}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EntityCard({
  entity,
  displayNumber,
  inheritedBlocks,
  theme,
  openEntities,
  setOpenEntities,
  openBlocks,
  setOpenBlocks,
  forceOpen,
  moduleId,
}: {
  entity: TxtEntity;
  displayNumber: string;
  inheritedBlocks: TxtBlock[];
  theme: Theme;
  moduleId?: ModuleId;
  openEntities: Set<string>;
  setOpenEntities: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
}) {
  const resolvedBlocks = mergeEntityBlocks(
    inheritedBlocks,
    entity.blocks,
  );
  const brandBlock = entity.blocks.find(
    (block) =>
      normalizedBlockKey(block.key) === "brand",
  );
  const brands = brandBlock
    ? splitBrandNames(brandBlock.value)
    : [];
  const visibleBlocks =
    moduleId === "drugs"
      ? resolvedBlocks.filter(
          (block) =>
            normalizedBlockKey(block.key) !== "brand",
        )
      : resolvedBlocks;

  const hasBody = visibleBlocks.length > 0;
  const isOpen =
    hasBody &&
    (forceOpen || openEntities.has(entity.id));

  const toggleEntity = () => {
    if (!hasBody || forceOpen) return;

    setOpenEntities((current) => {
      const next = new Set(current);
      if (next.has(entity.id)) {
        next.delete(entity.id);
      } else {
        next.add(entity.id);
      }
      return next;
    });
  };

  const entityHeaderContent = (
    <>
      <span
        className={`shrink-0 font-mono font-bold ${
          moduleId === "lectures"
            ? "text-[13px]"
            : "text-[11px]"
        }`}
        style={{ color: theme.accent }}
      >
        {displayNumber}
      </span>

      <strong
        className={`min-w-[130px] flex-1 truncate font-semibold ${
          moduleId === "lectures"
            ? "text-[17px]"
            : "text-[15px]"
        }`}
      >
        {entity.name}
      </strong>

      {moduleId === "drugs" && (
        <span className="min-w-[180px] flex-[0_1_42%] border-l border-[#e2e8e4] pl-4 max-[620px]:mt-2 max-[620px]:w-full max-[620px]:basis-full max-[620px]:border-l-0 max-[620px]:border-t max-[620px]:pl-0 max-[620px]:pt-2">
          <span className="block text-[10px] font-semibold tracking-[0.06em] text-[#8a958f]">
            상품명
          </span>
          {brands.length > 0 ? (
            <span className="mt-0.5 block truncate text-[13px] font-medium text-[#66736c]">
              {brands.join(" · ")}
            </span>
          ) : (
            <span className="mt-0.5 block text-[11px] text-[#a0aaa5]">
              등록된 상품명 없음
            </span>
          )}
        </span>
      )}
    </>
  );

  return (
    <article
      className="overflow-hidden rounded-[13px] border bg-white"
      style={{ borderColor: theme.border }}
    >
      {hasBody ? (
        <button
          type="button"
          onClick={toggleEntity}
          aria-expanded={isOpen}
          className="flex min-h-[56px] w-full flex-wrap items-center gap-3 px-4 py-2 text-left"
          style={{
            background: theme.soft2,
          }}
        >
          {entityHeaderContent}

          <span
            className="ml-auto shrink-0 text-[17px]"
            style={{ color: theme.accent }}
          >
            {isOpen ? "↑" : "↓"}
          </span>
        </button>
      ) : (
        <div
          className="flex min-h-[56px] w-full flex-wrap items-center gap-3 px-4 py-2"
          style={{
            background: theme.soft2,
          }}
        >
          {entityHeaderContent}
        </div>
      )}

      {isOpen && (
        <div
          className="border-t p-3"
          style={{ borderColor: theme.border }}
        >
          <BlockCards
            scopeId={`entity:${entity.id}`}
            blocks={visibleBlocks}
            theme={theme}
            openBlocks={openBlocks}
            setOpenBlocks={setOpenBlocks}
            forceOpen={forceOpen}
            semanticTint={moduleId === "drugs"}
            moduleId={moduleId}
          />
        </div>
      )}
    </article>
  );
}

function NodeCard({
  node,
  depth,
  openNodes,
  setOpenNodes,
  openEntities,
  setOpenEntities,
  openBlocks,
  setOpenBlocks,
  forceOpen,
  theme,
  inheritEntityBlocks,
  inheritedEntityBlocks,
  moduleId,
}: {
  node: TxtNode;
  depth: number;
  openNodes: Set<string>;
  setOpenNodes: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  openEntities: Set<string>;
  setOpenEntities: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
  theme: Theme;
  inheritEntityBlocks: boolean;
  inheritedEntityBlocks: TxtBlock[];
  moduleId?: ModuleId;
}) {
  const nextInheritedEntityBlocks =
    inheritEntityBlocks
      ? mergeBlocks(
          inheritedEntityBlocks,
          inheritedBlocksFrom(
            node.blocks,
            node.title,
          ),
        )
      : [];

  const beforeMemo = blocksWithoutMemo(
    node.blocks,
  );
  const trailingMemo = memoBlocks(
    node.blocks,
  );
  const hasOwnInfo =
    beforeMemo.length > 0 ||
    node.tfItems.length > 0 ||
    trailingMemo.length > 0;

  const hasBody =
    node.children.length > 0 ||
    hasOwnInfo ||
    node.entities.length > 0;

  const isOpen =
    hasBody && (forceOpen || openNodes.has(node.id));

  const toggleNode = () => {
    if (!hasBody || forceOpen) return;
    setOpenNodes((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };

  const bg =
    depth === 0
      ? theme.soft
      : depth === 1
        ? theme.soft2
        : "#ffffff";

  return (
    <div
      className="overflow-hidden rounded-[15px] border"
      style={{
        borderColor:
          depth <= 1
            ? theme.border
            : "#e2e8e4",
        background: bg,
      }}
    >
      {hasBody ? (
        <button
          type="button"
          onClick={toggleNode}
          aria-expanded={isOpen}
          className="flex min-h-[60px] w-full items-center justify-between gap-4 px-5 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`shrink-0 font-mono font-bold ${
                moduleId === "lectures"
                  ? "text-[13px]"
                  : "text-[12px]"
              }`}
              style={{ color: theme.accent }}
            >
              {node.number}
            </span>
            <strong
              className={`${
                moduleId === "lectures"
                  ? depth === 0
                    ? "text-[20px]"
                    : "text-[18px]"
                  : depth === 0
                    ? "text-[17px]"
                    : "text-[16px]"
              } truncate font-semibold tracking-[-0.015em]`}
            >
              {node.title}
            </strong>
          </div>

          <span
            className="shrink-0 text-[18px]"
            style={{ color: theme.accent }}
          >
            {isOpen ? "↑" : "↓"}
          </span>
        </button>
      ) : (
        <div className="flex min-h-[60px] items-center gap-3 px-5">
          <span
            className={`shrink-0 font-mono font-bold ${
              moduleId === "lectures"
                ? "text-[13px]"
                : "text-[12px]"
            }`}
            style={{ color: theme.accent }}
          >
            {node.number}
          </span>
          <strong
            className={`truncate font-semibold tracking-[-0.015em] ${
              moduleId === "lectures"
                ? "text-[18px]"
                : "text-[16px]"
            }`}
          >
            {node.title}
          </strong>
        </div>
      )}

      {isOpen && (
        <div
          className="border-t px-4 pb-4 pt-4"
          style={{ borderColor: theme.border }}
        >
          {beforeMemo.length > 0 && (
            <BlockCards
              scopeId={`node:${node.id}:main`}
              blocks={beforeMemo}
              theme={theme}
              openBlocks={openBlocks}
              setOpenBlocks={setOpenBlocks}
              forceOpen={forceOpen}
              semanticTint={moduleId === "drugs"}
              moduleId={moduleId}
            />
          )}

          {node.tfItems.length > 0 && (
            <div
              className={
                beforeMemo.length > 0
                  ? "mt-3"
                  : ""
              }
            >
              <TfQuizList
                items={node.tfItems}
                moduleId={moduleId}
              />
            </div>
          )}

          {trailingMemo.length > 0 && (
            <div
              className={
                beforeMemo.length > 0 ||
                node.tfItems.length > 0
                  ? "mt-3"
                  : ""
              }
            >
              <BlockCards
                scopeId={`node:${node.id}:memo`}
                blocks={trailingMemo}
                theme={theme}
                openBlocks={openBlocks}
                setOpenBlocks={setOpenBlocks}
                forceOpen={forceOpen}
                semanticTint={moduleId === "drugs"}
                moduleId={moduleId}
              />
            </div>
          )}

          {node.entities.length > 0 && (
            <div
              className={`${hasOwnInfo ? "mt-4" : ""} grid gap-3`}
            >
              {node.entities.map((entity, index) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  displayNumber={`${node.number}.${index + 1}`}
                  inheritedBlocks={nextInheritedEntityBlocks}
                  theme={theme}
                  openEntities={openEntities}
                  setOpenEntities={setOpenEntities}
                  openBlocks={openBlocks}
                  setOpenBlocks={setOpenBlocks}
                  forceOpen={forceOpen}
                  moduleId={moduleId}
                />
              ))}
            </div>
          )}

          {node.children.length > 0 && (
            <div
              className={`${
                hasOwnInfo ||
                node.entities.length > 0
                  ? "mt-4"
                  : ""
              } grid gap-3`}
            >
              {node.children.map((child) => (
                <NodeCard
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  openNodes={openNodes}
                  setOpenNodes={setOpenNodes}
                  openEntities={openEntities}
                  setOpenEntities={setOpenEntities}
                  openBlocks={openBlocks}
                  setOpenBlocks={setOpenBlocks}
                  forceOpen={forceOpen}
                  theme={theme}
                  inheritEntityBlocks={inheritEntityBlocks}
                  inheritedEntityBlocks={nextInheritedEntityBlocks}
                  moduleId={moduleId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function shuffleIndices(length: number) {
  const values = Array.from({ length }, (_, index) => index);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

function normalizedBlockKey(key: string) {
  return key.trim().replace(/^@+/, "").toLowerCase();
}

function inheritableBlocks(blocks: TxtBlock[]) {
  return blocks.filter(
    (block) => normalizedBlockKey(block.key) !== "note",
  );
}

function inheritedBlocksFrom(
  blocks: TxtBlock[],
  sourceLabel: string,
) {
  return inheritableBlocks(blocks).map((block) => ({
    ...block,
    id: `${block.id}:inherited:${sourceLabel}`,
    inheritanceScope: sourceLabel,
  }));
}

function mergeBlocks(base: TxtBlock[], additions: TxtBlock[]) {
  const order: string[] = [];
  const values = new Map<string, TxtBlock>();
  for (const block of [...base, ...additions]) {
    const key = normalizedBlockKey(block.key);
    if (!values.has(key)) order.push(key);
    values.set(key, block);
  }
  return order.map((key) => values.get(key)).filter((block): block is TxtBlock => Boolean(block));
}

function mergeEntityBlocks(
  inheritedBlocks: TxtBlock[],
  localBlocks: TxtBlock[],
) {
  const inheritedByKey = new Map<string, TxtBlock>();
  const localByKey = new Map<string, TxtBlock>();
  const order: string[] = [];

  for (const block of inheritedBlocks) {
    const key = normalizedBlockKey(block.key);
    if (!inheritedByKey.has(key)) order.push(key);
    inheritedByKey.set(key, block);
  }

  for (const block of localBlocks) {
    const key = normalizedBlockKey(block.key);
    if (!inheritedByKey.has(key) && !localByKey.has(key)) {
      order.push(key);
    }
    localByKey.set(key, block);
  }

  return order
    .map((key) => {
      const inherited = inheritedByKey.get(key);
      const local = localByKey.get(key);

      if (!inherited) return local;
      if (!local) return inherited;

      const inheritedValue = inherited.value.trim();
      const localValue = local.value.trim();

      if (inheritedValue === localValue) {
        return {
          ...local,
          inheritanceScope: inherited.inheritanceScope,
        };
      }

      return {
        ...local,
        inheritanceScope: inherited.inheritanceScope,
        inheritedValue,
        localValue,
      };
    })
    .filter(
      (block): block is TxtBlock => Boolean(block),
    );
}

function splitBrandNames(value: string) {
  return value.split(/[\n,;]+/g).map((item) => item.trim()).filter(Boolean);
}

export type QuizSource = {
  id: string;
  title: string;
  parsed: ParsedUniversalTxt;
};

type QuizCue = {
  text: string;
  kind: "성분명" | "상품명" | "미생물명";
};

type QuizAnswerRow = {
  label: string;
  value: string;
  key?: string;
  inheritanceScope?: string;
  inheritedValue?: string;
  localValue?: string;
};

type TfRandomQuizQuestion = {
  kind: "tf";
  id: string;
  sourceTitle: string;
  prompt: string;
  statement: string;
  answer: boolean;
};

type EntityQuizQuestion = {
  kind: "entity";
  id: string;
  sourceTitle: string;
  entityName: string;
  brands: string[];
  cues: QuizCue[];
  rows: QuizAnswerRow[];
};

function collectEntityQuizQuestions(
  source: QuizSource,
  moduleId: "drugs" | "microbiology",
): EntityQuizQuestion[] {
  const questions: EntityQuizQuestion[] = [];

  const addEntity = (
    entity: TxtEntity,
    hierarchy: string[],
    inheritedBlocks: TxtBlock[],
  ) => {
    const entityBlocks = mergeEntityBlocks(
      inheritableBlocks(inheritedBlocks),
      entity.blocks,
    );
    const brandBlock = entity.blocks.find((block) => normalizedBlockKey(block.key) === "brand");
    const brands = brandBlock ? splitBrandNames(brandBlock.value) : [];

    const cues: QuizCue[] =
      moduleId === "drugs"
        ? [{ text: entity.name, kind: "성분명" }]
        : [{ text: entity.name, kind: "미생물명" }];

    const rows: QuizAnswerRow[] = [];
    if (moduleId === "drugs") {
      rows.push({ label: "성분명", value: entity.name });
      if (hierarchy.length) rows.push({ label: "계열", value: hierarchy.join(" › ") });
    } else if (hierarchy.length) {
      rows.push({ label: "분류", value: hierarchy.join(" › ") });
    }

    for (const block of orderBlocksForModule(
      entityBlocks,
      moduleId,
    )) {
      if (!block.value.trim()) continue;
      const key = normalizedBlockKey(block.key);
      if (moduleId === "drugs" && key === "brand") {
        continue;
      }
      rows.push({
        label: block.label,
        value: block.value.trim(),
        key,
        inheritanceScope: block.inheritanceScope,
        inheritedValue: block.inheritedValue,
        localValue: block.localValue,
      });
    }

    questions.push({
      kind: "entity",
      id: `${source.id}:${entity.id}`,
      sourceTitle: source.title,
      entityName: entity.name,
      brands,
      cues,
      rows,
    });
  };

  const rootInheritedBlocks =
    inheritedBlocksFrom(
      source.parsed.blocks,
      source.title,
    );

  for (const entity of source.parsed.entities) {
    addEntity(
      entity,
      [source.title],
      rootInheritedBlocks,
    );
  }

  const walk = (nodes: TxtNode[], hierarchy: string[], inheritedBlocks: TxtBlock[]) => {
    for (const node of nodes) {
      const nextHierarchy = [...hierarchy, node.title];
      const nextInherited = mergeBlocks(
        inheritableBlocks(inheritedBlocks),
        inheritedBlocksFrom(
          node.blocks,
          node.title,
        ),
      );
      for (const entity of node.entities) addEntity(entity, nextHierarchy, nextInherited);
      walk(node.children, nextHierarchy, nextInherited);
    }
  };

  walk(
    source.parsed.nodes,
    [source.title],
    rootInheritedBlocks,
  );
  return questions;
}

function collectTfQuizQuestions(
  source: QuizSource,
): TfRandomQuizQuestion[] {
  const questions: TfRandomQuizQuestion[] = [];

  const addItems = (
    items: TxtTfItem[],
    scope: string,
  ) => {
    for (const item of items) {
      questions.push({
        kind: "tf",
        id: `${source.id}:${scope}:${item.id}`,
        sourceTitle: source.title,
        prompt: scope
          ? `${scope} › T/F`
          : "T/F",
        statement: item.statement,
        answer: item.answer,
      });
    }
  };

  addItems(
    source.parsed.tfItems,
    source.title,
  );

  const walk = (
    nodes: TxtNode[],
    parents: string[],
  ) => {
    for (const node of nodes) {
      const path = [...parents, node.title];
      const scope = path.join(" › ");

      addItems(node.tfItems, scope);
      walk(node.children, path);
    }
  };

  walk(source.parsed.nodes, []);
  return questions;
}

function randomCue(question: EntityQuizQuestion): QuizCue {
  if (!question.cues.length) return { text: question.entityName, kind: "미생물명" };
  return question.cues[Math.floor(Math.random() * question.cues.length)];
}

export function EntityRecallQuiz({
  sources,
  moduleId,
}: {
  sources: QuizSource[];
  moduleId: "drugs" | "microbiology";
}) {
  const questions = useMemo(
    () =>
      sources.flatMap((source) => [
        ...collectEntityQuizQuestions(
          source,
          moduleId,
        ),
        ...collectTfQuizQuestions(source),
      ]),
    [sources, moduleId],
  );

  const signature = useMemo(
    () =>
      questions
        .map((question) => question.id)
        .join("|"),
    [questions],
  );

  const [order, setOrder] = useState<number[]>([]);
  const [cues, setCues] = useState<
    Record<string, QuizCue>
  >({});
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const startRound = () => {
    setOrder(shuffleIndices(questions.length));

    const nextCues: Record<string, QuizCue> = {};
    for (const question of questions) {
      if (question.kind === "entity") {
        nextCues[question.id] =
          randomCue(question);
      }
    }

    setCues(nextCues);
    setPosition(0);
    setRevealed(false);
  };

  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, moduleId]);

  if (!questions.length) {
    return (
      <div className="rounded-[15px] border border-dashed bg-white p-8 text-center text-[14px] leading-6 text-[#7d8781]">
        선택 범위에서{" "}
        <strong>## 약물명</strong> 또는{" "}
        <strong>## 미생물명</strong>을 찾지 못했습니다.
      </div>
    );
  }

  const safeOrder =
    order.length === questions.length
      ? order
      : Array.from(
          { length: questions.length },
          (_, index) => index,
        );

  const currentIndex =
    safeOrder[position % safeOrder.length] ?? 0;
  const current = questions[currentIndex];

  const cue =
    current.kind === "entity"
      ? cues[current.id] ?? randomCue(current)
      : undefined;

  const visibleRows =
    current.kind === "entity"
      ? cue?.kind === "성분명"
        ? current.rows.filter(
            (row) => row.label !== "성분명",
          )
        : current.rows
      : [];

  const previousQuestion = () => {
    if (position <= 0) return;

    setPosition((current) =>
      Math.max(0, current - 1),
    );
    setRevealed(false);
  };

  const nextQuestion = () => {
    const nextPosition = position + 1;

    if (nextPosition >= questions.length) {
      startRound();
      return;
    }

    setPosition(nextPosition);
    setRevealed(false);
  };

  return (
    <div className="rounded-[18px] border border-[#dfe6e2] bg-white p-6">
      <p className="text-[12px] font-bold tracking-[0.12em] text-[#168269]">
        RANDOM QUIZ {position + 1} / {questions.length}
      </p>

      {current.kind === "tf" ? (
        <>
          <p className="mt-6 text-[14px] font-semibold tracking-[-0.01em] text-[#718078]">
            {current.prompt}
          </p>

          <div className="mt-3 rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb] p-5">
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold leading-[1.4] tracking-[-0.035em]">
              {current.statement}
            </h2>

            <div className="mt-6 min-h-[52px]">
              {revealed ? (
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: current.answer
                        ? "#4d84d8"
                        : "#cf6269",
                      boxShadow: current.answer
                        ? "0 0 12px 4px rgba(77,132,216,0.38)"
                        : "0 0 12px 4px rgba(207,98,105,0.36)",
                    }}
                  />
                  <strong
                    className="text-[26px]"
                    style={{
                      color: current.answer
                        ? "#4d84d8"
                        : "#cf6269",
                    }}
                  >
                    {current.answer ? "T" : "F"}
                  </strong>
                </div>
              ) : (
                <span className="text-[14px] text-[#9aa39e]">
                  T인지 F인지 판단한 뒤 정답을 확인하세요.
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            className={`mt-6 ${
              moduleId === "drugs"
                ? "grid grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)] items-end gap-5 max-[620px]:grid-cols-1"
                : ""
            }`}
          >
            <h2 className="text-[clamp(30px,4.8vw,42px)] font-bold tracking-[-0.045em]">
              {cue?.text}
            </h2>

            {moduleId === "drugs" && (
              <div className="min-w-0 border-l border-[#e1e7e3] pl-5 max-[620px]:border-l-0 max-[620px]:border-t max-[620px]:pl-0 max-[620px]:pt-3">
                <span className="block text-[10px] font-semibold tracking-[0.06em] text-[#8a958f]">
                  상품명
                </span>
                {current.brands.length > 0 ? (
                  <span className="mt-1 block truncate text-[clamp(14px,2.2vw,18px)] font-medium text-[#6f7d76]">
                    {current.brands.join(" · ")}
                  </span>
                ) : (
                  <span className="mt-1 block text-[12px] text-[#a0aaa5]">
                    등록된 상품명 없음
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb]">
            {visibleRows.map((row, index) => {
              const tint =
                moduleId === "drugs" && row.key
                  ? drugSemanticTint(row.key)
                  : null;

              return (
                <div
                  key={`${row.label}-${index}`}
                  className="grid min-h-[68px] grid-cols-[170px_minmax(0,1fr)] border-b last:border-b-0 max-[620px]:grid-cols-[118px_minmax(0,1fr)]"
                  style={{
                    borderColor:
                      tint?.border ?? "#edf1ee",
                    background:
                      tint?.background ?? "transparent",
                  }}
                >
                  <div
                    className="flex items-center border-r px-5 py-4"
                    style={{
                      borderColor:
                        tint?.border ?? "#edf1ee",
                    }}
                  >
                    <div className="min-w-0">
                      <strong
                        className="block break-keep text-[15px] font-semibold leading-6"
                        style={{
                          color:
                            tint?.label ?? "#53615a",
                        }}
                      >
                        {row.label}
                      </strong>
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center px-5 py-4">
                    {revealed ? (
                      <div className="min-w-0 flex-1">
                        <CompositeBlockValue
                          value={row.value}
                          inheritedValue={
                            row.inheritedValue
                          }
                          localValue={
                            row.localValue
                          }
                          inheritanceScope={
                            row.inheritanceScope
                          }
                        />
                      </div>
                    ) : (
                      <span
                        aria-hidden="true"
                        className="min-h-[24px]"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {visibleRows.length === 0 && (
              <div className="p-6 text-[13px] text-[#8a948f]">
                등록된 정답 항목이 없습니다.
              </div>
            )}
          </div>
        </>
      )}

      {revealed && (
        <p className="mt-2 text-[11px] text-[#9aa39e]">
          TXT: {current.sourceTitle}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setRevealed((value) => !value)
          }
          className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[14px] font-semibold text-[#075f4e]"
        >
          {revealed
            ? "정답 숨기기"
            : "정답 보기"}
        </button>

        <button
          type="button"
          onClick={previousQuestion}
          disabled={position === 0}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← 이전 문제
        </button>

        <button
          type="button"
          onClick={nextQuestion}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[14px] font-semibold"
        >
          다음 랜덤 문제 →
        </button>
      </div>
    </div>
  );
}

type LectureBlockQuizQuestion = {
  kind: "block";
  id: string;
  sourceTitle: string;
  prompt: string;
  answer: string;
};

type LectureQuizQuestion =
  | LectureBlockQuizQuestion
  | TfRandomQuizQuestion;

function collectLectureQuizQuestions(
  source: QuizSource,
): LectureQuizQuestion[] {
  const questions: LectureQuizQuestion[] = [];

  const addBlock = (
    scope: string,
    block: TxtBlock,
    index: number,
  ) => {
    if (!block.value.trim()) return;

    questions.push({
      kind: "block",
      id: `${source.id}:${scope}:${block.id}:${index}`,
      sourceTitle: source.title,
      prompt: scope
        ? `${scope} › ${block.label}`
        : block.label,
      answer: block.value.trim(),
    });
  };

  source.parsed.blocks.forEach((block, index) => {
    addBlock(source.title, block, index);
  });

  questions.push(
    ...collectTfQuizQuestions({
      ...source,
      parsed: {
        ...source.parsed,
        nodes: [],
      },
    }),
  );

  source.parsed.entities.forEach((entity, entityIndex) => {
    entity.blocks.forEach((block, blockIndex) => {
      addBlock(
        `${source.title} › ${entity.name}`,
        block,
        entityIndex * 1000 + blockIndex,
      );
    });
  });

  const walk = (
    nodes: TxtNode[],
    parents: string[],
  ) => {
    for (const node of nodes) {
      const path = [...parents, node.title];
      const scope = path.join(" › ");

      node.blocks.forEach((block, index) => {
        addBlock(
          scope,
          block,
          index,
        );
      });

      for (const item of node.tfItems) {
        questions.push({
          kind: "tf",
          id: `${source.id}:${scope}:${item.id}`,
          sourceTitle: source.title,
          prompt: `${scope} › T/F`,
          statement: item.statement,
          answer: item.answer,
        });
      }

      node.entities.forEach(
        (entity, entityIndex) => {
          entity.blocks.forEach(
            (block, blockIndex) => {
              addBlock(
                `${scope} › ${entity.name}`,
                block,
                entityIndex * 1000 + blockIndex,
              );
            },
          );
        },
      );

      walk(node.children, path);
    }
  };

  walk(source.parsed.nodes, []);
  return questions;
}

export function LectureRandomQuiz({
  sources,
}: {
  sources: QuizSource[];
}) {
  const questions = useMemo(
    () =>
      sources.flatMap((source) =>
        collectLectureQuizQuestions(source),
      ),
    [sources],
  );

  const signature = useMemo(
    () =>
      questions
        .map((question) => question.id)
        .join("|"),
    [questions],
  );

  const [order, setOrder] = useState<number[]>([]);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] =
    useState(false);

  const startRound = () => {
    setOrder(shuffleIndices(questions.length));
    setPosition(0);
    setRevealed(false);
  };

  useEffect(() => {
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!questions.length) {
    return (
      <div className="rounded-[15px] border border-dashed bg-white p-8 text-center text-[14px] leading-6 text-[#7d8781]">
        선택 범위에서 퀴즈로 만들 수 있는
        @정보 블록 또는 T/F 문항을 찾지 못했습니다.
      </div>
    );
  }

  const safeOrder =
    order.length === questions.length
      ? order
      : Array.from(
          { length: questions.length },
          (_, index) => index,
        );

  const currentIndex =
    safeOrder[position % safeOrder.length] ?? 0;
  const current = questions[currentIndex];

  const previousQuestion = () => {
    if (position <= 0) return;

    setPosition((current) =>
      Math.max(0, current - 1),
    );
    setRevealed(false);
  };

  const nextQuestion = () => {
    const nextPosition = position + 1;

    if (nextPosition >= questions.length) {
      startRound();
      return;
    }

    setPosition(nextPosition);
    setRevealed(false);
  };

  return (
    <div className="rounded-[18px] border border-[#dfe6e2] bg-white p-6">
      <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
        RANDOM QUIZ {position + 1} /{" "}
        {questions.length}
      </p>

      <h2 className="mt-6 text-[clamp(28px,4.4vw,38px)] font-bold leading-[1.35] tracking-[-0.035em]">
        {current.prompt}
      </h2>

      {current.kind === "tf" ? (
        <div className="mt-6 min-h-[150px] rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb] p-5">
          <div className="text-[clamp(22px,3.6vw,30px)] font-semibold leading-[1.5] tracking-[-0.025em] text-[#26332d]">
            {current.statement}
          </div>

          <div className="mt-6 min-h-[46px]">
            {revealed ? (
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: current.answer
                      ? "#4d84d8"
                      : "#cf6269",
                    boxShadow: current.answer
                      ? "0 0 12px 4px rgba(77,132,216,0.38)"
                      : "0 0 12px 4px rgba(207,98,105,0.36)",
                  }}
                />
                <strong
                  className="text-[28px]"
                  style={{
                    color: current.answer
                      ? "#4d84d8"
                      : "#cf6269",
                  }}
                >
                  {current.answer ? "T" : "F"}
                </strong>
              </div>
            ) : (
              <span className="text-[15px] text-[#9aa39e]">
                T인지 F인지 판단한 뒤 정답을 확인하세요.
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 min-h-[150px] rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb] p-5">
          {revealed ? (
            <div className="whitespace-pre-wrap text-[17px] leading-8 text-[#53615a]">
              {current.answer}
            </div>
          ) : (
            <span className="text-[15px] text-[#9aa39e]">
              정답을 떠올린 뒤 확인하세요.
            </span>
          )}
        </div>
      )}

      {revealed && sources.length > 1 && (
        <p className="mt-2 text-[12px] text-[#9aa39e]">
          강의: {current.sourceTitle}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            setRevealed((value) => !value)
          }
          className="rounded-[10px] border border-[#cfe1d8] bg-[#eef6eb] px-4 py-2.5 text-[15px] font-semibold text-[#075f4e]"
        >
          {revealed
            ? "정답 숨기기"
            : "정답 보기"}
        </button>

        <button
          type="button"
          onClick={previousQuestion}
          disabled={position === 0}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-35"
        >
          ← 이전 문제
        </button>

        <button
          type="button"
          onClick={nextQuestion}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[15px] font-semibold"
        >
          다음 랜덤 문제 →
        </button>
      </div>
    </div>
  );
}


export function DocumentQuiz({
  parsed,
  moduleId = "drugs",
}: {
  parsed: ParsedUniversalTxt;
  moduleId?: "drugs" | "microbiology";
}) {
  return <EntityRecallQuiz moduleId={moduleId} sources={[{ id: "current", title: parsed.title, parsed }]} />;
}

export default function UniversalDocument({
  content,
  query,
  blockLabels = {},
  moduleId,
}: {
  content: string;
  query: string;
  blockLabels?: BlockLabelMap;
  moduleId?: ModuleId;
}) {
  const parsed = useMemo(
    () => parseUniversalTxt(content, blockLabels),
    [content, blockLabels],
  );

  const [openNodes, setOpenNodes] =
    useState<Set<string>>(() => new Set());
  const [openEntities, setOpenEntities] =
    useState<Set<string>>(() => new Set());
  const [openBlocks, setOpenBlocks] =
    useState<Set<string>>(() => new Set());

  const normalizedQuery = query.trim();

  const filteredNodes = useMemo(
    () =>
      filterNodes(
        parsed.nodes,
        normalizedQuery,
      ),
    [parsed.nodes, normalizedQuery],
  );

  const filteredEntities = useMemo(
    () =>
      filterEntities(
        parsed.entities,
        normalizedQuery,
      ),
    [parsed.entities, normalizedQuery],
  );

  const theme =
    THEMES[parsed.color ?? "green"];
  const forceOpen = Boolean(normalizedQuery);
  const inheritEntityBlocks =
    moduleId === "microbiology";
  const rootInheritedEntityBlocks =
    inheritEntityBlocks
      ? inheritedBlocksFrom(
          parsed.blocks,
          parsed.title,
        )
      : [];

  useEffect(() => {
    setOpenNodes(new Set());
    setOpenEntities(new Set());
    setOpenBlocks(new Set());
  }, [content]);

  useEffect(() => {
    const collapse = () => {
      setOpenNodes(new Set());
      setOpenEntities(new Set());
      setOpenBlocks(new Set());
    };

    window.addEventListener(
      "meditree:collapse-all",
      collapse,
    );

    return () =>
      window.removeEventListener(
        "meditree:collapse-all",
        collapse,
      );
  }, []);

  const fileBlocks =
    moduleId === "microbiology"
      ? []
      : normalizedQuery
        ? parsed.blocks.filter((block) =>
            `${block.label} ${block.value}`
              .toLowerCase()
              .includes(
                normalizedQuery.toLowerCase(),
              ),
          )
        : parsed.blocks;

  const fileTfItems =
    moduleId === "clinical" ||
    moduleId === "lectures"
      ? normalizedQuery
        ? parsed.tfItems.filter((item) =>
            item.statement
              .toLowerCase()
              .includes(
                normalizedQuery.toLowerCase(),
              ),
          )
        : parsed.tfItems
      : [];

  const fileMainBlocks =
    blocksWithoutMemo(fileBlocks);
  const fileMemoBlocks =
    memoBlocks(fileBlocks);

  return (
    <section
      className="rounded-[18px] border p-3 shadow-[0_10px_30px_rgba(19,40,31,0.035)]"
      style={{
        borderColor: theme.border,
        background: "#fbfcfb",
        boxShadow: `0 10px 30px ${theme.glow}`,
      }}
    >
      {(fileMainBlocks.length > 0 ||
        fileTfItems.length > 0 ||
        fileMemoBlocks.length > 0) && (
        <div
          className="mb-4 rounded-[15px] border bg-white p-3"
          style={{ borderColor: theme.border }}
        >
          {fileMainBlocks.length > 0 && (
            <BlockCards
              scopeId="file:main"
              blocks={fileMainBlocks}
              theme={theme}
              openBlocks={openBlocks}
              setOpenBlocks={setOpenBlocks}
              forceOpen={forceOpen}
              semanticTint={moduleId === "drugs"}
              moduleId={moduleId}
            />
          )}

          {fileTfItems.length > 0 && (
            <div
              className={
                fileMainBlocks.length > 0
                  ? "mt-3"
                  : ""
              }
            >
              <TfQuizList
                items={fileTfItems}
                moduleId={moduleId}
              />
            </div>
          )}

          {fileMemoBlocks.length > 0 && (
            <div
              className={
                fileMainBlocks.length > 0 ||
                fileTfItems.length > 0
                  ? "mt-3"
                  : ""
              }
            >
              <BlockCards
                scopeId="file:memo"
                blocks={fileMemoBlocks}
                theme={theme}
                openBlocks={openBlocks}
                setOpenBlocks={setOpenBlocks}
                forceOpen={forceOpen}
                semanticTint={moduleId === "drugs"}
                moduleId={moduleId}
              />
            </div>
          )}
        </div>
      )}

      {filteredEntities.length > 0 && (
        <div className="mb-4 grid gap-3">
          {filteredEntities.map((entity, index) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              displayNumber={String(index + 1).padStart(2, "0")}
              inheritedBlocks={rootInheritedEntityBlocks}
              theme={theme}
              openEntities={openEntities}
              setOpenEntities={setOpenEntities}
              openBlocks={openBlocks}
              setOpenBlocks={setOpenBlocks}
              forceOpen={forceOpen}
              moduleId={moduleId}
            />
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {filteredNodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            depth={0}
            openNodes={openNodes}
            setOpenNodes={setOpenNodes}
            openEntities={openEntities}
            setOpenEntities={setOpenEntities}
            openBlocks={openBlocks}
            setOpenBlocks={setOpenBlocks}
            forceOpen={forceOpen}
            theme={theme}
            inheritEntityBlocks={inheritEntityBlocks}
            inheritedEntityBlocks={rootInheritedEntityBlocks}
            moduleId={moduleId}
          />
        ))}
      </div>

      {filteredNodes.length === 0 &&
        filteredEntities.length === 0 &&
        fileBlocks.length === 0 &&
        fileTfItems.length === 0 && (
          <div className="p-8 text-center text-[14px] text-[#7d8781]">
            검색 결과가 없습니다.
          </div>
        )}
    </section>
  );
}
