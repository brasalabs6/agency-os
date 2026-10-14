import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLogs, leadConversationScripts as scripts, leadConversationScriptRevisions as revisions } from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ConversationScript, ScriptRevision, ScriptView } from "@/lib/domain/script-flow";
import type { CreateScriptRecord, PublishScriptRecord, SaveScriptRecord, ScriptFlowRepository } from "./script-flow-repository";

const conflict=()=>new DomainError("Script changed since read", "SCRIPT_VERSION_CONFLICT", 409);
const missing=()=>new DomainError("Script not found", "SCRIPT_NOT_FOUND", 404);
const iso=(d:Date)=>d.toISOString();
function mapScript(r:typeof scripts.$inferSelect):ConversationScript {
  return {id:r.id,leadId:r.leadId,title:r.title,channel:r.channel,purpose:r.purpose,version:r.version,
    draftRevisionId:r.draftRevisionId,publishedRevisionId:r.publishedRevisionId,createdByType:r.createdByType,
    createdById:r.createdById,createdAt:iso(r.createdAt),updatedAt:iso(r.updatedAt)};
}
function mapRevision(r:typeof revisions.$inferSelect):ScriptRevision {
  return {id:r.id,scriptId:r.scriptId,revisionNumber:r.revisionNumber,baseRevisionId:r.baseRevisionId,
    graph:r.graph,changeSummary:r.changeSummary,createdByType:r.createdByType,
    createdById:r.createdById,createdAt:iso(r.createdAt)};
}
export class PostgresScriptFlowRepository implements ScriptFlowRepository {
  async listByLead(leadId:string,filter:Parameters<ScriptFlowRepository["listByLead"]>[1]) {
    const conditions=[eq(scripts.leadId,leadId)];
    if(filter.channel)conditions.push(eq(scripts.channel,filter.channel));
    if(filter.purpose)conditions.push(eq(scripts.purpose,filter.purpose));
    const where=and(...conditions);
    const [items,total]=await Promise.all([
      getDb().select().from(scripts).where(where).orderBy(desc(scripts.updatedAt)).limit(filter.limit).offset(filter.offset),
      getDb().select({total:sql<number>`count(*)::integer`}).from(scripts).where(where),
    ]);
    return {items:items.map(mapScript),total:Number(total[0]?.total??0)};
  }
  async getByIdAndLead(scriptId:string,leadId:string) {
    const [row]=await getDb().select().from(scripts).where(and(eq(scripts.id,scriptId),eq(scripts.leadId,leadId))).limit(1);
    return row?mapScript(row):null;
  }
  async getRevision(scriptId:string,revisionId:string) {
    const [row]=await getDb().select().from(revisions).where(and(eq(revisions.scriptId,scriptId),eq(revisions.id,revisionId))).limit(1);
    return row?mapRevision(row):null;
  }
  async createWithDraft(input:CreateScriptRecord,actor:ActorContext,tool?:string):Promise<ScriptView> {
    return getDb().transaction(async tx=>{
      const key=and(eq(scripts.leadId,input.leadId),eq(scripts.creationActorId,actor.id),eq(scripts.creationKey,input.creationKey));
      let [existing]=await tx.select().from(scripts).where(key).limit(1);
      if(existing){
        if(existing.creationPayloadHash!==input.creationPayloadHash)throw new DomainError("Creation key reused with different payload","SCRIPT_CREATION_KEY_CONFLICT",409);
        const [prior]=await tx.select().from(revisions).where(eq(revisions.id,existing.draftRevisionId??existing.publishedRevisionId!));
        return {script:mapScript(existing),revision:prior?mapRevision(prior):null};
      }
      const [inserted]=await tx.insert(scripts).values({leadId:input.leadId,title:input.title,
        channel:input.channel,purpose:input.purpose,creationKey:input.creationKey,
        creationActorId:actor.id,creationPayloadHash:input.creationPayloadHash,
        createdByType:actor.type,createdById:actor.id}).onConflictDoNothing().returning();
      if(!inserted){
        [existing]=await tx.select().from(scripts).where(key).limit(1);
        if(!existing || existing.creationPayloadHash!==input.creationPayloadHash)
          throw new DomainError("Creation key collision","SCRIPT_CREATION_KEY_CONFLICT",409);
        const [rev]=await tx.select().from(revisions).where(eq(revisions.id,existing.draftRevisionId??existing.publishedRevisionId!));
        return {script:mapScript(existing),revision:rev?mapRevision(rev):null};
      }
      const [revision]=await tx.insert(revisions).values({scriptId:inserted.id,revisionNumber:1,graph:input.graph,
        createdByType:actor.type,createdById:actor.id}).returning();
      const [updated]=await tx.update(scripts).set({draftRevisionId:revision.id})
        .where(eq(scripts.id,inserted.id)).returning();
      await tx.insert(auditLogs).values({actorType:actor.type,actorId:actor.id,action:"lead_script.created",tool,
        leadId:input.leadId,entityType:"lead_conversation_script",entityId:inserted.id,input:{revisionId:revision.id},
        result:{version:updated.version,nodeCount:input.graph.nodes.length,edgeCount:input.graph.edges.length}});
      return {script:mapScript(updated),revision:mapRevision(revision)};
    });
  }
  async commitDraft(input:SaveScriptRecord,actor:ActorContext,tool?:string):Promise<ScriptView> {
    return getDb().transaction(async tx=>{
      const [previous]=await tx.select().from(scripts).where(and(eq(scripts.id,input.scriptId),eq(scripts.leadId,input.leadId))).limit(1);
      if(!previous)throw missing();
      const [cas]=await tx.update(scripts).set({version:sql.raw("version + 1"),updatedAt:new Date()})
        .where(and(eq(scripts.id,input.scriptId),eq(scripts.leadId,input.leadId),eq(scripts.version,input.expectedVersion))).returning();
      if(!cas)throw conflict();
      const [last]=await tx.select({n:revisions.revisionNumber}).from(revisions)
        .where(eq(revisions.scriptId,previous.id)).orderBy(desc(revisions.revisionNumber)).limit(1);
      const base=input.baseRevisionId??previous.draftRevisionId??previous.publishedRevisionId;
      if(base){
        const [valid]=await tx.select({id:revisions.id}).from(revisions)
          .where(and(eq(revisions.scriptId,previous.id),eq(revisions.id,base))).limit(1);
        if(!valid)throw new DomainError("Revision not found","SCRIPT_REVISION_NOT_FOUND",404);
      }
      const [revision]=await tx.insert(revisions).values({
        scriptId:previous.id,revisionNumber:(last?.n??0)+1,baseRevisionId:base,graph:input.graph,
        changeSummary:input.summary??null,createdByType:actor.type,createdById:actor.id,
      }).returning();
      const [updated]=await tx.update(scripts).set({draftRevisionId:revision.id})
        .where(eq(scripts.id,previous.id)).returning();
      await tx.insert(auditLogs).values({actorType:actor.type,actorId:actor.id,action:"lead_script.draft_updated",tool,
        leadId:input.leadId,entityType:"lead_conversation_script",entityId:previous.id,input:{revisionId:revision.id},
        result:{version:updated.version,nodeCount:input.graph.nodes.length,edgeCount:input.graph.edges.length}});
      return {script:mapScript(updated),revision:mapRevision(revision)};
    });
  }
  async publishDraft(input:PublishScriptRecord,actor:ActorContext):Promise<ScriptView> {
    return getDb().transaction(async tx=>{
      const [before]=await tx.select().from(scripts).where(and(eq(scripts.id,input.scriptId),eq(scripts.leadId,input.leadId))).limit(1);
      if(!before)throw missing();
      if(before.version!==input.expectedVersion)throw conflict();
      if(before.draftRevisionId!==input.expectedDraftRevisionId)throw new DomainError("Draft changed","SCRIPT_DRAFT_CONFLICT",409);
      const [revision]=await tx.select().from(revisions).where(and(eq(revisions.id,input.expectedDraftRevisionId),
        eq(revisions.scriptId,before.id))).limit(1);
      if(!revision)throw new DomainError("Revision not found","SCRIPT_REVISION_NOT_FOUND",404);
      const [updated]=await tx.update(scripts).set({
        publishedRevisionId:revision.id,draftRevisionId:null,version:sql.raw("version + 1"),updatedAt:new Date(),
      }).where(and(eq(scripts.id,before.id),eq(scripts.version,input.expectedVersion),
        eq(scripts.draftRevisionId,input.expectedDraftRevisionId))).returning();
      if(!updated)throw conflict();
      await tx.insert(auditLogs).values({actorType:actor.type,actorId:actor.id,action:"lead_script.published",
        leadId:input.leadId,entityType:"lead_conversation_script",entityId:before.id,
        input:{revisionId:revision.id},result:{version:updated.version}});
      return {script:mapScript(updated),revision:mapRevision(revision)};
    });
  }
}
export const postgresScriptFlowRepository=new PostgresScriptFlowRepository();
