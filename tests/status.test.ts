import { describe, expect, it } from "vitest";
import { canContact, canTransition, pipelineGroupForStatus, statusForPipelineGroup } from "@/lib/domain/status";

describe("lead status rules", () => {
  it("blocks contact for do-not-contact", () => expect(canContact("DO_NOT_CONTACT", true)).toBe(false));
  it("keeps invalid and do-not-contact terminal", () => {
    expect(canTransition("DO_NOT_CONTACT", "CONTACTED")).toBe(false);
    expect(canTransition("INVALID", "READY_TO_CONTACT")).toBe(false);
  });
  it("allows a won lead to enter onboarding after a signed contract", () => {
    expect(canTransition("WON", "ONBOARDING")).toBe(true);
    expect(canTransition("ONBOARDING", "CONTACTED")).toBe(false);
  });
  it("maps grouped Kanban states", () => {
    expect(pipelineGroupForStatus("ENRICHED")).toBe("inbox");
    expect(statusForPipelineGroup("proposal")).toBe("PROPOSAL_SENT");
  });
});
