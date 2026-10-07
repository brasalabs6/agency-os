import * as z from "zod/v4";
import { APPROVAL_ACTION_TYPES, DIAGNOSTIC_STATUSES } from "@/lib/domain/automation";
import { SERVICE_OPPORTUNITIES } from "@/lib/domain/types";

export const profileFactSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().min(1).max(10000),
  classification: z.enum(["FACT", "INFERENCE", "UNKNOWN"]),
  sourceUrl: z.string().url().nullable().optional(),
  observedAt: z.string().datetime().nullable().optional(),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
});

export const businessProfileSnapshotSchema = z.object({
  identity: z.record(z.string(), z.unknown()).default({}),
  contacts: z.record(z.string(), z.unknown()).default({}),
  businessSignals: z.record(z.string(), z.unknown()).default({}),
  competition: z.array(z.record(z.string(), z.unknown())).default([]),
  facts: z.array(profileFactSchema).default([]),
});

export const diagnosticFindingSchema = z.object({
  dimension: z.string().min(1).max(120),
  severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  title: z.string().min(1).max(300),
  explanation: z.string().min(1).max(10000),
  evidenceIds: z.array(z.string()).default([]),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
  publicSafe: z.boolean().default(false),
});

export const diagnosticRecommendationSchema = z.object({
  service: z.enum(SERVICE_OPPORTUNITIES),
  rationale: z.string().min(1).max(5000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const diagnosticCreateSchema = z.object({
  leadId: z.string().uuid(),
  businessProfileId: z.string().uuid().nullable().optional(),
  executiveSummary: z.string().max(20000).optional(),
  strengths: z.array(diagnosticFindingSchema).default([]),
  gaps: z.array(diagnosticFindingSchema).default([]),
  recommendations: z.array(diagnosticRecommendationSchema).default([]),
  scores: z.record(z.string(), z.number().min(0).max(100)).default({}),
  recommendedServices: z.array(z.string()).default([]),
  internalNotes: z.string().max(20000).nullable().optional(),
  publicSummary: z.string().max(20000).nullable().optional(),
});

export const diagnosticUpdateSchema = diagnosticCreateSchema
  .omit({ leadId: true, businessProfileId: true })
  .partial()
  .extend({ expectedVersion: z.number().int().positive().optional() });

export const scoreAssessmentSchema = z.object({
  leadId: z.string().uuid(),
  diagnosticId: z.string().uuid().nullable().optional(),
  digitalGap: z.number().int().min(0).max(25),
  economicPotential: z.number().int().min(0).max(20),
  contactability: z.number().int().min(0).max(15),
  urgency: z.number().int().min(0).max(15),
  serviceFit: z.number().int().min(0).max(15),
  proofPotential: z.number().int().min(0).max(10),
  confidence: z.number().int().min(0).max(100),
  reasons: z.array(z.string().max(1000)).default([]),
  recommendedService: z.string().max(100).nullable().optional(),
});

export const aiRunStartSchema = z.object({
  skill: z.string().min(1).max(200),
  skillVersion: z.string().min(1).max(80).default("1"),
  leadId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().max(300).nullable().optional(),
  inputSummary: z.record(z.string(), z.unknown()).default({}),
});

export const aiRunFinishSchema = z.object({
  status: z.enum(["COMPLETED", "FAILED", "CANCELED", "WAITING_APPROVAL"]),
  outputSummary: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().max(200).nullable().optional(),
  errorMessage: z.string().max(5000).nullable().optional(),
});

export const prospectingRunCreateSchema = z.object({
  objective: z.string().min(1).max(5000),
  icp: z.record(z.string(), z.unknown()).default({}),
  region: z.string().max(300).nullable().optional(),
  segments: z.array(z.string().max(200)).default([]),
  sources: z.array(z.string().max(300)).default([]),
  maxCandidates: z.number().int().min(1).max(500).default(50),
});

export const channelConnectionCreateSchema = z.object({
  accountLabel: z.string().min(1).max(200),
  ownerUserId: z.string().uuid().nullable().optional(),
  externalAccountId: z.string().max(500).nullable().optional(),
  capabilities: z.array(z.enum(["READ", "SEND"])).default(["READ"]),
});

export const whatsappIngestSchema = z.object({
  connectionId: z.string().uuid(),
  externalId: z.string().min(1).max(1000),
  leadId: z.string().uuid().nullable().optional(),
  contactAddress: z.string().min(1).max(500),
  contactDisplayName: z.string().max(500).nullable().optional(),
  optOutDetected: z.boolean().optional(),
  messages: z.array(z.object({
    externalId: z.string().min(1).max(1000),
    direction: z.enum(["INBOUND", "OUTBOUND"]),
    sentAt: z.string().datetime(),
    sender: z.string().min(1).max(500),
    text: z.string().max(100000).nullable().optional(),
    mediaType: z.string().max(200).nullable().optional(),
    deliveryStatus: z.string().max(200).nullable().optional(),
    rawMetadata: z.record(z.string(), z.unknown()).default({}),
  })).max(1000),
});

export const approvalCreateSchema = z.object({
  leadId: z.string().uuid().nullable().optional(),
  actionType: z.enum(APPROVAL_ACTION_TYPES),
  payload: z.record(z.string(), z.unknown()),
  preview: z.string().min(1).max(100000),
  rationale: z.string().max(10000).nullable().optional(),
  policyChecks: z.array(z.object({
    id: z.string().min(1).max(200),
    passed: z.boolean(),
    message: z.string().min(1).max(2000),
  })).default([]),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const approvalDecisionSchema = z.object({
  expectedVersion: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  preview: z.string().max(100000).optional(),
});

export const qualificationSchema = z.object({
  decisionMakers: z.array(z.string().max(500)).default([]),
  problemStatements: z.array(z.string().max(5000)).default([]),
  desiredOutcome: z.string().max(10000).nullable().optional(),
  currentProcess: z.string().max(20000).nullable().optional(),
  urgency: z.string().max(5000).nullable().optional(),
  explicitBudgetStatement: z.string().max(5000).nullable().optional(),
  timeline: z.string().max(5000).nullable().optional(),
  constraints: z.array(z.string().max(5000)).default([]),
  technicalDependencies: z.array(z.string().max(5000)).default([]),
  unansweredQuestions: z.array(z.string().max(5000)).default([]),
  riskFlags: z.array(z.string().max(5000)).default([]),
  serviceFit: z.array(z.string().max(500)).default([]),
});

export const proposalCreateSchema = z.object({
  leadId: z.string().uuid(),
  diagnosticId: z.string().uuid().nullable().optional(),
  qualificationId: z.string().uuid().nullable().optional(),
  services: z.array(z.string().max(200)).min(1),
  scope: z.array(z.string().max(5000)).default([]),
  exclusions: z.array(z.string().max(5000)).default([]),
  assumptions: z.array(z.string().max(5000)).default([]),
  clientDependencies: z.array(z.string().max(5000)).default([]),
  milestones: z.array(z.record(z.string(), z.unknown())).default([]),
  agencyFeeCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).default("BRL"),
  externalCosts: z.array(z.record(z.string(), z.unknown())).default([]),
  paymentTerms: z.string().max(10000).nullable().optional(),
  validityUntil: z.string().datetime().nullable().optional(),
});

export const proposalUpdateSchema = proposalCreateSchema
  .omit({ leadId: true })
  .partial()
  .extend({ expectedVersion: z.number().int().positive().optional() });

export const contractCreateSchema = z.object({
  proposalId: z.string().uuid(),
  templateId: z.string().min(1).max(300),
  templateVersion: z.string().min(1).max(100),
  parties: z.record(z.string(), z.unknown()).default({}),
  terms: z.record(z.string(), z.unknown()).default({}),
  responsibilitiesAgency: z.array(z.string().max(5000)).optional(),
  responsibilitiesClient: z.array(z.string().max(5000)).optional(),
  paymentObligations: z.array(z.record(z.string(), z.unknown())).default([]),
  deliverables: z.array(z.string().max(5000)).optional(),
  supportObligations: z.array(z.string().max(5000)).default([]),
});

export const contractUpdateSchema = contractCreateSchema
  .omit({ proposalId: true, templateId: true, templateVersion: true })
  .partial()
  .extend({ expectedVersion: z.number().int().positive().optional() });

export const contractSignatureSchema = z.object({
  status: z.enum(["SIGNED", "DECLINED"]),
  signatureProvider: z.string().max(200).nullable().optional(),
  externalSignatureId: z.string().max(500).nullable().optional(),
  signedArtifactRef: z.string().max(2000).nullable().optional(),
  signedAt: z.string().datetime().nullable().optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().max(500).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  targetAt: z.string().datetime().nullable().optional(),
});

export const obligationUpdateSchema = z.object({
  status: z.enum(["TODO", "DOING", "WAITING", "DONE", "CANCELED"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const diagnosticStatusSchema = z.enum(DIAGNOSTIC_STATUSES);
