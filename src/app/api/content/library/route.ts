import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { TxtLibrary } from "@/lib/txt-content";
import {
  loadTxtLibraryFromStorage,
  saveTxtLibraryToStorage,
  storageErrorResponse,
} from "@/lib/storage-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const library = await loadTxtLibraryFromStorage();

    return Response.json(
      {
        ok: true,
        source: "supabase-storage",
        library,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return storageErrorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "관리자 로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as {
      library?: TxtLibrary;
      previousLibrary?: TxtLibrary;
    };

    if (!body.library) {
      return Response.json(
        {
          ok: false,
          code: "BAD_REQUEST",
          message: "저장할 TXT 데이터가 없습니다.",
        },
        { status: 400 },
      );
    }

    const result = await saveTxtLibraryToStorage(
      body.library,
      body.previousLibrary,
    );

    return Response.json({
      ok: true,
      source: "supabase-storage",
      ...result,
    });
  } catch (error) {
    return storageErrorResponse(error);
  }
}
