import AdminBreadcrumbs from "@/components/AdminBreadcrumbs";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TxtFolderEditorAdmin from "@/components/TxtFolderEditorAdmin";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  return (
    <main className="min-h-[calc(100vh-90px)] overflow-x-hidden bg-[#f8faf8] px-5 pb-24 pt-10 text-[#17211d] min-[1180px]:pr-[128px]">
      <div className="mx-auto w-[min(1120px,100%)] min-w-0">
        <AdminBreadcrumbs
          items={[
            { label: "미생물 TXT", href: "/admin/microbiology" },
            { label: "분류" },
          ]}
        />

        <div className="mt-8 min-w-0">
          <Suspense fallback={null}>
            <TxtFolderEditorAdmin kind="microbiology" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
