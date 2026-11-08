import { Suspense } from "react";
import CompareView from "./CompareView";

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <CompareView />
    </Suspense>
  );
}
