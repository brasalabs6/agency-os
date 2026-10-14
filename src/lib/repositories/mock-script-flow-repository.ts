import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import { getLeadRepository } from "@/lib/repositories";
import type { ConversationScript, ScriptRevision, ScriptView } from "@/lib/domain/script-flow";
import type { ActorContext } from "@/lib/domain/types";
import type { CreateScriptRecord, PublishScriptRecord, SaveScriptRecord, ScriptFlowRepository } from "./script-flow-repository";

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
const conflict = () => new DomainError("Script changed since read", "SCRIPT_VERSION_CONFLICT", 409);
const missing = () => new DomainError("Script not found", "SCRIPT_NOT_FOUND", 404);

export class MockScriptFlowRepository implements ScriptFlowRepository {
  private scripts: ConversationScript[] = [];
  private revisions: ScriptRevision[] = [];
  private hashes = new Map<string, string>();

  async listByLead(leadId: string, filters: Parameters<ScriptFlowRepository["listByLead"]>[1]) {
    const items = this.scripts.filter(s => s.leadId === leadId
      && (!filters.channel || s.channel === filters.channel)
      && (!filters.purpose || s.purpose === filters.purpose))
      .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return { items: clone(items.slice(filters.offset,filters.offset+filters.limit)), total: items.length };
  }
  async getByIdAndLead(id: string, leadId: string) {
    return clone(this.scripts.find(x => x.id === id && x.leadId === leadId) ?? null);
  }
  async getRevision(scriptId: string, revisionId: string) {
    return clone(this.revisions.find(x => x.scriptId === scriptId && x.id === revisionId) ?? null);
  }
  private async audit(actor: ActorContext, action: string, s: ConversationScript, rev: ScriptRevision, tool?: string) {
    await getLeadRepository().addAudit({ actor, action, tool, leadId: s.leadId, entityType: "lead_conversation_script", entityId: s.id,
      input: { revisionId: rev.id }, result: { version: s.version, nodeCount: rev.graph.nodes.length, edgeCount: rev.graph.edges.length } });
  }
  private key(leadId: string, actor: ActorContext, key: string) {
    return leadId + "|" + actor.id + "|" + key;
  }
  async createWithDraft(input: CreateScriptRecord, actor: ActorContext, tool?: string): Promise<ScriptView> {
    const key = this.key(input.leadId,actor,input.creationKey);
    const existing = this.scripts.find(x => this.key(x.leadId, { id: x.createdById } as ActorContext, x.id) === key);
    // Store creation-key indexing separately because scriptId is not an idempotency key.
    const match = this.scripts.find(x => this.hashes.get(x.id + ":key") === key);
    if (match || existing) {
      const s = match ?? existing!;
      if (this.hashes.get(s.id + ":hash") !== input.creationPayloadHash)
        throw new DomainError("Creation key reused with different input", "SCRIPT_CREATION_KEY_CONFLICT", 409);
      return { script: clone(s), revision: await this.getRevision(s.id, s.draftRevisionId ?? s.publishedRevisionId!) };
    }
    const stamp=now(), id=randomUUID(), revisionId=randomUUID();
    const script: ConversationScript = {
      id,leadId:input.leadId,title:input.title,channel:input.channel,purpose:input.purpose,
      version:1,draftRevisionId:revisionId,publishedRevisionId:null,
      createdByType:actor.type,createdById:actor.id,createdAt:stamp,updatedAt:stamp
    };
    const revision: ScriptRevision = {
      id:revisionId,scriptId:id,revisionNumber:1,baseRevisionId:null,graph:clone(input.graph),changeSummary:null,
      createdByType:actor.type,createdById:actor.id,createdAt:stamp,
    };
    await this.audit(actor,"lead_script.created",script,revision,tool);
    this.scripts.push(script);this.revisions.push(revision);
    this.hashes.set(id+":key",key); this.hashes.set(id+":hash",input.creationPayloadHash);
    return clone({script,revision});
  }
  async commitDraft(input: SaveScriptRecord, actor: ActorContext, tool?: string): Promise<ScriptView> {
    const idx = this.scripts.findIndex(x=>x.id===input.scriptId&&x.leadId===input.leadId);
    if(idx<0)throw missing();
    const prior=this.scripts[idx];
    if(prior.version!==input.expectedVersion)throw conflict();
    const base=input.baseRevisionId??prior.draftRevisionId??prior.publishedRevisionId;
    if(input.baseRevisionId && !this.revisions.some(x=>x.scriptId===prior.id&&x.id===input.baseRevisionId))throw missing();
    const count=this.revisions.filter(x=>x.scriptId===prior.id).length;
    const stamp=now();
    const revision:ScriptRevision={id:randomUUID(),scriptId:prior.id,revisionNumber:count+1,baseRevisionId:base,
      graph:clone(input.graph),changeSummary:input.summary??null,createdByType:actor.type,createdById:actor.id,createdAt:stamp};
    const script={...prior,version:prior.version+1,draftRevisionId:revision.id,updatedAt:stamp};
    await this.audit(actor,"lead_script.draft_updated",script,revision,tool);
    this.revisions.push(revision);this.scripts[idx]=script;
    return clone({script,revision});
  }
  async publishDraft(input: PublishScriptRecord, actor: ActorContext): Promise<ScriptView> {
    const idx=this.scripts.findIndex(x=>x.id===input.scriptId&&x.leadId===input.leadId);
    if(idx<0)throw missing();
    const prior=this.scripts[idx];
    if(prior.version!==input.expectedVersion)throw conflict();
    if(!prior.draftRevisionId||prior.draftRevisionId!==input.expectedDraftRevisionId)
      throw new DomainError("Draft changed since read", "SCRIPT_DRAFT_CONFLICT", 409);
    const revision=this.revisions.find(x=>x.id===prior.draftRevisionId&&x.scriptId===prior.id)!;
    const script={...prior,version:prior.version+1,publishedRevisionId:revision.id,draftRevisionId:null,updatedAt:now()};
    await this.audit(actor,"lead_script.published",script,revision);
    this.scripts[idx]=script;
    return clone({script,revision});
  }
}
export const mockScriptFlowRepository = new MockScriptFlowRepository();
