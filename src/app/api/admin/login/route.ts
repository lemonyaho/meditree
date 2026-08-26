import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not configured." },
      { status: 503 },
    );
  }

  let password = "";

  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json(
      { ok: false, error: "Invalid password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: getAdminSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
