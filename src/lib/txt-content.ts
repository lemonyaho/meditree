export type LectureColor = "red" | "yellow" | "blue" | "green";

export type TxtFile = {
  id: string;
  name: string;
  content: string;
};

export type TxtFolder = {
  id: string;
  name: string;
  english: string;
  files: TxtFile[];
};

export type TxtLibrary = {
  lectures: {
    folders: TxtFolder[];
  };
  drugs: {
    folders: TxtFolder[];
  };
  microbiology: {
    folders: TxtFolder[];
  };
};

export type ParsedLectureTopic = {
  number: string;
  title: string;
  depth: number;
};


export type ParsedLectureDate = {
  raw: string;
  year: number;
  month: number;
  day: number;
  periods: number[];
  startPeriod: number;
  sortKey: number;
  valid: boolean;
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
      year: 0,
      month: 0,
      day: 0,
      periods: [],
      startPeriod: 99,
      sortKey: Number.MAX_SAFE_INTEGER,
      valid: false,
    };
  }

  const year = 2000 + Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const periods = match[4].split("").map(Number);

  const date = new Date(year, month - 1, day);
  const validCalendarDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  const validPeriods =
    periods.length > 0 &&
    periods.every(
      (period, index) =>
        period >= 1 &&
        period <= 9 &&
        (index === 0 || period === periods[index - 1] + 1),
    );

  const valid = validCalendarDate && validPeriods;
  const startPeriod = periods[0] ?? 99;
  const sortKey = valid
    ? year * 10000000 +
      month * 100000 +
      day * 1000 +
      startPeriod
    : Number.MAX_SAFE_INTEGER;

  return {
    raw: trimmed,
    year,
    month,
    day,
    periods,
    startPeriod,
    sortKey,
    valid,
  };
}

export function compareLectureDates(
  a?: string,
  b?: string,
): number {
  const parsedA = parseLectureDate(a);
  const parsedB = parseLectureDate(b);

  const keyA =
    parsedA?.valid === true
      ? parsedA.sortKey
      : Number.MAX_SAFE_INTEGER;
  const keyB =
    parsedB?.valid === true
      ? parsedB.sortKey
      : Number.MAX_SAFE_INTEGER;

  return keyA - keyB;
}

export function formatLectureDate(raw?: string): string {
  const parsed = parseLectureDate(raw);

  if (!parsed?.valid) return raw?.trim() || "";

  const periodLabel =
    parsed.periods.length === 1
      ? `${parsed.periods[0]}교시`
      : `${parsed.periods[0]}–${
          parsed.periods[parsed.periods.length - 1]
        }교시`;

  return `${String(parsed.year).slice(-2)}.${String(
    parsed.month,
  ).padStart(2, "0")}.${String(parsed.day).padStart(
    2,
    "0",
  )} · ${periodLabel}`;
}

export type ParsedLecture = {
  title: string;
  date?: string;
  professor?: string;
  color: LectureColor;
  refs: string[];
  topics: ParsedLectureTopic[];
};

export type Drug = {
  generic: string;
  brand?: string;
  indications?: string[];
  contraindications?: string[];
  adverseEffects?: string[];
  sources?: string[];
};

export type DrugHierarchyNode = {
  id: string;
  name: string;
  mechanism?: string;
  children: DrugHierarchyNode[];
  drugs: Drug[];
};

export type ParsedDrugCategory = {
  id: string;
  name: string;
  english: string;
  refs: string[];
  hierarchy: DrugHierarchyNode[];
};

export type FlatDrug = {
  drug: Drug;
  path: string[];
};

export type MicrobeDomain = "bacteria" | "virus" | "fungus" | "parasite";

export type OxygenRequirement =
  | "Obligate aerobe"
  | "Microaerophile"
  | "Facultative anaerobe"
  | "Obligate anaerobe";

export type ParsedMicrobe = {
  id: string;
  name: string;
  domain: MicrobeDomain;
  subgroup: string;
  gram?: string;
  morphology?: string;
  oxygen?: OxygenRequirement;
  keyFacts: string[];
};

export const TXT_LIBRARY_KEY = "meditree-txt-library-v1";

export const oxygenRequirements: OxygenRequirement[] = [
  "Obligate aerobe",
  "Microaerophile",
  "Facultative anaerobe",
  "Obligate anaerobe",
];

const LEGACY_SEED_FILE_IDS = new Set([
  // lectures
  "intro-infectious",
  "antibiotic-use",

  // drugs
  "antihistamines",
  "antibiotics",
  "antivirals",
  "antifungals",

  // microbiology
  "gram-positive",
  "gram-negative",
  "atypical-special",
  "dna-virus",
  "rna-virus",
  "yeast",
  "mold",
  "protozoa",
  "helminth",
]);

