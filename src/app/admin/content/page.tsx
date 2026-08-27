import { redirect } from "next/navigation";
import { Suspense } from "react";
import ContentTreeAdmin from "@/components/ContentTreeAdmin";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function Page() {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-x-hidden bg-[#f8faf8] px-5 pb-24 pt-9 text-[#17211d] min-[1220px]:pr-[118px] max-[720px]:px-4">
      <div className="mx-auto w-[min(1120px,100%)] min-w-0">
        <Suspense fallback={null}>
          <ContentTreeAdmin />
        </Suspense>
      </div>
    </main>
  );
}
