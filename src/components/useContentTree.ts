"use client";

import { useEffect, useState } from "react";
import {
  cloneDefaultContentTree,
  normalizeContentTree,
  type ContentTree,
} from "@/lib/content-model";

let treeCache: ContentTree | null = null;
let treeInflight: Promise<ContentTree> | null = null;
const fileCache = new Map<string, string>();
const fileInflight = new Map<string, Promise<string>>();

function cloneTree(tree: ContentTree) {
  return JSON.parse(JSON.stringify(tree)) as ContentTree;
}

export async function readContentTree(options: { force?: boolean } = {}) {
  if (!options.force && treeCache) return cloneTree(treeCache);
  if (!options.force && treeInflight) return cloneTree(await treeInflight);

  const request = (async () => {
    const response = await fetch("/api/content/tree", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; tree?: ContentTree; message?: string }
      | null;

    if (!response.ok || !data?.tree) {
      throw new Error(data?.message || `콘텐츠 구조를 불러오지 못했습니다. (${response.status})`);
    }

    const tree = normalizeContentTree(data.tree);
    treeCache = cloneTree(tree);
    return tree;
  })();

  treeInflight = request;
  try {
    return cloneTree(await request);
  } finally {
    if (treeInflight === request) treeInflight = null;
  }
}

export async function readContentFile(objectPath: string, options: { force?: boolean } = {}) {
  if (!options.force && fileCache.has(objectPath)) {
    return fileCache.get(objectPath)!;
  }

  if (!options.force && fileInflight.has(objectPath)) {
    return fileInflight.get(objectPath)!;
  }

  const request = (async () => {
    const response = await fetch(
      `/api/content/file?path=${encodeURIComponent(objectPath)}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; content?: string; message?: string }
      | null;

    if (!response.ok || typeof data?.content !== "string") {
      throw new Error(data?.message || `TXT를 불러오지 못했습니다. (${response.status})`);
    }

    fileCache.set(objectPath, data.content);
    return data.content;
  })();

  fileInflight.set(objectPath, request);
  try {
    return await request;
  } finally {
    fileInflight.delete(objectPath);
  }
}

export async function writeContentTree(
  tree: ContentTree,
  fileEdits: Record<string, string> = {},
) {
  const response = await fetch("/api/content/tree", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tree, fileEdits }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        tree?: ContentTree;
        message?: string;
        uploadedFileCount?: number;
      }
    | null;

  if (!response.ok || !data?.ok || !data.tree) {
    throw new Error(data?.message || `저장에 실패했습니다. (${response.status})`);
  }

  const saved = normalizeContentTree(data.tree);
  treeCache = cloneTree(saved);

  // Update the session cache for files whose object path is now known.
  const byId = new Map<string, string>();
  const walkFolders = (folders: ContentTree["modules"]["clinical"]["folders"]) => {
    for (const folder of folders) {
      for (const file of folder.files) {
        if (file.objectPath) byId.set(file.id, file.objectPath);
      }
      walkFolders(folder.folders);
    }
  };
  for (const module of Object.values(saved.modules)) {
    for (const file of module.files) {
      if (file.objectPath) byId.set(file.id, file.objectPath);
    }
    walkFolders(module.folders);
  }
  for (const [id, content] of Object.entries(fileEdits)) {
    const path = byId.get(id);
    if (path) fileCache.set(path, content);
  }

  window.dispatchEvent(
    new CustomEvent("meditree:v2-tree-updated", { detail: cloneTree(saved) }),
  );

  return { ...data, tree: saved };
}

export default function useContentTree() {
  const [tree, setTree] = useState<ContentTree>(() =>
    treeCache ? cloneTree(treeCache) : cloneDefaultContentTree(),
  );

  useEffect(() => {
    let active = true;
    void readContentTree().then((current) => {
      if (active) setTree(current);
    }).catch((error) => console.error("MediTree v2 tree load failed:", error));

    const handle = (event: Event) => {
      const detail = (event as CustomEvent<ContentTree>).detail;
      if (detail) setTree(cloneTree(detail));
    };
    window.addEventListener("meditree:v2-tree-updated", handle);

    return () => {
      active = false;
      window.removeEventListener("meditree:v2-tree-updated", handle);
    };
  }, []);

  return tree;
}
