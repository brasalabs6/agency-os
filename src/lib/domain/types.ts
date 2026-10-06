export const LEAD_STATUSES = [
  "DISCOVERED",
  "ENRICHED",
  "SCORED",
  "READY_TO_CONTACT",
  "CONTACTED",
  "QUALIFIED",
  "PERMISSIONED_FOLLOWUP",
  "DIAGNOSIS_SENT",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "ONBOARDING",
  "NURTURE",
  "LOST",
  "DO_NOT_CONTACT",
  "INVALID",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SERVICE_OPPORTUNITIES = [
  "WEBSITE",
  "LANDING_PAGE",
  "DIGITAL_CATALOG",
  "GOOGLE_BUSINESS",
  "AUTOMATION",
  "CUSTOM_SYSTEM",
  "OTHER",
] as const;

export type ServiceOpportunity = (typeof SERVICE_OPPORTUNITIES)[number];

export type ActorType = "USER" | "AGENT" | "SYSTEM";
export type UserRole = "ADMIN" | "MEMBER";

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
}

export interface Lead {
  id: string;
  name: string;
  legalName?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  instagramUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  status: LeadStatus;
  score?: number | null;
  scoreReasons: string[];
  primaryOpportunity?: ServiceOpportunity | null;
  opportunityNotes?: string | null;
  owner?: UserSummary | null;
  tags: string[];
  sourceType?: string | null;
  sourceUrl?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  nextActionOwner?: UserSummary | null;
  doNotContact: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type ActivityType =
  | "CREATED"
  | "UPDATED"
  | "STAGE_CHANGED"
  | "NOTE_ADDED"
  | "CONTACT_RECORDED"
  | "NEXT_ACTION_SET"
  | "NEXT_ACTION_COMPLETED"
  | "SCORE_UPDATED"
  | "ASSIGNED"
  | "SOURCE_ADDED"
  | "AGENT_ACTION"
  | "WON"
  | "LOST";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  actorType: ActorType;
  actorId: string;
  actorName: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LeadEvidence {
  id: string;
  leadId: string;
  sourceUrl: string;
  sourceType?: string | null;
  observedAt?: string | null;
  claim: string;
  value: string;
  confidence?: number | null;
  createdBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorType: ActorType;
  actorId: string;
  tool?: string | null;
  action: string;
  leadId?: string | null;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
}

export interface LeadSearchFilters {
  query?: string;
  status?: LeadStatus;
  statuses?: LeadStatus[];
  pipelineGroup?: string;
  segment?: string;
  city?: string;
  opportunity?: ServiceOpportunity;
  ownerId?: string;
  scoreMin?: number;
  scoreMax?: number;
  tags?: string[];
  overdue?: boolean;
  dueToday?: boolean;
  noNextAction?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeadSearchResult {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActorContext {
  type: ActorType;
  id: string;
  name: string;
  scopes?: string[];
}

export interface CreateLeadInput {
  name: string;
  legalName?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  instagramUrl?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  status?: LeadStatus;
  statuses?: LeadStatus[];
  score?: number | null;
  scoreReasons?: string[];
  primaryOpportunity?: ServiceOpportunity | null;
  opportunityNotes?: string | null;
  ownerId?: string | null;
  tags?: string[];
  sourceType?: string | null;
  sourceUrl?: string | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  nextActionOwnerId?: string | null;
}

export type UpdateLeadInput = Partial<Omit<CreateLeadInput, "name">> & {
  name?: string;
  expectedVersion?: number;
};

export interface DashboardSummary {
  activeLeads: number;
  overdueActions: number;
  contactToday: number;
  openProposals: number;
  negotiation: number;
  won: number;
  countsByStatus: Partial<Record<LeadStatus, number>>;
  needsAttention: Lead[];
}
