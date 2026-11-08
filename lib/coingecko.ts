export async function cgFetch(
  path: string,
  revalidateSeconds: number
): Promise<Response> {
  const headers: Record<string, string> = {};
  const key = process.env.COINGECKO_API_KEY;
  if (typeof key === "string" && key.length > 0) {
    headers["x-cg-demo-api-key"] = key;
  }
  return fetch(`https://api.coingecko.com/api/v3${path}`, {
    headers,
    next: { revalidate: revalidateSeconds },
  });
}
