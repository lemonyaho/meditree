import { Suspense } from "react";
import StudyModulePage from "@/components/StudyModulePage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StudyModulePage moduleId="cases" />
    </Suspense>
  );
}
