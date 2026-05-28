import { describe, expect, it } from "vitest";

import { parsePostgresUrl } from "../database-url.js";

describe("parsePostgresUrl", () => {
  it("rejects unencoded @ in password", () => {
    expect(() =>
      parsePostgresUrl("postgresql://user:Pass@word@localhost:5432/product_farming")
    ).toThrow(/URL-encode/i);
  });

  it("rejects suspicious host base", () => {
    expect(() => parsePostgresUrl("postgresql://user:secret@base:5432/product_farming")).toThrow(
      /host is "base"/i
    );
  });

  it("parses a valid neon-style URL", () => {
    const parsed = parsePostgresUrl(
      "postgresql://user:secret@ep-example.neon.tech:5432/product_farming"
    );
    expect(parsed.host).toBe("ep-example.neon.tech");
    expect(parsed.database).toBe("product_farming");
    expect(parsed.connectionString).toContain("sslmode=require");
    expect(parsed.connectionString).toContain("connect_timeout=30");
  });
});
