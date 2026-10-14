import { describe, expect, it } from "vitest";
import { runtimeDatabaseUrl } from "@/lib/db/client";

describe("serverless Supavisor connection mode", () => {
  it("routes a Supavisor session pooler URL to transaction mode", () => {
    const input = "postgresql://user:masked@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require";
    const actual = new URL(runtimeDatabaseUrl(input));
    expect(actual.port).toBe("6543");
    expect(actual.searchParams.get("sslmode")).toBe("require");
    expect(actual.username).toBe("user");
  });

  it("keeps transaction pooler URLs unchanged", () => {
    const value = "postgres://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";
    expect(runtimeDatabaseUrl(value)).toBe(value);
  });

  it("does not rewrite direct, local or unrelated database endpoints", () => {
    for (const value of [
      "postgres://agencyos:masked@localhost:5432/agencyos",
      "postgres://postgres:masked@db.project.supabase.co:5432/postgres",
      "postgres://postgres:masked@other.example.com:5432/postgres",
    ]) {
      expect(runtimeDatabaseUrl(value)).toBe(value);
    }
  });

  it("rejects non-postgresql protocol", () => {
    expect(() => runtimeDatabaseUrl("https://untrusted.example/path")).toThrow("PostgreSQL protocol");
  });
});
