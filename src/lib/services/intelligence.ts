import { DomainError } from "@/lib/domain/errors";
import type { ActorContext, ServiceOpportunity } from "@/lib/domain/types";
import type {
  AutomationBundle, BusinessProfile, Diagnostic, DiagnosticFinding,
  DiagnosticRecommendation, ScoreAssessment,
} from "@/lib/domain/automation";
import { getAutomationRepository } from "@/lib/repositories";
import { getLead, moveLeadStage, updateLead } from "./leads";
import { automationAudit, nowIso, requireHumanActor, throwVersionConflict } from "./automation-utils";

const repo = () => getAutomationRepository();

function validateScore(input: Pick<ScoreAssessment,
  "digitalGap" | "economicPotential" | "contactability" | "urgency" |
  "serviceFit" | "proofPotential" | "confidence">) {
  const checks: Array<[string, number, number]> = [
    ["digitalGap", input.digitalGap, 25],
    ["economicPotential", input.economicPotential, 20],
    ["contactability", input.contactability, 15],
    ["urgency", input.urgency, 15],
    ["serviceFit", input.serviceFit, 15],
    ["proofPotential", input.proofPotential, 10],
    ["confidence", input.confidence, 100],
  ];
  for (const [name, value, max] of checks) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      throw new DomainError(name + " must be an integer between 0 and " + max, "INVALID_SCORE", 422);
    }
  }
}

export async function getAutomationBundle(leadId: string): Promise<AutomationBundle> {
  await getLead(leadId);
  const [profiles, diagnostics, scores, aiRuns, conversations, qualification, proposals, contracts, approvals, projects] =
    await Promise.all([
      repo().listBusinessProfiles(leadId),
      repo().listDiagnostics(leadId),
      repo().listScoreAssessments(leadId),
      repo().listAiRuns({ leadId, limit: 100 }),
      repo().listConversations({ leadId, limit: 100 }),
      repo().getQualification(leadId),
      repo().listProposals(leadId),
      repo().listContracts(leadId),
      repo().listApprovals({ leadId, limit: 100 }),
      repo().listProjects(leadId),
    ]);
  const conversationViews = await Promise.all(
    conversations.map(async (conversation) => ({
      ...conversation,
      messages: await repo().listMessages(conversation.id, 200),
    })),
  );
  const projectViews = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      obligations: await repo().listObligations(project.id),
    })),
  );
  return {
    businessProfile: profiles[0] ?? null,
    diagnostics,
    scores,
    aiRuns,
    conversations: conversationViews,
    qualification,
    proposals,
    contracts,
    approvals,
    projects: projectViews,
  };
}

export async function createBusinessProfileSnapshot(
  leadId: string,
  input: Omit<BusinessProfile,
    "id" | "leadId" | "version" | "createdAt" | "createdByType" | "createdById">,
  actor: ActorContext,
  tool?: string,
) {
  const data = await getLead(leadId);
  const previous = await repo().listBusinessProfiles(leadId);
  const profile = await repo().createBusinessProfile({
    leadId,
    version: (previous[0]?.version ?? 0) + 1,
    ...input,
    createdByType: actor.type,
    createdById: actor.id,
  });
  await automationAudit(
    actor,
    "business_profile.snapshot.create",
    "business_profile",
    profile.id,
    { version: profile.version, facts: profile.facts.length },
    { version: profile.version },
    leadId,
    tool,
  );
  if (data.lead.status === "DISCOVERED") {
    await moveLeadStage(leadId, "ENRICHED", actor, {
      reason: "Business profile enrichment completed",
      tool,
    });
  }
  return profile;
}

export async function listBusinessProfiles(leadId: string) {
  await getLead(leadId);
  return repo().listBusinessProfiles(leadId);
}

