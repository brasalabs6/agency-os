import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ActivityType, ActorType, LeadStatus, ServiceOpportunity, UserRole } from "@/lib/domain/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").$type<UserRole>().notNull().default("MEMBER"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    segment: text("segment"),
    city: text("city"),
    state: text("state"),
    website: text("website"),
    googleMapsUrl: text("google_maps_url"),
    instagramUrl: text("instagram_url"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    contactName: text("contact_name"),
    contactRole: text("contact_role"),
    status: text("status").$type<LeadStatus>().notNull().default("DISCOVERED"),
    score: integer("score"),
    scoreReasons: jsonb("score_reasons").$type<string[]>().notNull().default([]),
    primaryOpportunity: text("primary_opportunity").$type<ServiceOpportunity>(),
    opportunityNotes: text("opportunity_notes"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    sourceType: text("source_type"),
    sourceUrl: text("source_url"),
    nextAction: text("next_action"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    nextActionOwnerId: uuid("next_action_owner_id").references(() => users.id, { onDelete: "set null" }),
    doNotContact: boolean("do_not_contact").notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_status_idx").on(table.status),
    index("leads_score_idx").on(table.score),
    index("leads_city_idx").on(table.city),
    index("leads_next_action_at_idx").on(table.nextActionAt),
    index("leads_updated_at_idx").on(table.updatedAt),
  ],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").$type<ActivityType>().notNull(),
    actorType: text("actor_type").$type<ActorType>().notNull(),
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lead_activities_lead_idx").on(table.leadId), index("lead_activities_created_idx").on(table.createdAt)],
);

export const leadEvidence = pgTable(
  "lead_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    claim: text("claim").notNull(),
    value: text("value").notNull(),
    confidence: integer("confidence"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("lead_evidence_lead_idx").on(table.leadId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").$type<ActorType>().notNull(),
    actorId: text("actor_id").notNull(),
    tool: text("tool"),
    action: text("action").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_logs_lead_idx").on(table.leadId), index("audit_logs_created_idx").on(table.createdAt)],
);
