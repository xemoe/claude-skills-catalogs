"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ForceGraph3DInstance, LinkObject, NodeObject } from "3d-force-graph";
import type SpriteText from "three-spritetext";
import {
    DARK_PALETTE,
    LIGHT_PALETTE,
    endpointId,
    nodeColorFor,
    type FgLink,
    type FgNode,
    type ForceData,
    type GraphPalette,
} from "@/lib/relation-graph-data";

// ---- tuning constants ------------------------------------------------------

const HUB_TEXT_HEIGHT = 7;
const ENTITY_TEXT_HEIGHT = 4.2;
const DIMMED_OPACITY = 0.12;
const MEMBERSHIP_WIDTH = 0.4;
const REFERENCE_WIDTH = 0.9;
const ACTIVE_WIDTH_FACTOR = 3;
const ARROW_LENGTH = 3.5;
const CHARGE_STRENGTH = -135;
const MEMBERSHIP_DISTANCE = 34;
const REFERENCE_DISTANCE = 62;
const FIT_DURATION_MS = 600;
const FIT_PADDING = 48;
const FOCUS_DISTANCE = 140;
const FOCUS_DURATION_MS = 700;

interface HighlightState {
    active: boolean;
    nodes: Set<string>;
    links: Set<FgLink>;
}

interface Adjacency {
    nodes: Map<string, Set<string>>;
    links: Map<string, Set<FgLink>>;
}

