import { Redis } from "@upstash/redis";

type SharedEntry<T> = { data: T; fetchedAt: number };

const REDIS_TIMEOUT_MS = 1500;

// undefined = not resolved yet, null = unavailable (missing env or init failed)
let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (
    typeof url === "string" &&
    url.length > 0 &&
    typeof token === "string" &&
    token.length > 0
  ) {
    client = new Redis({ url, token });
  } else {
    client = null;
  }
  return client;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[cache] timeout after ${REDIS_TIMEOUT_MS}ms`)),
      REDIS_TIMEOUT_MS
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function parseEntry<T>(raw: unknown): SharedEntry<T> | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<SharedEntry<T>>;
  if (typeof entry.fetchedAt !== "number" || !("data" in entry)) return null;
  return { data: entry.data as T, fetchedAt: entry.fetchedAt };
}

export async function getSharedCache<T>(
  key: string
): Promise<{ data: T; fetchedAt: number } | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await withTimeout(redis.get<unknown>(key));
    return parseEntry<T>(raw);
  } catch (err) {
    console.warn("[cache]", err);
    return null;
  }
}

export async function setSharedCache<T>(
  key: string,
  data: T,
  maxAgeSeconds: number
): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    const entry: SharedEntry<T> = { data, fetchedAt: Date.now() };
    await withTimeout(redis.set(key, JSON.stringify(entry), { ex: maxAgeSeconds }));
  } catch (err) {
    console.warn("[cache]", err);
  }
}