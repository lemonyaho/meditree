export type HomeModuleId =
  | "clinical"
  | "lectures"
  | "drugs"
  | "microbiology";

export type HomeModule = {
  id: HomeModuleId;
  title: string;
  english: string;
  description: string;
};

export type HomeContent = {
  eyebrow: string;
  brandTitle: string;
  subtitle: string;
  modules: HomeModule[];
  footerCopyright: string;
  footerAdminLabel: string;
};

export const HOME_CONTENT_KEY = "meditree-admin-home-v2";
export const LEGACY_HOME_KEY = "meditree-admin-home-v1";

export const HOME_MODULE_META: Record<
  HomeModuleId,
  { href: string }
> = {
  clinical: { href: "/clinical" },
  lectures: { href: "/lectures" },
  drugs: { href: "/drugs" },
  microbiology: { href: "/microbiology" },
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  eyebrow: "MEDICAL STUDY ARCHIVE",
  brandTitle: "MediTree",
  subtitle: "공부한 내용을 하나씩 쌓고, 필요할 때 다시 꺼내보세요.",
  modules: [
    {
      id: "clinical",
      title: "임상 단권화",
      english: "CLINICAL",
      description:
        "임상에서 다시 찾아볼 핵심 내용을 질환과 상황 중심으로 정리합니다.",
    },
    {
      id: "lectures",
      title: "강의 단권화",
      english: "LECTURE",
      description: "계통별 강의와 목차를 한곳에서 정리합니다.",
    },
    {
      id: "drugs",
      title: "약물 공부 도구",
      english: "DRUG TOOL",
      description:
        "계열 · 계층 · 성분명 · 상품명 · 임상 정보를 연결합니다.",
    },
    {
      id: "microbiology",
      title: "미생물 공부 도구",
      english: "MICROBE TOOL",
      description:
        "세균 · 바이러스 · 진균 · 기생충을 분류하고 비교합니다.",
    },
  ],
  footerCopyright: "©2026 LMYH. All Rights Reserved.",
  footerAdminLabel: "관리자 도구",
};

export function cloneDefaultHomeContent(): HomeContent {
  return JSON.parse(JSON.stringify(DEFAULT_HOME_CONTENT)) as HomeContent;
}

export function mergeLegacyHomeContent(
  legacy: unknown,
): HomeContent {
  const next = cloneDefaultHomeContent();

  if (!Array.isArray(legacy)) return next;

  const legacyModules = legacy.filter(
    (value): value is {
      id: HomeModuleId;
      title?: string;
      english?: string;
    } =>
      Boolean(value) &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string",
  );

  const ordered: HomeModule[] = [];

  for (const legacyModule of legacyModules) {
    const base = next.modules.find(
      (module) => module.id === legacyModule.id,
    );
    if (!base) continue;

    ordered.push({
      ...base,
      title:
        typeof legacyModule.title === "string"
          ? legacyModule.title
          : base.title,
      english:
        typeof legacyModule.english === "string"
          ? legacyModule.english
          : base.english,
    });
  }

  for (const module of next.modules) {
    if (!ordered.some((entry) => entry.id === module.id)) {
      ordered.push(module);
    }
  }

  next.modules = ordered;
  return next;
}
