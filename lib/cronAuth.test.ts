import { describe, it, expect } from "vitest";
import { isAuthorized } from "./cronAuth";

describe("isAuthorized", () => {
  const secret = "0123456789abcdef";

  it("returns true for correct token", () => {
    expect(isAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("returns false for wrong token", () => {
    expect(isAuthorized("Bearer wrong-token-here", secret)).toBe(false);
  });

  it("returns false for missing header", () => {
    expect(isAuthorized(null, secret)).toBe(false);
    expect(isAuthorized(undefined, secret)).toBe(false);
  });

  it("returns false for header without Bearer prefix", () => {
    expect(isAuthorized(secret, secret)).toBe(false);
    expect(isAuthorized(`Basic ${secret}`, secret)).toBe(false);
  });

  it("returns false for undefined secret", () => {
    expect(isAuthorized(`Bearer ${secret}`, undefined)).toBe(false);
  });

  it("returns false for secret shorter than 16", () => {
    expect(isAuthorized("Bearer short", "short")).toBe(false);
    expect(isAuthorized("Bearer 123456789012345", "123456789012345")).toBe(false);
  });

  it("returns true for token with surrounding spaces", () => {
    expect(isAuthorized(`Bearer   ${secret}  `, secret)).toBe(true);
  });
});
