import { describe, expect, it } from "vitest";
import { MockTaskRepository } from "@/lib/repositories/mock-task-repository";
describe("MockTaskRepository", () => {
  it("scopes tasks by lead", async () => { const repo = new MockTaskRepository(); const all=await repo.search({includeCompleted:true,limit:500}); const leadId=all.items[0].leadId; const scoped=await repo.search({leadId,includeCompleted:true,limit:500}); expect(scoped.items.length).toBeGreaterThan(0); expect(scoped.items.every((task)=>task.leadId===leadId)).toBe(true); });
  it("enforces optimistic version on update", async () => { const repo=new MockTaskRepository(); const first=(await repo.search({limit:1})).items[0]; expect(await repo.update(first.id,{title:"Changed",expectedVersion:first.version+1})).toBeNull(); const updated=await repo.update(first.id,{title:"Changed",expectedVersion:first.version}); expect(updated?.version).toBe(first.version+1); });
});
