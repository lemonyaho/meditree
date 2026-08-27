import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { ContentTree } from "@/lib/content-model";
import {
  loadContentTreeFromStorage,
  saveContentTreeToStorage,
  storageErrorResponse,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tree = await loadContentTreeFromStorage();
    return Response.json(
      { ok: true, source: "supabase-storage", tree },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return storageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json(
      { ok: false, code: "UNAUTHORIZED", message: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      tree?: ContentTree;
      fileEdits?: Record<string, string>;
    };

    if (!body.tree) {
      return Response.json(
        { ok: false, code: "BAD_REQUEST", message: "저장할 콘텐츠 구조가 없습니다." },
        { status: 400 },
      );
    }

    const result = await saveContentTreeToStorage(body.tree, body.fileEdits ?? {});
    return Response.json({ ok: true, source: "supabase-storage", ...result });
  } catch (error) {
    return storageErrorResponse(error);
  }
}
