import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ActorContext } from "@/lib/domain/types";
import { requireScope } from "@/lib/auth/mcp-auth";
import {
  businessProfileSnapshotSchema,
  diagnosticCreateSchema,
  diagnosticUpdateSchema,
  scoreAssessmentSchema,
  aiRunStartSchema,
  aiRunFinishSchema,
  prospectingRunCreateSchema,
} from "@/lib/validation/automation";
import {
  SKILL_CATALOG,
  createBusinessProfileSnapshot,
  listBusinessProfiles,
  createDiagnostic,
  getDiagnostic,
  listDiagnostics,
  updateDiagnostic,
  finalizeDiagnostic,
  createScoreAssessment,
  listScoreAssessments,
  startAiRun,
  finishAiRun,
  listAiRuns,
  createProspectingRun,
  listProspectingRuns,
  updateProspectingRun,
} from "@/lib/services/intelligence";
import { mcpReadAnnotations, mcpTextResult, mcpWriteAnnotations } from "./helpers";

export function registerIntelligenceTools(server: McpServer, actor: ActorContext) {
  server.registerTool("skills_list", {
    title: "List AgencyOS skills",
    description: "List the supported AI workflow skills, versions and autonomy levels.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({}),
  }, async () => mcpTextResult({ items: SKILL_CATALOG }));

  server.registerTool("business_profile_get", {
    title: "Get business profile",
    description: "Read versioned researched business profile snapshots for one lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "diagnostics.read");
    const items = await listBusinessProfiles(leadId);
    return mcpTextResult({ latest: items[0] ?? null, items });
  });

  server.registerTool("business_profile_snapshot_create", {
    title: "Create business profile snapshot",
    description: "Save a sourced, versioned public business profile. Facts must distinguish FACT, INFERENCE and UNKNOWN.",
    annotations: mcpWriteAnnotations,
    inputSchema: businessProfileSnapshotSchema.extend({ leadId: z.string().uuid() }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "diagnostics.write");
    return mcpTextResult(await createBusinessProfileSnapshot(leadId, input, actor, "business_profile_snapshot_create"));
  });

  server.registerTool("lead_diagnostic_get", {
    title: "Get diagnostic",
    description: "Read one digital presence diagnostic by id.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ diagnosticId: z.string().uuid() }),
  }, async ({ diagnosticId }) => {
    requireScope(actor, "diagnostics.read");
    return mcpTextResult(await getDiagnostic(diagnosticId));
  });

  server.registerTool("lead_diagnostic_list", {
    title: "List lead diagnostics",
    description: "List all diagnostic versions for a lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "diagnostics.read");
    return mcpTextResult({ items: await listDiagnostics(leadId) });
  });

  server.registerTool("lead_diagnostic_create", {
    title: "Create diagnostic",
    description: "Create a structured diagnostic draft with sourced strengths, gaps and recommendations.",
    annotations: mcpWriteAnnotations,
    inputSchema: diagnosticCreateSchema,
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "diagnostics.write");
    return mcpTextResult(await createDiagnostic(leadId, input, actor, "lead_diagnostic_create"));
  });

  server.registerTool("lead_diagnostic_update", {
    title: "Update diagnostic",
    description: "Update a diagnostic draft. Use expectedVersion when editing a previously read version.",
    annotations: mcpWriteAnnotations,
    inputSchema: diagnosticUpdateSchema.extend({ diagnosticId: z.string().uuid() }),
  }, async ({ diagnosticId, expectedVersion, ...changes }) => {
    requireScope(actor, "diagnostics.write");
    return mcpTextResult(await updateDiagnostic(diagnosticId, changes, expectedVersion, actor, "lead_diagnostic_update"));
  });

  server.registerTool("lead_diagnostic_finalize", {
    title: "Finalize diagnostic",
    description: "Render a diagnostic into a READY internal/public artifact. Human approval remains separate.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ diagnosticId: z.string().uuid(), expectedVersion: z.number().int().positive().optional() }),
  }, async ({ diagnosticId, expectedVersion }) => {
    requireScope(actor, "diagnostics.write");
    return mcpTextResult(await finalizeDiagnostic(diagnosticId, expectedVersion, actor, "lead_diagnostic_finalize"));
  });

  server.registerTool("lead_score_assessment_get", {
    title: "Get score assessments",
    description: "Read versioned lead score assessments and their dimension breakdown.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "diagnostics.read");
    return mcpTextResult({ items: await listScoreAssessments(leadId) });
  });

  server.registerTool("lead_score_assessment_create", {
    title: "Create score assessment",
    description: "Create a structured score assessment. Total is computed by AgencyOS and projected to the lead.",
    annotations: mcpWriteAnnotations,
    inputSchema: scoreAssessmentSchema,
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "diagnostics.write");
    return mcpTextResult(await createScoreAssessment(leadId, input, actor, "lead_score_assessment_create"));
  });

  server.registerTool("ai_run_list", {
    title: "List AI workflow runs",
    description: "Read skill execution records without model chain-of-thought.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({
      leadId: z.string().uuid().optional(),
      skill: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }),
  }, async (filters) => {
    requireScope(actor, "ai_runs.read");
    return mcpTextResult({ items: await listAiRuns(filters) });
  });

  server.registerTool("ai_run_start", {
    title: "Start AI workflow run",
    description: "Create an idempotent workflow run ledger entry before executing a skill.",
    annotations: mcpWriteAnnotations,
    inputSchema: aiRunStartSchema,
  }, async (input) => {
    requireScope(actor, "ai_runs.write");
    return mcpTextResult(await startAiRun(input, actor, "ai_run_start"));
  });

  server.registerTool("ai_run_finish", {
    title: "Finish AI workflow run",
    description: "Mark an AI run completed, failed, canceled or waiting for human approval.",
    annotations: mcpWriteAnnotations,
    inputSchema: aiRunFinishSchema.extend({ runId: z.string().uuid() }),
  }, async ({ runId, ...input }) => {
    requireScope(actor, "ai_runs.write");
    return mcpTextResult(await finishAiRun(runId, input, actor, "ai_run_finish"));
  });

  server.registerTool("prospecting_runs_list", {
    title: "List prospecting runs",
    description: "Read research/prospecting batches used to discover leads from the public web.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ limit: z.number().int().min(1).max(200).default(100) }),
  }, async ({ limit }) => {
    requireScope(actor, "prospecting.read");
    return mcpTextResult({ items: await listProspectingRuns(limit) });
  });

  server.registerTool("prospecting_run_create", {
    title: "Create prospecting run",
    description: "Create a research run defining objective, ICP, region, sources and candidate limit.",
    annotations: mcpWriteAnnotations,
    inputSchema: prospectingRunCreateSchema,
  }, async (input) => {
    requireScope(actor, "prospecting.write");
    return mcpTextResult(await createProspectingRun(input, actor, "prospecting_run_create"));
  });

  server.registerTool("prospecting_run_update", {
    title: "Update prospecting run",
    description: "Update run status, linked AI run and counters after discovery/enrichment work.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({
      runId: z.string().uuid(),
      status: z.enum(["DRAFT", "RUNNING", "COMPLETED", "FAILED", "CANCELED"]).optional(),
      aiRunId: z.string().uuid().nullable().optional(),
      counters: z.object({
        found: z.number().int().nonnegative(),
        imported: z.number().int().nonnegative(),
        duplicates: z.number().int().nonnegative(),
        rejected: z.number().int().nonnegative(),
      }).optional(),
    }),
  }, async ({ runId, ...changes }) => {
    requireScope(actor, "prospecting.write");
    return mcpTextResult(await updateProspectingRun(runId, changes, actor, "prospecting_run_update"));
  });
}
