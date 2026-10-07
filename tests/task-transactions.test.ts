import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead, LeadTaskView } from "@/lib/domain/types";

const repositoryMocks = vi.hoisted(() => ({
  getLeadRepository: vi.fn(),
  getTaskRepository: vi.fn(),
  withRepositoryTransaction: vi.fn(),
}));

vi.mock("@/lib/repositories", () => repositoryMocks);

import { createTask, syncLeadNextAction } from "@/lib/services/tasks";

const lead = (patch: Partial<Lead> = {}): Lead => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Lead",
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
  status: "READY_TO_CONTACT",
  score: 80,
  scoreReasons: [],
  primaryOpportunity: null,
  opportunityNotes: null,
  owner: null,
  tags: [],
  sourceType: null,
  sourceUrl: null,
  nextAction: null,
  nextActionAt: null,
  nextActionOwner: null,
  doNotContact: false,
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
  version: 7,
  ...patch,
});

const task = (leadValue: Lead, patch: Partial<LeadTaskView> = {}): LeadTaskView => ({
  id: "22222222-2222-4222-8222-222222222222",
  leadId: leadValue.id,
  title: "Follow up",
  description: null,
  type: "TASK",
  status: "TODO",
  priority: "MEDIUM",
  dueAt: "2026-10-07T13:00:00.000Z",
  startAt: null,
  endAt: null,
  allDay: false,
  owner: null,
  order: 0,
  createdByType: "USER",
  createdById: "33333333-3333-4333-8333-333333333333",
  completedAt: null,
  canceledAt: null,
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
  version: 1,
  lead: {
    id: leadValue.id,
    name: leadValue.name,
    status: leadValue.status,
    score: leadValue.score,
  },
  ...patch,
});

describe("task transaction orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

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
  });

  it("locks the lead before reading tasks and refreshes the projection without stale lead version", async () => {
    const currentLead = lead({ nextAction: "Old action", nextActionAt: null });
    const nextTask = task(currentLead);

    const lockForUpdate = vi.fn().mockResolvedValue(undefined);
    const getById = vi.fn().mockResolvedValue(currentLead);
    const update = vi.fn().mockImplementation(async (_id: string, input: Record<string, unknown>) => ({
      ...currentLead,
      nextAction: input.nextAction,
      nextActionAt: input.nextActionAt,
      nextActionOwner: null,
      version: currentLead.version + 1,
    }));
    const search = vi.fn().mockResolvedValue({ items: [nextTask], total: 1, limit: 500, offset: 0 });

    repositoryMocks.getLeadRepository.mockReturnValue({
      lockForUpdate,
      getById,
      update,
    });
    repositoryMocks.getTaskRepository.mockReturnValue({ search });

    await syncLeadNextAction(currentLead.id);

    expect(repositoryMocks.withRepositoryTransaction).toHaveBeenCalledTimes(1);
    expect(lockForUpdate).toHaveBeenCalledWith(currentLead.id);
    expect(lockForUpdate.mock.invocationCallOrder[0]).toBeLessThan(search.mock.invocationCallOrder[0]);
    expect(update).toHaveBeenCalledWith(currentLead.id, {
      nextAction: nextTask.title,
      nextActionAt: nextTask.dueAt,
      nextActionOwnerId: null,
    });
    expect(update.mock.calls[0][1]).not.toHaveProperty("expectedVersion");
  });

  it("does not bump the lead version when the projected next action is already current", async () => {
    const currentLead = lead({
      nextAction: "Follow up",
      nextActionAt: "2026-10-07T13:00:00.000Z",
    });
    const nextTask = task(currentLead);
    const update = vi.fn();

    repositoryMocks.getLeadRepository.mockReturnValue({
      lockForUpdate: vi.fn().mockResolvedValue(undefined),
      getById: vi.fn().mockResolvedValue(currentLead),
      update,
    });
    repositoryMocks.getTaskRepository.mockReturnValue({
      search: vi.fn().mockResolvedValue({ items: [nextTask], total: 1, limit: 500, offset: 0 }),
    });

    const result = await syncLeadNextAction(currentLead.id);

    expect(result).toEqual(currentLead);
    expect(update).not.toHaveBeenCalled();
  });

  it("runs task, activity, audit and next-action projection inside the transaction boundary", async () => {
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

    const currentLead = lead();
    const createdTask = task(currentLead);
    const assertActive = () => expect(active).toBe(true);

    const leadRepo = {
      getById: vi.fn().mockImplementation(async () => {
        assertActive();
        return currentLead;
      }),
      lockForUpdate: vi.fn().mockImplementation(async () => {
        assertActive();
      }),
      listUsers: vi.fn().mockImplementation(async () => {
        assertActive();
        return [];
      }),
      addActivity: vi.fn().mockImplementation(async () => {
        assertActive();
        return { id: "activity" };
      }),
      addAudit: vi.fn().mockImplementation(async () => {
        assertActive();
        return { id: "audit" };
      }),
      update: vi.fn().mockImplementation(async (_id: string, input: Record<string, unknown>) => {
        assertActive();
        return {
          ...currentLead,
          nextAction: input.nextAction,
          nextActionAt: input.nextActionAt,
          nextActionOwner: null,
          version: currentLead.version + 1,
        };
      }),
    };

    const taskRepo = {
      create: vi.fn().mockImplementation(async () => {
        assertActive();
        return createdTask;
      }),
      search: vi.fn().mockImplementation(async () => {
        assertActive();
        return { items: [createdTask], total: 1, limit: 500, offset: 0 };
      }),
    };

    repositoryMocks.getLeadRepository.mockReturnValue(leadRepo);
    repositoryMocks.getTaskRepository.mockReturnValue(taskRepo);

    await createTask(
      { leadId: currentLead.id, title: createdTask.title, type: "TASK" },
      { type: "USER", id: "33333333-3333-4333-8333-333333333333", name: "Tester", scopes: ["leads.write"] },
    );

    expect(taskRepo.create).toHaveBeenCalledTimes(1);
    expect(leadRepo.addActivity).toHaveBeenCalledTimes(1);
    expect(leadRepo.addAudit).toHaveBeenCalledTimes(1);
    expect(leadRepo.lockForUpdate).toHaveBeenCalledTimes(1);
    expect(leadRepo.update).toHaveBeenCalledTimes(1);
  });
});
