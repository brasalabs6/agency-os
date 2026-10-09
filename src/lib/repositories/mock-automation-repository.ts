import { randomUUID } from "node:crypto";
import type {
  AiRun, ApprovalRequest, BusinessProfile, ChannelConnection, ChannelMessage, ClientProject,
  Contract, Conversation, Diagnostic, ProjectObligation, Proposal, ProspectingRun,
  Qualification, ScoreAssessment,
} from "@/lib/domain/automation";
import type { AutomationRepository } from "./automation-repository";

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

export class MockAutomationRepository implements AutomationRepository {
  private businessProfiles: BusinessProfile[] = [];
  private diagnostics: Diagnostic[] = [];
  private scores: ScoreAssessment[] = [];
  private aiRuns: AiRun[] = [];
  private prospectingRuns: ProspectingRun[] = [];
  private connections: ChannelConnection[] = [];
  private conversations: Conversation[] = [];
  private messages: ChannelMessage[] = [];
  private approvals: ApprovalRequest[] = [];
  private qualifications: Qualification[] = [];
  private proposals: Proposal[] = [];
  private contracts: Contract[] = [];
  private projects: ClientProject[] = [];
  private obligations: ProjectObligation[] = [];

  async listBusinessProfiles(leadId: string) {
    return clone(this.businessProfiles.filter((x) => x.leadId === leadId).sort((a, b) => b.version - a.version));
  }
  async createBusinessProfile(input: Omit<BusinessProfile, "id" | "createdAt">) {
    const item: BusinessProfile = { id: randomUUID(), ...input, createdAt: now() };
    this.businessProfiles.push(item); return clone(item);
  }

