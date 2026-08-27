"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  BlockLabelMap,
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

function BlockCards({
  scopeId,
  blocks,
  theme,
  openBlocks,
  setOpenBlocks,
  forceOpen,
}: {
  scopeId: string;
  blocks: TxtBlock[];
  theme: Theme;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
}) {
  if (!blocks.length) return null;

  return (
    <div className="grid gap-2.5">
      {blocks.map((block) => {
        const id = `${scopeId}:${block.id}`;
        const open =
          forceOpen || openBlocks.has(id);

        return (
          <div
            key={id}
            className="overflow-hidden rounded-[12px] border border-[#e0e6e2] bg-white"
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
              <span className="text-[14px] font-semibold">
                {block.label}
              </span>
              <span
                className="text-[13px] font-semibold"
                style={{ color: theme.accent }}
              >
                {open ? "닫기" : "보기"}
              </span>
            </button>

            {open && (
              <div className="whitespace-pre-wrap border-t border-[#edf1ee] px-4 py-3 text-[14px] leading-6 text-[#5f6b64]">
                {block.value || "내용 없음"}
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
  theme,
  openBlocks,
  setOpenBlocks,
  forceOpen,
}: {
  entity: TxtEntity;
  displayNumber: string;
  theme: Theme;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
}) {
  return (
    <article
      className="overflow-hidden rounded-[13px] border bg-white"
      style={{ borderColor: theme.border }}
    >
      <div
        className="flex min-h-[52px] items-center gap-3 border-b px-4"
        style={{
          borderColor: theme.border,
          background: theme.soft2,
        }}
      >
        <span
          className="shrink-0 font-mono text-[11px] font-bold"
          style={{ color: theme.accent }}
        >
          {displayNumber}
        </span>
        <strong className="text-[15px] font-semibold">
          {entity.name}
        </strong>
      </div>

      {entity.blocks.length > 0 && (
        <div className="p-3">
          <BlockCards
            scopeId={`entity:${entity.id}`}
            blocks={entity.blocks}
            theme={theme}
            openBlocks={openBlocks}
            setOpenBlocks={setOpenBlocks}
            forceOpen={forceOpen}
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
  openBlocks,
  setOpenBlocks,
  forceOpen,
  theme,
}: {
  node: TxtNode;
  depth: number;
  openNodes: Set<string>;
  setOpenNodes: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  openBlocks: Set<string>;
  setOpenBlocks: React.Dispatch<
    React.SetStateAction<Set<string>>
  >;
  forceOpen: boolean;
  theme: Theme;
}) {
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
                  theme={theme}
                  openBlocks={openBlocks}
                  setOpenBlocks={setOpenBlocks}
                  forceOpen={forceOpen}
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
                  openBlocks={openBlocks}
                  setOpenBlocks={setOpenBlocks}
                  forceOpen={forceOpen}
                  theme={theme}
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
};

type EntityQuizQuestion = {
  id: string;
  sourceTitle: string;
  entityName: string;
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
    const entityBlocks = mergeBlocks(inheritedBlocks, entity.blocks);
    const brandBlock = entity.blocks.find((block) => normalizedBlockKey(block.key) === "brand");
    const brands = brandBlock ? splitBrandNames(brandBlock.value) : [];

    const cues: QuizCue[] = moduleId === "drugs"
      ? [
          { text: entity.name, kind: "성분명" },
          ...brands.map((brand) => ({ text: brand, kind: "상품명" as const })),
        ]
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
      rows.push({ label: block.label, value: block.value.trim() });
    }

    questions.push({
      id: `${source.id}:${entity.id}`,
      sourceTitle: source.title,
      entityName: entity.name,
      cues,
      rows,
    });
  };

  for (const entity of source.parsed.entities) {
    addEntity(entity, [source.title], source.parsed.blocks);
  }

  const walk = (nodes: TxtNode[], hierarchy: string[], inheritedBlocks: TxtBlock[]) => {
    for (const node of nodes) {
      const nextHierarchy = [...hierarchy, node.title];
      const nextInherited = mergeBlocks(inheritedBlocks, node.blocks);
      for (const entity of node.entities) addEntity(entity, nextHierarchy, nextInherited);
      walk(node.children, nextHierarchy, nextInherited);
    }
  };

  walk(source.parsed.nodes, [source.title], source.parsed.blocks);
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

      <h2 className="mt-6 text-[clamp(30px,4.8vw,42px)] font-bold tracking-[-0.045em]">
        {cue.text}
      </h2>

      <div className="mt-6 overflow-hidden rounded-[14px] border border-[#dfe6e2] bg-[#fbfcfb]">
        {visibleRows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="grid min-h-[56px] grid-cols-[150px_minmax(0,1fr)] border-b border-[#edf1ee] last:border-b-0 max-[620px]:grid-cols-[112px_minmax(0,1fr)]"
          >
            <div className="flex items-center border-r border-[#edf1ee] px-4 py-3">
              <strong className="text-[13px] font-semibold text-[#53615a]">
                {row.label}
              </strong>
            </div>

            <div className="flex min-w-0 items-center px-4 py-3">
              {revealed ? (
                <div className="min-w-0 whitespace-pre-wrap text-[14px] leading-6 text-[#5f6b64]">
                  {row.value}
                </div>
              ) : (
                <span
                  aria-hidden="true"
                  className="min-h-[20px]"
                />
              )}
            </div>
          </div>
        ))}

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
}: {
  content: string;
  query: string;
  blockLabels?: BlockLabelMap;
}) {
  const parsed = useMemo(
    () => parseUniversalTxt(content, blockLabels),
    [content, blockLabels],
  );

  const [openNodes, setOpenNodes] =
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

  useEffect(() => {
    setOpenNodes(new Set());
    setOpenBlocks(new Set());
  }, [content]);

  useEffect(() => {
    const collapse = () => {
      setOpenNodes(new Set());
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

  const fileBlocks = normalizedQuery
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
              theme={theme}
              openBlocks={openBlocks}
              setOpenBlocks={setOpenBlocks}
              forceOpen={forceOpen}
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
            openBlocks={openBlocks}
            setOpenBlocks={setOpenBlocks}
            forceOpen={forceOpen}
            theme={theme}
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
