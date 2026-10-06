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

export const LEAD_TASK_TYPES = [
  "TASK",
  "CALL",
  "FOLLOW_UP",
  "MEETING",
  "RESEARCH",
  "PROPOSAL",
  "OTHER",
] as const;
export type LeadTaskType = (typeof LEAD_TASK_TYPES)[number];

export const LEAD_TASK_STATUSES = ["TODO", "DOING", "DONE", "CANCELED"] as const;
export type LeadTaskStatus = (typeof LEAD_TASK_STATUSES)[number];

export const LEAD_TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type LeadTaskPriority = (typeof LEAD_TASK_PRIORITIES)[number];

export type ActorType = "USER" | "AGENT" | "SYSTEM";
export type UserRole = "ADMIN" | "MEMBER";

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  active?: boolean;
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
  | "LOST"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_CANCELED"
  | "TASK_RESCHEDULED"
  | "TASK_REASSIGNED"
  | "TASK_REORDERED";

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

export interface LeadTask {
  id: string;
  leadId: string;
  title: string;
  description?: string | null;
  type: LeadTaskType;
  status: LeadTaskStatus;
  priority: LeadTaskPriority;
  dueAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  allDay: boolean;
  owner?: UserSummary | null;
  order: number;
  createdByType: ActorType;
  createdById?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface LeadTaskLeadSummary {
  id: string;
  name: string;
  status: LeadStatus;
  score?: number | null;
}

export interface LeadTaskView extends LeadTask {
  lead: LeadTaskLeadSummary;
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
  ownerUnassigned?: boolean;
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

export interface TaskSearchFilters {
  leadId?: string;
  ownerId?: string;
  status?: LeadTaskStatus;
  statuses?: LeadTaskStatus[];
  priority?: LeadTaskPriority;
  priorities?: LeadTaskPriority[];
  type?: LeadTaskType;
  types?: LeadTaskType[];
  from?: string;
  to?: string;
  overdue?: boolean;
  dueToday?: boolean;
  noDate?: boolean;
  includeCompleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface TaskSearchResult {
  items: LeadTaskView[];
  total: number;
  limit: number;
  offset: number;
}

export interface ActorContext {
  type: ActorType;
  id: string;
  name: string;
  scopes?: string[];
  role?: UserRole;
  principalUserId?: string;
  principalUserName?: string;
  credentialId?: string;
  credentialName?: string;
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

export interface CreateLeadTaskInput {
  leadId: string;
  title: string;
  description?: string | null;
  type?: LeadTaskType;
  priority?: LeadTaskPriority;
  dueAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  ownerId?: string | null;
  order?: number;
}

export interface UpdateLeadTaskInput {
  title?: string;
  description?: string | null;
  type?: LeadTaskType;
  status?: "TODO" | "DOING";
  priority?: LeadTaskPriority;
  dueAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  allDay?: boolean;
  ownerId?: string | null;
  order?: number;
  expectedVersion?: number;
}

export interface DashboardSummary {
  activeLeads: number;
  overdueActions: number;
  contactToday: number;
  openProposals: number;
  negotiation: number;
  won: number;
  tasksToday: number;
  overdueTasks: number;
  meetingsToday: number;
  countsByStatus: Partial<Record<LeadStatus, number>>;
  needsAttention: Lead[];
}
