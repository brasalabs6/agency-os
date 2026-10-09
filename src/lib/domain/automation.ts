import type { ActorType, ServiceOpportunity } from "./types";

export const DIAGNOSTIC_STATUSES = ["DRAFT", "READY", "APPROVED", "SENT", "SUPERSEDED"] as const;
export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number];

export const AI_RUN_STATUSES = ["QUEUED", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "CANCELED"] as const;
export type AiRunStatus = (typeof AI_RUN_STATUSES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "EXECUTING", "REJECTED", "EXPIRED", "EXECUTED", "CANCELED"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_ACTION_TYPES = [
  "WHATSAPP_SEND", "EMAIL_SEND", "PROPOSAL_SEND", "CONTRACT_SEND", "PRICING_EXCEPTION", "OTHER",
] as const;
export type ApprovalActionType = (typeof APPROVAL_ACTION_TYPES)[number];

export const PROPOSAL_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const CONTRACT_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "SIGNED", "DECLINED", "CANCELED", "SUPERSEDED"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const PROJECT_STATUSES = ["PLANNED", "ACTIVE", "WAITING_CLIENT", "BLOCKED_EXTERNAL", "REVIEWING", "DONE", "CANCELED"] as const;
export type ClientProjectStatus = (typeof PROJECT_STATUSES)[number];

export const OBLIGATION_STATUSES = ["TODO", "DOING", "WAITING", "DONE", "CANCELED"] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export type FactClassification = "FACT" | "INFERENCE" | "UNKNOWN";

export interface ProfileFact {
  key: string;
  value: string;
  classification: FactClassification;
  sourceUrl?: string | null;
  observedAt?: string | null;
  confidence?: number | null;
}

export interface BusinessProfile {
  id: string;
  leadId: string;
  version: number;
  identity: Record<string, unknown>;
  contacts: Record<string, unknown>;
  businessSignals: Record<string, unknown>;
  competition: Record<string, unknown>[];
  facts: ProfileFact[];
  createdByType: ActorType;
  createdById?: string | null;
  createdAt: string;
}

export interface DiagnosticFinding {
  dimension: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  explanation: string;
  evidenceIds: string[];
  confidence?: number | null;
  publicSafe: boolean;
}

export interface DiagnosticRecommendation {
  service: ServiceOpportunity | "OTHER";
  rationale: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export interface Diagnostic {
  id: string;
  leadId: string;
  businessProfileId?: string | null;
  status: DiagnosticStatus;
  version: number;
  executiveSummary: string;
  strengths: DiagnosticFinding[];
  gaps: DiagnosticFinding[];
  recommendations: DiagnosticRecommendation[];
  scores: Record<string, number>;
  recommendedServices: string[];
  internalNotes?: string | null;
  publicSummary?: string | null;
  artifactRef?: string | null;
  renderedContent?: string | null;
  generatedByType: ActorType;
  generatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreAssessment {
  id: string;
  leadId: string;
  diagnosticId?: string | null;
  digitalGap: number;
  economicPotential: number;
  contactability: number;
  urgency: number;
  serviceFit: number;
  proofPotential: number;
  total: number;
  confidence: number;
  reasons: string[];
  recommendedService?: string | null;
  createdByType: ActorType;
  createdById?: string | null;
  createdAt: string;
}

export interface AiRun {
  id: string;
  skill: string;
  skillVersion: string;
  leadId?: string | null;
  status: AiRunStatus;
  actorType: ActorType;
  actorId: string;
  idempotencyKey?: string | null;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectingRun {
  id: string;
  objective: string;
  icp: Record<string, unknown>;
  region?: string | null;
  segments: string[];
  sources: string[];
  maxCandidates: number;
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";
  aiRunId?: string | null;
  counters: { found: number; imported: number; duplicates: number; rejected: number };
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelConnection {
  id: string;
  provider: "WHATSAPP";
  accountLabel: string;
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED";
  capabilities: ("READ" | "SEND")[];
  ownerUserId?: string | null;
  externalAccountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  connectionId: string;
  externalId: string;
  leadId?: string | null;
  contactAddress: string;
  contactDisplayName?: string | null;
  lastMessageAt?: string | null;
  optOutDetected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelMessage {
  id: string;
  conversationId: string;
  externalId: string;
  direction: "INBOUND" | "OUTBOUND";
  sentAt: string;
  sender: string;
  text?: string | null;
  mediaType?: string | null;
  deliveryStatus?: string | null;
  rawMetadata: Record<string, unknown>;
  createdAt: string;
}

export interface PolicyCheck {
  id: string;
  passed: boolean;
  message: string;
}

export interface ApprovalRequest {
  id: string;
  leadId?: string | null;
  actionType: ApprovalActionType;
  payload: Record<string, unknown>;
  payloadHash: string;
  preview: string;
  rationale?: string | null;
  policyChecks: PolicyCheck[];
  status: ApprovalStatus;
  createdByType: ActorType;
  createdById: string;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  rejectedByUserId?: string | null;
  rejectedAt?: string | null;
  executedAt?: string | null;
  executionResult: Record<string, unknown>;
  expiresAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Qualification {
  id: string;
  leadId: string;
  version: number;
  decisionMakers: string[];
  problemStatements: string[];
  desiredOutcome?: string | null;
  currentProcess?: string | null;
  urgency?: string | null;
  explicitBudgetStatement?: string | null;
  timeline?: string | null;
  constraints: string[];
  technicalDependencies: string[];
  unansweredQuestions: string[];
  riskFlags: string[];
  serviceFit: string[];
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  diagnosticId?: string | null;
  qualificationId?: string | null;
  version: number;
  status: ProposalStatus;
  services: string[];
  scope: string[];
  exclusions: string[];
  assumptions: string[];
  clientDependencies: string[];
  milestones: Record<string, unknown>[];
  agencyFeeCents?: number | null;
  currency: string;
  externalCosts: Record<string, unknown>[];
  paymentTerms?: string | null;
  validityUntil?: string | null;
  renderedContent?: string | null;
  artifactRef?: string | null;
  approvalId?: string | null;
  sentAt?: string | null;
  responseNotes?: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  leadId: string;
  proposalId: string;
  proposalVersion: number;
  proposalSnapshotHash: string;
  proposalSnapshot: Record<string, unknown>;
  templateId: string;
  templateVersion: string;
  version: number;
  status: ContractStatus;
  parties: Record<string, unknown>;
  terms: Record<string, unknown>;
  responsibilitiesAgency: string[];
  responsibilitiesClient: string[];
  paymentObligations: Record<string, unknown>[];
  deliverables: string[];
  supportObligations: string[];
  renderedContent?: string | null;
  artifactRef?: string | null;
  approvalId?: string | null;
  signatureProvider?: string | null;
  externalSignatureId?: string | null;
  signedArtifactRef?: string | null;
  signedAt?: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProject {
  id: string;
  leadId: string;
  contractId: string;
  name: string;
  status: ClientProjectStatus;
  ownerUserId?: string | null;
  startedAt?: string | null;
  targetAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectObligation {
  id: string;
  version: number;
  projectId: string;
  sourceContractId: string;
  sourceKey: string;
  party: "AGENCY" | "CLIENT";
  kind: "DELIVERABLE" | "MILESTONE" | "PAYMENT" | "APPROVAL" | "SUPPORT" | "DEPENDENCY" | "OTHER";
  title: string;
  description?: string | null;
  status: ObligationStatus;
  dueAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationBundle {
  businessProfile: BusinessProfile | null;
  diagnostics: Diagnostic[];
  scores: ScoreAssessment[];
  aiRuns: AiRun[];
  conversations: Array<Conversation & { messages: ChannelMessage[] }>;
  qualification: Qualification | null;
  proposals: Proposal[];
  contracts: Contract[];
  approvals: ApprovalRequest[];
  projects: Array<ClientProject & { obligations: ProjectObligation[] }>;
}
