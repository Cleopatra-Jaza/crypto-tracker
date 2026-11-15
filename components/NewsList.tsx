"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news";

type Filter = "All" | "Cointelegraph" | "CoinDesk";

const FILTERS: Filter[] = ["All", "Cointelegraph", "CoinDesk"];

function formatRelativeTime(from: number, now: number): string {
  const diff = now - from;
  if (!Number.isFinite(diff) || diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NewsList() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/news", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data: unknown = await res.json();
        if (!res.ok) {
          const message =
            data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Failed to load news";
          throw new Error(message);
        }
        if (ignore) return;
        const list =
          data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
            ? ((data as { items: NewsItem[] }).items as NewsItem[])
            : [];
        setItems(list);
        // Relative times are computed on the client only, after data has loaded.
        setLoadedAt(Date.now());
      } catch (e) {
        if (ignore || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [reloadKey]);

  const visible = filter === "All" ? items : items.filter((item) => item.source === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-11 rounded-lg border px-4 py-2 md:min-h-0 ${
              filter === f
                ? "border-green-500 bg-green-500 text-black"
                : "border-[var(--input-border)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--card-border)] p-4"
            >
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--skeleton)]" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-[var(--skeleton)]" />
              <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[var(--skeleton)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[var(--card-border)] p-4">
          <p className="text-sm text-red-700 dark:text-red-500">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 min-h-11 rounded-lg border border-[var(--input-border)] px-4 py-2 md:min-h-0"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[var(--card-border)] p-4">
          <p className="text-sm text-[var(--muted)]">No news available right now.</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 min-h-11 rounded-lg border border-[var(--input-border)] px-4 py-2 md:min-h-0"
          >
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No items from this source.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => {
            const time =
              item.publishedAt != null && loadedAt != null
                ? formatRelativeTime(item.publishedAt, loadedAt)
                : null;
            return (
              <li
                key={item.link}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    {item.source}
                  </span>
                  {time && <span className="shrink-0 text-xs text-[var(--muted)]">{time}</span>}
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block font-medium hover:underline"
                >
                  {item.title}
                </a>
                {item.summary && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">
                    {item.summary}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-[var(--muted)]">
        Headlines from Cointelegraph and CoinDesk RSS feeds. Open an item to read it on the
        original site.
      </p>
    </div>
  );
}