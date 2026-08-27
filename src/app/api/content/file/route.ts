import { downloadContentText, storageErrorResponse } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return Response.json(
      { ok: false, code: "BAD_REQUEST", message: "TXT 경로가 없습니다." },
      { status: 400 },
    );
  }

  try {
    const content = await downloadContentText(path);
    return Response.json(
      { ok: true, content },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return storageErrorResponse(error);
  }
}
