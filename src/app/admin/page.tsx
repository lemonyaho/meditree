import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import SiteAdminEditor from "@/components/SiteAdminEditor";
import styles from "./admin.module.css";
import { isAdminAuthenticated, isAdminConfigured } from "@/lib/admin-auth";
import { APP_VERSION } from "@/lib/content-model";

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const authenticated = configured ? await isAdminAuthenticated() : false;

  if (!authenticated) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className="mb-5 text-[13px] text-[#7d8781]">MediTree › 관리자</div>
          <section className={styles.card}>
            <div className={styles.brand}>
              <img src="/meditree-logo.png" alt="" aria-hidden="true" />
              <div>
                <span className={styles.eyebrow}>MEDITREE ADMIN</span>
                <h1 className={styles.title}>관리자 로그인</h1>
              </div>
            </div>
            {!configured ? (
              <div className={styles.warning}>
                <strong>ADMIN_PASSWORD가 설정되지 않았습니다.</strong><br />
                .env.local 또는 Vercel Environment Variables의 ADMIN_PASSWORD를 확인하세요.
              </div>
            ) : (
              <LoginForm />
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f8faf8] px-5 pb-24 pt-9 text-[#17211d] min-[1220px]:pr-[118px] max-[720px]:px-4">
      <div className="mx-auto w-[min(1120px,100%)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <nav className="text-[13px] text-[#7d8781]">MediTree › 관리자</nav>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="rounded-[10px] border bg-white px-4 py-2.5 text-[13px]">로그아웃</button>
          </form>
        </div>
        <header className="mb-8 mt-9">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">ADMIN · MEDITREE V{APP_VERSION}</p>
          <h1 className="mt-2 text-[clamp(36px,5vw,48px)] font-bold tracking-[-0.05em]">홈 · UI 설정</h1>
          <p className="mt-3 text-[15px] text-[#6d7772]">UI 메타데이터와 4개 모듈의 표시 순서를 관리합니다. 실제 내용은 각 콘텐츠 관리에서 Supabase 폴더/TXT 트리로 관리합니다.</p>
        </header>
        <SiteAdminEditor />
      </div>
    </main>
  );
}
