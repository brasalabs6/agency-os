import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  aiRuns, approvalRequests, businessProfiles, channelConnections, channelMessages, clientProjects,
  contracts, conversations, diagnostics, projectObligations, proposals, prospectingRuns,
  qualifications, scoreAssessments,
} from "@/lib/db/schema";
import type {
  AiRun, ApprovalRequest, BusinessProfile, ChannelConnection, ChannelMessage, ClientProject,
  Contract, Conversation, Diagnostic, ProjectObligation, Proposal, ProspectingRun,
  Qualification, ScoreAssessment,
} from "@/lib/domain/automation";
import type { AutomationRepository } from "./automation-repository";

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;
const arr = <T>(value: T[] | null | undefined) => value ?? [];
const obj = <T extends Record<string, unknown>>(value: T | null | undefined) => value ?? ({} as T);

function mapBusinessProfile(r: typeof businessProfiles.$inferSelect): BusinessProfile {
  return { id:r.id,leadId:r.leadId,version:r.version,identity:obj(r.identity),contacts:obj(r.contacts),businessSignals:obj(r.businessSignals),competition:arr(r.competition),facts:arr(r.facts),createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString() };
}
function mapDiagnostic(r: typeof diagnostics.$inferSelect): Diagnostic {
  return { id:r.id,leadId:r.leadId,businessProfileId:r.businessProfileId,status:r.status,version:r.version,executiveSummary:r.executiveSummary,strengths:arr(r.strengths),gaps:arr(r.gaps),recommendations:arr(r.recommendations),scores:obj(r.scores),recommendedServices:arr(r.recommendedServices),internalNotes:r.internalNotes,publicSummary:r.publicSummary,artifactRef:r.artifactRef,renderedContent:r.renderedContent,generatedByType:r.generatedByType,generatedById:r.generatedById,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapScore(r: typeof scoreAssessments.$inferSelect): ScoreAssessment {
  return { id:r.id,leadId:r.leadId,diagnosticId:r.diagnosticId,digitalGap:r.digitalGap,economicPotential:r.economicPotential,contactability:r.contactability,urgency:r.urgency,serviceFit:r.serviceFit,proofPotential:r.proofPotential,total:r.total,confidence:r.confidence,reasons:arr(r.reasons),recommendedService:r.recommendedService,createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString() };
}
function mapAiRun(r: typeof aiRuns.$inferSelect): AiRun {
  return { id:r.id,skill:r.skill,skillVersion:r.skillVersion,leadId:r.leadId,status:r.status,actorType:r.actorType,actorId:r.actorId,idempotencyKey:r.idempotencyKey,inputSummary:obj(r.inputSummary),outputSummary:obj(r.outputSummary),errorCode:r.errorCode,errorMessage:r.errorMessage,startedAt:iso(r.startedAt),completedAt:iso(r.completedAt),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapProspecting(r: typeof prospectingRuns.$inferSelect): ProspectingRun {
  const counters = obj(r.counters) as Record<string, number>;
  return { id:r.id,objective:r.objective,icp:obj(r.icp),region:r.region,segments:arr(r.segments),sources:arr(r.sources),maxCandidates:r.maxCandidates,status:r.status as ProspectingRun["status"],aiRunId:r.aiRunId,counters:{found:counters.found??0,imported:counters.imported??0,duplicates:counters.duplicates??0,rejected:counters.rejected??0},createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapConnection(r: typeof channelConnections.$inferSelect): ChannelConnection {
  return { id:r.id,provider:"WHATSAPP",accountLabel:r.accountLabel,status:r.status as ChannelConnection["status"],capabilities:arr(r.capabilities) as ChannelConnection["capabilities"],ownerUserId:r.ownerUserId,externalAccountId:r.externalAccountId,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapConversation(r: typeof conversations.$inferSelect): Conversation {
  return { id:r.id,connectionId:r.connectionId,externalId:r.externalId,leadId:r.leadId,contactAddress:r.contactAddress,contactDisplayName:r.contactDisplayName,lastMessageAt:iso(r.lastMessageAt),optOutDetected:r.optOutDetected,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapMessage(r: typeof channelMessages.$inferSelect): ChannelMessage {
  return { id:r.id,conversationId:r.conversationId,externalId:r.externalId,direction:r.direction as ChannelMessage["direction"],sentAt:r.sentAt.toISOString(),sender:r.sender,text:r.text,mediaType:r.mediaType,deliveryStatus:r.deliveryStatus,rawMetadata:obj(r.rawMetadata),createdAt:r.createdAt.toISOString() };
}
function mapApproval(r: typeof approvalRequests.$inferSelect): ApprovalRequest {
  return { id:r.id,leadId:r.leadId,actionType:r.actionType,payload:obj(r.payload),payloadHash:r.payloadHash,preview:r.preview,rationale:r.rationale,policyChecks:arr(r.policyChecks),status:r.status,createdByType:r.createdByType,createdById:r.createdById,approvedByUserId:r.approvedByUserId,approvedAt:iso(r.approvedAt),rejectedByUserId:r.rejectedByUserId,rejectedAt:iso(r.rejectedAt),executedAt:iso(r.executedAt),executionResult:obj(r.executionResult),expiresAt:iso(r.expiresAt),version:r.version,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapQualification(r: typeof qualifications.$inferSelect): Qualification {
  return { id:r.id,leadId:r.leadId,version:r.version,decisionMakers:arr(r.decisionMakers),problemStatements:arr(r.problemStatements),desiredOutcome:r.desiredOutcome,currentProcess:r.currentProcess,urgency:r.urgency,explicitBudgetStatement:r.explicitBudgetStatement,timeline:r.timeline,constraints:arr(r.constraints),technicalDependencies:arr(r.technicalDependencies),unansweredQuestions:arr(r.unansweredQuestions),riskFlags:arr(r.riskFlags),serviceFit:arr(r.serviceFit),createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapProposal(r: typeof proposals.$inferSelect): Proposal {
  return { id:r.id,leadId:r.leadId,diagnosticId:r.diagnosticId,qualificationId:r.qualificationId,version:r.version,status:r.status,services:arr(r.services),scope:arr(r.scope),exclusions:arr(r.exclusions),assumptions:arr(r.assumptions),clientDependencies:arr(r.clientDependencies),milestones:arr(r.milestones),agencyFeeCents:r.agencyFeeCents,currency:r.currency,externalCosts:arr(r.externalCosts),paymentTerms:r.paymentTerms,validityUntil:iso(r.validityUntil),renderedContent:r.renderedContent,artifactRef:r.artifactRef,approvalId:r.approvalId,sentAt:iso(r.sentAt),responseNotes:r.responseNotes,createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapContract(r: typeof contracts.$inferSelect): Contract {
  return { id:r.id,leadId:r.leadId,proposalId:r.proposalId,proposalVersion:r.proposalVersion,proposalSnapshotHash:r.proposalSnapshotHash,proposalSnapshot:obj(r.proposalSnapshot),templateId:r.templateId,templateVersion:r.templateVersion,version:r.version,status:r.status,parties:obj(r.parties),terms:obj(r.terms),responsibilitiesAgency:arr(r.responsibilitiesAgency),responsibilitiesClient:arr(r.responsibilitiesClient),paymentObligations:arr(r.paymentObligations),deliverables:arr(r.deliverables),supportObligations:arr(r.supportObligations),renderedContent:r.renderedContent,artifactRef:r.artifactRef,approvalId:r.approvalId,signatureProvider:r.signatureProvider,externalSignatureId:r.externalSignatureId,signedArtifactRef:r.signedArtifactRef,signedAt:iso(r.signedAt),createdByType:r.createdByType,createdById:r.createdById,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapProject(r: typeof clientProjects.$inferSelect): ClientProject {
  return { id:r.id,leadId:r.leadId,contractId:r.contractId,name:r.name,status:r.status,ownerUserId:r.ownerUserId,startedAt:iso(r.startedAt),targetAt:iso(r.targetAt),completedAt:iso(r.completedAt),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}
function mapObligation(r: typeof projectObligations.$inferSelect): ProjectObligation {
  return { id:r.id,projectId:r.projectId,sourceContractId:r.sourceContractId,sourceKey:r.sourceKey,party:r.party as ProjectObligation["party"],kind:r.kind as ProjectObligation["kind"],title:r.title,description:r.description,status:r.status,dueAt:iso(r.dueAt),metadata:obj(r.metadata),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString() };
}

export class PostgresAutomationRepository implements AutomationRepository {
  async listBusinessProfiles(leadId:string){ return (await getDb().select().from(businessProfiles).where(eq(businessProfiles.leadId,leadId)).orderBy(desc(businessProfiles.version))).map(mapBusinessProfile); }
  async createBusinessProfile(input:Omit<BusinessProfile,"id"|"createdAt">){
    const [r]=await getDb().insert(businessProfiles).values({leadId:input.leadId,version:input.version,identity:input.identity,contacts:input.contacts,businessSignals:input.businessSignals,competition:input.competition,facts:input.facts,createdByType:input.createdByType,createdById:input.createdById}).returning(); return mapBusinessProfile(r);
  }

  async listDiagnostics(leadId:string){return (await getDb().select().from(diagnostics).where(eq(diagnostics.leadId,leadId)).orderBy(desc(diagnostics.updatedAt))).map(mapDiagnostic);}
  async getDiagnostic(id:string){const [r]=await getDb().select().from(diagnostics).where(eq(diagnostics.id,id)).limit(1);return r?mapDiagnostic(r):null;}
  async createDiagnostic(input:Omit<Diagnostic,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(diagnostics).values({leadId:input.leadId,businessProfileId:input.businessProfileId,status:input.status,version:input.version,executiveSummary:input.executiveSummary,strengths:input.strengths,gaps:input.gaps,recommendations:input.recommendations,scores:input.scores,recommendedServices:input.recommendedServices,internalNotes:input.internalNotes,publicSummary:input.publicSummary,artifactRef:input.artifactRef,renderedContent:input.renderedContent,generatedByType:input.generatedByType,generatedById:input.generatedById}).returning();return mapDiagnostic(r);
  }
  async updateDiagnostic(id:string,expectedVersion:number|undefined,changes:Partial<Diagnostic>){
    const conditions=[eq(diagnostics.id,id)];if(expectedVersion!=null)conditions.push(eq(diagnostics.version,expectedVersion));
    const [r]=await getDb().update(diagnostics).set({status:changes.status,executiveSummary:changes.executiveSummary,strengths:changes.strengths,gaps:changes.gaps,recommendations:changes.recommendations,scores:changes.scores,recommendedServices:changes.recommendedServices,internalNotes:changes.internalNotes,publicSummary:changes.publicSummary,artifactRef:changes.artifactRef,renderedContent:changes.renderedContent,version:sql`${diagnostics.version} + 1` as unknown as number,updatedAt:new Date()}).where(and(...conditions)).returning();return r?mapDiagnostic(r):null;
  }

  async listScoreAssessments(leadId:string){return (await getDb().select().from(scoreAssessments).where(eq(scoreAssessments.leadId,leadId)).orderBy(desc(scoreAssessments.createdAt))).map(mapScore);}
  async createScoreAssessment(input:Omit<ScoreAssessment,"id"|"createdAt">){
    const [r]=await getDb().insert(scoreAssessments).values({leadId:input.leadId,diagnosticId:input.diagnosticId,digitalGap:input.digitalGap,economicPotential:input.economicPotential,contactability:input.contactability,urgency:input.urgency,serviceFit:input.serviceFit,proofPotential:input.proofPotential,total:input.total,confidence:input.confidence,reasons:input.reasons,recommendedService:input.recommendedService,createdByType:input.createdByType,createdById:input.createdById}).returning();return mapScore(r);
  }

  async listAiRuns(filters:{leadId?:string;skill?:string;status?:string;limit?:number}={}){
    const conditions=[];if(filters.leadId)conditions.push(eq(aiRuns.leadId,filters.leadId));if(filters.skill)conditions.push(eq(aiRuns.skill,filters.skill));if(filters.status)conditions.push(eq(aiRuns.status,filters.status as AiRun["status"]));
    return (await getDb().select().from(aiRuns).where(conditions.length?and(...conditions):undefined).orderBy(desc(aiRuns.createdAt)).limit(filters.limit??100)).map(mapAiRun);
  }
  async getAiRun(id:string){const [r]=await getDb().select().from(aiRuns).where(eq(aiRuns.id,id)).limit(1);return r?mapAiRun(r):null;}
  async findAiRunByIdempotencyKey(key:string){const [r]=await getDb().select().from(aiRuns).where(eq(aiRuns.idempotencyKey,key)).limit(1);return r?mapAiRun(r):null;}
  async createAiRun(input:Omit<AiRun,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(aiRuns).values({skill:input.skill,skillVersion:input.skillVersion,leadId:input.leadId,status:input.status,actorType:input.actorType,actorId:input.actorId,idempotencyKey:input.idempotencyKey,inputSummary:input.inputSummary,outputSummary:input.outputSummary,errorCode:input.errorCode,errorMessage:input.errorMessage,startedAt:input.startedAt?new Date(input.startedAt):null,completedAt:input.completedAt?new Date(input.completedAt):null}).returning();return mapAiRun(r);
  }
  async updateAiRun(id:string,changes:Partial<AiRun>){
    const [r]=await getDb().update(aiRuns).set({status:changes.status,outputSummary:changes.outputSummary,errorCode:changes.errorCode,errorMessage:changes.errorMessage,startedAt:changes.startedAt?new Date(changes.startedAt):changes.startedAt===null?null:undefined,completedAt:changes.completedAt?new Date(changes.completedAt):changes.completedAt===null?null:undefined,updatedAt:new Date()}).where(eq(aiRuns.id,id)).returning();return r?mapAiRun(r):null;
  }

  async listProspectingRuns(limit=100){return (await getDb().select().from(prospectingRuns).orderBy(desc(prospectingRuns.createdAt)).limit(limit)).map(mapProspecting);}
  async getProspectingRun(id:string){const [r]=await getDb().select().from(prospectingRuns).where(eq(prospectingRuns.id,id)).limit(1);return r?mapProspecting(r):null;}
  async createProspectingRun(input:Omit<ProspectingRun,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(prospectingRuns).values({objective:input.objective,icp:input.icp,region:input.region,segments:input.segments,sources:input.sources,maxCandidates:input.maxCandidates,status:input.status,aiRunId:input.aiRunId,counters:input.counters,createdByType:input.createdByType,createdById:input.createdById}).returning();return mapProspecting(r);
  }
  async updateProspectingRun(id:string,changes:Partial<ProspectingRun>){
    const [r]=await getDb().update(prospectingRuns).set({status:changes.status,aiRunId:changes.aiRunId,counters:changes.counters,updatedAt:new Date()}).where(eq(prospectingRuns.id,id)).returning();return r?mapProspecting(r):null;
  }

  async listChannelConnections(){return (await getDb().select().from(channelConnections).orderBy(desc(channelConnections.createdAt))).map(mapConnection);}
  async getChannelConnection(id:string){const [r]=await getDb().select().from(channelConnections).where(eq(channelConnections.id,id)).limit(1);return r?mapConnection(r):null;}
  async createChannelConnection(input:Omit<ChannelConnection,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(channelConnections).values({provider:input.provider,accountLabel:input.accountLabel,status:input.status,capabilities:input.capabilities,ownerUserId:input.ownerUserId,externalAccountId:input.externalAccountId}).returning();return mapConnection(r);
  }
  async updateChannelConnection(id:string,changes:Partial<ChannelConnection>){
    const [r]=await getDb().update(channelConnections).set({accountLabel:changes.accountLabel,status:changes.status,capabilities:changes.capabilities,ownerUserId:changes.ownerUserId,externalAccountId:changes.externalAccountId,updatedAt:new Date()}).where(eq(channelConnections.id,id)).returning();return r?mapConnection(r):null;
  }

  async listConversations(filters:{leadId?:string;connectionId?:string;limit?:number}={}){
    const conditions=[];if(filters.leadId)conditions.push(eq(conversations.leadId,filters.leadId));if(filters.connectionId)conditions.push(eq(conversations.connectionId,filters.connectionId));
    return (await getDb().select().from(conversations).where(conditions.length?and(...conditions):undefined).orderBy(desc(conversations.lastMessageAt)).limit(filters.limit??100)).map(mapConversation);
  }
  async getConversation(id:string){const [r]=await getDb().select().from(conversations).where(eq(conversations.id,id)).limit(1);return r?mapConversation(r):null;}
  async getConversationByExternal(connectionId:string,externalId:string){const [r]=await getDb().select().from(conversations).where(and(eq(conversations.connectionId,connectionId),eq(conversations.externalId,externalId))).limit(1);return r?mapConversation(r):null;}
  async upsertConversation(input:Omit<Conversation,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(conversations).values({connectionId:input.connectionId,externalId:input.externalId,leadId:input.leadId,contactAddress:input.contactAddress,contactDisplayName:input.contactDisplayName,lastMessageAt:input.lastMessageAt?new Date(input.lastMessageAt):null,optOutDetected:input.optOutDetected})
      .onConflictDoUpdate({target:[conversations.connectionId,conversations.externalId],set:{
        leadId:sql`COALESCE(${conversations.leadId}, EXCLUDED.lead_id)`,
        contactAddress:input.contactAddress,
        contactDisplayName:sql`COALESCE(EXCLUDED.contact_display_name, ${conversations.contactDisplayName})`,
        lastMessageAt:sql`GREATEST(${conversations.lastMessageAt}, EXCLUDED.last_message_at)`,
        optOutDetected:sql`${conversations.optOutDetected} OR EXCLUDED.opt_out_detected`,
        updatedAt:new Date(),
      }}).returning();return mapConversation(r);
  }
  async linkConversation(id:string,leadId:string|null,optOutDetected?:boolean){
    const [r]=await getDb().update(conversations).set({leadId,optOutDetected,updatedAt:new Date()}).where(eq(conversations.id,id)).returning();return r?mapConversation(r):null;
  }
  async listMessages(conversationId:string,limit=200){
    const rows=await getDb().select().from(channelMessages).where(eq(channelMessages.conversationId,conversationId)).orderBy(desc(channelMessages.sentAt),desc(channelMessages.createdAt)).limit(limit);
    return rows.reverse().map(mapMessage);
  }
  async upsertMessage(input:Omit<ChannelMessage,"id"|"createdAt">){
    const [r]=await getDb().insert(channelMessages).values({conversationId:input.conversationId,externalId:input.externalId,direction:input.direction,sentAt:new Date(input.sentAt),sender:input.sender,text:input.text,mediaType:input.mediaType,deliveryStatus:input.deliveryStatus,rawMetadata:input.rawMetadata})
      .onConflictDoUpdate({target:[channelMessages.conversationId,channelMessages.externalId],set:{direction:input.direction,sentAt:new Date(input.sentAt),sender:input.sender,text:input.text,mediaType:input.mediaType,deliveryStatus:input.deliveryStatus,rawMetadata:input.rawMetadata}}).returning();return mapMessage(r);
  }

  async listApprovals(filters:{leadId?:string;status?:string;limit?:number}={}){
    const conditions=[];if(filters.leadId)conditions.push(eq(approvalRequests.leadId,filters.leadId));if(filters.status)conditions.push(eq(approvalRequests.status,filters.status as ApprovalRequest["status"]));
    return (await getDb().select().from(approvalRequests).where(conditions.length?and(...conditions):undefined).orderBy(desc(approvalRequests.createdAt)).limit(filters.limit??100)).map(mapApproval);
  }
  async getApproval(id:string){const [r]=await getDb().select().from(approvalRequests).where(eq(approvalRequests.id,id)).limit(1);return r?mapApproval(r):null;}
  async createApproval(input:Omit<ApprovalRequest,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(approvalRequests).values({leadId:input.leadId,actionType:input.actionType,payload:input.payload,payloadHash:input.payloadHash,preview:input.preview,rationale:input.rationale,policyChecks:input.policyChecks,status:input.status,createdByType:input.createdByType,createdById:input.createdById,approvedByUserId:input.approvedByUserId,approvedAt:input.approvedAt?new Date(input.approvedAt):null,rejectedByUserId:input.rejectedByUserId,rejectedAt:input.rejectedAt?new Date(input.rejectedAt):null,executedAt:input.executedAt?new Date(input.executedAt):null,executionResult:input.executionResult,expiresAt:input.expiresAt?new Date(input.expiresAt):null,version:input.version}).returning();return mapApproval(r);
  }
  async updateApproval(id:string,expectedVersion:number|undefined,changes:Partial<ApprovalRequest>){
    const conditions=[eq(approvalRequests.id,id)];if(expectedVersion!=null)conditions.push(eq(approvalRequests.version,expectedVersion));
    const [r]=await getDb().update(approvalRequests).set({payload:changes.payload,payloadHash:changes.payloadHash,preview:changes.preview,rationale:changes.rationale,policyChecks:changes.policyChecks,status:changes.status,approvedByUserId:changes.approvedByUserId,approvedAt:changes.approvedAt?new Date(changes.approvedAt):changes.approvedAt===null?null:undefined,rejectedByUserId:changes.rejectedByUserId,rejectedAt:changes.rejectedAt?new Date(changes.rejectedAt):changes.rejectedAt===null?null:undefined,executedAt:changes.executedAt?new Date(changes.executedAt):changes.executedAt===null?null:undefined,executionResult:changes.executionResult,version:sql`${approvalRequests.version} + 1` as unknown as number,updatedAt:new Date()}).where(and(...conditions)).returning();return r?mapApproval(r):null;
  }

  async getQualification(leadId:string){const [r]=await getDb().select().from(qualifications).where(eq(qualifications.leadId,leadId)).orderBy(desc(qualifications.updatedAt)).limit(1);return r?mapQualification(r):null;}
  async upsertQualification(input:Omit<Qualification,"id"|"createdAt"|"updatedAt">&{id?:string},expectedVersion?:number){
    const existing=await this.getQualification(input.leadId);
    if(existing){
      if(expectedVersion==null)return null;
      const [r]=await getDb().update(qualifications).set({
        version:sql`${qualifications.version} + 1` as unknown as number,
        decisionMakers:input.decisionMakers,
        problemStatements:input.problemStatements,
        desiredOutcome:input.desiredOutcome,
        currentProcess:input.currentProcess,
        urgency:input.urgency,
        explicitBudgetStatement:input.explicitBudgetStatement,
        timeline:input.timeline,
        constraints:input.constraints,
        technicalDependencies:input.technicalDependencies,
        unansweredQuestions:input.unansweredQuestions,
        riskFlags:input.riskFlags,
        serviceFit:input.serviceFit,
        createdByType:input.createdByType,
        createdById:input.createdById,
        updatedAt:new Date(),
      }).where(and(eq(qualifications.id,existing.id),eq(qualifications.version,expectedVersion))).returning();
      return r?mapQualification(r):null;
    }
    if(expectedVersion!=null)return null;
    const [r]=await getDb().insert(qualifications).values({
      leadId:input.leadId,
      version:input.version,
      decisionMakers:input.decisionMakers,
      problemStatements:input.problemStatements,
      desiredOutcome:input.desiredOutcome,
      currentProcess:input.currentProcess,
      urgency:input.urgency,
      explicitBudgetStatement:input.explicitBudgetStatement,
      timeline:input.timeline,
      constraints:input.constraints,
      technicalDependencies:input.technicalDependencies,
      unansweredQuestions:input.unansweredQuestions,
      riskFlags:input.riskFlags,
      serviceFit:input.serviceFit,
      createdByType:input.createdByType,
      createdById:input.createdById,
    }).returning();
    return mapQualification(r);
  }

  async listProposals(leadId:string){return (await getDb().select().from(proposals).where(eq(proposals.leadId,leadId)).orderBy(desc(proposals.version))).map(mapProposal);}
  async getProposal(id:string){const [r]=await getDb().select().from(proposals).where(eq(proposals.id,id)).limit(1);return r?mapProposal(r):null;}
  async createProposal(input:Omit<Proposal,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(proposals).values({leadId:input.leadId,diagnosticId:input.diagnosticId,qualificationId:input.qualificationId,version:input.version,status:input.status,services:input.services,scope:input.scope,exclusions:input.exclusions,assumptions:input.assumptions,clientDependencies:input.clientDependencies,milestones:input.milestones,agencyFeeCents:input.agencyFeeCents,currency:input.currency,externalCosts:input.externalCosts,paymentTerms:input.paymentTerms,validityUntil:input.validityUntil?new Date(input.validityUntil):null,renderedContent:input.renderedContent,artifactRef:input.artifactRef,approvalId:input.approvalId,sentAt:input.sentAt?new Date(input.sentAt):null,responseNotes:input.responseNotes,createdByType:input.createdByType,createdById:input.createdById}).returning();return mapProposal(r);
  }
  async updateProposal(id:string,expectedVersion:number|undefined,changes:Partial<Proposal>){
    const conditions=[eq(proposals.id,id)];if(expectedVersion!=null)conditions.push(eq(proposals.version,expectedVersion));
    const [r]=await getDb().update(proposals).set({status:changes.status,services:changes.services,scope:changes.scope,exclusions:changes.exclusions,assumptions:changes.assumptions,clientDependencies:changes.clientDependencies,milestones:changes.milestones,agencyFeeCents:changes.agencyFeeCents,currency:changes.currency,externalCosts:changes.externalCosts,paymentTerms:changes.paymentTerms,validityUntil:changes.validityUntil?new Date(changes.validityUntil):changes.validityUntil===null?null:undefined,renderedContent:changes.renderedContent,artifactRef:changes.artifactRef,approvalId:changes.approvalId,sentAt:changes.sentAt?new Date(changes.sentAt):changes.sentAt===null?null:undefined,responseNotes:changes.responseNotes,version:sql`${proposals.version} + 1` as unknown as number,updatedAt:new Date()}).where(and(...conditions)).returning();return r?mapProposal(r):null;
  }

  async listContracts(leadId:string){return (await getDb().select().from(contracts).where(eq(contracts.leadId,leadId)).orderBy(desc(contracts.version))).map(mapContract);}
  async getContract(id:string){const [r]=await getDb().select().from(contracts).where(eq(contracts.id,id)).limit(1);return r?mapContract(r):null;}
  async createContract(input:Omit<Contract,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(contracts).values({leadId:input.leadId,proposalId:input.proposalId,proposalVersion:input.proposalVersion,proposalSnapshotHash:input.proposalSnapshotHash,proposalSnapshot:input.proposalSnapshot,templateId:input.templateId,templateVersion:input.templateVersion,version:input.version,status:input.status,parties:input.parties,terms:input.terms,responsibilitiesAgency:input.responsibilitiesAgency,responsibilitiesClient:input.responsibilitiesClient,paymentObligations:input.paymentObligations,deliverables:input.deliverables,supportObligations:input.supportObligations,renderedContent:input.renderedContent,artifactRef:input.artifactRef,approvalId:input.approvalId,signatureProvider:input.signatureProvider,externalSignatureId:input.externalSignatureId,signedArtifactRef:input.signedArtifactRef,signedAt:input.signedAt?new Date(input.signedAt):null,createdByType:input.createdByType,createdById:input.createdById}).returning();return mapContract(r);
  }
  async updateContract(id:string,expectedVersion:number|undefined,changes:Partial<Contract>){
    const conditions=[eq(contracts.id,id)];if(expectedVersion!=null)conditions.push(eq(contracts.version,expectedVersion));
    const [r]=await getDb().update(contracts).set({status:changes.status,parties:changes.parties,terms:changes.terms,responsibilitiesAgency:changes.responsibilitiesAgency,responsibilitiesClient:changes.responsibilitiesClient,paymentObligations:changes.paymentObligations,deliverables:changes.deliverables,supportObligations:changes.supportObligations,renderedContent:changes.renderedContent,artifactRef:changes.artifactRef,approvalId:changes.approvalId,signatureProvider:changes.signatureProvider,externalSignatureId:changes.externalSignatureId,signedArtifactRef:changes.signedArtifactRef,signedAt:changes.signedAt?new Date(changes.signedAt):changes.signedAt===null?null:undefined,version:sql`${contracts.version} + 1` as unknown as number,updatedAt:new Date()}).where(and(...conditions)).returning();return r?mapContract(r):null;
  }

  async listProjects(leadId:string){return (await getDb().select().from(clientProjects).where(eq(clientProjects.leadId,leadId)).orderBy(desc(clientProjects.createdAt))).map(mapProject);}
  async getProjectByContract(contractId:string){const [r]=await getDb().select().from(clientProjects).where(eq(clientProjects.contractId,contractId)).limit(1);return r?mapProject(r):null;}
  async createProject(input:Omit<ClientProject,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(clientProjects).values({leadId:input.leadId,contractId:input.contractId,name:input.name,status:input.status,ownerUserId:input.ownerUserId,startedAt:input.startedAt?new Date(input.startedAt):null,targetAt:input.targetAt?new Date(input.targetAt):null,completedAt:input.completedAt?new Date(input.completedAt):null}).onConflictDoNothing({target:clientProjects.contractId}).returning();
    if(r)return mapProject(r);
    const existing=await this.getProjectByContract(input.contractId);if(!existing)throw new Error("Project conflict without existing row");return existing;
  }
  async updateProject(id:string,changes:Partial<ClientProject>){
    const [r]=await getDb().update(clientProjects).set({name:changes.name,status:changes.status,ownerUserId:changes.ownerUserId,startedAt:changes.startedAt?new Date(changes.startedAt):changes.startedAt===null?null:undefined,targetAt:changes.targetAt?new Date(changes.targetAt):changes.targetAt===null?null:undefined,completedAt:changes.completedAt?new Date(changes.completedAt):changes.completedAt===null?null:undefined,updatedAt:new Date()}).where(eq(clientProjects.id,id)).returning();return r?mapProject(r):null;
  }
  async listObligations(projectId:string){return (await getDb().select().from(projectObligations).where(eq(projectObligations.projectId,projectId)).orderBy(projectObligations.createdAt)).map(mapObligation);}
  async createObligation(input:Omit<ProjectObligation,"id"|"createdAt"|"updatedAt">){
    const [r]=await getDb().insert(projectObligations).values({projectId:input.projectId,sourceContractId:input.sourceContractId,sourceKey:input.sourceKey,party:input.party,kind:input.kind,title:input.title,description:input.description,status:input.status,dueAt:input.dueAt?new Date(input.dueAt):null,metadata:input.metadata}).onConflictDoNothing({target:[projectObligations.projectId,projectObligations.sourceKey]}).returning();
    if(r)return mapObligation(r);
    const [existing]=await getDb().select().from(projectObligations).where(and(eq(projectObligations.projectId,input.projectId),eq(projectObligations.sourceKey,input.sourceKey))).limit(1);
    if(!existing)throw new Error("Obligation conflict without existing row");return mapObligation(existing);
  }
  async updateObligation(id:string,changes:Partial<ProjectObligation>){
    const [r]=await getDb().update(projectObligations).set({status:changes.status,dueAt:changes.dueAt?new Date(changes.dueAt):changes.dueAt===null?null:undefined,description:changes.description,metadata:changes.metadata,updatedAt:new Date()}).where(eq(projectObligations.id,id)).returning();return r?mapObligation(r):null;
  }
}
export const postgresAutomationRepository = new PostgresAutomationRepository();