export const defaultTxtLibrary: TxtLibrary = {
  lectures: {
    folders: [
      {
        id: "immunology",
        name: "면역(본2-2)",
        english: "IMMUNOLOGY",
        files: [],
      },
      {
        id: "infectious-disease",
        name: "감염",
        english: "INFECTIOUS DISEASE",
        files: [],
      },
    ],
  },

  drugs: {
    folders: [],
  },

  microbiology: {
    folders: [
      {
        id: "bacteria",
        name: "세균",
        english: "BACTERIA",
        files: [],
      },
      {
        id: "virus",
        name: "바이러스",
        english: "VIRUS",
        files: [],
      },
      {
        id: "fungus",
        name: "진균",
        english: "FUNGUS",
        files: [],
      },
      {
        id: "parasite",
        name: "기생충",
        english: "PARASITE",
        files: [],
      },
    ],
  },
};

export function removeLegacySeedTxt(
  library: TxtLibrary,
): TxtLibrary {
  return {
    lectures: {
      folders: library.lectures.folders.map((folder) => ({
        ...folder,
        files: folder.files.filter(
          (file) => !LEGACY_SEED_FILE_IDS.has(file.id),
        ),
      })),
    },

    drugs: {
      folders: library.drugs.folders.map((folder) => ({
        ...folder,
        files: folder.files.filter(
          (file) => !LEGACY_SEED_FILE_IDS.has(file.id),
        ),
      })),
    },

    microbiology: {
      folders: library.microbiology.folders.map((folder) => ({
        ...folder,
        files: folder.files.filter(
          (file) => !LEGACY_SEED_FILE_IDS.has(file.id),
        ),
      })),
    },
  };
}

export function normalizeTxtLibraryShape(
  input: unknown,
): TxtLibrary {
  const raw = (input ?? {}) as {
    lectures?: { folders?: TxtFolder[] };
    drugs?: {
      folders?: TxtFolder[];
      files?: TxtFile[];
    };
    microbiology?: { folders?: TxtFolder[] };
  };

  const lectureFolders = Array.isArray(
    raw.lectures?.folders,
  )
    ? raw.lectures!.folders!
    : cloneDefaultTxtLibrary().lectures.folders;

  let drugFolders: TxtFolder[] = [];

  if (Array.isArray(raw.drugs?.folders)) {
    drugFolders = raw.drugs!.folders!;
  } else if (
    Array.isArray(raw.drugs?.files) &&
    raw.drugs!.files!.length
  ) {
    // Legacy flat drug TXT: preserve it without losing data.
    drugFolders = raw.drugs!.files!.map((file) => ({
      id: `legacy-${file.id}`,
      name: file.name.replace(/\.txt$/i, ""),
      english: "",
      files: [file],
    }));
  }

  const microFolders = Array.isArray(
    raw.microbiology?.folders,
  )
    ? raw.microbiology!.folders!
    : cloneDefaultTxtLibrary().microbiology.folders;

  return removeLegacySeedTxt({
    lectures: { folders: lectureFolders },
    drugs: { folders: drugFolders },
    microbiology: { folders: microFolders },
  });
}

export function cloneDefaultTxtLibrary(): TxtLibrary {
  return JSON.parse(JSON.stringify(defaultTxtLibrary)) as TxtLibrary;
}

function cleanLines(text: string) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function metaValue(line: string, key: string) {
  const prefix = `@${key}`;
  if (!line.startsWith(prefix)) return undefined;
  return line.slice(prefix.length).trim();
}

function refValue(line: string) {
  const match = line.match(/^@ref\s+\d+\s*:\s*(.*)$/i);
  return match?.[1]?.trim();
}

export function parseLectureTxt(text: string): ParsedLecture {
  const lines = cleanLines(text);
  let title = "제목 없음";
  let date: string | undefined;
  let professor: string | undefined;
  let color: LectureColor = "green";
  const refs: string[] = [];
  const topics: ParsedLectureTopic[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      title = line.slice(2).trim() || title;
      continue;
    }

    const dateValue = metaValue(line, "date");
    if (dateValue !== undefined) {
      date = dateValue || undefined;
      continue;
    }

    const profValue = metaValue(line, "prof");
    if (profValue !== undefined) {
      const trimmedProfessor = profValue.trim();

      if (!trimmedProfessor) {
        professor = undefined;
      } else {
        const alreadyHasProfessorSuffix =
          /\s+P$/i.test(trimmedProfessor) ||
          /[가-힣]P$/i.test(trimmedProfessor);

        professor = alreadyHasProfessorSuffix
          ? trimmedProfessor
          : `${trimmedProfessor} P`;
      }

      continue;
    }

    const colorValue = metaValue(line, "color");
    if (
      colorValue === "red" ||
      colorValue === "yellow" ||
      colorValue === "blue" ||
      colorValue === "green"
    ) {
      color = colorValue;
      continue;
    }

    const ref = refValue(line);
    if (ref !== undefined) {
      if (ref && ref.toLowerCase() !== "none") refs.push(ref);
      continue;
    }

    const topic = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (topic) {
      topics.push({
        number: topic[1],
        title: topic[2].trim(),
        depth: topic[1].split(".").length - 1,
      });
    }
  }

  return { title, date, professor, color, refs, topics };
}

