import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ScriptChannel, ScriptPurpose, ScriptView } from "@/lib/domain/script-flow";
import { getLeadRepository, getScriptFlowRepository } from "@/lib/repositories";
import { hashPayload } from "./automation-utils";
import { applyScriptPatch, createScriptSchema, patchScriptSchema, publishScriptSchema, replaceScriptSchema,
  restoreScriptSchema, validateScriptGraph } from "@/lib/validation/script-flow";

const repo=()=>getScriptFlowRepository();
const missing=()=>new DomainError("Script not found", "SCRIPT_NOT_FOUND", 404);

export function scriptsEnabled() {
  return process.env.CONVERSATION_SCRIPTS_ENABLED === "true";
}
function enabled() {
  if(!scriptsEnabled()) throw new DomainError("Conversation scripts are not enabled","CONVERSATION_SCRIPTS_DISABLED",503);
}
function allowed(actor:ActorContext,scope:"scripts.read"|"scripts.write") {
  if(!actor.scopes?.includes(scope))throw new DomainError("Script scope required","SCRIPT_FORBIDDEN",403);
}
function administrator(actor:ActorContext) {
  if(actor.type!=="USER"||actor.role!=="ADMIN")throw new DomainError("Human ADMIN required","SCRIPT_FORBIDDEN",403);
}
async function leadExists(leadId:string) {
  if(!await getLeadRepository().getById(leadId)) throw new DomainError("Lead not found","LEAD_NOT_FOUND",404);
}
async function verifyEvidence(leadId:string,graph:ReturnType<typeof validateScriptGraph>) {
  const referenced=[...new Set(graph.nodes.flatMap(node=>node.evidenceIds??[]))];
  if(!referenced.length)return;
  const evidence=await getLeadRepository().listEvidence(leadId);
  const ids=new Set(evidence.map(e=>e.id));
  for(const id of referenced) {
    if(!ids.has(id))throw new DomainError("Referenced evidence is not on this lead","SCRIPT_GRAPH_INVALID",422);
  }
}
export async function listLeadScripts(leadId:string,actor:ActorContext,
 filters:{channel?:ScriptChannel;purpose?:ScriptPurpose;limit?:number;offset?:number}={}) {
  enabled();allowed(actor,"scripts.read");await leadExists(leadId);
  return repo().listByLead(leadId,{channel:filters.channel,purpose:filters.purpose,limit:filters.limit??50,offset:filters.offset??0});
}
export async function getLeadScript(leadId:string,scriptId:string,actor:ActorContext,
 selector:{view?:"published"|"draft";revisionId?:string}={}):Promise<ScriptView> {
  enabled();allowed(actor,"scripts.read");await leadExists(leadId);
  const script=await repo().getByIdAndLead(scriptId,leadId);
  if(!script)throw missing();
  const revisionId=selector.revisionId??(selector.view==="draft"?
    script.draftRevisionId:selector.view==="published"?script.publishedRevisionId:
    script.publishedRevisionId??script.draftRevisionId);
  if(!revisionId)return {script,revision:null};
  const revision=await repo().getRevision(scriptId,revisionId);
  if(!revision)throw new DomainError("Revision not found","SCRIPT_REVISION_NOT_FOUND",404);
  return {script,revision};
}
export async function createLeadScript(leadId:string,input:unknown,actor:ActorContext,tool?:string) {
  enabled();allowed(actor,"scripts.write");await leadExists(leadId);
  const parsed=createScriptSchema.safeParse(input);
  if(!parsed.success)throw new DomainError("Invalid script creation request","SCRIPT_GRAPH_INVALID",422);
  const graph=validateScriptGraph(parsed.data.graph);
  await verifyEvidence(leadId,graph);
  const {creationKey,title,channel,purpose}=parsed.data;
  return repo().createWithDraft({leadId,creationKey,title,channel,purpose,graph,
    creationPayloadHash:hashPayload({leadId,title,channel,purpose,graph})},actor,tool);
}
export async function replaceLeadScript(leadId:string,scriptId:string,input:unknown,actor:ActorContext,tool?:string) {
  enabled();allowed(actor,"scripts.write");await leadExists(leadId);
  const parsed=replaceScriptSchema.safeParse(input);
  if(!parsed.success)throw new DomainError("Invalid script replacement request","SCRIPT_GRAPH_INVALID",422);
  const existing=await repo().getByIdAndLead(scriptId,leadId);
  if(!existing)throw missing();
  const graph=validateScriptGraph(parsed.data.graph);
  await verifyEvidence(leadId,graph);
  return repo().commitDraft({leadId,scriptId,expectedVersion:parsed.data.expectedVersion,
    graph,summary:parsed.data.summary},actor,tool);
}
export async function patchLeadScript(leadId:string,scriptId:string,input:unknown,actor:ActorContext,tool?:string) {
  enabled();allowed(actor,"scripts.write");await leadExists(leadId);
  const parsed=patchScriptSchema.safeParse(input);
  if(!parsed.success)throw new DomainError("Invalid script patch request","SCRIPT_GRAPH_INVALID",422);
  const {script,revision}=await getLeadScript(leadId,scriptId,actor,{view:"draft"});
  if(script.version!==parsed.data.expectedVersion)
    throw new DomainError("Script changed since read","SCRIPT_VERSION_CONFLICT",409);
  const baseline=revision??await repo().getRevision(scriptId,script.publishedRevisionId??"");
  if(!baseline)throw new DomainError("Missing source revision","SCRIPT_REVISION_NOT_FOUND",404);
  const graph=applyScriptPatch(baseline.graph,parsed.data.operations);
  await verifyEvidence(leadId,graph);
  return repo().commitDraft({leadId,scriptId,expectedVersion:parsed.data.expectedVersion,
    graph,summary:parsed.data.summary},actor,tool);
}
export async function publishLeadScript(leadId:string,scriptId:string,input:unknown,actor:ActorContext) {
  enabled();allowed(actor,"scripts.read");administrator(actor);await leadExists(leadId);
  const parsed=publishScriptSchema.safeParse(input);
  if(!parsed.success)throw new DomainError("Invalid publish request","SCRIPT_GRAPH_INVALID",422);
  const {script,revision}=await getLeadScript(leadId,scriptId,actor,{view:"draft"});
  if(script.version!==parsed.data.expectedVersion)throw new DomainError("Stale script version","SCRIPT_VERSION_CONFLICT",409);
  if(!revision||revision.id!==parsed.data.expectedDraftRevisionId)
    throw new DomainError("Draft changed","SCRIPT_DRAFT_CONFLICT",409);
  validateScriptGraph(revision.graph,true);
  await verifyEvidence(leadId,revision.graph);
  return repo().publishDraft({leadId,scriptId,expectedVersion:parsed.data.expectedVersion,
    expectedDraftRevisionId:revision.id},actor);
}
export async function restoreLeadScript(leadId:string,scriptId:string,input:unknown,actor:ActorContext) {
  enabled();allowed(actor,"scripts.read");administrator(actor);await leadExists(leadId);
  const parsed=restoreScriptSchema.safeParse(input);
  if(!parsed.success)throw new DomainError("Invalid restore request","SCRIPT_GRAPH_INVALID",422);
  const {script,revision}=await getLeadScript(leadId,scriptId,actor,{revisionId:parsed.data.revisionId});
  if(script.version!==parsed.data.expectedVersion)throw new DomainError("Stale script version","SCRIPT_VERSION_CONFLICT",409);
  if(!revision)throw new DomainError("Revision not found","SCRIPT_REVISION_NOT_FOUND",404);
  validateScriptGraph(revision.graph);
  return repo().commitDraft({leadId,scriptId,expectedVersion:parsed.data.expectedVersion,
    graph:revision.graph,baseRevisionId:revision.id,summary:"Restored revision "+revision.revisionNumber},actor);
}
