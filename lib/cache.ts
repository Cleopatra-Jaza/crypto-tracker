import { Redis } from "@upstash/redis";

type SharedEntry<T> = { data: T; fetchedAt: number };

const REDIS_TIMEOUT_MS = 1500;

// undefined = not resolved yet, null = unavailable (missing env or init failed)
let client: Redis | null | undefined;
// Set when client creation failed, so we never retry it on every request.
let disabled = false;

function cleanEnvValue(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  let out = value.trim();
  // Drop a single pair of surrounding quotes, then trim again.
  if (out.length >= 2) {
    const first = out[0];
    const last = out[out.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      out = out.slice(1, -1).trim();
    }
  }
  return out.length > 0 ? out : null;
}

function getClient(): Redis | null {
  if (client !== undefined) return client;
  if (disabled) return null;
  const url = cleanEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = cleanEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) {
    client = null;
    return client;
  }
  try {
    client = new Redis({ url, token });
  } catch (err) {
    console.warn("[cache] Redis disabled:", err);
    client = null;
    disabled = true;
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
  try {
    const redis = getClient();
    if (!redis) return null;
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
  try {
    const redis = getClient();
    if (!redis) return;
    const entry: SharedEntry<T> = { data, fetchedAt: Date.now() };
    await withTimeout(
      redis.set(key, JSON.stringify(entry), { ex: maxAgeSeconds })
    ).catch((err) => {
      console.warn("[cache]", err);
    });
  } catch (err) {
    console.warn("[cache]", err);
  }
}