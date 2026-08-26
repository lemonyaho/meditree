import AdminBreadcrumbs from "@/components/AdminBreadcrumbs";
import { redirect } from "next/navigation";
import TxtFolderIndexAdmin from "@/components/TxtFolderIndexAdmin";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  return (
    <main className="min-h-[calc(100vh-90px)] overflow-x-hidden bg-[#f8faf8] px-5 pb-24 pt-10 text-[#17211d] min-[1180px]:pr-[128px]">
      <div className="mx-auto w-[min(1060px,100%)]">
        <AdminBreadcrumbs
          items={[{ label: "미생물 TXT" }]}
        />

        <header className="mb-8 mt-8">
          <p className="text-[13px] font-bold tracking-[0.12em] text-[#168269]">
            TXT ADMIN · MICROBIOLOGY
          </p>
          <h1 className="mt-2 text-[42px] font-bold tracking-[-0.05em]">
            미생물 TXT 관리
          </h1>
          <p className="mt-3 text-[15px] text-[#748079]">
            Bacteria, Virus, Fungus, Parasite 등 큰 분류를 먼저 선택합니다.
          </p>
        </header>

        <TxtFolderIndexAdmin kind="microbiology" />
      </div>
    </main>
  );
}
