"use client";

import "@xyflow/react/dist/style.css";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BaseEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  getStraightPath,
  useEdgesState,
  useInternalNode,
  useNodesState,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { FileText, FolderGit2, HardDrive, Package, Terminal, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/count-badge";
import { cn } from "@/lib/utils";
import type {
  RelationCluster,
  RelationClusterKind,
  RelationGraph,
  RelationNode,
} from "@/lib/relations";

// ---- geometry constants ----------------------------------------------------

const ENT_W = 188;
const ENT_H = 60;
const HUB_W = 184;
const HUB_H = 58;

const REFERENCE_COLOR = "#0e7490";
const MEMBERSHIP_COLOR = "#cbd5e1";

const HANDLE_STYLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 1,
  minHeight: 1,
  border: "none",
  background: "transparent",
};

const CLUSTER_META: Record<
  RelationClusterKind,
  { icon: typeof Package; border: string; text: string; bg: string; hex: string }
> = {
  plugin: {
    icon: Package,
    border: "border-purple-400",
    text: "text-purple-700",
    bg: "bg-purple-50",
    hex: "#a855f7",
  },
  project: {
    icon: FolderGit2,
    border: "border-green-400",
    text: "text-green-700",
    bg: "bg-green-50",
    hex: "#22c55e",
  },
  personal: {
    icon: User,
    border: "border-blue-400",
    text: "text-blue-700",
    bg: "bg-blue-50",
    hex: "#3b82f6",
  },
  local: {
    icon: HardDrive,
    border: "border-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
    hex: "#94a3b8",
  },
};

// ---- hover context ---------------------------------------------------------

interface HoverState {
  hovered: string | null;
  related: Set<string>;
}

const HoverContext = createContext<HoverState>({ hovered: null, related: new Set() });

/** Resolves how a node/edge endpoint should render given the current hover. */
function useHoverFlags(id: string) {
  const { hovered, related } = useContext(HoverContext);
  if (hovered === null) return { faded: false, active: false };
  const active = id === hovered || related.has(id);
  return { faded: !active, active };
}

// ---- node data -------------------------------------------------------------

interface EntityData {
  kind: "skill" | "command";
  label: string;
  description: string;
  variant: RelationClusterKind;
  href: string;
  references: number;
  [key: string]: unknown;
}

interface HubData {
  kind: RelationClusterKind;
  label: string;
  count: number;
  [key: string]: unknown;
}

// ---- custom nodes ----------------------------------------------------------

function EntityNode({ id, data }: NodeProps) {
  const d = data as EntityData;
  const { faded, active } = useHoverFlags(id);
  const meta = CLUSTER_META[d.variant];
  const Icon = d.kind === "command" ? Terminal : FileText;

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col justify-center gap-0.5 border bg-card px-2.5 transition-all",
        meta.border,
        active && "shadow-md ring-2 ring-offset-1 ring-[#0e7490]",
        faded ? "opacity-15" : "opacity-100",
      )}
      style={{ width: ENT_W, height: ENT_H }}
      title={`${d.label} — ${d.description}`}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={HANDLE_STYLE} />
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.text)} />
        <span
          className={cn(
            "truncate text-xs font-semibold text-foreground",
            d.kind === "command" && "font-mono",
          )}
        >
          {d.label}
        </span>
        {d.references > 0 && (
          <span
            className="ml-auto shrink-0 rounded-none bg-[#0e7490] px-1 text-[10px] font-semibold leading-tight text-white"
            title={`Linked to ${d.references} other ${d.references === 1 ? "item" : "items"}`}
          >
            {d.references}
          </span>
        )}
      </div>
      <p className="truncate text-[10px] leading-tight text-muted-foreground">{d.description}</p>
    </div>
  );
}

function HubNode({ id, data }: NodeProps) {
  const d = data as HubData;
  const { faded } = useHoverFlags(id);
  const meta = CLUSTER_META[d.kind];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-2 px-3 shadow-sm transition-all",
        meta.border,
        meta.bg,
        faded ? "opacity-20" : "opacity-100",
      )}
      style={{ width: HUB_W, height: HUB_H }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={HANDLE_STYLE} />
      <span
        className={cn("flex h-9 w-9 shrink-0 items-center justify-center border bg-card", meta.border)}
      >
        <Icon className={cn("h-4 w-4", meta.text)} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{d.label}</p>
        <p className={cn("text-[10px] font-medium uppercase tracking-wide", meta.text)}>
          {d.kind} · {d.count} {d.count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}

const NODE_TYPES = { entity: EntityNode, hub: HubNode };

// ---- floating edge ---------------------------------------------------------

/** Point where the line from a node's centre crosses its border, toward `other`. */
function getNodeIntersection(node: InternalNode, other: InternalNode) {
  const w = (node.measured?.width ?? 0) / 2;
  const h = (node.measured?.height ?? 0) / 2;
  const x2 = node.internals.positionAbsolute.x + w;
  const y2 = node.internals.positionAbsolute.y + h;
  const x1 = other.internals.positionAbsolute.x + (other.measured?.width ?? 0) / 2;
  const y1 = other.internals.positionAbsolute.y + (other.measured?.height ?? 0) / 2;
  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (yy3 - xx3) + y2 };
}