export async function createDiagnostic(
  leadId: string,
  input: {
    businessProfileId?: string | null;
    executiveSummary?: string;
    strengths?: DiagnosticFinding[];
    gaps?: DiagnosticFinding[];
    recommendations?: DiagnosticRecommendation[];
    scores?: Record<string, number>;
    recommendedServices?: string[];
    internalNotes?: string | null;
    publicSummary?: string | null;
  },
  actor: ActorContext,
  tool?: string,
) {
  await getLead(leadId);
  if (input.businessProfileId) {
    const profiles = await repo().listBusinessProfiles(leadId);
    if (!profiles.some((profile) => profile.id === input.businessProfileId)) {
      throw new DomainError(
        "Business profile belongs to another lead",
        "RELATION_LEAD_MISMATCH",
        422,
        { relation: "businessProfileId" },
      );
    }
  }
  const item = await repo().createDiagnostic({
    leadId,
    businessProfileId: input.businessProfileId ?? null,
    status: "DRAFT",
    version: 1,
    executiveSummary: input.executiveSummary ?? "",
    strengths: input.strengths ?? [],
    gaps: input.gaps ?? [],
    recommendations: input.recommendations ?? [],
    scores: input.scores ?? {},
    recommendedServices: input.recommendedServices ?? [],
    internalNotes: input.internalNotes ?? null,
    publicSummary: input.publicSummary ?? null,
    artifactRef: null,
    renderedContent: null,
    generatedByType: actor.type,
    generatedById: actor.id,
  });
  await automationAudit(actor, "diagnostic.create", "diagnostic", item.id, { leadId }, { version: 1 }, leadId, tool);
  return item;
}

export async function getDiagnostic(id: string) {
  const item = await repo().getDiagnostic(id);
  if (!item) throw new DomainError("Diagnostic not found", "DIAGNOSTIC_NOT_FOUND", 404);
  return item;
}

export async function listDiagnostics(leadId: string) {
  await getLead(leadId);
  return repo().listDiagnostics(leadId);
}

