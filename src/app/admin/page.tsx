import LoginForm from "./LoginForm";
import AdminHomeEditor from "./AdminHomeEditor";
import AdminBreadcrumbs from "@/components/AdminBreadcrumbs";
import styles from "./admin.module.css";
import {
  isAdminAuthenticated,
  isAdminConfigured,
} from "@/lib/admin-auth";

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const authenticated = configured
    ? await isAdminAuthenticated()
    : false;

  if (!authenticated) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <AdminBreadcrumbs />

          <section className={styles.card}>
            <div className={styles.brand}>
              <img
                src="/meditree-logo.png"
                alt=""
                aria-hidden="true"
              />
              <div>
                <span className={styles.eyebrow}>MEDITREE ADMIN</span>
                <h1 className={styles.title}>관리자 로그인</h1>
              </div>
            </div>

            {!configured ? (
              <div className={styles.warning}>
                <strong>ADMIN_PASSWORD가 설정되지 않았습니다.</strong>
                <br />
                프로젝트 루트의 .env.local에 ADMIN_PASSWORD를
                설정하고 dev server를 재시작하세요.
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
    <main className="min-h-[calc(100vh-90px)] bg-[#f8faf8] px-5 pb-24 pt-10 text-[#17211d] min-[1180px]:pr-[128px]">
      <div className="mx-auto w-[min(1000px,100%)]">
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <AdminBreadcrumbs />

            <form action="/api/admin/logout" method="post">
              <button
                type="submit"
                className="rounded-[10px] border bg-white px-4 py-2.5 text-[13px]"
              >
                로그아웃
              </button>
            </form>
          </div>

          <p className="mb-2 mt-0 text-[13px] font-bold tracking-[0.12em] text-[#168269]">
            ADMIN
          </p>
          <h1 className="text-[clamp(36px,5vw,48px)] font-bold tracking-[-0.05em]">
            홈페이지 편집
          </h1>
          <p className="mt-3 text-[15px] text-[#6d7772]">
            홈 화면의 이름과 순서를 관리합니다. 세부 콘텐츠는 각 TXT 관리 화면에서 수정합니다.
          </p>
        </header>

        <AdminHomeEditor />
      </div>
    </main>
  );
}
