import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "meditree_admin";

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return timingSafeEqual(aBuffer, bBuffer);
}

function sessionToken(password: string) {
  return createHash("sha256")
    .update(`meditree-admin-session-v1:${password}`)
    .digest("hex");
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export function verifyAdminPassword(candidate: string) {
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) return false;

  return safeEqual(candidate, password);
}

export function getAdminSessionToken() {
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) return "";

  return sessionToken(password);
}

export async function isAdminAuthenticated() {
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) return false;

  const cookieStore = await cookies();
  const actual = cookieStore.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const expected = sessionToken(password);

  if (!actual) return false;

  return safeEqual(actual, expected);
}
