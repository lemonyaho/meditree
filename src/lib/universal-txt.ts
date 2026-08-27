import type {
  BlockLabelMap,
  FileMeta,
  ModuleId,
  ThemeColor,
} from "@/lib/content-model";

export type TxtBlock = {
  id: string;
  key: string;
  label: string;
  value: string;
  inheritanceScope?: string;
  inheritedValue?: string;
  localValue?: string;
};

export type TxtEntity = {
  id: string;
  name: string;
  blocks: TxtBlock[];
};

export type TxtNode = {
  id: string;
  number: string;
  title: string;
  depth: number;
  blocks: TxtBlock[];
  entities: TxtEntity[];
  children: TxtNode[];
};

export type ParsedUniversalTxt = {
  title: string;
  english?: string;
  date?: string;
  professor?: string;
  color?: ThemeColor;
  blocks: TxtBlock[];
  entities: TxtEntity[];
  nodes: TxtNode[];
};

const RESERVED_META = new Set([
  "english",
  "date",
  "prof",
  "professor",
  "color",
  "verified",
]);

function normalizeBlockKey(key: string) {
  return key.trim().replace(/^@+/, "").toLowerCase();
}

const BLOCK_KEY_ALIASES: Record<string, string> = {
  oxygen: "o2",
};

function canonicalBlockKey(
  key: string,
  labels: BlockLabelMap,
) {
  const normalized = normalizeBlockKey(key);
  if (normalized in labels) return normalized;

  const alias = BLOCK_KEY_ALIASES[normalized];
  if (alias && alias in labels) return alias;

  return normalized;
}

export function blockLabel(
  key: string,
  labels: BlockLabelMap = {},
) {
  const raw = key.trim().replace(/^@+/, "");
  const normalized = canonicalBlockKey(raw, labels);

  for (const [registeredKey, registeredLabel] of Object.entries(labels)) {
    if (normalizeBlockKey(registeredKey) === normalized) {
      return registeredLabel;
    }
  }

  // 등록하지 않은 사용자 지정 라벨은 원문을 그대로 사용한다.
  // @염증성 설사 → 염증성 설사
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return raw;

  // 등록되지 않은 영문 key도 깨지지 않고 사람이 읽을 수 있게 표시.
  return raw
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function stripLegacyVerifiedMetadata(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter(
      (line) =>
        !/^\s*@verified(?:\s+.*)?\s*$/i.test(line),
    )
    .join("\n");
}

export function contentFingerprint(text: string) {
  const normalized = stripLegacyVerifiedMetadata(text)
    .replace(/\r\n?/g, "\n")
    .trimEnd();

  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}

export function txtTitleFromContent(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^#\s+(.+?)\s*$/);
    const title = match?.[1]?.trim();
    if (title) return title;
  }
  return undefined;
}

export function replaceTxtTitle(text: string, nextTitle: string) {
  const title = nextTitle.trim();
  if (!title) return text;

  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const titleIndex = lines.findIndex((line) => /^\s*#(?:\s|$)/.test(line));

  if (titleIndex >= 0) {
    lines[titleIndex] = `# ${title}`;
    return lines.join("\n");
  }

  return `# ${title}${normalized ? `\n${normalized}` : ""}`;
}

function normalizeProfessor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /(?:\sP|[가-힣]P)$/i.test(trimmed) ? trimmed : `${trimmed} P`;
}

function normalizeColor(value: string): ThemeColor | undefined {
  const normalized = value.trim().toLowerCase();
  return normalized === "red" ||
    normalized === "yellow" ||
    normalized === "blue" ||
    normalized === "green"
    ? normalized
    : undefined;
}

function makeBlock(
  key: string,
  value: string,
  index: number,
  labels: BlockLabelMap,
): TxtBlock {
  return {
    id: `block-${index}`,
    key,
    label: blockLabel(key, labels),
    value: value.trim(),
  };
}

function buildTree(
  flat: Array<Omit<TxtNode, "children">>,
): TxtNode[] {
  const roots: TxtNode[] = [];
  const stack: TxtNode[] = [];

  flat.forEach((item) => {
    const node: TxtNode = { ...item, children: [] };
    const depth = item.depth;

    while (stack.length > depth) stack.pop();

    if (depth === 0 || !stack[depth - 1]) {
      roots.push(node);
    } else {
      stack[depth - 1].children.push(node);
    }

    stack[depth] = node;
    stack.length = depth + 1;
  });

  return roots;
}