function makeNodeId(number: string, title: string) {
  return `${number}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣β]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseDrugTxt(id: string, text: string): ParsedDrugCategory {
  const lines = cleanLines(text);
  let name = "이름 없음";
  let english = "";
  const refs: string[] = [];
  const hierarchy: DrugHierarchyNode[] = [];
  const stack: DrugHierarchyNode[] = [];
  let currentNode: DrugHierarchyNode | undefined;
  let currentDrug: Drug | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Preferred drug block syntax.
    if (line.startsWith("## ")) {
      const drugName = line.slice(3).trim();

      if (currentNode && drugName) {
        const drug: Drug = { generic: drugName };
        currentNode.drugs.push(drug);
        currentDrug = drug;
      }

      continue;
    }

    // File/category title.
    if (line.startsWith("# ")) {
      name = line.slice(2).trim() || name;
      currentDrug = undefined;
      continue;
    }

    const englishValue = metaValue(line, "english");
    if (englishValue !== undefined) {
      english = englishValue;
      continue;
    }

    const numbered = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numbered) {
      const number = numbered[1];
      const nodeName = numbered[2].trim();
      const depth = number.split(".").length;
      const node: DrugHierarchyNode = {
        id: makeNodeId(number, nodeName),
        name: nodeName,
        children: [],
        drugs: [],
      };

      if (depth === 1) {
        hierarchy.push(node);
      } else {
        const parent = stack[depth - 2];
        if (parent) parent.children.push(node);
        else hierarchy.push(node);
      }

      stack[depth - 1] = node;
      stack.length = depth;
      currentNode = node;
      currentDrug = undefined;
      continue;
    }

    const mechanism = metaValue(line, "mechanism");
    if (mechanism !== undefined) {
      if (currentNode) currentNode.mechanism = mechanism;
      continue;
    }

    // Legacy support so already-saved @drug files do not break.
    const legacyDrugName = metaValue(line, "drug");
    if (legacyDrugName !== undefined) {
      if (currentNode && legacyDrugName) {
        const drug: Drug = { generic: legacyDrugName };
        currentNode.drugs.push(drug);
        currentDrug = drug;
      }
      continue;
    }

    const brand = metaValue(line, "brand");
    if (brand !== undefined && currentDrug) {
      currentDrug.brand = brand || undefined;
      continue;
    }

    const indication = metaValue(line, "indication");
    if (indication !== undefined && currentDrug) {
      currentDrug.indications = [
        ...(currentDrug.indications ?? []),
        ...splitCommaValues(indication),
      ];
      continue;
    }

    const contraindication =
      metaValue(line, "contra") ??
      metaValue(line, "contraindication");

    if (contraindication !== undefined && currentDrug) {
      currentDrug.contraindications = [
        ...(currentDrug.contraindications ?? []),
        ...splitCommaValues(contraindication),
      ];
      continue;
    }

    const adverse = metaValue(line, "adverse");
    if (adverse !== undefined && currentDrug) {
      currentDrug.adverseEffects = [
        ...(currentDrug.adverseEffects ?? []),
        ...splitCommaValues(adverse),
      ];
      continue;
    }

    const ref = refValue(line);
    if (ref !== undefined) {
      if (ref && ref.toLowerCase() !== "none") {
        if (currentDrug) {
          currentDrug.sources = [
            ...(currentDrug.sources ?? []),
            ref,
          ];
        } else {
          refs.push(ref);
        }
      }
    }
  }

  return { id, name, english, refs, hierarchy };
}

export function flattenDrugNodes(
  nodes: DrugHierarchyNode[],
  parentPath: string[] = [],
): FlatDrug[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.name];

    return [
      ...node.drugs.map((drug) => ({ drug, path })),
      ...flattenDrugNodes(node.children, path),
    ];
  });
}

export function flattenDrugCategory(category: ParsedDrugCategory) {
  return flattenDrugNodes(category.hierarchy);
}

export function drugCategorySearchText(category: ParsedDrugCategory) {
  const walk = (nodes: DrugHierarchyNode[]): string[] =>
    nodes.flatMap((node) => [
      node.name,
      node.mechanism ?? "",
      ...node.drugs.flatMap((drug) => [
        drug.generic,
        drug.brand ?? "",
        ...(drug.indications ?? []),
        ...(drug.contraindications ?? []),
        ...(drug.adverseEffects ?? []),
      ]),
      ...walk(node.children),
    ]);

  return [category.name, category.english, ...walk(category.hierarchy)]
    .join(" ")
    .toLowerCase();
}

function inferGramFromMicrobiologyTitle(
  title: string,
): string | undefined {
  const normalized = title
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[＋]/g, "+")
    .replace(/[－−]/g, "-");

  if (
    normalized.includes("gram(+)") ||
    normalized.includes("gram+") ||
    normalized.includes("grampositive")
  ) {
    return "Gram-positive";
  }

  if (
    normalized.includes("gram(-)") ||
    normalized.includes("gram-") ||
    normalized.includes("gramnegative")
  ) {
    return "Gram-negative";
  }

  return undefined;
}

function normalizeOxygenRequirement(
  value: string,
): OxygenRequirement | undefined {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const aliases: Record<string, OxygenRequirement> = {
    "obligate aerobe": "Obligate aerobe",
    "obligate aerobic": "Obligate aerobe",
    "obl aerobe": "Obligate aerobe",
    "obl aerobic": "Obligate aerobe",
    microaerophile: "Microaerophile",
    microaerophilic: "Microaerophile",
    "facultative anaerobe": "Facultative anaerobe",
    "facultative anaerobic": "Facultative anaerobe",
    "fac anaerobe": "Facultative anaerobe",
    "fac anaerobic": "Facultative anaerobe",
    "obligate anaerobe": "Obligate anaerobe",
    "obligate anaerobic": "Obligate anaerobe",
    "obl anaerobe": "Obligate anaerobe",
    "obl anaerobic": "Obligate anaerobe",
  };

  return aliases[normalized];
}

export function parseMicrobiologyTxt(
  fileId: string,
  text: string,
  fallbackDomain: MicrobeDomain,
): {
  title: string;
  domain: MicrobeDomain;
  organisms: ParsedMicrobe[];
} {
  const lines = cleanLines(text);
  let title = "미분류";
  let domain: MicrobeDomain = fallbackDomain;
  const organisms: ParsedMicrobe[] = [];
  let current: ParsedMicrobe | undefined;

  function startOrganism(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    current = {
      id: `${fileId}-${organisms.length + 1}`,
      name: trimmed,
      domain,
      subgroup: title,
      keyFacts: [],
    };

    organisms.push(current);
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Preferred organism block syntax.
    if (line.startsWith("## ")) {
      startOrganism(line.slice(3));
      continue;
    }

    // TXT group title.
    if (line.startsWith("# ")) {
      title = line.slice(2).trim() || title;
      continue;
    }

    const domainValue = metaValue(line, "domain");
    if (
      domainValue === "bacteria" ||
      domainValue === "virus" ||
      domainValue === "fungus" ||
      domainValue === "parasite"
    ) {
      domain = domainValue;
      continue;
    }

    // Legacy syntax remains supported.
    const organism = metaValue(line, "organism");
    if (organism !== undefined) {
      startOrganism(organism);
      continue;
    }

    if (!current) continue;

    const gram = metaValue(line, "gram");
    if (gram !== undefined) {
      current.gram = gram || undefined;
      continue;
    }

    const morphology = metaValue(line, "morphology");
    if (morphology !== undefined) {
      current.morphology = morphology || undefined;
      continue;
    }

    const oxygen = metaValue(line, "oxygen");
    if (oxygen !== undefined) {
      current.oxygen = normalizeOxygenRequirement(oxygen);
      continue;
    }

    const feature = metaValue(line, "feature");
    if (feature !== undefined && feature) {
      current.keyFacts.push(
        ...feature
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }

  const inferredGram =
    domain === "bacteria"
      ? inferGramFromMicrobiologyTitle(title)
      : undefined;

  for (const organism of organisms) {
    organism.domain = domain;
    organism.subgroup = title;

    // Explicit @gram always wins. Otherwise infer once from the TXT title.
    if (!organism.gram && inferredGram) {
      organism.gram = inferredGram;
    }
  }

  return { title, domain, organisms };
}

export const TXT_TEMPLATES = {
  lecture: `# 강의명
@date 
@prof 
@color green
`,
  drug: `# 제목
@english

01 계층 1
@mechanism 

01.1 계층 2
01.1.1 계층 3

## 
@brand 
@indication 
@contra 
@adverse 
`,
  microbiology: `# 제목
@domain bacteria

## 
@morphology 
@oxygen 
@feature 
`,
};
