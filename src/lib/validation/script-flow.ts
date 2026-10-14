import * as z from "zod/v4";
import { DomainError } from "@/lib/domain/errors";
import { SCRIPT_CHANNELS, SCRIPT_NODE_TYPES, SCRIPT_PURPOSES, type ScriptGraph, type ScriptPatchOperation } from "@/lib/domain/script-flow";

const identifier = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
export const scriptNodeSchema = z.strictObject({
  id: identifier,
  type: z.enum(SCRIPT_NODE_TYPES),
  title: z.string().trim().min(1).max(120),
  script: z.string().trim().min(1).max(5000),
  guidance: z.string().max(500).optional(),
  evidenceIds: z.array(z.string().uuid()).max(30).optional(),
});
export const scriptEdgeSchema = z.strictObject({
  id: identifier,
  source: identifier,
  target: identifier,
  reaction: z.strictObject({
    label: z.string().trim().min(1).max(120),
    code: identifier.optional(),
  }),
});
export const scriptGraphSchema = z.strictObject({
  schemaVersion: z.literal(1),
  startNodeId: z.string().max(100),
  nodes: z.array(scriptNodeSchema).max(100),
  edges: z.array(scriptEdgeSchema).max(250),
});
export const scriptMetaSchema = z.strictObject({
  title: z.string().trim().min(1).max(180),
  channel: z.enum(SCRIPT_CHANNELS),
  purpose: z.enum(SCRIPT_PURPOSES),
});
export const createScriptSchema = scriptMetaSchema.extend({
  creationKey: z.string().trim().min(1).max(180),
  graph: scriptGraphSchema,
});
export const replaceScriptSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  graph: scriptGraphSchema,
  summary: z.string().max(500).optional(),
});
const operations = [
  z.strictObject({ op: z.literal("addNode"), node: scriptNodeSchema }),
  z.strictObject({ op: z.literal("updateNode"), nodeId: identifier, changes: scriptNodeSchema.omit({ id: true }).partial() }),
  z.strictObject({ op: z.literal("removeNode"), nodeId: identifier }),
  z.strictObject({ op: z.literal("addEdge"), edge: scriptEdgeSchema }),
  z.strictObject({ op: z.literal("updateEdge"), edgeId: identifier, changes: scriptEdgeSchema.omit({ id: true }).partial() }),
  z.strictObject({ op: z.literal("removeEdge"), edgeId: identifier }),
  z.strictObject({ op: z.literal("setStartNode"), nodeId: identifier }),
] as const;
export const patchScriptSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  operations: z.array(z.discriminatedUnion("op", operations)).min(1).max(100),
  summary: z.string().max(500).optional(),
});
export const publishScriptSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  expectedDraftRevisionId: z.string().uuid(),
});
export const restoreScriptSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  revisionId: z.string().uuid(),
});
export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type ReplaceScriptInput = z.infer<typeof replaceScriptSchema>;
export type PatchScriptInput = z.infer<typeof patchScriptSchema>;

function invalid(message: string): never {
  throw new DomainError(message, "SCRIPT_GRAPH_INVALID", 422);
}
function unique(values: string[]) { return new Set(values).size === values.length; }

export function validateScriptGraph(input: unknown, publish = false): ScriptGraph {
  const parsed = scriptGraphSchema.safeParse(input);
  if (!parsed.success) invalid(parsed.error.issues.map(x => x.path.join(".") + ": " + x.message).slice(0, 10).join("; "));
  const graph = parsed.data;
  if (Buffer.byteLength(JSON.stringify(graph), "utf8") > 1024 * 1024) {
    throw new DomainError("Graph exceeds 1 MiB", "SCRIPT_LIMIT_EXCEEDED", 422);
  }
  if (!unique(graph.nodes.map(x => x.id)) || !unique(graph.edges.map(x => x.id))) invalid("Duplicate node or edge id");
  const nodes = new Map(graph.nodes.map(x => [x.id, x]));
  if ((graph.nodes.length > 0 && !nodes.has(graph.startNodeId)) ||
    (graph.nodes.length === 0 && (graph.startNodeId !== "" || graph.edges.length > 0))) invalid("Invalid start node");
  const outgoing = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  const labels = new Map<string, Set<string>>();
  const codes = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) invalid("Dangling edge: " + edge.id);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    reverse.set(edge.target, [...(reverse.get(edge.target) ?? []), edge.source]);
    const normalized = edge.reaction.label.trim().toLocaleLowerCase("pt-BR");
    const used = labels.get(edge.source) ?? new Set();
    if (used.has(normalized)) invalid("Duplicate reaction for node " + edge.source);
    used.add(normalized); labels.set(edge.source, used);
    if (edge.reaction.code) {
      const seenCodes = codes.get(edge.source) ?? new Set();
      if (seenCodes.has(edge.reaction.code)) invalid("Duplicate reaction code for node " + edge.source);
      seenCodes.add(edge.reaction.code); codes.set(edge.source, seenCodes);
    }
  }
  if (!publish) return graph;
  if (!graph.nodes.length) invalid("Published graph requires nodes");
  const ends = graph.nodes.filter(x => x.type === "END").map(x => x.id);
  if (!ends.length) invalid("Published graph requires an END");
  for (const node of graph.nodes) {
    const count = outgoing.get(node.id)?.length ?? 0;
    if (node.type === "END" && count) invalid("END cannot have outgoing edges: " + node.id);
    if (node.type !== "END" && !count) invalid("Non-END must have outgoing edges: " + node.id);
  }
  function visit(starts: string[], edges: Map<string,string[]>) {
    const seen = new Set<string>();
    const queue = [...starts];
    while (queue.length) {
      const next = queue.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      for (const id of edges.get(next) ?? []) if (!seen.has(id)) queue.push(id);
    }
    return seen;
  }
  const reachable = visit([graph.startNodeId], outgoing);
  if (reachable.size !== graph.nodes.length) invalid("All nodes must be reachable from start");
  const terminating = visit(ends, reverse);
  if (terminating.size !== graph.nodes.length) invalid("Every node must have a possible path to END");
  return graph;
}

export function applyScriptPatch(graph: ScriptGraph, operations: ScriptPatchOperation[]): ScriptGraph {
  const next: ScriptGraph = structuredClone(graph);
  for (const step of operations) {
    switch (step.op) {
      case "addNode":
        next.nodes.push(step.node); break;
      case "updateNode": {
        const node = next.nodes.find(x => x.id === step.nodeId);
        if (!node) invalid("Node not found: " + step.nodeId);
        Object.assign(node, step.changes); break;
      }
      case "removeNode":
        next.nodes = next.nodes.filter(x => x.id !== step.nodeId); break;
      case "addEdge":
        next.edges.push(step.edge); break;
      case "updateEdge": {
        const edge = next.edges.find(x => x.id === step.edgeId);
        if (!edge) invalid("Edge not found: " + step.edgeId);
        Object.assign(edge, step.changes); break;
      }
      case "removeEdge":
        next.edges = next.edges.filter(x => x.id !== step.edgeId); break;
      case "setStartNode":
        next.startNodeId = step.nodeId; break;
    }
  }
  return validateScriptGraph(next);
}
