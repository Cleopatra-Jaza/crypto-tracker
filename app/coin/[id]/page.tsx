import { Suspense } from "react";
import CoinDetail from "./CoinDetail";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoinDetail id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-6">Loading...</p>}>
      <Content params={params} />
    </Suspense>
  );
}