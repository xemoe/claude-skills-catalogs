"use client";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Pipeline } from "@/lib/pipeline";

const NODE_W = 218;
const NODE_H = 100;
const GAP_X = 76;
const GAP_Y = 60;
/** Members per row before the pipeline wraps to a new (reversed) row. */
const ROW_MAX = 5;
const ACCENT = "#0e7490";

const HANDLE_STYLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: "none",
  background: "transparent",
};

interface StepData {
  index: number;
  total: number;
  title: string;
  detail: string;
  [key: string]: unknown;
}

function StepNode({ data }: NodeProps) {
  const d = data as StepData;

  return (
    <div
      className="flex items-stretch gap-2.5 border bg-card px-3 py-2.5 shadow-sm"
      style={{ width: NODE_W, height: NODE_H }}
      title={d.detail ? `${d.title} — ${d.detail}` : d.title}
    >
      <Handle id="tL" type="target" position={Position.Left} isConnectable={false} style={HANDLE_STYLE} />
      <Handle id="tR" type="target" position={Position.Right} isConnectable={false} style={HANDLE_STYLE} />
      <Handle id="tT" type="target" position={Position.Top} isConnectable={false} style={HANDLE_STYLE} />
      <Handle id="sL" type="source" position={Position.Left} isConnectable={false} style={HANDLE_STYLE} />
      <Handle id="sR" type="source" position={Position.Right} isConnectable={false} style={HANDLE_STYLE} />
      <Handle id="sB" type="source" position={Position.Bottom} isConnectable={false} style={HANDLE_STYLE} />
      <div className="flex flex-col items-center gap-1">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#0e7490] text-xs font-bold text-white">
          {d.index}
        </span>
        <span className="w-px flex-1 bg-border" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
          {d.title}
        </p>
        {d.detail && (
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
            {d.detail}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
        {d.index}/{d.total}
      </span>
    </div>
  );
}

const NODE_TYPES = { step: StepNode };

function rowCount(total: number): number {
  return Math.max(1, Math.ceil(total / ROW_MAX));
}

/** Lays the steps out as a left-right snake so every node stays readable. */
function buildFlow(pipeline: Pipeline): { nodes: Node[]; edges: Edge[] } {
  const total = pipeline.steps.length;
  const rows = rowCount(total);
  const cols = Math.max(1, Math.ceil(total / rows));

  const place = (i: number) => {
    const row = Math.floor(i / cols);
    const posInRow = i % cols;
    const col = row % 2 === 0 ? posInRow : cols - 1 - posInRow;
    return { row, x: col * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) };
  };

  const nodes: Node[] = pipeline.steps.map((step, i) => {
    const p = place(i);
    return {
      id: `step-${i}`,
      type: "step",
      position: { x: p.x, y: p.y },
      data: { index: step.index, total, title: step.title, detail: step.detail },
      width: NODE_W,
      height: NODE_H,
    };
  });

  const edges: Edge[] = [];
  for (let i = 0; i < total - 1; i++) {
    const from = place(i);
    const to = place(i + 1);
    let sourceHandle: string;
    let targetHandle: string;
    if (from.row === to.row) {
      // Even rows flow left-to-right, odd rows right-to-left.
      [sourceHandle, targetHandle] =
        from.row % 2 === 0 ? ["sR", "tL"] : ["sL", "tR"];
    } else {
      [sourceHandle, targetHandle] = ["sB", "tT"];
    }
    edges.push({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      sourceHandle,
      targetHandle,
      type: "smoothstep",
      animated: true,
      style: { stroke: ACCENT, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: ACCENT, width: 16, height: 16 },
    });
  }

  return { nodes, edges };
}

export function NodePipeline({ pipeline }: { pipeline: Pipeline }) {
  // React Flow measures the DOM, so it is mounted client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const flow = useMemo(() => buildFlow(pipeline), [pipeline]);
  const rows = rowCount(pipeline.steps.length);
  const height = rows === 1 ? 248 : rows === 2 ? 392 : 470;

  return (
    <div
      className="w-full border bg-muted/30 ring-1 ring-foreground/10"
      style={{ height }}
    >
      {mounted ? (
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          maxZoom={1.4}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading pipeline…
        </div>
      )}
    </div>
  );
}