function matchNumericHeading(value: string) {
  const match = value.match(
    /^(\d+(?:\.\d+)*)\s+(.+)$/,
  );
  if (!match) return null;

  const number = match[1];
  const title = match[2].trim();

  // MediTree heading syntax is 01 / 01.1 / 01.1.1 ...
  // A plain 3+ digit number is much more likely to be a dose/value
  // (e.g. "160 mg/800 mg") than a section number.
  if (
    !number.includes(".") &&
    Number(number) >= 100
  ) {
    return null;
  }

  // Also reject common dose/unit lines even when the number is 1–2 digits.
  if (
    /^(?:mg|mcg|μg|ug|g|kg|ml|mL|L|IU|U|unit|units|mmol|mEq|%)\b/i.test(
      title,
    )
  ) {
    return null;
  }

  return match;
}

export function parseUniversalTxt(
  text: string,
  labels: BlockLabelMap = {},
): ParsedUniversalTxt {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let title = "제목 없음";
  let english: string | undefined;
  let date: string | undefined;
  let professor: string | undefined;
  let color: ThemeColor | undefined;
  let seenContent = false;

  const fileBlocks: TxtBlock[] = [];
  const fileEntities: TxtEntity[] = [];
  const flatNodes: Array<Omit<TxtNode, "children">> = [];

  let currentNode: Omit<TxtNode, "children"> | undefined;
  let currentEntity: TxtEntity | undefined;
  let blockIndex = 0;
  let entityIndex = 0;

  const isHeading = (value: string) =>
    Boolean(matchNumericHeading(value));
  const isEntity = (value: string) =>
    /^##\s+(.+)$/.test(value);
  const isAtLine = (value: string) =>
    value.startsWith("@") && value.length > 1;

  const registeredKeys = new Set(
    Object.keys(labels).map(normalizeBlockKey),
  );

  const appendBlock = (block: TxtBlock) => {
    if (currentEntity) currentEntity.blocks.push(block);
    else if (currentNode) currentNode.blocks.push(block);
    else fileBlocks.push(block);
  };

  for (let index = 0; index < lines.length; ) {
    const raw = lines[index];
    const trimmed = raw.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    // ## entity는 # title보다 먼저 검사해야 한다.
    const entityMatch = trimmed.match(/^##\s+(.+)$/);
    if (entityMatch) {
      seenContent = true;
      const entity: TxtEntity = {
        id: `entity-${entityIndex++}`,
        name: entityMatch[1].trim(),
        blocks: [],
      };
      if (currentNode) currentNode.entities.push(entity);
      else fileEntities.push(entity);
      currentEntity = entity;
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim() || title;
      currentEntity = undefined;
      index += 1;
      continue;
    }

    const heading = matchNumericHeading(trimmed);
    if (heading) {
      seenContent = true;
      currentEntity = undefined;
      const number = heading[1];
      currentNode = {
        id: `${number}-${flatNodes.length}`,
        number,
        title: heading[2].trim(),
        depth: number.split(".").length - 1,
        blocks: [],
        entities: [],
      };
      flatNodes.push(currentNode);
      index += 1;
      continue;
    }

    if (isAtLine(trimmed)) {
      const body = trimmed.slice(1).trim();
      const meta = body.match(
        /^([A-Za-z][A-Za-z0-9_-]*)(?:\s+(.*))?$/,
      );

      if (
        !seenContent &&
        meta &&
        RESERVED_META.has(meta[1].toLowerCase())
      ) {
        const key = meta[1].toLowerCase();
        const inline = meta[2]?.trim() ?? "";

        if (key === "english") english = inline || undefined;
        if (key === "date") date = inline || undefined;
        if (key === "prof" || key === "professor") {
          professor = normalizeProfessor(inline);
        }
        if (key === "color") {
          color = normalizeColor(inline) ?? color;
        }

        index += 1;
        continue;
      }

      const firstToken = body.match(/^([^\s]+)(?:\s+(.*))?$/);
      const first = firstToken?.[1] ?? body;
      const rest = firstToken?.[2]?.trim() ?? "";
      const canonicalFirst = canonicalBlockKey(first, labels);

      // 등록된 @key만 inline value를 허용한다.
      // @oxygen은 v2.2.0부터 @o2의 호환 alias로 처리한다.
      // 등록되지 않은 @염증성 설사 같은 문구는 전체 문구가 라벨.
      const isRegisteredKey =
        registeredKeys.has(canonicalFirst);
      const key = isRegisteredKey ? canonicalFirst : body;
      const inline = isRegisteredKey ? rest : "";

      const valueLines: string[] = [];
      if (inline) valueLines.push(inline);

      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextTrimmed = lines[cursor].trim();
        if (
          nextTrimmed.startsWith("# ") ||
          isEntity(nextTrimmed) ||
          isHeading(nextTrimmed) ||
          isAtLine(nextTrimmed)
        ) {
          break;
        }
        valueLines.push(lines[cursor]);
        cursor += 1;
      }

      const value = valueLines.join("\n").trim();
      if (value) {
        appendBlock(
          makeBlock(key, value, blockIndex++, labels),
        );
      }

      index = cursor;
      continue;
    }

    // @ 없이 직접 쓴 자유 텍스트는 현재 entity/node의 메모.
    const freeLines: string[] = [raw];
    let cursor = index + 1;

    while (cursor < lines.length) {
      const nextTrimmed = lines[cursor].trim();
      if (
        nextTrimmed.startsWith("# ") ||
        isEntity(nextTrimmed) ||
        isHeading(nextTrimmed) ||
        isAtLine(nextTrimmed)
      ) {
        break;
      }
      freeLines.push(lines[cursor]);
      cursor += 1;
    }

    const value = freeLines.join("\n").trim();
    if (value) {
      appendBlock(
        makeBlock("note", value, blockIndex++, {
          ...labels,
          note: "메모",
        }),
      );
    }

    index = cursor;
  }

  return {
    title,
    english,
    date,
    professor,
    color,
    blocks: fileBlocks,
    entities: fileEntities,
    nodes: buildTree(flatNodes),
  };
}

