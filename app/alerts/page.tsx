import { Suspense } from "react";
import AlertsView from "./AlertsView";

export default function AlertsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <AlertsView />
    </Suspense>
  );
}
