import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type ActorContext, type LeadStatus } from "@/lib/domain/types";
import { requireScope } from "@/lib/auth/mcp-auth";
import {
  addLeadEvidence,
  addLeadNote,
  getLead,
  listActivities,
  markOutcome,
  moveLeadStage,
  recordContact,
  searchLeads,
  setNextAction,
  updateLead,
  upsertLeads,
} from "@/lib/services/leads";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { PIPELINE_GROUPS } from "@/lib/domain/status";

const textResult = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value as Record<string, unknown>,
});

const readAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };

export function buildMcpServer(actor: ActorContext) {
  const server = new McpServer(
    { name: "agencyos-leads", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: "Operate the AgencyOS lead pipeline. Respect DO_NOT_CONTACT, preserve source evidence, and always use domain tools instead of inventing facts." },
  );

  server.registerTool("leads_search", {
    title: "Search leads",
    description: "Search and filter CRM leads. Use this before creating leads to reduce duplicates.",
    annotations: readAnnotations,
    inputSchema: z.object({
      query: z.string().optional(),
      status: z.enum(LEAD_STATUSES).optional(),
      pipelineGroup: z.enum(["inbox", "contact", "qualified", "diagnosis", "proposal", "negotiation", "won"]).optional(),
      segment: z.string().optional(), city: z.string().optional(), opportunity: z.enum(SERVICE_OPPORTUNITIES).optional(),
      ownerId: z.string().uuid().optional(), scoreMin: z.number().int().min(0).max(100).optional(), scoreMax: z.number().int().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(), overdue: z.boolean().optional(), dueToday: z.boolean().optional(), noNextAction: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0),
    }),
  }, async (args) => {
    requireScope(actor, "leads.read");
    return textResult(await searchLeads(args));
  });

  server.registerTool("lead_get", {
    title: "Get lead",
    description: "Get one lead with its timeline and source evidence.", annotations: readAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1) }),
  }, async ({ leadId }) => {
    requireScope(actor, "leads.read");
    return textResult(await getLead(leadId));
  });

  server.registerTool("lead_activity_list", {
    title: "List lead activity",
    description: "Read the chronological activity history for a lead.", annotations: readAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), limit: z.number().int().min(1).max(200).default(100) }),
  }, async ({ leadId, limit }) => {
    requireScope(actor, "leads.read");
    return textResult({ items: await listActivities(leadId, limit) });
  });

  server.registerTool("pipeline_summary", {
    title: "Pipeline summary",
    description: "Return pipeline counts, overdue work, and leads requiring attention.", annotations: readAnnotations,
    inputSchema: z.object({}),
  }, async () => {
    requireScope(actor, "leads.read");
    const summary = await getDashboardSummary();
    return textResult({ ...summary, pipelineGroups: PIPELINE_GROUPS });
  });

  const leadInput = z.object({
    name: z.string().min(2), legalName: z.string().nullable().optional(), segment: z.string().nullable().optional(), city: z.string().nullable().optional(), state: z.string().nullable().optional(),
    website: z.string().url().nullable().optional(), googleMapsUrl: z.string().url().nullable().optional(), instagramUrl: z.string().url().nullable().optional(),
    phone: z.string().nullable().optional(), whatsapp: z.string().nullable().optional(), email: z.string().email().nullable().optional(), contactName: z.string().nullable().optional(), contactRole: z.string().nullable().optional(),
    status: z.enum(LEAD_STATUSES).optional(), score: z.number().int().min(0).max(100).nullable().optional(), scoreReasons: z.array(z.string()).optional(),
    primaryOpportunity: z.enum(SERVICE_OPPORTUNITIES).nullable().optional(), opportunityNotes: z.string().nullable().optional(), ownerId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string()).optional(), sourceType: z.string().nullable().optional(), sourceUrl: z.string().url().nullable().optional(),
    nextAction: z.string().nullable().optional(), nextActionAt: z.string().datetime().nullable().optional(), nextActionOwnerId: z.string().uuid().nullable().optional(),
  });

  server.registerTool("leads_upsert", {
    title: "Upsert researched leads",
    description: "Create or enrich up to 50 leads with deduplication. Ambiguous name+city matches are returned for review instead of being merged.", annotations: writeAnnotations,
    inputSchema: z.object({ leads: z.array(leadInput).min(1).max(50) }),
  }, async ({ leads }) => {
    requireScope(actor, "leads.write");
    return textResult(await upsertLeads(leads, actor, "leads_upsert"));
  });

  server.registerTool("lead_update", {
    title: "Update lead",
    description: "Update explicitly allowed lead fields. Supply expectedVersion when acting on a previously-read lead.", annotations: writeAnnotations,
    inputSchema: z.object({
      leadId: z.string().min(1), expectedVersion: z.number().int().positive().optional(),
      changes: leadInput.partial().omit({ status: true }),
      reason: z.string().max(1000).optional(),
    }),
  }, async ({ leadId, expectedVersion, changes, reason }) => {
    requireScope(actor, "leads.write");
    const result = await updateLead(leadId, { ...changes, expectedVersion }, actor, "lead_update");
    if (reason) await addLeadNote(leadId, `Motivo da atualização: ${reason}`, actor, "lead_update");
    return textResult(result);
  });

  server.registerTool("lead_move_stage", {
    title: "Move lead stage",
    description: "Move a lead through the canonical state machine. Terminal and do-not-contact guards are enforced.", annotations: writeAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), targetStatus: z.enum(LEAD_STATUSES), reason: z.string().max(1000).optional(), expectedVersion: z.number().int().positive().optional() }),
  }, async ({ leadId, targetStatus, reason, expectedVersion }) => {
    requireScope(actor, "leads.write");
    return textResult(await moveLeadStage(leadId, targetStatus as LeadStatus, actor, { reason, expectedVersion, tool: "lead_move_stage" }));
  });

  server.registerTool("lead_add_note", {
    title: "Add lead note", description: "Append a note to a lead timeline.", annotations: writeAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), body: z.string().min(1).max(10000) }),
  }, async ({ leadId, body }) => {
    requireScope(actor, "leads.write");
    return textResult(await addLeadNote(leadId, body, actor, "lead_add_note"));
  });

  server.registerTool("lead_add_evidence", {
    title: "Add source evidence",
    description: "Attach a sourced claim to a lead. Keep facts and inferences explicit and preserve the source URL.", annotations: writeAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), sourceUrl: z.string().url(), sourceType: z.string().nullable().optional(), observedAt: z.string().datetime().nullable().optional(), claim: z.string().min(1), value: z.string().min(1), confidence: z.number().int().min(0).max(100).nullable().optional() }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "leads.write");
    return textResult(await addLeadEvidence(leadId, input, actor, "lead_add_evidence"));
  });

  server.registerTool("lead_set_next_action", {
    title: "Set next action",
    description: "Set the explicit next step for an active lead.", annotations: writeAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), action: z.string().min(1).max(1000), dueAt: z.string().datetime().nullable().optional(), ownerId: z.string().uuid().nullable().optional(), expectedVersion: z.number().int().positive().optional() }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "leads.write");
    return textResult(await setNextAction(leadId, input, actor, "lead_set_next_action"));
  });

  server.registerTool("lead_record_contact", {
    title: "Record contact",
    description: "Record a human outreach outcome. This tool refuses DO_NOT_CONTACT leads.", annotations: writeAnnotations,
    inputSchema: z.object({
      leadId: z.string().min(1), channel: z.enum(["PHONE", "WHATSAPP", "EMAIL", "MEETING", "OTHER"]),
      outcome: z.enum(["REACHED_DECISION_MAKER", "REACHED_STAFF", "NO_ANSWER", "FOLLOW_UP_REQUESTED", "INTERESTED", "NOT_INTERESTED", "WRONG_CONTACT", "OTHER"]),
      summary: z.string().min(1).max(5000), contactedAt: z.string().datetime().optional(), nextAction: z.string().nullable().optional(), nextActionAt: z.string().datetime().nullable().optional(), expectedVersion: z.number().int().positive().optional(),
    }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "leads.write");
    return textResult(await recordContact(leadId, input, actor, "lead_record_contact"));
  });

  server.registerTool("lead_mark_outcome", {
    title: "Mark lead outcome",
    description: "Mark a lead won, lost, nurture, invalid, or do-not-contact with an explicit reason.", annotations: writeAnnotations,
    inputSchema: z.object({ leadId: z.string().min(1), outcome: z.enum(["WON", "LOST", "NURTURE", "INVALID", "DO_NOT_CONTACT"]), reason: z.string().min(1).max(1000), notes: z.string().max(5000).optional(), expectedVersion: z.number().int().positive().optional() }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "leads.write");
    return textResult(await markOutcome(leadId, input, actor, "lead_mark_outcome"));
  });

  return server;
}

export function createMcpHttpHandler(actor: ActorContext) {
  return createMcpHandler(() => buildMcpServer(actor));
}