export function metadataFromTxt(
  text: string,
  fallbackTitle: string,
): FileMeta {
  const parsed = parseUniversalTxt(text);
  return {
    title: txtTitleFromContent(text) ?? fallbackTitle,
    english: parsed.english,
    date: parsed.date,
    professor: parsed.professor,
    color: parsed.color,
  };
}

export type ParsedLectureDate = {
  raw: string;
  valid: boolean;
  sortKey: number;
  label: string;
};

export function parseLectureDate(
  raw?: string,
): ParsedLectureDate | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(\d{2})\.(\d{2})\.(\d{2})\.([1-9]+)$/,
  );

  if (!match) {
    return {
      raw: trimmed,
      valid: false,
      sortKey: Number.MAX_SAFE_INTEGER,
      label: trimmed,
    };
  }

  const year = 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const periods = match[4].split("").map(Number);
  const date = new Date(year, month - 1, day);
  const validDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  const validPeriods = periods.every(
    (period, index) =>
      period >= 1 &&
      period <= 9 &&
      (index === 0 ||
        period === periods[index - 1] + 1),
  );
  const valid = validDate && validPeriods;

  const periodLabel =
    periods.length === 1
      ? `${periods[0]}교시`
      : `${periods[0]}–${periods[periods.length - 1]}교시`;

  return {
    raw: trimmed,
    valid,
    sortKey: valid
      ? year * 10000000 +
        month * 100000 +
        day * 1000 +
        periods[0]
      : Number.MAX_SAFE_INTEGER,
    label: valid
      ? `${String(year).slice(-2)}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} · ${periodLabel}`
      : trimmed,
  };
}

export function compareLectureFiles(
  a: { meta: FileMeta },
  b: { meta: FileMeta },
) {
  const aDate = parseLectureDate(a.meta.date);
  const bDate = parseLectureDate(b.meta.date);

  return (
    (aDate?.sortKey ?? Number.MAX_SAFE_INTEGER) -
    (bDate?.sortKey ?? Number.MAX_SAFE_INTEGER)
  );
}

export function createTxtTemplate(
  moduleId: ModuleId,
  title: string,
) {
  if (moduleId === "lectures") {
    return `# ${title}
@english 
@date 
@prof 
@color 

01 큰 목차
@def 
`;
  }

  if (moduleId === "clinical") {
    return `# ${title}
@english 

01 큰 목차
@def 
`;
  }

  if (moduleId === "drugs") {
    return `# ${title}
@english 

01 약물 계열
@mechanism

## Drugname
@brand
@target
@indi
@contra
@side
@memo
`;
  }

  return `# ${title}
@english 
@gram 
@morph 
@o2 

01 분류
## Genus species
`;
}

export function documentSearchText(
  parsed: ParsedUniversalTxt,
) {
  const values: string[] = [
    parsed.title,
    parsed.english ?? "",
  ];

  const addBlocks = (blocks: TxtBlock[]) => {
    for (const block of blocks) {
      values.push(block.label, block.value);
    }
  };

  const addEntities = (entities: TxtEntity[]) => {
    for (const entity of entities) {
      values.push(entity.name);
      addBlocks(entity.blocks);
    }
  };

  const walk = (nodes: TxtNode[]) => {
    for (const node of nodes) {
      values.push(node.number, node.title);
      addBlocks(node.blocks);
      addEntities(node.entities);
      walk(node.children);
    }
  };

  addBlocks(parsed.blocks);
  addEntities(parsed.entities);
  walk(parsed.nodes);

  return values.join(" ").toLowerCase();
}