function currentPalette(): GraphPalette {
    if (typeof document === "undefined") return LIGHT_PALETTE;
    return document.documentElement.classList.contains("dark") ? DARK_PALETTE : LIGHT_PALETTE;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Builds the neighbour and incident-link lookup used for hover highlighting. */
function buildAdjacency(links: FgLink[]): Adjacency {
    const nodes = new Map<string, Set<string>>();
    const linkMap = new Map<string, Set<FgLink>>();
    const addNode = (a: string, b: string) => {
        const set = nodes.get(a);
        if (set) set.add(b);
        else nodes.set(a, new Set([b]));
    };
    const addLink = (a: string, link: FgLink) => {
        const set = linkMap.get(a);
        if (set) set.add(link);
        else linkMap.set(a, new Set([link]));
    };
    for (const link of links) {
        const s = endpointId(link.source);
        const t = endpointId(link.target);
        addNode(s, t);
        addNode(t, s);
        addLink(s, link);
        addLink(t, link);
    }
    return { nodes, links: linkMap };
}

/**
 * Renders a {@link RelationGraph} as an interactive 3D force-directed graph
 * whose nodes are text labels (via `three-spritetext`). The heavy WebGL library
 * is dynamically imported inside an effect so it never executes on the server.
 */
export function RelationGraphScene({ data }: { data: ForceData }) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const graphRef = useRef<ForceGraph3DInstance | null>(null);

    // Mutable state shared with the engine's accessor callbacks via refs, so the
    // callbacks stay stable while still reading the latest values.
    const dataRef = useRef<ForceData>(data);
    const routerRef = useRef(router);
    const paletteRef = useRef<GraphPalette>(LIGHT_PALETTE);
    const highlightRef = useRef<HighlightState>({ active: false, nodes: new Set(), links: new Set() });
    const adjacencyRef = useRef<Adjacency>({ nodes: new Map(), links: new Map() });
    const spritesRef = useRef<Map<string, SpriteText>>(new Map());
    const didFitRef = useRef(false);
    const applyDataRef = useRef<(next: ForceData) => void>(() => {});

    dataRef.current = data;
    routerRef.current = router;

    // --- engine lifecycle (mount once) --------------------------------------
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let disposed = false;
        let graph: ForceGraph3DInstance | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let themeObserver: MutationObserver | null = null;

        const isLink = (l: FgLink) => l.kind === "reference";
        const isDimmed = (l: FgLink) => highlightRef.current.active && !highlightRef.current.links.has(l);

        const linkColor = (link: LinkObject): string => {
            const l = link as FgLink;
            const p = paletteRef.current;
            if (isDimmed(l)) return p.linkDimmed;
            if (highlightRef.current.links.has(l)) {
                return isLink(l) ? p.referenceLinkActive : p.membershipLinkActive;
            }
            return isLink(l) ? p.referenceLink : p.membershipLink;
        };

        const setData = (next: ForceData) => {
            const g = graphRef.current;
            if (!g) return;
            spritesRef.current = new Map();
            adjacencyRef.current = buildAdjacency(next.links);
            highlightRef.current = { active: false, nodes: new Set(), links: new Set() };
            didFitRef.current = false;
            g.graphData({ nodes: next.nodes, links: next.links });
        };
        applyDataRef.current = setData;

        const applyTheme = () => {
            const g = graphRef.current;
            if (!g) return;
            const p = currentPalette();
            paletteRef.current = p;
            g.backgroundColor(p.background);
            for (const node of dataRef.current.nodes) {
                const sprite = spritesRef.current.get(node.id);
                if (!sprite) continue;
                sprite.color = nodeColorFor(node, p);
                if (node.type === "hub") sprite.backgroundColor = p.hubBackground;
            }
            // Re-assigning each accessor forces the engine to repaint link bodies,
            // arrowheads, and any live particles (whose colour is baked at creation).
            g.linkColor(g.linkColor())
                .linkDirectionalArrowColor(g.linkDirectionalArrowColor())
                .linkDirectionalParticleColor(g.linkDirectionalParticleColor());
        };

        const applyHighlight = (node: NodeObject | null) => {
            const g = graphRef.current;
            if (!g) return;
            const hi: HighlightState = { active: node != null, nodes: new Set(), links: new Set() };
            if (node) {
                const id = String((node as FgNode).id);
                hi.nodes.add(id);
                for (const nb of adjacencyRef.current.nodes.get(id) ?? []) hi.nodes.add(nb);
                for (const link of adjacencyRef.current.links.get(id) ?? []) hi.links.add(link);
            }
            highlightRef.current = hi;

            for (const [id, sprite] of spritesRef.current) {
                const lit = !hi.active || hi.nodes.has(id);
                sprite.material.transparent = true;
                sprite.material.opacity = lit ? 1 : DIMMED_OPACITY;
            }
            g.linkColor(g.linkColor())
                .linkWidth(g.linkWidth())
                .linkDirectionalArrowColor(g.linkDirectionalArrowColor())
                .linkDirectionalParticles(g.linkDirectionalParticles());
        };

        let SpriteTextCtor: typeof SpriteText;

        (async () => {
            try {
                const [{ default: ForceGraph3D }, { default: SpriteTextImport }] = await Promise.all([
                    import("3d-force-graph"),
                    import("three-spritetext"),
                ]);
                if (disposed || !containerRef.current) return;
                SpriteTextCtor = SpriteTextImport;

                graph = new ForceGraph3D(containerRef.current, { controlType: "orbit" });
                graphRef.current = graph;
                paletteRef.current = currentPalette();

                graph
                    .width(containerRef.current.clientWidth)
                    .height(containerRef.current.clientHeight)
                    .backgroundColor(paletteRef.current.background)
                    .showNavInfo(false)
                    // Read-only graph: no node dragging. This also avoids a crash
                    // where clicking a node navigates (unmounting the canvas), and
                    // the resulting pointercancel reaches three's DragControls →
                    // OrbitControls.onPointerUp with cleared pointer state.
                    .enableNodeDrag(false)
                    .nodeRelSize(3)
                    .nodeThreeObjectExtend(false)
                    .nodeThreeObject((node: NodeObject) => {
                        const n = node as FgNode;
                        const sprite = new SpriteTextCtor(n.label);
                        sprite.material.depthWrite = false;
                        sprite.material.transparent = true;
                        sprite.color = nodeColorFor(n, paletteRef.current);
                        if (n.type === "hub") {
                            sprite.textHeight = HUB_TEXT_HEIGHT;
                            sprite.fontWeight = "700";
                            sprite.backgroundColor = paletteRef.current.hubBackground;
                            sprite.padding = 2;
                            sprite.borderRadius = 2;
                        } else {
                            sprite.textHeight = ENTITY_TEXT_HEIGHT;
                            sprite.fontWeight = n.entityKind === "command" ? "600" : "500";
                        }
                        spritesRef.current.set(n.id, sprite);
                        return sprite;
                    })
                    .nodeLabel((node: NodeObject) => {
                        const n = node as FgNode;
                        if (n.type === "hub") return `<b>${escapeHtml(n.label)}</b>`;
                        const desc = n.description ? `<br/>${escapeHtml(n.description)}` : "";
                        return `<b>${escapeHtml(n.label)}</b>${desc}`;
                    })
                    .linkColor(linkColor)
                    .linkWidth((link: LinkObject) => {
                        const l = link as FgLink;
                        const base = isLink(l) ? REFERENCE_WIDTH : MEMBERSHIP_WIDTH;
                        return highlightRef.current.links.has(l) ? base * ACTIVE_WIDTH_FACTOR : base;
                    })
                    .linkOpacity(0.7)
                    .linkDirectionalArrowLength((link: LinkObject) =>
                        isLink(link as FgLink) ? ARROW_LENGTH : 0,
                    )
                    .linkDirectionalArrowRelPos(1)
                    .linkDirectionalArrowColor(linkColor)
                    .linkDirectionalParticles((link: LinkObject) => {
                        const l = link as FgLink;
                        return highlightRef.current.links.has(l) && isLink(l) ? 3 : 0;
                    })
                    .linkDirectionalParticleWidth(1.6)
                    .linkDirectionalParticleColor(() => paletteRef.current.particle)
                    .onNodeHover(applyHighlight)
                    .onNodeClick((node: NodeObject) => {
                        const n = node as FgNode;
                        if (n.type === "entity" && n.href) {
                            routerRef.current.push(n.href);
                            return;
                        }
                        // Hub click: ease the camera in to frame the cluster.
                        const x = n.x ?? 0;
                        const y = n.y ?? 0;
                        const z = n.z ?? 0;
                        const ratio = 1 + FOCUS_DISTANCE / Math.hypot(x, y, z || 1);
                        graph?.cameraPosition(
                            { x: x * ratio, y: y * ratio, z: z * ratio },
                            { x, y, z },
                            FOCUS_DURATION_MS,
                        );
                    })
                    .onEngineStop(() => {
                        if (didFitRef.current) return;
                        didFitRef.current = true;
                        graph?.zoomToFit(FIT_DURATION_MS, FIT_PADDING);
                    });

                const charge = graph.d3Force("charge");
                if (charge) charge.strength(CHARGE_STRENGTH);
                const linkForce = graph.d3Force("link");
                if (linkForce) {
                    linkForce.distance((l: FgLink) =>
                        l.kind === "membership" ? MEMBERSHIP_DISTANCE : REFERENCE_DISTANCE,
                    );
                }

                setData(dataRef.current);

                resizeObserver = new ResizeObserver(() => {
                    const el = containerRef.current;
                    if (el && graphRef.current) {
                        graphRef.current.width(el.clientWidth).height(el.clientHeight);
                    }
                });
                resizeObserver.observe(containerRef.current);

                themeObserver = new MutationObserver(applyTheme);
                themeObserver.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ["class"],
                });
            } catch (error: unknown) {
                // Surface init failures rather than leaving a silent blank canvas.
                console.error("Failed to initialise the 3D relationship graph", error);
            }
        })();

        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            themeObserver?.disconnect();
            graph?._destructor();
            graphRef.current = null;
            spritesRef.current = new Map();
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
        // Mount-once. `router` is read through `routerRef` inside onNodeClick so
        // it never needs to be a dependency — keeping it out of the deps avoids
        // tearing down and rebuilding the WebGL context on every navigation.
    }, []);

    // --- push data updates (filter changes) into the live engine ------------
    useEffect(() => {
        applyDataRef.current(data);
    }, [data]);

    return <div ref={containerRef} className="h-full w-full" />;
}
