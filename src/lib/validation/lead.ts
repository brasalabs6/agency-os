import { z } from "zod";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES } from "@/lib/domain/types";

const nullableText = z.string().trim().max(1000).nullable().optional();

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(200),
  legalName: nullableText,
  segment: nullableText,
  city: nullableText,
  state: z.string().trim().max(80).nullable().optional(),
  website: z.string().url().nullable().optional(),
  googleMapsUrl: z.string().url().nullable().optional(),
  instagramUrl: z.string().url().nullable().optional(),
  phone: nullableText,
  whatsapp: nullableText,
  email: z.string().email().nullable().optional(),
  contactName: nullableText,
  contactRole: nullableText,
  status: z.enum(LEAD_STATUSES).optional(),
  score: z.number().int().min(0).max(100).nullable().optional(),
  scoreReasons: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  primaryOpportunity: z.enum(SERVICE_OPPORTUNITIES).nullable().optional(),
  opportunityNotes: z.string().trim().max(5000).nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  sourceType: nullableText,
  sourceUrl: z.string().url().nullable().optional(),
  nextAction: z.string().trim().max(1000).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionOwnerId: z.string().uuid().nullable().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().omit({ status: true }).extend({
  expectedVersion: z.number().int().positive().optional(),
});

export const moveStageSchema = z.object({
  targetStatus: z.enum(LEAD_STATUSES),
  reason: z.string().trim().max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export const addNoteSchema = z.object({ body: z.string().trim().min(1).max(10000) });

export const setNextActionSchema = z.object({
  action: z.string().trim().min(1).max(1000),
  dueAt: z.string().datetime().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export const recordContactSchema = z.object({
  channel: z.enum(["PHONE", "WHATSAPP", "EMAIL", "MEETING", "OTHER"]),
  outcome: z.enum(["REACHED_DECISION_MAKER", "REACHED_STAFF", "NO_ANSWER", "FOLLOW_UP_REQUESTED", "INTERESTED", "NOT_INTERESTED", "WRONG_CONTACT", "OTHER"]),
  summary: z.string().trim().min(1).max(5000),
  contactedAt: z.string().datetime().optional(),
  nextAction: z.string().trim().max(1000).nullable().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export const addEvidenceSchema = z.object({
  sourceUrl: z.string().url(),
  sourceType: z.string().trim().max(100).nullable().optional(),
  observedAt: z.string().datetime().nullable().optional(),
  claim: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(2000),
  confidence: z.number().int().min(0).max(100).nullable().optional(),
});

export const markOutcomeSchema = z.object({
  outcome: z.enum(["WON", "LOST", "NURTURE", "INVALID", "DO_NOT_CONTACT"]),
  reason: z.string().trim().min(1).max(1000),
  notes: z.string().trim().max(5000).optional(),
  expectedVersion: z.number().int().positive().optional(),
});
