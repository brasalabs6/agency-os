import { describe, expect, it } from "vitest";
import { effectiveTaskDate, isTaskOverdue, pickNextTask } from "@/lib/domain/task";
import type { LeadTask } from "@/lib/domain/types";
const task = (patch: Partial<LeadTask> = {}): LeadTask => ({ id: "1", leadId: "l", title: "Task", type: "TASK", status: "TODO", priority: "MEDIUM", dueAt: null, startAt: null, endAt: null, allDay: false, owner: null, order: 10, createdByType: "USER", createdById: "u", completedAt: null, canceledAt: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, ...patch });
describe("task rules", () => {
  it("uses dueAt before startAt", () => expect(effectiveTaskDate(task({ dueAt: "2026-01-02T10:00:00Z", startAt: "2026-01-03T10:00:00Z" }))).toBe("2026-01-02T10:00:00Z"));
  it("only considers active tasks overdue", () => { const now = new Date("2026-01-03T00:00:00Z"); expect(isTaskOverdue(task({ dueAt: "2026-01-02T00:00:00Z" }), now)).toBe(true); expect(isTaskOverdue(task({ status: "DONE", dueAt: "2026-01-02T00:00:00Z" }), now)).toBe(false); });
  it("picks dated then higher priority task", () => { const a=task({id:"a",dueAt:null,priority:"URGENT"}); const b=task({id:"b",dueAt:"2026-01-04T00:00:00Z",priority:"LOW"}); expect(pickNextTask([a,b])?.id).toBe("b"); });
});
