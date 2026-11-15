import { createHash, timingSafeEqual } from "node:crypto";

export function isAuthorized(
  authorizationHeader: string | null | undefined,
  secret: string | undefined
): boolean {
  if (secret === undefined || secret.trim().length < 16) {
    return false;
  }
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  const trimmedSecret = secret.trim();

  const tokenHash = createHash("sha256").update(token).digest();
  const secretHash = createHash("sha256").update(trimmedSecret).digest();

  return timingSafeEqual(tokenHash, secretHash);
}
