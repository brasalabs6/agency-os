import type {
  AiRun, ApprovalRequest, BusinessProfile, ChannelConnection, ChannelMessage, ClientProject,
  Contract, Conversation, Diagnostic, ProjectObligation, Proposal, ProspectingRun,
  Qualification, ScoreAssessment,
} from "@/lib/domain/automation";

export interface AutomationRepository {
  listBusinessProfiles(leadId: string): Promise<BusinessProfile[]>;
  createBusinessProfile(input: Omit<BusinessProfile, "id" | "createdAt">): Promise<BusinessProfile>;

  listDiagnostics(leadId: string): Promise<Diagnostic[]>;
  getDiagnostic(id: string): Promise<Diagnostic | null>;
  createDiagnostic(input: Omit<Diagnostic, "id" | "createdAt" | "updatedAt">): Promise<Diagnostic>;
  updateDiagnostic(id: string, expectedVersion: number | undefined, changes: Partial<Diagnostic>): Promise<Diagnostic | null>;

  listScoreAssessments(leadId: string): Promise<ScoreAssessment[]>;
  createScoreAssessment(input: Omit<ScoreAssessment, "id" | "createdAt">): Promise<ScoreAssessment>;

  listAiRuns(filters?: { leadId?: string; skill?: string; status?: string; limit?: number }): Promise<AiRun[]>;
  getAiRun(id: string): Promise<AiRun | null>;
  findAiRunByIdempotencyKey(key: string): Promise<AiRun | null>;
  createAiRun(input: Omit<AiRun, "id" | "createdAt" | "updatedAt">): Promise<AiRun>;
  updateAiRun(id: string, changes: Partial<AiRun>): Promise<AiRun | null>;

  listProspectingRuns(limit?: number): Promise<ProspectingRun[]>;
  getProspectingRun(id: string): Promise<ProspectingRun | null>;
  createProspectingRun(input: Omit<ProspectingRun, "id" | "createdAt" | "updatedAt">): Promise<ProspectingRun>;
  updateProspectingRun(id: string, changes: Partial<ProspectingRun>): Promise<ProspectingRun | null>;

  listChannelConnections(): Promise<ChannelConnection[]>;
  getChannelConnection(id: string): Promise<ChannelConnection | null>;
  createChannelConnection(input: Omit<ChannelConnection, "id" | "createdAt" | "updatedAt">): Promise<ChannelConnection>;
  updateChannelConnection(id: string, changes: Partial<ChannelConnection>): Promise<ChannelConnection | null>;

  listConversations(filters?: { leadId?: string; connectionId?: string; limit?: number }): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | null>;
  getConversationByExternal(connectionId: string, externalId: string): Promise<Conversation | null>;
  upsertConversation(input: Omit<Conversation, "id" | "createdAt" | "updatedAt">): Promise<Conversation>;
  linkConversation(id: string, leadId: string | null, optOutDetected?: boolean): Promise<Conversation | null>;

  listMessages(conversationId: string, limit?: number): Promise<ChannelMessage[]>;
  upsertMessage(input: Omit<ChannelMessage, "id" | "createdAt">): Promise<ChannelMessage>;

  listApprovals(filters?: { leadId?: string; status?: string; limit?: number }): Promise<ApprovalRequest[]>;
  getApproval(id: string): Promise<ApprovalRequest | null>;
  createApproval(input: Omit<ApprovalRequest, "id" | "createdAt" | "updatedAt">): Promise<ApprovalRequest>;
  updateApproval(id: string, expectedVersion: number | undefined, changes: Partial<ApprovalRequest>): Promise<ApprovalRequest | null>;

  getQualification(leadId: string): Promise<Qualification | null>;
  upsertQualification(input: Omit<Qualification, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Qualification>;

  listProposals(leadId: string): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | null>;
  createProposal(input: Omit<Proposal, "id" | "createdAt" | "updatedAt">): Promise<Proposal>;
  updateProposal(id: string, expectedVersion: number | undefined, changes: Partial<Proposal>): Promise<Proposal | null>;

  listContracts(leadId: string): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | null>;
  createContract(input: Omit<Contract, "id" | "createdAt" | "updatedAt">): Promise<Contract>;
  updateContract(id: string, expectedVersion: number | undefined, changes: Partial<Contract>): Promise<Contract | null>;

  listProjects(leadId: string): Promise<ClientProject[]>;
  getProjectByContract(contractId: string): Promise<ClientProject | null>;
  createProject(input: Omit<ClientProject, "id" | "createdAt" | "updatedAt">): Promise<ClientProject>;
  updateProject(id: string, changes: Partial<ClientProject>): Promise<ClientProject | null>;

  listObligations(projectId: string): Promise<ProjectObligation[]>;
  createObligation(input: Omit<ProjectObligation, "id" | "createdAt" | "updatedAt">): Promise<ProjectObligation>;
  updateObligation(id: string, changes: Partial<ProjectObligation>): Promise<ProjectObligation | null>;
}
