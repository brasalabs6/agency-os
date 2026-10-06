import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ActivityType, ActorType, LeadStatus, LeadTaskPriority, LeadTaskStatus, LeadTaskType, ServiceOpportunity, UserRole } from "@/lib/domain/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").$type<UserRole>().notNull().default("MEMBER"),
  passwordHash: text("password_hash"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("user_sessions_user_idx").on(table.userId),
  index("user_sessions_expires_idx").on(table.expiresAt),
  index("user_sessions_revoked_idx").on(table.revokedAt),
]);

export const mcpCredentials = pgTable("mcp_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenPrefix: text("token_prefix").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default(["leads.read", "leads.write"]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (table) => [
  index("mcp_credentials_user_idx").on(table.userId),
  index("mcp_credentials_active_idx").on(table.active),
  index("mcp_credentials_revoked_idx").on(table.revokedAt),
  index("mcp_credentials_expires_idx").on(table.expiresAt),
]);

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

export const leadTasks = pgTable(
  "lead_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").$type<LeadTaskType>().notNull().default("TASK"),
    status: text("status").$type<LeadTaskStatus>().notNull().default("TODO"),
    priority: text("priority").$type<LeadTaskPriority>().notNull().default("MEDIUM"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdByType: text("created_by_type").$type<ActorType>().notNull(),
    createdById: text("created_by_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("lead_tasks_lead_idx").on(table.leadId),
    index("lead_tasks_status_idx").on(table.status),
    index("lead_tasks_owner_idx").on(table.ownerId),
    index("lead_tasks_due_idx").on(table.dueAt),
    index("lead_tasks_start_idx").on(table.startAt),
    index("lead_tasks_end_idx").on(table.endAt),
    index("lead_tasks_owner_status_due_idx").on(table.ownerId, table.status, table.dueAt),
    index("lead_tasks_lead_status_idx").on(table.leadId, table.status),
    check("lead_tasks_event_pair", sql`(${table.startAt} IS NULL) = (${table.endAt} IS NULL)`),
    check("lead_tasks_event_order", sql`${table.endAt} IS NULL OR ${table.endAt} >= ${table.startAt}`),
    check("lead_tasks_done_completed", sql`${table.status} <> 'DONE' OR ${table.completedAt} IS NOT NULL`),
    check("lead_tasks_canceled_at", sql`${table.status} <> 'CANCELED' OR ${table.canceledAt} IS NOT NULL`),
  ],
);