  async listDiagnostics(leadId: string) {
    return clone(this.diagnostics.filter((x) => x.leadId === leadId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }
  async getDiagnostic(id: string) { return clone(this.diagnostics.find((x) => x.id === id) ?? null); }
  async createDiagnostic(input: Omit<Diagnostic, "id" | "createdAt" | "updatedAt">) {
    const ts = now(); const item: Diagnostic = { id: randomUUID(), ...input, createdAt: ts, updatedAt: ts };
    this.diagnostics.push(item); return clone(item);
  }
  async updateDiagnostic(id: string, expectedVersion: number | undefined, changes: Partial<Diagnostic>) {
    const i = this.diagnostics.findIndex((x) => x.id === id); if (i < 0) return null;
    const current = this.diagnostics[i]; if (expectedVersion != null && current.version !== expectedVersion) return null;
    const updated = { ...current, ...changes, id: current.id, version: current.version + 1, updatedAt: now() };
    this.diagnostics[i] = updated; return clone(updated);
  }

  async listScoreAssessments(leadId: string) {
    return clone(this.scores.filter((x) => x.leadId === leadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async createScoreAssessment(input: Omit<ScoreAssessment, "id" | "createdAt">) {
    const item: ScoreAssessment = { id: randomUUID(), ...input, createdAt: now() };
    this.scores.push(item); return clone(item);
  }

  async listAiRuns(filters: { leadId?: string; skill?: string; status?: string; limit?: number } = {}) {
    let items = this.aiRuns.filter((x) => (!filters.leadId || x.leadId === filters.leadId) && (!filters.skill || x.skill === filters.skill) && (!filters.status || x.status === filters.status));
    items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, filters.limit ?? 100); return clone(items);
  }
  async getAiRun(id: string) { return clone(this.aiRuns.find((x) => x.id === id) ?? null); }
  async findAiRunByIdempotencyKey(key: string) { return clone(this.aiRuns.find((x) => x.idempotencyKey === key) ?? null); }
  async createAiRun(input: Omit<AiRun, "id" | "createdAt" | "updatedAt">) {
    const ts = now(); const item: AiRun = { id: randomUUID(), ...input, createdAt: ts, updatedAt: ts };
    this.aiRuns.push(item); return clone(item);
  }
  async updateAiRun(id: string, changes: Partial<AiRun>) {
    const i = this.aiRuns.findIndex((x) => x.id === id); if (i < 0) return null;
    const current = this.aiRuns[i]; const updated = { ...current, ...changes, id: current.id, updatedAt: now() };
    this.aiRuns[i] = updated; return clone(updated);
  }

  async listProspectingRuns(limit = 100) { return clone(this.prospectingRuns.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit)); }
  async getProspectingRun(id: string) { return clone(this.prospectingRuns.find((x) => x.id === id) ?? null); }
  async createProspectingRun(input: Omit<ProspectingRun, "id" | "createdAt" | "updatedAt">) {
    const ts=now(); const item: ProspectingRun={id:randomUUID(),...input,createdAt:ts,updatedAt:ts}; this.prospectingRuns.push(item); return clone(item);
  }
  async updateProspectingRun(id:string,changes:Partial<ProspectingRun>) {
    const i=this.prospectingRuns.findIndex((x)=>x.id===id); if(i<0)return null; const cur=this.prospectingRuns[i];
    const updated={...cur,...changes,id:cur.id,updatedAt:now()}; this.prospectingRuns[i]=updated; return clone(updated);
  }

  async listChannelConnections(){return clone(this.connections);}
  async getChannelConnection(id:string){return clone(this.connections.find((x)=>x.id===id)??null);}
  async createChannelConnection(input:Omit<ChannelConnection,"id"|"createdAt"|"updatedAt">){
    const ts=now(); const item:ChannelConnection={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.connections.push(item);return clone(item);
  }
  async updateChannelConnection(id:string,changes:Partial<ChannelConnection>){
    const i=this.connections.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.connections[i];
    const updated={...cur,...changes,id:cur.id,updatedAt:now()};this.connections[i]=updated;return clone(updated);
  }

  async listConversations(filters:{leadId?:string;connectionId?:string;limit?:number}={}){
    return clone(this.conversations.filter((x)=>(!filters.leadId||x.leadId===filters.leadId)&&(!filters.connectionId||x.connectionId===filters.connectionId)).sort((a,b)=>(b.lastMessageAt??b.updatedAt).localeCompare(a.lastMessageAt??a.updatedAt)).slice(0,filters.limit??100));
  }
  async getConversation(id:string){return clone(this.conversations.find((x)=>x.id===id)??null);}
  async getConversationByExternal(connectionId:string,externalId:string){return clone(this.conversations.find((x)=>x.connectionId===connectionId&&x.externalId===externalId)??null);}
  async upsertConversation(input:Omit<Conversation,"id"|"createdAt"|"updatedAt">){
    const i=this.conversations.findIndex((x)=>x.connectionId===input.connectionId&&x.externalId===input.externalId); const ts=now();
    if(i>=0){const cur=this.conversations[i];const updated={...cur,...input,id:cur.id,updatedAt:ts};this.conversations[i]=updated;return clone(updated);}
    const item:Conversation={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.conversations.push(item);return clone(item);
  }
  async linkConversation(id:string,leadId:string|null,optOutDetected?:boolean){
    const i=this.conversations.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.conversations[i];
    const updated={...cur,leadId,optOutDetected:optOutDetected??cur.optOutDetected,updatedAt:now()};this.conversations[i]=updated;return clone(updated);
  }
  async listMessages(conversationId:string,limit=200){return clone(this.messages.filter((x)=>x.conversationId===conversationId).sort((a,b)=>a.sentAt.localeCompare(b.sentAt)).slice(-limit));}
  async upsertMessage(input:Omit<ChannelMessage,"id"|"createdAt">){
    const i=this.messages.findIndex((x)=>x.conversationId===input.conversationId&&x.externalId===input.externalId);
    if(i>=0){const cur=this.messages[i];const updated={...cur,...input,id:cur.id};this.messages[i]=updated;return clone(updated);}
    const item:ChannelMessage={id:randomUUID(),...input,createdAt:now()};this.messages.push(item);return clone(item);
  }

  async listApprovals(filters:{leadId?:string;status?:string;limit?:number}={}){
    return clone(this.approvals.filter((x)=>(!filters.leadId||x.leadId===filters.leadId)&&(!filters.status||x.status===filters.status)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,filters.limit??100));
  }
  async getApproval(id:string){return clone(this.approvals.find((x)=>x.id===id)??null);}
  async createApproval(input:Omit<ApprovalRequest,"id"|"createdAt"|"updatedAt">){
    const ts=now();const item:ApprovalRequest={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.approvals.push(item);return clone(item);
  }
  async updateApproval(id:string,expectedVersion:number|undefined,changes:Partial<ApprovalRequest>){
    const i=this.approvals.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.approvals[i];if(expectedVersion!=null&&cur.version!==expectedVersion)return null;
    const updated={...cur,...changes,id:cur.id,version:cur.version+1,updatedAt:now()};this.approvals[i]=updated;return clone(updated);
  }

  async getQualification(leadId:string){return clone(this.qualifications.find((x)=>x.leadId===leadId)??null);}
  async upsertQualification(input:Omit<Qualification,"id"|"createdAt"|"updatedAt">&{id?:string},expectedVersion?:number){
    const i=this.qualifications.findIndex((x)=>x.leadId===input.leadId);const ts=now();
    if(i>=0){const cur=this.qualifications[i];if(expectedVersion==null||cur.version!==expectedVersion)return null;const updated={...cur,...input,id:cur.id,version:cur.version+1,updatedAt:ts};this.qualifications[i]=updated;return clone(updated);}
    if(expectedVersion!=null)return null;
    const {id:_id,...rest}=input;const item:Qualification={id:randomUUID(),...rest,createdAt:ts,updatedAt:ts};this.qualifications.push(item);return clone(item);
  }

  async listProposals(leadId:string){return clone(this.proposals.filter((x)=>x.leadId===leadId).sort((a,b)=>b.version-a.version));}
  async getProposal(id:string){return clone(this.proposals.find((x)=>x.id===id)??null);}
  async createProposal(input:Omit<Proposal,"id"|"createdAt"|"updatedAt">){const ts=now();const item:Proposal={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.proposals.push(item);return clone(item);}
  async updateProposal(id:string,expectedVersion:number|undefined,changes:Partial<Proposal>){
    const i=this.proposals.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.proposals[i];if(expectedVersion!=null&&cur.version!==expectedVersion)return null;
    const updated={...cur,...changes,id:cur.id,version:cur.version+1,updatedAt:now()};this.proposals[i]=updated;return clone(updated);
  }

  async listContracts(leadId:string){return clone(this.contracts.filter((x)=>x.leadId===leadId).sort((a,b)=>b.version-a.version));}
  async getContract(id:string){return clone(this.contracts.find((x)=>x.id===id)??null);}
  async createContract(input:Omit<Contract,"id"|"createdAt"|"updatedAt">){const ts=now();const item:Contract={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.contracts.push(item);return clone(item);}
  async updateContract(id:string,expectedVersion:number|undefined,changes:Partial<Contract>){
    const i=this.contracts.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.contracts[i];if(expectedVersion!=null&&cur.version!==expectedVersion)return null;
    const updated={...cur,...changes,id:cur.id,version:cur.version+1,updatedAt:now()};this.contracts[i]=updated;return clone(updated);
  }

  async listProjects(leadId:string){return clone(this.projects.filter((x)=>x.leadId===leadId));}
  async getProjectByContract(contractId:string){return clone(this.projects.find((x)=>x.contractId===contractId)??null);}
  async createProject(input:Omit<ClientProject,"id"|"createdAt"|"updatedAt">){
    const existing=this.projects.find((x)=>x.contractId===input.contractId);if(existing)return clone(existing);
    const ts=now();const item:ClientProject={id:randomUUID(),...input,createdAt:ts,updatedAt:ts};this.projects.push(item);return clone(item);
  }
  async updateProject(id:string,changes:Partial<ClientProject>){const i=this.projects.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.projects[i];const updated={...cur,...changes,id:cur.id,updatedAt:now()};this.projects[i]=updated;return clone(updated);}

  async listObligations(projectId:string){return clone(this.obligations.filter((x)=>x.projectId===projectId));}
  async createObligation(input:Omit<ProjectObligation,"id"|"version"|"createdAt"|"updatedAt">){
    const existing=this.obligations.find((x)=>x.projectId===input.projectId&&x.sourceKey===input.sourceKey);if(existing)return clone(existing);
    const ts=now();const item:ProjectObligation={id:randomUUID(),version:1,...input,createdAt:ts,updatedAt:ts};this.obligations.push(item);return clone(item);
  }
  async updateObligation(id:string,expectedVersion:number,changes:Partial<ProjectObligation>){const i=this.obligations.findIndex((x)=>x.id===id);if(i<0)return null;const cur=this.obligations[i];if(cur.version!==expectedVersion)return null;const updated={...cur,...changes,id:cur.id,version:cur.version+1,updatedAt:now()};this.obligations[i]=updated;return clone(updated);}
}

export const mockAutomationRepository = new MockAutomationRepository();
