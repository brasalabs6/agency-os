import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/lib/services/http";

describe("HTTP same-origin check with reverse proxies", () => {
  it("accepts the browser-facing Host even if Next rewrites request.url", () => {
    const request = new Request("http://internal.local/api/leads", {
      method: "POST",
      headers: { Host: "agency.example.com", Origin: "https://agency.example.com" }
    });
    expect(() => assertSameOrigin(request)).not.toThrow();
  });
  it("rejects a different origin, including a spoofed port", () => {
    const bad = new Request("http://internal.local/api", {
      method: "POST",
      headers: { Host: "agency.example.com", Origin: "https://evil.example.com" }
    });
    const port = new Request("http://internal.local/api", {
      method: "POST",
      headers: { Host: "agency.example.com", Origin: "https://agency.example.com:8080" }
    });
    expect(() => assertSameOrigin(bad)).toThrowError("Invalid request origin");
    expect(() => assertSameOrigin(port)).toThrowError("Invalid request origin");
  });
  it("rejects malformed Origin safely", () => {
    const bad = new Request("http://internal.local/api", {
      method: "POST",
      headers: { Host: "agency.example.com", Origin: "not-a-url" }
    });
    expect(() => assertSameOrigin(bad)).toThrowError("Invalid request origin");
  });
});