function FloatingEdge({ source, target, markerEnd, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const { hovered } = useContext(HoverContext);

  if (!sourceNode || !targetNode) return null;
  if (!sourceNode.measured?.width || !targetNode.measured?.width) return null;

  const sp = getNodeIntersection(sourceNode, targetNode);
  const tp = getNodeIntersection(targetNode, sourceNode);
  const [path] = getStraightPath({
    sourceX: sp.x,
    sourceY: sp.y,
    targetX: tp.x,
    targetY: tp.y,
  });

  const isReference = (data as { kind?: string } | undefined)?.kind === "reference";
  const touches = hovered !== null && (source === hovered || target === hovered);
  const faded = hovered !== null && !touches;

  return (
    <BaseEdge
      path={path}
      markerEnd={isReference ? markerEnd : undefined}
      style={{
        stroke: isReference ? REFERENCE_COLOR : MEMBERSHIP_COLOR,
        strokeWidth: isReference ? (touches ? 2.6 : 1.7) : 1,
        opacity: faded ? (isReference ? 0.06 : 0.04) : isReference ? 0.85 : 0.5,
      }}
    />
  );
}

const EDGE_TYPES = { floating: FloatingEdge };

// ---- layout ----------------------------------------------------------------

const RING_BASE = 210;
const RING_GAP = 180;
const RING_CAP = 12;
const CELL_GAP = 76;
/** Min edge-to-edge spacing between two member nodes sharing a ring. */
const ARC_GAP = 46;

/** Lays clusters out as a grid of radial constellations: a hub ringed by its members. */
function computeLayout(graph: RelationGraph): { nodes: Node[]; edges: Edge[] } {
  const byCluster = new Map<string, RelationNode[]>();
  for (const n of graph.nodes) {
    const arr = byCluster.get(n.clusterId);
    if (arr) arr.push(n);
    else byCluster.set(n.clusterId, [n]);
  }

  interface Cell {
    cluster: RelationCluster;
    members: RelationNode[];
    rings: number[];
    radii: number[];
    half: number;
  }

  const cells: Cell[] = graph.clusters.map((cluster) => {
    const members = byCluster.get(cluster.id) ?? [];
    const ringCount = Math.max(1, Math.ceil(members.length / RING_CAP));
    const rings = new Array<number>(ringCount).fill(0);
    members.forEach((_, i) => {
      rings[i % ringCount]++;
    });
    // Each ring is wide enough that its members never overlap, and always
    // larger than the ring inside it.
    const radii: number[] = [];
    let prev = 0;
    for (let r = 0; r < ringCount; r++) {
      const minRadius = (rings[r] * (ENT_W + ARC_GAP)) / (2 * Math.PI);
      const radius =
        r === 0 ? Math.max(RING_BASE, minRadius) : Math.max(prev + RING_GAP, minRadius);
      radii.push(radius);
      prev = radius;
    }
    const half = radii[radii.length - 1] + ENT_W / 2 + 30;
    return { cluster, members, rings, radii, half };
  });

  const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(cells.length))));
  const nodes: Node[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let col = 0;

  for (const cell of cells) {
    if (col >= cols) {
      cursorX = 0;
      cursorY += rowHeight + CELL_GAP;
      rowHeight = 0;
      col = 0;
    }
    const size = cell.half * 2;
    const hubX = cursorX + cell.half;
    const hubY = cursorY + cell.half;

    nodes.push({
      id: cell.cluster.id,
      type: "hub",
      position: { x: hubX - HUB_W / 2, y: hubY - HUB_H / 2 },
      data: { kind: cell.cluster.kind, label: cell.cluster.label, count: cell.members.length },
      width: HUB_W,
      height: HUB_H,
    });

    let index = 0;
    cell.rings.forEach((count, ring) => {
      const radius = cell.radii[ring];
      const rotation = ring * 0.6;
      for (let k = 0; k < count; k++) {
        const member = cell.members[index++];
        const angle = -Math.PI / 2 + (k / count) * Math.PI * 2 + rotation;
        const cx = hubX + Math.cos(angle) * radius;
        const cy = hubY + Math.sin(angle) * radius;
        nodes.push({
          id: member.id,
          type: "entity",
          position: { x: cx - ENT_W / 2, y: cy - ENT_H / 2 },
          data: {
            kind: member.kind,
            label: member.label,
            description: member.description,
            variant: member.variant,
            href: member.href,
            references: member.references,
          },
          width: ENT_W,
          height: ENT_H,
        });
      }
    });

    cursorX += size + CELL_GAP;
    rowHeight = Math.max(rowHeight, size);
    col++;
  }

  const edges: Edge[] = graph.edges.map((e) => {
    const isReference = e.kind === "reference";
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: "floating",
      animated: isReference,
      data: { kind: e.kind },
      ...(isReference
        ? {
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: REFERENCE_COLOR,
              width: 13,
              height: 13,
            },
          }
        : {}),
    };
  });

  return { nodes, edges };
}