export async function updateDiagnostic(
  id: string,
  changes: Partial<Pick<Diagnostic,
    "executiveSummary" | "strengths" | "gaps" | "recommendations" | "scores" |
    "recommendedServices" | "internalNotes" | "publicSummary">>,
  expectedVersion: number,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getDiagnostic(id);
  if (before.status !== "DRAFT") {
    throw new DomainError(
      "Only DRAFT diagnostics can be edited",
      "DIAGNOSTIC_NOT_EDITABLE",
      409,
      { status: before.status },
    );
  }
  const updated = await repo().updateDiagnostic(id, expectedVersion, changes);
  if (!updated) throwVersionConflict("Diagnostic");
  await automationAudit(
    actor,
    "diagnostic.update",
    "diagnostic",
    id,
    { expectedVersion, changed: Object.keys(changes) },
    { version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

function renderDiagnosticMarkdown(item: Diagnostic) {
  const finding = (x: DiagnosticFinding) =>
    "- **" + x.title + "** (" + x.severity + "): " + x.explanation;
  const recommendation = (x: DiagnosticRecommendation) =>
    "- **" + x.service + "** (" + x.priority + "): " + x.rationale;
  const scores = Object.entries(item.scores)
    .map(([key, value]) => "- " + key + ": " + value + "/100")
    .join("\n");
  return [
    "# Diagnóstico de Presença Digital",
    "",
    item.publicSummary || item.executiveSummary,
    "",
    "## Pontos fortes",
    item.strengths.filter((x) => x.publicSafe).map(finding).join("\n") || "- Nenhum ponto forte público registrado.",
    "",
    "## Oportunidades",
    item.gaps.filter((x) => x.publicSafe).map(finding).join("\n") || "- Nenhuma oportunidade pública registrada.",
    "",
    "## Scorecard",
    scores || "- Sem scores registrados.",
    "",
    "## Próximos passos recomendados",
    item.recommendations.map(recommendation).join("\n") || "- Revisar com a equipe.",
  ].join("\n");
}

export async function finalizeDiagnostic(
  id: string,
  expectedVersion: number,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getDiagnostic(id);
  if (before.status !== "DRAFT") {
    throw new DomainError(
      "Only DRAFT diagnostics can be finalized",
      "DIAGNOSTIC_NOT_FINALIZABLE",
      409,
      { status: before.status },
    );
  }
  const updated = await repo().updateDiagnostic(id, expectedVersion, {
    status: "READY",
    renderedContent: renderDiagnosticMarkdown(before),
  });
  if (!updated) throwVersionConflict("Diagnostic");
  await automationAudit(
    actor,
    "diagnostic.finalize",
    "diagnostic",
    id,
    { expectedVersion },
    { status: updated.status, version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

export async function approveDiagnostic(
  id: string,
  expectedVersion: number,
  actor: ActorContext,
) {
  requireHumanActor(actor);
  const before = await getDiagnostic(id);
  if (before.status !== "READY") {
    throw new DomainError(
      "Only READY diagnostics can be approved",
      "DIAGNOSTIC_NOT_APPROVABLE",
      409,
      { status: before.status },
    );
  }
  const updated = await repo().updateDiagnostic(id, expectedVersion, { status: "APPROVED" });
  if (!updated) throwVersionConflict("Diagnostic");
  await automationAudit(actor, "diagnostic.approve", "diagnostic", id, {}, { status: "APPROVED" }, before.leadId);
  return updated;
}

export async function createScoreAssessment(
  leadId: string,
  input: {
    diagnosticId?: string | null;
    digitalGap: number;
    economicPotential: number;
    contactability: number;
    urgency: number;
    serviceFit: number;
    proofPotential: number;
    confidence: number;
    reasons?: string[];
    recommendedService?: string | null;
  },
  actor: ActorContext,
  tool?: string,
) {
  const data = await getLead(leadId);
  if (input.diagnosticId) {
    const diagnostic = await getDiagnostic(input.diagnosticId);
    if (diagnostic.leadId !== leadId) {
      throw new DomainError(
        "Diagnostic belongs to another lead",
        "RELATION_LEAD_MISMATCH",
        422,
        { relation: "diagnosticId" },
      );
    }
  }
  validateScore(input);
  const total =
    input.digitalGap + input.economicPotential + input.contactability +
    input.urgency + input.serviceFit + input.proofPotential;
  const assessment = await repo().createScoreAssessment({
    leadId,
    diagnosticId: input.diagnosticId ?? null,
    ...input,
    total,
    reasons: input.reasons ?? [],
    createdByType: actor.type,
    createdById: actor.id,
  });
  const known = ["WEBSITE", "LANDING_PAGE", "DIGITAL_CATALOG", "GOOGLE_BUSINESS", "AUTOMATION", "CUSTOM_SYSTEM", "OTHER"];
  const recommended = input.recommendedService && known.includes(input.recommendedService)
    ? input.recommendedService as ServiceOpportunity
    : data.lead.primaryOpportunity;
  const updatedLead = await updateLead(
    leadId,
    {
      score: total,
      scoreReasons: input.reasons ?? [],
      primaryOpportunity: recommended ?? null,
      expectedVersion: data.lead.version,
    },
    actor,
    tool,
  );
  if (updatedLead.status === "DISCOVERED" || updatedLead.status === "ENRICHED") {
    await moveLeadStage(leadId, "SCORED", actor, {
      reason: "Structured score assessment completed",
      tool,
    });
  }
  await automationAudit(actor, "score_assessment.create", "score_assessment", assessment.id, {}, { total }, leadId, tool);
  return assessment;
}

export async function listScoreAssessments(leadId: string) {
  await getLead(leadId);
  return repo().listScoreAssessments(leadId);
}

export async function startAiRun(
  input: {
    skill: string;
    skillVersion?: string;
    leadId?: string | null;
    idempotencyKey?: string | null;
    inputSummary?: Record<string, unknown>;
  },
  actor: ActorContext,
  tool?: string,
) {
  if (input.idempotencyKey) {
    const existing = await repo().findAiRunByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;
  }
  const item = await repo().createAiRun({
    skill: input.skill,
    skillVersion: input.skillVersion ?? "1",
    leadId: input.leadId ?? null,
    status: "RUNNING",
    actorType: actor.type,
    actorId: actor.id,
    idempotencyKey: input.idempotencyKey ?? null,
    inputSummary: input.inputSummary ?? {},
    outputSummary: {},
    errorCode: null,
    errorMessage: null,
    startedAt: nowIso(),
    completedAt: null,
  });
  await automationAudit(actor, "ai_run.start", "ai_run", item.id, { skill: item.skill }, {}, item.leadId, tool);
  return item;
}

export async function finishAiRun(
  id: string,
  input: {
    status: "COMPLETED" | "FAILED" | "CANCELED" | "WAITING_APPROVAL";
    outputSummary?: Record<string, unknown>;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
  actor: ActorContext,
  tool?: string,
) {
  const before = await repo().getAiRun(id);
  if (!before) throw new DomainError("AI run not found", "AI_RUN_NOT_FOUND", 404);
  const terminal = input.status === "COMPLETED" || input.status === "FAILED" || input.status === "CANCELED";
  const updated = await repo().updateAiRun(id, {
    status: input.status,
    outputSummary: input.outputSummary ?? before.outputSummary,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    completedAt: terminal ? nowIso() : null,
  });
  await automationAudit(actor, "ai_run.finish", "ai_run", id, { status: input.status }, {}, before.leadId, tool);
  return updated;
}

export async function listAiRuns(filters?: { leadId?: string; skill?: string; status?: string; limit?: number }) {
  return repo().listAiRuns(filters);
}

export async function createProspectingRun(
  input: {
    objective: string;
    icp?: Record<string, unknown>;
    region?: string | null;
    segments?: string[];
    sources?: string[];
    maxCandidates?: number;
  },
  actor: ActorContext,
  tool?: string,
) {
  const item = await repo().createProspectingRun({
    objective: input.objective,
    icp: input.icp ?? {},
    region: input.region ?? null,
    segments: input.segments ?? [],
    sources: input.sources ?? [],
    maxCandidates: input.maxCandidates ?? 50,
    status: "DRAFT",
    aiRunId: null,
    counters: { found: 0, imported: 0, duplicates: 0, rejected: 0 },
    createdByType: actor.type,
    createdById: actor.id,
  });
  await automationAudit(actor, "prospecting_run.create", "prospecting_run", item.id, { objective: item.objective }, {}, null, tool);
  return item;
}

export async function listProspectingRuns(limit = 100) {
  return repo().listProspectingRuns(limit);
}

export async function updateProspectingRun(
  id: string,
  changes: Partial<Pick<import("@/lib/domain/automation").ProspectingRun, "status" | "aiRunId" | "counters">>,
  actor: ActorContext,
  tool?: string,
) {
  const before = await repo().getProspectingRun(id);
  if (!before) throw new DomainError("Prospecting run not found", "PROSPECTING_RUN_NOT_FOUND", 404);
  const updated = await repo().updateProspectingRun(id, changes);
  await automationAudit(actor, "prospecting_run.update", "prospecting_run", id, { changes }, { status: updated?.status }, null, tool);
  return updated;
}

export const SKILL_CATALOG = [
  ["lead-discovery", "A1", "Research public sources, deduplicate and import candidate leads."],
  ["business-enrichment", "A1", "Build a sourced public business profile."],
  ["digital-presence-diagnostic", "A1", "Create a sourced digital presence diagnostic."],
  ["lead-scoring", "A1", "Create a structured score assessment and recommended opportunity."],
  ["sales-prioritization", "A0", "Prioritize the executable sales frontier."],
  ["outreach-copilot", "A0/A2", "Draft truthful outreach from evidence."],
  ["whatsapp-conversation-analysis", "A0", "Analyze read-only WhatsApp conversation history."],
  ["conversation-to-crm", "A1", "Convert conversation findings into CRM state."],
  ["lead-qualification", "A1/A2", "Maintain structured qualification and discovery."],
  ["whatsapp-assisted-outreach", "A2", "Draft and execute only human-approved WhatsApp messages."],
  ["proposal-generation", "A1/A2", "Generate versioned proposals from approved facts and pricing."],
  ["negotiation-copilot", "A0/A2", "Suggest policy-compliant negotiation responses."],
  ["contract-generation", "A1/A2", "Generate contract drafts tied to exact proposal versions."],
  ["contract-obligations", "A1", "Turn signed contracts into executable obligations."],
  ["client-onboarding", "A1/A2", "Build onboarding checklists and client dependency requests."],
  ["follow-up-planner", "A1/A2", "Plan context-aware follow-ups without violating DNC."],
  ["pipeline-review", "A0/A1", "Audit stalled leads, tasks and approval gaps."],
  ["sales-learning", "A0", "Analyze conversion, objections, segments and experiments."],
].map(([id, autonomy, description]) => ({ id, version: "1", autonomy, description }));
