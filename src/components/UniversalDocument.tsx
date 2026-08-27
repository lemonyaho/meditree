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

function drugSemanticTint(key: string) {
  const normalized = normalizedBlockKey(key);

  if (normalized === "indi") {
    return {
      background: "#f2f9f5",
      border: "#d8eadf",
      label: "#3f6f54",
    };
  }

  if (normalized === "contra") {
    return {
      background: "#fff4f5",
      border: "#f0dadd",
      label: "#8a5058",
    };
  }

  if (normalized === "side") {
    return {
      background: "#fff8ee",
      border: "#eee0c6",
      label: "#82643c",
    };
  }

  if (normalized === "memo") {
    return {
      background: "#f3f7fb",
      border: "#dbe6f0",
      label: "#4d6981",
    };
  }

  return null;
}

function CompositeBlockValue({
  value,
  inheritedValue,
  localValue,
  inheritanceScope,
}: {
  value: string;
  inheritedValue?: string;
  localValue?: string;
  inheritanceScope?: string;
}) {
  if (inheritedValue && localValue) {
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 inline-flex rounded-full border border-[#dce5e0] bg-[#f7faf8] px-2.5 py-1 text-[11px] font-semibold text-[#69766f]">
            공통 · {inheritanceScope}
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#53615a]">
            {inheritedValue}
          </div>
        </div>

        <div className="border-t border-[#e8eeea] pt-3">
          <div className="mb-1.5 inline-flex rounded-full border border-[#dfe6e2] bg-white/75 px-2.5 py-1 text-[11px] font-semibold text-[#69766f]">
            개별
          </div>
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#53615a]">
            {localValue}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#53615a]">
      {value || "내용 없음"}
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
}) {
  if (!blocks.length) return null;

  return (
    <div className="grid gap-2.5">
      {blocks.map((block) => {
        const id = `${scopeId}:${block.id}`;
        const open =
          forceOpen || openBlocks.has(id);
        const tint = semanticTint
          ? drugSemanticTint(block.key)
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
              className="flex min-h-[50px] w-full items-center justify-between gap-3 px-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="text-[15px] font-semibold"
                  style={{
                    color: tint?.label ?? "#111713",
                  }}
                >
                  {block.label}
                </span>

                {block.inheritanceScope &&
                  !(block.inheritedValue && block.localValue) && (
                    <span className="max-w-[260px] truncate rounded-full border border-[#dce5e0] bg-[#f7faf8] px-2.5 py-1 text-[11px] font-semibold text-[#69766f]">
                      공통 · {block.inheritanceScope}
                    </span>
                  )}
              </div>
              <span
                className="text-[13px] font-semibold"
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
          className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left"
          style={{
            background: theme.soft2,
          }}
        >
          <span
            className="shrink-0 font-mono text-[11px] font-bold"
            style={{ color: theme.accent }}
          >
            {displayNumber}
          </span>

          <strong className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {entity.name}
          </strong>

          {moduleId === "drugs" && brands.length > 0 && (
            <span className="shrink-0 text-right text-[12px] font-medium text-[#7f8a84]">
              {brands.join(" · ")}
            </span>
          )}

          <span
            className="shrink-0 text-[17px]"
            style={{ color: theme.accent }}
          >
            {isOpen ? "↑" : "↓"}
          </span>
        </button>
      ) : (
        <div
          className="flex min-h-[52px] items-center gap-3 px-4"
          style={{
            background: theme.soft2,
          }}
        >
          <span
            className="shrink-0 font-mono text-[11px] font-bold"
            style={{ color: theme.accent }}
          >
            {displayNumber}
          </span>

          <strong className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {entity.name}
          </strong>

          {moduleId === "drugs" && brands.length > 0 && (
            <span className="shrink-0 text-right text-[12px] font-medium text-[#7f8a84]">
              {brands.join(" · ")}
            </span>
          )}
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

  const hasBody =
    node.children.length > 0 ||
    node.blocks.length > 0 ||
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
              className="shrink-0 font-mono text-[12px] font-bold"
              style={{ color: theme.accent }}
            >
              {node.number}
            </span>
            <strong
              className={`${depth === 0 ? "text-[17px]" : "text-[16px]"} truncate font-semibold tracking-[-0.015em]`}
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
            className="shrink-0 font-mono text-[12px] font-bold"
            style={{ color: theme.accent }}
          >
            {node.number}
          </span>
          <strong className="truncate text-[16px] font-semibold tracking-[-0.015em]">
            {node.title}
          </strong>
        </div>
      )}

      {isOpen && (
        <div
          className="border-t px-4 pb-4 pt-4"
          style={{ borderColor: theme.border }}
        >
          {node.blocks.length > 0 && (
            <BlockCards
              scopeId={`node:${node.id}`}
              blocks={node.blocks}
              theme={theme}
              openBlocks={openBlocks}
              setOpenBlocks={setOpenBlocks}
              forceOpen={forceOpen}
              semanticTint={moduleId === "drugs"}
            />
          )}

          {node.entities.length > 0 && (
            <div
              className={`${node.blocks.length ? "mt-4" : ""} grid gap-3`}
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
              className={`${node.blocks.length || node.entities.length ? "mt-4" : ""} grid gap-3`}
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

type EntityQuizQuestion = {
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

    for (const block of entityBlocks) {
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
      sources.flatMap((source) =>
        collectEntityQuizQuestions(
          source,
          moduleId,
        ),
      ),
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
      nextCues[question.id] =
        randomCue(question);
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
    cues[current.id] ?? randomCue(current);

  const visibleRows =
    cue.kind === "성분명"
      ? current.rows.filter(
          (row) => row.label !== "성분명",
        )
      : current.rows;

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

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[clamp(30px,4.8vw,42px)] font-bold tracking-[-0.045em]">
          {cue.text}
        </h2>

        {moduleId === "drugs" &&
          current.brands.length > 0 && (
            <span className="text-[clamp(14px,2.2vw,18px)] font-medium text-[#7f8a84]">
              {current.brands.join(" · ")}
            </span>
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
            className="grid min-h-[68px] grid-cols-[185px_minmax(0,1fr)] border-b last:border-b-0 max-[620px]:grid-cols-[128px_minmax(0,1fr)]"
            style={{
              borderColor: tint?.border ?? "#edf1ee",
              background: tint?.background ?? "transparent",
            }}
          >
            <div
              className="flex items-center border-r px-5 py-4"
              style={{
                borderColor: tint?.border ?? "#edf1ee",
              }}
            >
              <div className="min-w-0">
                <strong
                  className="text-[15px] font-semibold"
                  style={{
                    color: tint?.label ?? "#53615a",
                  }}
                >
                  {row.label}
                </strong>

                {row.inheritanceScope &&
                  !(row.inheritedValue && row.localValue) && (
                    <div className="mt-1.5 inline-flex max-w-[160px] truncate rounded-full border border-[#dce5e0] bg-white/65 px-2 py-0.5 text-[10.5px] font-semibold text-[#69766f]">
                      공통 · {row.inheritanceScope}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex min-w-0 items-center px-5 py-4">
              {revealed ? (
                <div className="min-w-0 flex-1">
                  <CompositeBlockValue
                    value={row.value}
                    inheritedValue={row.inheritedValue}
                    localValue={row.localValue}
                    inheritanceScope={row.inheritanceScope}
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
          onClick={nextQuestion}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[14px] font-semibold"
        >
          다음 랜덤 문제 →
        </button>
      </div>
    </div>
  );
}

type LectureQuizQuestion = {
  id: string;
  sourceTitle: string;
  prompt: string;
  answer: string;
};

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
      id: `${source.id}:${scope}:${block.id}:${index}`,
      sourceTitle: source.title,
      prompt: scope
        ? `${scope} · ${block.label}`
        : block.label,
      answer: block.value.trim(),
    });
  };

  source.parsed.blocks.forEach((block, index) => {
    addBlock(source.title, block, index);
  });

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
        @정보 블록을 찾지 못했습니다.
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
        RANDOM QUIZ {position + 1} /{" "}
        {questions.length}
      </p>

      <h2 className="mt-6 text-[clamp(24px,4vw,34px)] font-bold leading-[1.35] tracking-[-0.035em]">
        {current.prompt}
      </h2>

      <div className="mt-6 min-h-[150px] rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb] p-5">
        {revealed ? (
          <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#53615a]">
            {current.answer}
          </div>
        ) : (
          <span className="text-[14px] text-[#9aa39e]">
            정답을 떠올린 뒤 확인하세요.
          </span>
        )}
      </div>

      {revealed && sources.length > 1 && (
        <p className="mt-2 text-[11px] text-[#9aa39e]">
          강의: {current.sourceTitle}
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
          onClick={nextQuestion}
          className="rounded-[10px] border bg-white px-4 py-2.5 text-[14px] font-semibold"
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

  return (
    <section
      className="rounded-[18px] border p-3 shadow-[0_10px_30px_rgba(19,40,31,0.035)]"
      style={{
        borderColor: theme.border,
        background: "#fbfcfb",
        boxShadow: `0 10px 30px ${theme.glow}`,
      }}
    >
      {fileBlocks.length > 0 && (
        <div
          className="mb-4 rounded-[15px] border bg-white p-3"
          style={{ borderColor: theme.border }}
        >
          <BlockCards
            scopeId="file"
            blocks={fileBlocks}
            theme={theme}
            openBlocks={openBlocks}
            setOpenBlocks={setOpenBlocks}
            forceOpen={forceOpen}
            semanticTint={moduleId === "drugs"}
          />
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
        fileBlocks.length === 0 && (
          <div className="p-8 text-center text-[14px] text-[#7d8781]">
            검색 결과가 없습니다.
          </div>
        )}
    </section>
  );
}
