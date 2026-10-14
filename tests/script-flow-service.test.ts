import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLeadRepository } from "@/lib/repositories";
import type { ActorContext } from "@/lib/domain/types";
import { createLeadScript, getLeadScript, listLeadScripts, patchLeadScript, publishLeadScript, restoreLeadScript } from "@/lib/services/script-flows";

const admin: ActorContext = { type: "USER", id: randomUUID(), name: "Admin", role: "ADMIN", scopes: ["scripts.read", "scripts.write"] };
const member: ActorContext = { type: "USER", id: randomUUID(), name: "Member", role: "MEMBER", scopes: ["scripts.read", "scripts.write"] };
const writer: ActorContext = { type: "AGENT", id: randomUUID(), name: "Write only", scopes: ["scripts.write"] };
const noScopes: ActorContext = { type: "AGENT", id: randomUUID(), name: "No scopes", scopes: [] };
const graph = {
  schemaVersion: 1 as const,
  startNodeId: "intro",
  nodes: [
    {id:"intro",type:"MESSAGE" as const,title:"Introdução",script:"Olá, podemos conversar?"},
    {id:"end",type:"END" as const,title:"Final",script:"Obrigado pela atenção"}
  ],
  edges: [{id:"next",source:"intro",target:"end",reaction:{label:"Não tem interesse"}}]
};
const priorFlag = process.env.CONVERSATION_SCRIPTS_ENABLED;
beforeAll(()=>{process.env.CONVERSATION_SCRIPTS_ENABLED="true";});
afterAll(()=>{
  if(priorFlag === undefined)delete process.env.CONVERSATION_SCRIPTS_ENABLED;
  else process.env.CONVERSATION_SCRIPTS_ENABLED=priorFlag;
});
describe("script flow service authorization and revisions",()=>{
  it("rejects missing scopes even if feature is enabled",async()=>{
    const lead=(await getLeadRepository().search({limit:1,offset:0})).items[0];
    await expect(listLeadScripts(lead.id,noScopes)).rejects.toMatchObject({code:"SCRIPT_FORBIDDEN",status:403});
  });
  it("allows a write-only MCP actor to create/patch, but not publish",async()=>{
    const lead=(await getLeadRepository().search({limit:1,offset:0})).items[0];
    const created=await createLeadScript(lead.id,{creationKey:randomUUID(),title:"WhatsApp",channel:"WHATSAPP",
      purpose:"FIRST_CONTACT",graph},writer);
    expect(created.script.version).toBe(1);
    const patched=await patchLeadScript(lead.id,created.script.id,{expectedVersion:1,
      operations:[{op:"updateNode",nodeId:"intro",changes:{script:"Olá, temos uma novidade"}}]},writer);
    expect(patched.script.version).toBe(2);
    await expect(publishLeadScript(lead.id,created.script.id,
      {expectedVersion:2,expectedDraftRevisionId:patched.revision!.id},writer)).rejects.toMatchObject({code:"SCRIPT_FORBIDDEN"});
    await expect(publishLeadScript(lead.id,created.script.id,
      {expectedVersion:2,expectedDraftRevisionId:patched.revision!.id},member)).rejects.toMatchObject({code:"SCRIPT_FORBIDDEN"});
    const published=await publishLeadScript(lead.id,created.script.id,
      {expectedVersion:2,expectedDraftRevisionId:patched.revision!.id},admin);
    expect(published.script.draftRevisionId).toBeNull();
    const current=await getLeadScript(lead.id,created.script.id,admin);
    expect(current.revision?.graph.nodes[0].script).toBe("Olá, temos uma novidade");
    const restored=await restoreLeadScript(lead.id,created.script.id,
      {expectedVersion:published.script.version,revisionId:created.revision!.id},admin);
    expect(restored.script.publishedRevisionId).toBe(published.revision!.id);
    expect(restored.script.draftRevisionId).not.toBe(restored.script.publishedRevisionId);
    const original=await getLeadScript(lead.id,created.script.id,admin,{revisionId:created.revision!.id});
    expect(original.revision?.graph.nodes[0].script).toBe("Olá, podemos conversar?");
  });
});
