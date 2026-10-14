import type { ActorContext } from "@/lib/domain/types";
import type { ConversationScript, ScriptGraph, ScriptRevision, ScriptChannel, ScriptPurpose, ScriptView } from "@/lib/domain/script-flow";

export interface CreateScriptRecord {
  leadId: string;
  title: string;
  channel: ScriptChannel;
  purpose: ScriptPurpose;
  creationKey: string;
  creationPayloadHash: string;
  graph: ScriptGraph;
}
export interface SaveScriptRecord {
  leadId: string;
  scriptId: string;
  expectedVersion: number;
  graph: ScriptGraph;
  summary?: string;
  baseRevisionId?: string;
}
export interface PublishScriptRecord {
  leadId: string;
  scriptId: string;
  expectedVersion: number;
  expectedDraftRevisionId: string;
}
export interface ScriptFlowRepository {
  listByLead(leadId: string, filters: { channel?: ScriptChannel; purpose?: ScriptPurpose; limit: number; offset: number }): Promise<{ items: ConversationScript[]; total: number }>;
  getByIdAndLead(scriptId: string, leadId: string): Promise<ConversationScript | null>;
  getRevision(scriptId: string, revisionId: string): Promise<ScriptRevision | null>;
  createWithDraft(input: CreateScriptRecord, actor: ActorContext, tool?: string): Promise<ScriptView>;
  commitDraft(input: SaveScriptRecord, actor: ActorContext, tool?: string): Promise<ScriptView>;
  publishDraft(input: PublishScriptRecord, actor: ActorContext): Promise<ScriptView>;
}
