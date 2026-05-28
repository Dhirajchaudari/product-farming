import { describe, expect, it } from "vitest";

import { normalizeRedisUrl } from "../redis-url.js";

describe("normalizeRedisUrl", () => {
  it("strips quotes and trailing encoded quote", () => {
    const raw =
      '"redis://default:secret@redis-16542.example.com:16542"';
    expect(normalizeRedisUrl(raw)).toBe(
      "redis://default:secret@redis-16542.example.com:16542"
    );
  });

  it("adds redis scheme when missing", () => {
    expect(normalizeRedisUrl("default:pass@host:6379")).toBe(
      "redis://default:pass@host:6379"
    );
  });
});
