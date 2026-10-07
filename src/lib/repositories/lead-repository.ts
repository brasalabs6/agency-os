import type {
  ActorContext,
  AuditLog,
  CreateLeadInput,
  Lead,
  LeadActivity,
  LeadEvidence,
  LeadSearchFilters,
  LeadSearchResult,
  UpdateLeadInput,
  UserSummary,
} from "@/lib/domain/types";

export interface AddActivityInput {
  leadId: string;
  type: LeadActivity["type"];
  actor: ActorContext;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface AddEvidenceInput {
  leadId: string;
  sourceUrl: string;
  sourceType?: string | null;
  observedAt?: string | null;
  claim: string;
  value: string;
  confidence?: number | null;
  createdBy: string;
}

export interface AddAuditInput {
  actor: ActorContext;
  tool?: string | null;
  action: string;
  leadId?: string | null;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface LeadRepository {
  search(filters: LeadSearchFilters): Promise<LeadSearchResult>;
  getById(id: string): Promise<Lead | null>;
  lockForUpdate(id: string): Promise<void>;
  findDuplicate(input: CreateLeadInput): Promise<Lead | null>;
  create(input: CreateLeadInput): Promise<Lead>;
  update(id: string, input: UpdateLeadInput): Promise<Lead | null>;
  listActivities(leadId: string, limit?: number): Promise<LeadActivity[]>;
  addActivity(input: AddActivityInput): Promise<LeadActivity>;
  listEvidence(leadId: string): Promise<LeadEvidence[]>;
  addEvidence(input: AddEvidenceInput): Promise<LeadEvidence>;
  addAudit(input: AddAuditInput): Promise<AuditLog>;
  listUsers(): Promise<UserSummary[]>;
}