type FilterKind = "all" | "skill" | "command";

/** Hides nodes that do not match the kind filter, and any cluster left empty. */
function applyFilter(base: { nodes: Node[]; edges: Edge[] }, filter: FilterKind) {
  if (filter === "all") return base;

  const hidden = new Set<string>();
  for (const n of base.nodes) {
    if (n.type === "entity" && (n.data as EntityData).kind !== filter) hidden.add(n.id);
  }
  const liveHubs = new Set<string>();
  for (const e of base.edges) {
    if ((e.data as { kind?: string } | undefined)?.kind === "membership" && !hidden.has(e.source)) {
      liveHubs.add(e.target);
    }
  }
  for (const n of base.nodes) {
    if (n.type === "hub" && !liveHubs.has(n.id)) hidden.add(n.id);
  }

  return {
    nodes: base.nodes.filter((n) => !hidden.has(n.id)),
    edges: base.edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target)),
  };
}

function buildAdjacency(edges: Edge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    const set = map.get(a);
    if (set) set.add(b);
    else map.set(a, new Set([b]));
  };
  for (const e of edges) {
    add(e.source, e.target);
    add(e.target, e.source);
  }
  return map;
}

// ---- legend ----------------------------------------------------------------

function Legend() {
  return (
    <div className="space-y-1.5 border bg-card/95 p-2.5 text-[11px] shadow-sm backdrop-blur">
      <p className="font-semibold text-foreground">Legend</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["plugin", "project", "personal", "local"] as RelationClusterKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1 text-muted-foreground">
            <span className={cn("h-2.5 w-2.5 border", CLUSTER_META[k].border, CLUSTER_META[k].bg)} />
            <span className="capitalize">{k}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
        <span className="flex items-center gap-1">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" y1="3" x2="22" y2="3" stroke={MEMBERSHIP_COLOR} strokeWidth="2.5" />
          </svg>
          bundled together
        </span>
        <span className="flex items-center gap-1">
          <svg width="22" height="6" aria-hidden>
            <line x1="0" y1="3" x2="22" y2="3" stroke={REFERENCE_COLOR} strokeWidth="2.5" />
          </svg>
          references
        </span>
      </div>
    </div>
  );
}

// ---- graph -----------------------------------------------------------------

function RelationFlow({ graph }: { graph: RelationGraph }) {
  const router = useRouter();
  const base = useMemo(() => computeLayout(graph), [graph]);
  const adjacency = useMemo(() => buildAdjacency(base.edges), [base]);

  const [filter, setFilter] = useState<FilterKind>("all");
  const view = useMemo(() => applyFilter(base, filter), [base, filter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(view.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(view.edges);
  useEffect(() => {
    setNodes(view.nodes);
    setEdges(view.edges);
  }, [view, setNodes, setEdges]);

  const [hover, setHover] = useState<HoverState>({ hovered: null, related: new Set() });

  return (
    <HoverContext.Provider value={hover}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodeClick={(_, node) => {
          if (node.type === "entity") router.push((node.data as EntityData).href);
        }}
        onNodeMouseEnter={(_, node) =>
          setHover({ hovered: node.id, related: adjacency.get(node.id) ?? new Set() })
        }
        onNodeMouseLeave={() => setHover({ hovered: null, related: new Set() })}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={1.75}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="#e2e8f0" />
        <Controls position="top-right" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          nodeColor={(n) =>
            n.type === "hub"
              ? "#64748b"
              : CLUSTER_META[(n.data as EntityData).variant]?.hex ?? "#94a3b8"
          }
        />
        <Panel position="top-left">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKind)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1.5">
                All
                <CountBadge>{graph.stats.skills + graph.stats.commands}</CountBadge>
              </TabsTrigger>
              <TabsTrigger value="skill" className="gap-1.5">
                Skills
                <CountBadge>{graph.stats.skills}</CountBadge>
              </TabsTrigger>
              <TabsTrigger value="command" className="gap-1.5">
                Commands
                <CountBadge>{graph.stats.commands}</CountBadge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Panel>
        <Panel position="bottom-left">
          <Legend />
        </Panel>
      </ReactFlow>
    </HoverContext.Provider>
  );
}

export function RelationGraph({ graph }: { graph: RelationGraph }) {
  // React Flow measures the DOM and cannot render identically on the server,
  // so it is mounted client-side only to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="h-[calc(100vh-15rem)] min-h-[600px] w-full border ring-1 ring-foreground/10">
      {mounted ? (
        <RelationFlow graph={graph} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading graph…
        </div>
      )}
    </div>
  );
}
