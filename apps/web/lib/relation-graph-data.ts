/**
 * Pure (React-free) data layer for the 3D relationship graph.
 *
 * Maps the server-built {@link RelationGraph} onto the node/link shape that
 * `3d-force-graph` consumes, and defines the light/dark colour palettes the
 * scene paints with. Kept free of React and of any `@lector/core` runtime
 * import (types only) so it stays client-safe.
 */
import type { LinkObject, NodeObject } from "3d-force-graph";
import type {
    RelationClusterKind,
    RelationEdgeKind,
    RelationGraph,
    RelationNodeKind,
} from "@/lib/relations";

/** Kinds shown in the filter tabs and legend, in display order. */
export const CLUSTER_KINDS: readonly RelationClusterKind[] = [
    "plugin",
    "project",
    "personal",
    "local",
] as const;

/** Filter applied by the tab bar above the canvas. */
export type GraphFilter = "all" | RelationNodeKind;

/**
 * A force-graph node. Extends the engine's {@link NodeObject} (which carries
 * the simulated `x/y/z` positions) with our own catalogue fields.
 */
export type FgNode = NodeObject & {
    id: string;
    /** Hubs are the bundling unit (plugin/project/scope); entities are items. */
    type: "entity" | "hub";
    /** Drives the node colour — the cluster/scope this node belongs to. */
    variant: RelationClusterKind;
    label: string;
    /** Entity-only: distinguishes a skill from a slash command. */
    entityKind?: RelationNodeKind;
    description?: string;
    href?: string;
    references?: number;
    /** Hub-only: member count. */
    count?: number;
};

/** A force-graph link tagged with how the two endpoints relate. */
export type FgLink = LinkObject<FgNode> & {
    kind: RelationEdgeKind;
};

export interface ForceData {
    nodes: FgNode[];
    links: FgLink[];
}

/** A full set of colours for one theme. */
export interface GraphPalette {
    /** WebGL canvas clear colour. */
    background: string;
    /** Node text colour, keyed by cluster kind. */
    cluster: Record<RelationClusterKind, string>;
    /** Chip behind a hub label. */
    hubBackground: string;
    membershipLink: string;
    referenceLink: string;
    /** Highlighted (hovered-neighbourhood) link colours. */
    membershipLinkActive: string;
    referenceLinkActive: string;
    /** Faded colour for links outside the hovered neighbourhood. */
    linkDimmed: string;
    /** Flowing-particle colour on hovered reference links. */
    particle: string;
}

export const LIGHT_PALETTE: GraphPalette = {
    background: "#f8fafc",
    cluster: {
        plugin: "#9333ea",
        project: "#15803d",
        personal: "#1d4ed8",
        local: "#475569",
    },
    hubBackground: "rgba(2,6,23,0.06)",
    membershipLink: "#cbd5e1",
    referenceLink: "#0e7490",
    membershipLinkActive: "#94a3b8",
    referenceLinkActive: "#0891b2",
    linkDimmed: "rgba(148,163,184,0.18)",
    particle: "#0891b2",
};

export const DARK_PALETTE: GraphPalette = {
    background: "#0b1220",
    cluster: {
        plugin: "#c084fc",
        project: "#4ade80",
        personal: "#60a5fa",
        local: "#cbd5e1",
    },
    hubBackground: "rgba(255,255,255,0.10)",
    membershipLink: "#334155",
    referenceLink: "#22d3ee",
    membershipLinkActive: "#64748b",
    referenceLinkActive: "#67e8f9",
    linkDimmed: "rgba(71,85,105,0.30)",
    particle: "#67e8f9",
};

/** Text colour for a node under the given palette. */
export function nodeColorFor(node: FgNode, palette: GraphPalette): string {
    return palette.cluster[node.variant];
}

/** Resolves a link endpoint to its node id, whether it is still a raw id or
 *  has already been replaced by a node object reference by the simulation. */
export function endpointId(end: FgLink["source"]): string {
    if (end == null) return "";
    if (typeof end === "object") return String((end as FgNode).id ?? "");
    return String(end);
}

/**
 * Projects a {@link RelationGraph} onto force-graph data, honouring the kind
 * filter. Returns brand-new objects on every call so the simulation can mutate
 * positions in place without corrupting the cached React graph prop.
 *
 * Hubs with no visible member are dropped, and any link touching a hidden node
 * is removed — the engine throws if a link references a missing node id.
 */
export function buildForceData(graph: RelationGraph, filter: GraphFilter): ForceData {
    const entities: FgNode[] = graph.nodes
        .filter((n) => filter === "all" || n.kind === filter)
        .map((n) => ({
            id: n.id,
            type: "entity",
            variant: n.variant,
            label: n.label,
            entityKind: n.kind,
            description: n.description,
            href: n.href,
            references: n.references,
        }));

    const visibleEntities = new Set(entities.map((e) => e.id));

    // A hub stays only if at least one of its members survived the filter.
    const liveHubIds = new Set<string>();
    for (const edge of graph.edges) {
        if (edge.kind === "membership" && visibleEntities.has(edge.source)) {
            liveHubIds.add(edge.target);
        }
    }

    const hubs: FgNode[] = graph.clusters
        .filter((c) => liveHubIds.has(c.id))
        .map((c) => ({
            id: c.id,
            type: "hub",
            variant: c.kind,
            label: c.label,
            count: c.size,
        }));

    const visibleNodes = new Set<string>([...visibleEntities, ...liveHubIds]);
    const links: FgLink[] = graph.edges
        .filter((e) => visibleNodes.has(e.source) && visibleNodes.has(e.target))
        .map((e) => ({ source: e.source, target: e.target, kind: e.kind }));

    return { nodes: [...hubs, ...entities], links };
}
