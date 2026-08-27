#!/usr/bin/env node

/**
 * MediTree one-time reset
 * - 홈페이지/UI 설정 유지
 * - 모든 폴더/TXT 삭제
 * - legacy Storage 삭제
 * - 최종적으로 content/index.json만 유지
 *
 * 실행:
 * node scripts/reset-content.mjs --confirm
 */

import fs from "node:fs";
import path from "node:path";

if (!process.argv.includes("--confirm")) {
  console.error("실행하려면 --confirm 이 필요합니다.");
  process.exit(2);
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const result = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const pos = line.indexOf("=");
    if (pos < 0) continue;
    const key = line.slice(0, pos).trim();
    let value = line.slice(pos + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const env = {
  ...loadEnv(path.resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const SUPABASE_URL = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
const SECRET = String(
  env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "",
);
const BUCKET = String(env.SUPABASE_STORAGE_BUCKET || "meditree-content");

if (!SUPABASE_URL || !SECRET) {
  throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY를 확인하세요.");
}

const authHeaders = { apikey: SECRET };
if (!SECRET.startsWith("sb_secret_") && !SECRET.startsWith("sb_publishable_")) {
  authHeaders.Authorization = `Bearer ${SECRET}`;
}

function encodeObjectPath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

async function request(endpoint, init = {}) {
  return fetch(`${SUPABASE_URL}/storage/v1${endpoint}`, {
    ...init,
    headers: { ...authHeaders, ...(init.headers || {}) },
  });
}

async function downloadText(objectPath) {
  const res = await request(
    `/object/${encodeURIComponent(BUCKET)}/${encodeObjectPath(objectPath)}`,
    { method: "GET" },
  );
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`읽기 실패 ${objectPath}: ${res.status} ${await res.text()}`);
  }
  return res.text();
}

async function uploadJson(objectPath, value) {
  const res = await request(
    `/object/${encodeURIComponent(BUCKET)}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "cache-control": "max-age=0",
        "x-upsert": "true",
      },
      body: JSON.stringify(value, null, 2),
    },
  );
  if (!res.ok) {
    throw new Error(`업로드 실패: ${res.status} ${await res.text()}`);
  }
}

async function listFolder(prefix = "") {
  const output = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await request(`/object/list/${encodeURIComponent(BUCKET)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: prefix.replace(/\/$/, ""),
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });

    if (!res.ok) {
      throw new Error(`목록 조회 실패: ${res.status} ${await res.text()}`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;

    for (const row of rows) {
      const name = String(row.name || "");
      if (!name) continue;
      const full = prefix ? `${prefix.replace(/\/$/, "")}/${name}` : name;
      const isFolder = !row.id && !row.metadata;
      if (isFolder) output.push(...(await listFolder(full)));
      else output.push(full);
    }

    if (rows.length < limit) break;
    offset += limit;
  }

  return output;
}

async function deleteObjects(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    if (!chunk.length) continue;

    const res = await request(`/object/${encodeURIComponent(BUCKET)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: chunk }),
    });

    if (!res.ok) {
      throw new Error(`삭제 실패: ${res.status} ${await res.text()}`);
    }
  }
}

function cleanManifest(manifest) {
  const next = structuredClone(manifest);
  next.schemaVersion = 2;
  next.updatedAt = new Date().toISOString();

  if (!next.site || !next.modules) {
    throw new Error("index.json 구조가 올바르지 않습니다.");
  }

  for (const module of Object.values(next.modules)) {
    module.folders = [];
    module.files = [];
  }

  return next;
}

console.log(`Bucket: ${BUCKET}`);
console.log("1/4 현재 홈페이지/UI 설정 읽기");

const raw =
  (await downloadText("content/index.json")) ??
  (await downloadText("v2/index.json")) ??
  (await downloadText("index.json"));

if (!raw) {
  throw new Error("보존할 기존 index.json을 찾지 못했습니다.");
}

const clean = cleanManifest(JSON.parse(raw));

console.log("2/4 빈 content/index.json 저장");
await uploadJson("content/index.json", clean);

const verifyRaw = await downloadText("content/index.json");
if (!verifyRaw) throw new Error("새 index 저장 검증 실패");

const verify = JSON.parse(verifyRaw);
for (const module of Object.values(verify.modules || {})) {
  if ((module.folders || []).length || (module.files || []).length) {
    throw new Error("초기화 검증 실패: 폴더/TXT가 남아 있습니다.");
  }
}

console.log("3/4 TXT 및 legacy object 삭제");
const all = await listFolder("");
const toDelete = all.filter((item) => item !== "content/index.json");
for (const item of toDelete) console.log(`  - ${item}`);
await deleteObjects(toDelete);

console.log("4/4 최종 검증");
const after = await listFolder("");
const unexpected = after.filter((item) => item !== "content/index.json");
if (unexpected.length) {
  throw new Error(`남은 object:\n${unexpected.join("\n")}`);
}

console.log("");
console.log("초기화 완료");
console.log("홈페이지/UI 설정: 유지");
console.log("폴더/TXT: 0개");
console.log("Storage: content/index.json만 유지");
