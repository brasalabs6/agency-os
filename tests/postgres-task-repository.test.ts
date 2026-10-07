import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectCalls: 0,
  leadSelectCalls: 0,
}));

const taskRows = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    leadId: "20000000-0000-4000-8000-000000000001",
    title: "Task A",
    description: null,
    type: "TASK",
    status: "TODO",
    priority: "MEDIUM",
    dueAt: null,
    startAt: null,
    endAt: null,
    allDay: false,
    ownerId: "30000000-0000-4000-8000-000000000001",
    sortOrder: 0,
    createdByType: "USER",
    createdById: "30000000-0000-4000-8000-000000000001",
    completedAt: null,
    canceledAt: null,
    version: 1,
    createdAt: new Date("2026-10-07T12:00:00Z"),
    updatedAt: new Date("2026-10-07T12:00:00Z"),
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    leadId: "20000000-0000-4000-8000-000000000002",
    title: "Task B",
    description: null,
    type: "CALL",
    status: "TODO",
    priority: "HIGH",
    dueAt: null,
    startAt: null,
    endAt: null,
    allDay: false,
    ownerId: null,
    sortOrder: 1,
    createdByType: "AGENT",
    createdById: "agent",
    completedAt: null,
    canceledAt: null,
    version: 1,
    createdAt: new Date("2026-10-07T12:00:00Z"),
    updatedAt: new Date("2026-10-07T12:00:00Z"),
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    leadId: "20000000-0000-4000-8000-000000000001",
    title: "Task C",
    description: null,
    type: "FOLLOW_UP",
    status: "DOING",
    priority: "LOW",
    dueAt: null,
    startAt: null,
    endAt: null,
    allDay: false,
    ownerId: null,
    sortOrder: 2,
    createdByType: "USER",
    createdById: "30000000-0000-4000-8000-000000000001",
    completedAt: null,
    canceledAt: null,
    version: 1,
    createdAt: new Date("2026-10-07T12:00:00Z"),
    updatedAt: new Date("2026-10-07T12:00:00Z"),
  },
];

function builder<T>(value: T) {
  const query: Record<string, unknown> = {};
  const promise = Promise.resolve(value);
  for (const method of ["where", "orderBy", "limit"]) {
    query[method] = vi.fn(() => query);
  }
  query.offset = vi.fn(() => promise);
  query.then = promise.then.bind(promise);
  query.catch = promise.catch.bind(promise);
  query.finally = promise.finally.bind(promise);
  return query;
}

const fakeDb = vi.hoisted(() => ({
  select: vi.fn((selection?: Record<string, unknown>) => {
    state.selectCalls += 1;
    let value: unknown;
    if (!selection) {
      value = taskRows;
    } else if ("count" in selection) {
      value = [{ count: taskRows.length }];
    } else if ("email" in selection) {
      value = [{ id: "30000000-0000-4000-8000-000000000001", name: "Owner", email: "owner@example.test" }];
    } else {
      state.leadSelectCalls += 1;
      value = [
        { id: "20000000-0000-4000-8000-000000000001", name: "Lead A", status: "DISCOVERED", score: 80 },
        { id: "20000000-0000-4000-8000-000000000002", name: "Lead B", status: "QUALIFIED", score: 90 },
      ];
    }
    return { from: vi.fn(() => builder(value)) };
  }),
}));

vi.mock("@/lib/db/client", () => ({ getDb: () => fakeDb }));

import { PostgresTaskRepository } from "@/lib/repositories/postgres-task-repository";

describe("PostgresTaskRepository task hydration", () => {
  beforeEach(() => {
    state.selectCalls = 0;
    state.leadSelectCalls = 0;
    fakeDb.select.mockClear();
  });

  it("hydrates multiple tasks with one batched lead query", async () => {
    const result = await new PostgresTaskRepository().search({ includeCompleted: true, limit: 100 });

    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.lead.name)).toEqual(["Lead A", "Lead B", "Lead A"]);
    expect(state.leadSelectCalls).toBe(1);
    expect(state.selectCalls).toBe(4);
  });
});
