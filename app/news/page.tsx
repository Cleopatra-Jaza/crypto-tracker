import type { Metadata } from "next";
import NewsList from "@/components/NewsList";

export const metadata: Metadata = {
  title: "News | Crypto Tracker",
  description: "Latest crypto headlines from Cointelegraph and CoinDesk RSS feeds.",
};

export default function NewsPage() {
  return (
    <main className="mx-auto max-w-4xl w-full min-w-0 px-4 py-6 pb-24 md:px-6 md:py-6 md:pb-0">
      <h1 className="mb-2 text-xl font-medium md:mb-4 md:text-3xl md:font-bold">News</h1>
      <NewsList />
    </main>
  );
}