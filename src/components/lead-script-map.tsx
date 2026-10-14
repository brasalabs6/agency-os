"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { ScriptGraph } from "@/lib/domain/script-flow";

interface TrailStep { nodeId: string; edgeId?: string }
interface Props {
  graph: ScriptGraph;
  trail: TrailStep[];
  onSelect: (nodeId: string) => void;
}

/**
 * Read-only projection of the canonical script graph.
 * Node/edge positions and React Flow events are never persisted to the CRM.
 * Cycles are supported: the breadth-first layout visits each node once.
 */
export function LeadScriptMap({ graph, trail, onSelect }: Props) {
  const currentId = trail.at(-1)?.nodeId;
  const exploredNodes = useMemo(() => new Set(trail.map(step => step.nodeId)), [trail]);
  const exploredEdges = useMemo(() => new Set(trail.map(step => step.edgeId).filter(Boolean)), [trail]);

  const { nodes, edges } = useMemo(() => {
    const outgoing = new Map<string, string[]>();
    for (const edge of graph.edges) {
      outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
    }

    const depth = new Map<string, number>();
    if (graph.nodes.some(node => node.id === graph.startNodeId)) {
      depth.set(graph.startNodeId, 0);
      const queue = [graph.startNodeId];
      for (let index = 0; index < queue.length; index += 1) {
        const source = queue[index];
        for (const target of outgoing.get(source) ?? []) {
          if (!depth.has(target)) {
            depth.set(target, (depth.get(source) ?? 0) + 1);
            queue.push(target);
          }
        }
      }
    }

    // Drafts may contain unreachable nodes: display them in a separate column.
    const orphanColumn = Math.max(0, ...depth.values()) + 1;
    const counts = new Map<number, number>();
    const nodes: Node[] = graph.nodes.map(node => {
      const column = depth.get(node.id) ?? orphanColumn;
      const row = counts.get(column) ?? 0;
      counts.set(column, row + 1);
      const selected = node.id === currentId;
      const visited = exploredNodes.has(node.id);

      return {
        id: node.id,
        type: "default",
        position: { x: column * 270, y: row * 140 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: false,
        selectable: true,
        data: {
          label: (
            <span className="block text-left">
              <span className="block text-[10px] uppercase opacity-70">{node.type}</span>
              <span className="block font-semibold">{node.title}</span>
            </span>
          ),
        },
        style: {
          width: 210,
          padding: 12,
          borderRadius: 10,
          border: selected ? "2px solid #2563eb" : visited ? "2px solid #60a5fa" : "1px solid #94a3b8",
          background: selected ? "#dbeafe" : visited ? "#eff6ff" : "#f8fafc",
          color: "#0f172a",
          boxShadow: selected ? "0 0 0 2px #bfdbfe" : undefined,
        },
        ariaLabel: "Examinar nó: " + node.title,
      };
    });

    const edges: Edge[] = graph.edges.map(edge => {
      const active = exploredEdges.has(edge.id);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        label: edge.reaction.label,
        animated: active,
        style: { stroke: active ? "#2563eb" : "#94a3b8", strokeWidth: active ? 3 : 1.5 },
        labelStyle: { fontSize: 11, fill: "#334155" },
        labelBgStyle: { fill: "#f8fafc", fillOpacity: .9 },
        labelBgPadding: [5, 3],
        markerEnd: { type: MarkerType.ArrowClosed, color: active ? "#2563eb" : "#94a3b8" },
      };
    });
    return { nodes, edges };
  }, [graph, currentId, exploredNodes, exploredEdges]);

  return (
    <section className="surface-flat rounded-xl border border-default p-3" aria-label="Mapa de caminhos">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Mapa de caminhos</h3>
        <p className="mt-1 text-xs text-muted">
          Clique num nó para ver o texto. Os caminhos já percorridos ficam destacados.
          Use o mouse, toque ou controles para mover e ampliar o mapa.
        </p>
      </div>
      <div role="group" aria-label="Mapa interativo do roteiro comercial"
        className="h-[480px] w-full overflow-hidden rounded-lg border border-default bg-[var(--panel-2)] sm:h-[540px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          onNodeClick={(_, node) => onSelect(node.id)}
        >
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={node => exploredNodes.has(node.id) ? "#60a5fa" : "#94a3b8"} />
          <Background gap={20} size={1} />
        </ReactFlow>
      </div>
      <p className="mt-2 text-xs text-muted">
        Explorar o grafo não envia mensagens nem registra reações como conversas reais.
      </p>
    </section>
  );
}
