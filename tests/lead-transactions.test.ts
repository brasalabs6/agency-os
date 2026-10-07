import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "@/lib/domain/types";

const repositoryMocks = vi.hoisted(() => ({
  getLeadRepository: vi.fn(),
  getTaskRepository: vi.fn(),
  withRepositoryTransaction: vi.fn(),
}));

vi.mock("@/lib/repositories", () => repositoryMocks);

import { createLead } from "@/lib/services/leads";

const createdLead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Atomic Lead",
  legalName: null,
  segment: null,
  city: null,
  state: null,
  website: null,
  googleMapsUrl: null,
  instagramUrl: null,
  phone: null,
  whatsapp: null,
  email: null,
  contactName: null,
  contactRole: null,
  status: "DISCOVERED",
  score: null,
  scoreReasons: [],
  primaryOpportunity: null,
  opportunityNotes: null,
  owner: null,
  tags: [],
  sourceType: "MANUAL",
  sourceUrl: null,
  nextAction: null,
  nextActionAt: null,
  nextActionOwner: null,
  doNotContact: false,
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
  version: 1,
};

describe("lead transaction orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps lead creation, activity and audit inside one transaction boundary", async () => {
    let active = false;
    repositoryMocks.withRepositoryTransaction.mockImplementation(async (work: () => Promise<unknown>) => {
      if (active) return work();
      active = true;
      try {
        return await work();
      } finally {
        active = false;
      }
    });

    const assertActive = () => expect(active).toBe(true);
    const leadRepo = {
      listUsers: vi.fn().mockImplementation(async () => {
        assertActive();
        return [];
      }),
      findDuplicate: vi.fn().mockImplementation(async () => {
        assertActive();
        return null;
      }),
      create: vi.fn().mockImplementation(async () => {
        assertActive();
        return createdLead;
      }),
      addActivity: vi.fn().mockImplementation(async () => {
        assertActive();
        return { id: "activity" };
      }),
      addAudit: vi.fn().mockImplementation(async () => {
        assertActive();
        return { id: "audit" };
      }),
    };

    repositoryMocks.getLeadRepository.mockReturnValue(leadRepo);

    const result = await createLead(
      { name: createdLead.name, sourceType: "MANUAL" },
      { type: "USER", id: "33333333-3333-4333-8333-333333333333", name: "Tester" },
    );

    expect(result).toEqual(createdLead);
    expect(repositoryMocks.withRepositoryTransaction).toHaveBeenCalledTimes(1);
    expect(leadRepo.create).toHaveBeenCalledTimes(1);
    expect(leadRepo.addActivity).toHaveBeenCalledTimes(1);
    expect(leadRepo.addAudit).toHaveBeenCalledTimes(1);
  });
});
