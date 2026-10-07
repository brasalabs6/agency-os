import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ActorContext } from "@/lib/domain/types";
import { requireScope } from "@/lib/auth/mcp-auth";
import {
  contractCreateSchema,
  contractUpdateSchema,
  proposalCreateSchema,
  proposalUpdateSchema,
  qualificationSchema,
} from "@/lib/validation/automation";
import {
  createContractFromProposal,
  createProposal,
  executeApprovedContract,
  executeApprovedProposal,
  getContract,
  getProposal,
  getQualification,
  listContracts,
  listProposals,
  markProposalResponse,
  requestContractApproval,
  requestProposalApproval,
  updateContractDraft,
  updateProposal,
  upsertQualification,
} from "@/lib/services/sales-automation";
import { createProjectFromSignedContract, listProjects, updateProjectObligation } from "@/lib/services/client-projects";
import { mcpReadAnnotations, mcpTextResult, mcpWriteAnnotations } from "./helpers";

export function registerSalesAutomationTools(server: McpServer, actor: ActorContext) {
  server.registerTool("lead_qualification_get", {
    title: "Get lead qualification",
    description: "Read structured discovery/qualification for a lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "leads.read");
    return mcpTextResult(await getQualification(leadId));
  });

  server.registerTool("lead_qualification_update", {
    title: "Update lead qualification",
    description: "Save structured discovery facts, unknowns, decision makers, constraints and service fit.",
    annotations: mcpWriteAnnotations,
    inputSchema: qualificationSchema.extend({ leadId: z.string().uuid() }),
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "leads.write");
    return mcpTextResult(await upsertQualification(leadId, input, actor, "lead_qualification_update"));
  });

  server.registerTool("proposal_list", {
    title: "List proposals",
    description: "List versioned proposals for a lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "proposals.read");
    return mcpTextResult({ items: await listProposals(leadId) });
  });

  server.registerTool("proposal_get", {
    title: "Get proposal",
    description: "Read one versioned proposal.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ proposalId: z.string().uuid() }),
  }, async ({ proposalId }) => {
    requireScope(actor, "proposals.read");
    return mcpTextResult(await getProposal(proposalId));
  });

  server.registerTool("proposal_create", {
    title: "Create proposal",
    description: "Create a proposal draft from approved facts. Pricing may remain HUMAN_REQUIRED.",
    annotations: mcpWriteAnnotations,
    inputSchema: proposalCreateSchema,
  }, async ({ leadId, ...input }) => {
    requireScope(actor, "proposals.write");
    return mcpTextResult(await createProposal(leadId, input, actor, "proposal_create"));
  });

  server.registerTool("proposal_update", {
    title: "Update proposal",
    description: "Update a proposal draft using optimistic concurrency.",
    annotations: mcpWriteAnnotations,
    inputSchema: proposalUpdateSchema.extend({ proposalId: z.string().uuid() }),
  }, async ({ proposalId, expectedVersion, ...changes }) => {
    requireScope(actor, "proposals.write");
    return mcpTextResult(await updateProposal(proposalId, changes, expectedVersion, actor, "proposal_update"));
  });

  server.registerTool("proposal_request_approval", {
    title: "Request proposal send approval",
    description: "Create a human approval request before sending a priced proposal.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ proposalId: z.string().uuid() }),
  }, async ({ proposalId }) => {
    requireScope(actor, "approvals.request");
    return mcpTextResult(await requestProposalApproval(proposalId, actor, "proposal_request_approval"));
  });

  server.registerTool("proposal_send_approved", {
    title: "Send approved proposal",
    description: "Mark/send only the exact proposal version covered by an approved human request.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ approvalId: z.string().uuid() }),
  }, async ({ approvalId }) => {
    requireScope(actor, "proposals.send.approved");
    return mcpTextResult(await executeApprovedProposal(approvalId, actor, "proposal_send_approved"));
  });

  server.registerTool("proposal_mark_response", {
    title: "Record proposal response",
    description: "Record ACCEPTED or REJECTED response and advance workflow where appropriate.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({
      proposalId: z.string().uuid(),
      status: z.enum(["ACCEPTED", "REJECTED"]),
      notes: z.string().max(5000).optional(),
    }),
  }, async ({ proposalId, status, notes }) => {
    requireScope(actor, "proposals.write");
    return mcpTextResult(await markProposalResponse(proposalId, status, notes, actor, "proposal_mark_response"));
  });

  server.registerTool("contract_list", {
    title: "List contracts",
    description: "List versioned contracts for a lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "contracts.read");
    return mcpTextResult({ items: await listContracts(leadId) });
  });

  server.registerTool("contract_get", {
    title: "Get contract",
    description: "Read one contract and its signature/approval state.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ contractId: z.string().uuid() }),
  }, async ({ contractId }) => {
    requireScope(actor, "contracts.read");
    return mcpTextResult(await getContract(contractId));
  });

  server.registerTool("contract_create_from_proposal", {
    title: "Create contract from proposal",
    description: "Create a contract draft tied to an exact proposal version.",
    annotations: mcpWriteAnnotations,
    inputSchema: contractCreateSchema,
  }, async ({ proposalId, ...input }) => {
    requireScope(actor, "contracts.draft");
    return mcpTextResult(await createContractFromProposal(proposalId, input, actor, "contract_create_from_proposal"));
  });

  server.registerTool("contract_update_draft", {
    title: "Update contract draft",
    description: "Edit only DRAFT/PENDING_REVIEW contract versions.",
    annotations: mcpWriteAnnotations,
    inputSchema: contractUpdateSchema.extend({ contractId: z.string().uuid() }),
  }, async ({ contractId, expectedVersion, ...changes }) => {
    requireScope(actor, "contracts.draft");
    return mcpTextResult(await updateContractDraft(contractId, changes, expectedVersion, actor, "contract_update_draft"));
  });

  server.registerTool("contract_request_approval", {
    title: "Request contract send approval",
    description: "Create mandatory human/legal review request before contract send.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ contractId: z.string().uuid() }),
  }, async ({ contractId }) => {
    requireScope(actor, "approvals.request");
    return mcpTextResult(await requestContractApproval(contractId, actor, "contract_request_approval"));
  });

  server.registerTool("contract_send_approved", {
    title: "Send approved contract",
    description: "Execute only a human-approved exact contract version.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ approvalId: z.string().uuid() }),
  }, async ({ approvalId }) => {
    requireScope(actor, "contracts.send.approved");
    return mcpTextResult(await executeApprovedContract(approvalId, actor, "contract_send_approved"));
  });

  server.registerTool("client_projects_list", {
    title: "List client projects",
    description: "List projects and contract-derived obligations for a lead.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ leadId: z.string().uuid() }),
  }, async ({ leadId }) => {
    requireScope(actor, "projects.read");
    return mcpTextResult({ items: await listProjects(leadId) });
  });

  server.registerTool("project_create_from_contract", {
    title: "Create project from signed contract",
    description: "Create one client project and obligations only from a SIGNED contract.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({
      contractId: z.string().uuid(),
      name: z.string().max(500).optional(),
      ownerUserId: z.string().uuid().nullable().optional(),
      targetAt: z.string().datetime().nullable().optional(),
    }),
  }, async ({ contractId, ...input }) => {
    requireScope(actor, "projects.write");
    return mcpTextResult(await createProjectFromSignedContract(contractId, input, actor, "project_create_from_contract"));
  });

  server.registerTool("project_obligation_update", {
    title: "Update project obligation",
    description: "Update status/date/notes of a contract-derived project obligation.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({
      obligationId: z.string().uuid(),
      status: z.enum(["TODO", "DOING", "WAITING", "DONE", "CANCELED"]).optional(),
      dueAt: z.string().datetime().nullable().optional(),
      description: z.string().max(10000).nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  }, async ({ obligationId, ...changes }) => {
    requireScope(actor, "projects.write");
    return mcpTextResult(await updateProjectObligation(obligationId, changes, actor, "project_obligation_update"));
  });
}
