import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ActorContext } from "@/lib/domain/types";
import type { ScriptGraph } from "@/lib/domain/script-flow";
import { MockScriptFlowRepository } from "@/lib/repositories/mock-script-flow-repository";

const actor:ActorContext={type:"AGENT",id:"script-mock-agent",name:"Script Test Agent",scopes:["scripts.read","scripts.write"]};
const baseGraph:ScriptGraph={schemaVersion:1,startNodeId:"intro",
  nodes:[{id:"intro",type:"MESSAGE",title:"Olá",script:"Bom dia"},{id:"bye",type:"END",title:"Tchau",script:"Até mais"}],
  edges:[{id:"no",source:"intro",target:"bye",reaction:{label:"Não tenho interesse"}}]};
function input() {return {leadId:randomUUID(),title:"Primeiro contato",channel:"WHATSAPP" as const,
  purpose:"FIRST_CONTACT" as const,creationKey:"first-contact",creationPayloadHash:"hash-1",graph:baseGraph};}

describe("Mock conversation script revisions",()=>{
  it("deduplicates identical create and rejects an idempotency-key collision",async()=>{
    const repo=new MockScriptFlowRepository(),data=input();
    const first=await repo.createWithDraft(data,actor);
    const repeated=await repo.createWithDraft(data,actor);
    expect(first.script.id).toBe(repeated.script.id);
    expect((await repo.listByLead(data.leadId,{limit:10,offset:0})).total).toBe(1);
    await expect(repo.createWithDraft({...data,creationPayloadHash:"different"},actor)).rejects.toMatchObject({
      code:"SCRIPT_CREATION_KEY_CONFLICT",status:409,
    });
  });
  it("keeps published immutable during new drafts and enforces version CAS",async()=>{
    const repo=new MockScriptFlowRepository(),data=input();
    const a=await repo.createWithDraft(data,actor);
    const b=await repo.publishDraft({leadId:data.leadId,scriptId:a.script.id,expectedVersion:1,
      expectedDraftRevisionId:a.revision!.id},actor);
    expect(b.script.version).toBe(2);
    expect(b.script.draftRevisionId).toBeNull();
    const updated={...baseGraph,nodes:baseGraph.nodes.map(n=>n.id==="intro"?{...n,script:"Nova fala"}:n)};
    const c=await repo.commitDraft({leadId:data.leadId,scriptId:a.script.id,expectedVersion:2,graph:updated},actor);
    expect(c.script.publishedRevisionId).toBe(a.revision?.id);
    expect(c.script.draftRevisionId).toBe(c.revision?.id);
    expect((await repo.getRevision(a.script.id,a.revision!.id))?.graph.nodes[0].script).toBe("Bom dia");
    await expect(repo.commitDraft({leadId:data.leadId,scriptId:a.script.id,expectedVersion:2,graph:updated},actor))
      .rejects.toMatchObject({code:"SCRIPT_VERSION_CONFLICT",status:409});
    const d=await repo.publishDraft({leadId:data.leadId,scriptId:a.script.id,expectedVersion:3,
      expectedDraftRevisionId:c.revision!.id},actor);
    expect(d.script.publishedRevisionId).toBe(c.revision!.id);
    expect((await repo.getRevision(a.script.id,a.revision!.id))?.graph.nodes[0].script).toBe("Bom dia");
  });
  it("rejects publishing a replaced draft and does not alter revisions",async()=>{
    const repo=new MockScriptFlowRepository(),data=input();
    const first=await repo.createWithDraft(data,actor);
    const next=await repo.commitDraft({leadId:data.leadId,scriptId:first.script.id,expectedVersion:1,graph:baseGraph},actor);
    await expect(repo.publishDraft({leadId:data.leadId,scriptId:first.script.id,expectedVersion:2,
      expectedDraftRevisionId:first.revision!.id},actor)).rejects.toMatchObject({code:"SCRIPT_DRAFT_CONFLICT"});
    expect((await repo.getByIdAndLead(first.script.id,data.leadId))?.draftRevisionId).toBe(next.revision?.id);
  });
});
