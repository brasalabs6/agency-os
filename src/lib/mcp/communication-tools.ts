import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { ActorContext } from "@/lib/domain/types";
import { requireScope } from "@/lib/auth/mcp-auth";
import { approvalCreateSchema, whatsappIngestSchema } from "@/lib/validation/automation";
import {
  createApprovalRequest,
  executeApprovedWhatsapp,
  getApproval,
  getConversation,
  ingestWhatsAppConversation,
  linkConversation,
  listApprovals,
  listChannelConnections,
  listConversations,
} from "@/lib/services/communications";
import { mcpReadAnnotations, mcpTextResult, mcpWriteAnnotations } from "./helpers";

export function registerCommunicationTools(server: McpServer, actor: ActorContext) {
  server.registerTool("whatsapp_connections_list", {
    title: "List WhatsApp connections",
    description: "Read configured WhatsApp channel connections and capabilities.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({}),
  }, async () => {
    requireScope(actor, "conversations.read");
    return mcpTextResult({ items: await listChannelConnections() });
  });

  server.registerTool("whatsapp_conversations_list", {
    title: "List WhatsApp conversations",
    description: "List synced WhatsApp conversations, optionally for one lead or connection.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({
      leadId: z.string().uuid().optional(),
      connectionId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }),
  }, async (filters) => {
    requireScope(actor, "conversations.read");
    return mcpTextResult({ items: await listConversations(filters) });
  });

  server.registerTool("whatsapp_conversation_get", {
    title: "Get WhatsApp conversation",
    description: "Read one conversation and its synced messages. This tool never sends messages.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ conversationId: z.string().uuid() }),
  }, async ({ conversationId }) => {
    requireScope(actor, "conversations.read");
    return mcpTextResult(await getConversation(conversationId));
  });

  server.registerTool("whatsapp_messages_list", {
    title: "List WhatsApp messages",
    description: "Read messages for a synced WhatsApp conversation.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ conversationId: z.string().uuid() }),
  }, async ({ conversationId }) => {
    requireScope(actor, "conversations.read");
    const data = await getConversation(conversationId);
    return mcpTextResult({ conversation: data.conversation, items: data.messages });
  });

  server.registerTool("whatsapp_contact_resolve", {
    title: "Resolve WhatsApp contact",
    description: "Find synced conversations matching a WhatsApp/contact address.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ contactAddress: z.string().min(1), limit: z.number().int().min(1).max(200).default(100) }),
  }, async ({ contactAddress, limit }) => {
    requireScope(actor, "conversations.read");
    const items = await listConversations({ limit });
    const normalized = contactAddress.replace(/\D/g, "");
    return mcpTextResult({
      items: items.filter((item) =>
        item.contactAddress.replace(/\D/g, "").includes(normalized) ||
        normalized.includes(item.contactAddress.replace(/\D/g, "")),
      ),
    });
  });

  server.registerTool("whatsapp_conversation_ingest", {
    title: "Ingest WhatsApp conversation",
    description: "Integration-facing upsert for synced conversations/messages. It does not send anything.",
    annotations: mcpWriteAnnotations,
    inputSchema: whatsappIngestSchema,
  }, async (input) => {
    requireScope(actor, "conversations.write");
    return mcpTextResult(await ingestWhatsAppConversation(input, actor, "whatsapp_conversation_ingest"));
  });

  server.registerTool("whatsapp_conversation_link", {
    title: "Link conversation to lead",
    description: "Link a synced WhatsApp conversation to a CRM lead and optionally record opt-out detection.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({
      conversationId: z.string().uuid(),
      leadId: z.string().uuid().nullable(),
      optOutDetected: z.boolean().optional(),
    }),
  }, async ({ conversationId, leadId, optOutDetected }) => {
    requireScope(actor, "conversations.write");
    return mcpTextResult(await linkConversation(conversationId, leadId, optOutDetected, actor));
  });

  server.registerTool("approval_request_create", {
    title: "Request human approval",
    description: "Create a human approval request for an external action. Agents cannot approve their own requests.",
    annotations: mcpWriteAnnotations,
    inputSchema: approvalCreateSchema,
  }, async (input) => {
    requireScope(actor, "approvals.request");
    return mcpTextResult(await createApprovalRequest(input, actor, "approval_request_create"));
  });

  server.registerTool("approval_request_get", {
    title: "Get approval request",
    description: "Read one approval request, policy checks and current status.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({ approvalId: z.string().uuid() }),
  }, async ({ approvalId }) => {
    requireScope(actor, "approvals.read");
    return mcpTextResult(await getApproval(approvalId));
  });

  server.registerTool("approval_request_list", {
    title: "List approval requests",
    description: "List approval requests. Approval/rejection itself is human-only and not exposed here.",
    annotations: mcpReadAnnotations,
    inputSchema: z.object({
      leadId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }),
  }, async (filters) => {
    requireScope(actor, "approvals.read");
    return mcpTextResult({ items: await listApprovals(filters) });
  });

  server.registerTool("whatsapp_message_send_approved", {
    title: "Send approved WhatsApp message",
    description: "Execute only an already human-approved immutable WHATSAPP_SEND request. No raw-send tool exists.",
    annotations: mcpWriteAnnotations,
    inputSchema: z.object({ approvalId: z.string().uuid() }),
  }, async ({ approvalId }) => {
    requireScope(actor, "messages.send.approved");
    return mcpTextResult(await executeApprovedWhatsapp(approvalId, actor, "whatsapp_message_send_approved"));
  });
}
