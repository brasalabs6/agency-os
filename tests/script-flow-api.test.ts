import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLeadRepository } from "@/lib/repositories";
import { GET as listScripts, POST as createScript } from "@/app/api/leads/[id]/scripts/route";
import { GET as readScript, PATCH as patchScript } from "@/app/api/leads/[id]/scripts/[scriptId]/route";
import { POST as publishScript } from "@/app/api/leads/[id]/scripts/[scriptId]/publish/route";
import { POST as restoreScript } from "@/app/api/leads/[id]/scripts/[scriptId]/restore/route";

const previousFlag=process.env.CONVERSATION_SCRIPTS_ENABLED;
const previousAuth=process.env.APP_AUTH_DISABLED;
beforeAll(()=>{
  process.env.CONVERSATION_SCRIPTS_ENABLED="true";
  process.env.APP_AUTH_DISABLED="true";
});
afterAll(()=>{
  if(previousFlag===undefined) delete process.env.CONVERSATION_SCRIPTS_ENABLED;
  else process.env.CONVERSATION_SCRIPTS_ENABLED=previousFlag;
  if(previousAuth===undefined) delete process.env.APP_AUTH_DISABLED;
  else process.env.APP_AUTH_DISABLED=previousAuth;
});
const graph={
  schemaVersion:1,startNodeId:"start",
  nodes:[{id:"start",type:"QUESTION",title:"Abertura",script:"Posso explicar a ideia?"},
    {id:"close",type:"END",title:"Fim",script:"Obrigado pela atenção."}],
  edges:[{id:"done",source:"start",target:"close",reaction:{label:"Não deseja continuar"}}],
};
const post=(url:string,body:unknown)=>new Request(url,{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost:3000"},body:JSON.stringify(body)});
const patch=(url:string,body:unknown)=>new Request(url,{method:"PATCH",headers:{"Content-Type":"application/json",Origin:"http://localhost:3000"},body:JSON.stringify(body)});

describe("Conversation Script Graph REST integration in mock mode",()=>{
  it("creates, lists, patches, reads, publishes and restores without changing lead",async()=>{
    const lead=(await getLeadRepository().search({limit:1,offset:0})).items[0];
    expect(lead).toBeDefined();
    const leadVersion=lead.version;
    const base="http://localhost:3000/api/leads/"+lead.id+"/scripts";
    const parent={params:Promise.resolve({id:lead.id})};
    const create=await createScript(post(base,{creationKey:randomUUID(),title:"Script Comercial",channel:"WHATSAPP",purpose:"FIRST_CONTACT",graph}),parent);
    expect(create.status).toBe(201);
    const created=await create.json();
    expect(created.script.version).toBe(1);
    const url=base+"/"+created.script.id;
    const child={params:Promise.resolve({id:lead.id,scriptId:created.script.id})};
    const list=await listScripts(new Request(base),parent);
    expect(list.status).toBe(200);
    expect((await list.json()).items.some((s:{id:string})=>s.id===created.script.id)).toBe(true);
    const updated=await patchScript(patch(url,{expectedVersion:1,operations:[
      {op:"updateNode",nodeId:"start",changes:{script:"Posso explicar melhor a oportunidade?"}}
    ]}),child);
    expect(updated.status).toBe(200);
    const draft=await updated.json();
    expect(draft.script.version).toBe(2);
    const result=await readScript(new Request(url+"?view=draft"),child);
    expect((await result.json()).revision.graph.nodes[0].script).toBe("Posso explicar melhor a oportunidade?");
    const publish=await publishScript(post(url+"/publish",{expectedVersion:2,
      expectedDraftRevisionId:draft.revision.id}),child);
    expect(publish.status).toBe(200);
    const released=await publish.json();
    expect(released.script.publishedRevisionId).toBe(draft.revision.id);
    const restored=await restoreScript(post(url+"/restore",{
      expectedVersion:released.script.version,revisionId:created.revision.id,
    }),child);
    expect(restored.status).toBe(200);
    const reverted=await restored.json();
    expect(reverted.script.publishedRevisionId).toBe(released.revision.id);
    expect(reverted.revision.graph.nodes[0].script).toBe("Posso explicar a ideia?");
    expect((await getLeadRepository().getById(lead.id))?.version).toBe(leadVersion);
  });
});
