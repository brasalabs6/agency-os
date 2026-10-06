import { describe, expect, it } from "vitest";
import { MockLeadRepository } from "@/lib/repositories/mock-lead-repository";

describe("mock repository", () => {
  it("finds demo leads and detects strong duplicates", async () => {
    const repo = new MockLeadRepository();
    const page = await repo.search({ scoreMin: 80 });
    expect(page.items.length).toBeGreaterThan(0);
    const lead = page.items.find((item) => item.website);
    expect(lead).toBeTruthy();
    const duplicate = await repo.findDuplicate({ name: "Other Name", website: lead!.website! });
    expect(duplicate?.id).toBe(lead!.id);
  });
});
