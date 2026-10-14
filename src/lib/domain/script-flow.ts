import type { ActorType } from "@/lib/domain/types";

export const SCRIPT_CHANNELS = ["WHATSAPP", "PHONE", "EMAIL", "GENERAL"] as const;
export const SCRIPT_PURPOSES = ["FIRST_CONTACT", "QUALIFICATION", "FOLLOW_UP", "NEGOTIATION", "OTHER"] as const;
export const SCRIPT_NODE_TYPES = ["MESSAGE", "QUESTION", "END"] as const;
export type ScriptChannel = (typeof SCRIPT_CHANNELS)[number];
export type ScriptPurpose = (typeof SCRIPT_PURPOSES)[number];
export type ScriptNodeType = (typeof SCRIPT_NODE_TYPES)[number];

export interface ScriptNode {
  id: string;
  type: ScriptNodeType;
  title: string;
  script: string;
  guidance?: string;
  evidenceIds?: string[];
}
export interface ScriptEdge {
  id: string;
  source: string;
  target: string;
  reaction: { label: string; code?: string };
}
export interface ScriptGraph {
  schemaVersion: 1;
  startNodeId: string;
  nodes: ScriptNode[];
  edges: ScriptEdge[];
}
export interface ConversationScript {
  id: string;
  leadId: string;
  title: string;
  channel: ScriptChannel;
  purpose: ScriptPurpose;
  version: number;
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
export interface ScriptRevision {
  id: string;
  scriptId: string;
  revisionNumber: number;
  baseRevisionId: string | null;
  graph: ScriptGraph;
  changeSummary: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
}
export interface ScriptView {
  script: ConversationScript;
  revision: ScriptRevision | null;
}
export type ScriptPatchOperation =
  | { op: "addNode"; node: ScriptNode }
  | { op: "updateNode"; nodeId: string; changes: Partial<Omit<ScriptNode, "id">> }
  | { op: "removeNode"; nodeId: string }
  | { op: "addEdge"; edge: ScriptEdge }
  | { op: "updateEdge"; edgeId: string; changes: Partial<Omit<ScriptEdge, "id">> }
  | { op: "removeEdge"; edgeId: string }
  | { op: "setStartNode"; nodeId: string };
