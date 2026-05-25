import path from "path";
import { scanCommands } from "@lector/core/command-scanner";
import { parseCommandMd } from "@lector/core/command-parser";
import { scanSkills } from "@lector/core/scanner";
import { parseSkillMd } from "@lector/core/skill-parser";
import { listPresetItems } from "@lector/presets/presets";
import { type Locale, DEFAULT_LOCALE } from "./i18n/config";
import { getDictionary, type Dictionary } from "./i18n/dictionaries";
import type { Command, Skill } from "@lector/core/types";

/** A graph node is either a deployed skill or a slash command. */
export type RelationNodeKind = "skill" | "command";

/** Clusters group skills/commands that ship or live together. */
export type RelationClusterKind = "plugin" | "project" | "personal" | "local";

/**
 * - `membership` — a skill/command belongs to a cluster (a plugin, a project…).
 * - `reference`  — one skill/command's body explicitly names another.
 */
export type RelationEdgeKind = "membership" | "reference";

export interface RelationNode {
    /** Graph-unique id ("s:<id>" for skills, "c:<id>" for commands). */
    id: string;
    kind: RelationNodeKind;
    /** Id of the underlying skill/command in the catalog. */
    entityId: string;
    /** Bare name. */
    name: string;
    /** Display label — "/name" for commands, the plain name for skills. */
    label: string;
    description: string;
    /** Deployment type/scope — drives the node colour. */
    variant: RelationClusterKind;
    /** Cluster this node belongs to. */
    clusterId: string;
    /** Detail-page link. */
    href: string;
    /** Number of distinct nodes it shares a reference edge with. */
    references: number;
}

export interface RelationCluster {
    id: string;
    kind: RelationClusterKind;
    label: string;
    /** Number of member nodes. */
    size: number;
}

export interface RelationEdge {
    id: string;
    source: string;
    target: string;
    kind: RelationEdgeKind;
}

export interface RelationGraph {
    nodes: RelationNode[];
    clusters: RelationCluster[];
    edges: RelationEdge[];
    stats: {
        skills: number;
        commands: number;
        clusters: number;
        references: number;
    };
    scannedAt: string;
}

const CACHE_TTL_MS = 8000;
let cache:
    | { graph: RelationGraph; at: number; locale: Locale; presetId: number | null }
    | null = null;

function emptyGraph(): RelationGraph {
    return {
        nodes: [],
        clusters: [],
        edges: [],
        stats: { skills: 0, commands: 0, clusters: 0, references: 0 },
        scannedAt: new Date().toISOString(),
    };
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive, separator-stable key for a project path. */
function projectKey(p: string): string {
    const resolved = path.resolve(p);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

interface ClusterRef {
    id: string;
    kind: RelationClusterKind;
    label: string;
}

function skillCluster(skill: Skill, dict: Dictionary): ClusterRef {
    if (skill.type === "plugin" && skill.plugin) {
        return { id: `g:plugin:${skill.plugin.name}`, kind: "plugin", label: skill.plugin.name };
    }
    if (skill.type === "project" && skill.project) {
        return {
            id: `g:project:${projectKey(skill.project.path)}`,
            kind: "project",
            label: skill.project.name,
        };
    }
    if (skill.type === "personal") {
        return { id: "g:personal", kind: "personal", label: dict.skillTypes.personal };
    }
    return { id: "g:local", kind: "local", label: dict.skillTypes.local };
}

function commandCluster(command: Command, dict: Dictionary): ClusterRef {
    if (command.scope === "plugin" && command.plugin) {
        return { id: `g:plugin:${command.plugin.name}`, kind: "plugin", label: command.plugin.name };
    }
    if (command.scope === "project" && command.project) {
        return {
            id: `g:project:${projectKey(command.project.path)}`,
            kind: "project",
            label: command.project.name,
        };
    }
    return { id: "g:personal", kind: "personal", label: dict.skillTypes.personal };
}

/**
 * Builds a relationship graph restricted to the items in the given preset.
 * When `presetId` is null/undefined (no active preset) returns an empty graph —
 * the page deliberately never renders the full catalogue, which is too heavy
 * with many deployed skills.
 */
export function buildRelationGraph(
    opts: { force?: boolean; locale?: Locale; presetId?: number | null } = {},
): RelationGraph {
    const locale = opts.locale ?? DEFAULT_LOCALE;
    const presetId = opts.presetId ?? null;

    if (
        !opts.force &&
        cache &&
        cache.locale === locale &&
        cache.presetId === presetId &&
        Date.now() - cache.at < CACHE_TTL_MS
    ) {
        return cache.graph;
    }

    if (presetId == null) {
        const graph = emptyGraph();
        cache = { graph, at: Date.now(), locale, presetId };
        return graph;
    }

    let presetSkillNames: Set<string> | null = null;
    let presetCommandNames: Set<string> | null = null;
    try {
        const items = listPresetItems(presetId);
        presetSkillNames = new Set();
        presetCommandNames = new Set();
        for (const item of items) {
            if (item.kind === "skill") presetSkillNames.add(item.identifier);
            else presetCommandNames.add(item.identifier);
        }
    } catch {
        // Preset DB is unavailable — return empty rather than rendering the full
        // catalogue, which is the explicit anti-pattern this page is avoiding.
        const graph = emptyGraph();
        cache = { graph, at: Date.now(), locale, presetId };
        return graph;
    }

    const dict = getDictionary(locale);
    const skillScan = scanSkills(opts);
    const commandScan = scanCommands(opts);

    const filteredSkills = presetSkillNames
        ? skillScan.skills.filter((s) => presetSkillNames!.has(s.name))
        : [];
    const filteredCommands = presetCommandNames
        ? commandScan.commands.filter((c) => presetCommandNames!.has(c.name))
        : [];

    const nodes: RelationNode[] = [];
    const clusters = new Map<string, RelationCluster>();
    /** Full body text per node id — used for reference detection. */
    const bodies = new Map<string, string>();

    const registerCluster = (ref: ClusterRef) => {
        const existing = clusters.get(ref.id);
        if (existing) existing.size++;
        else clusters.set(ref.id, { id: ref.id, kind: ref.kind, label: ref.label, size: 1 });
    };

    for (const skill of filteredSkills) {
        const cluster = skillCluster(skill, dict);
        registerCluster(cluster);
        const id = `s:${skill.id}`;
        nodes.push({
            id,
            kind: "skill",
            entityId: skill.id,
            name: skill.name,
            label: skill.name,
            description: skill.description,
            variant: cluster.kind,
            clusterId: cluster.id,
            href: `/skills/${skill.id}`,
            references: 0,
        });
        bodies.set(id, parseSkillMd(skill.skillMdPath).body.toLowerCase());
    }

    for (const command of filteredCommands) {
        const cluster = commandCluster(command, dict);
        registerCluster(cluster);
        const id = `c:${command.id}`;
        nodes.push({
            id,
            kind: "command",
            entityId: command.id,
            name: command.name,
            label: `/${command.name}`,
            description: command.description,
            variant: cluster.kind,
            clusterId: cluster.id,
            href: `/commands/${command.id}`,
            references: 0,
        });
        bodies.set(id, parseCommandMd(command.path).body.toLowerCase());
    }

    // --- Reference detection -------------------------------------------------
    // A slash-command lookup: full namespaced name and its last segment.
    const commandByToken = new Map<string, RelationNode>();
    for (const node of nodes) {
        if (node.kind !== "command") continue;
        const full = node.name.toLowerCase();
        commandByToken.set(full, node);
        const last = full.split(":").pop();
        if (last && !commandByToken.has(last)) commandByToken.set(last, node);
    }
    // Hyphenated, multi-word names are distinctive enough to match as plain words.
    const namedEntities = nodes
        .filter((n) => {
            const nm = n.name.toLowerCase();
            return nm.length >= 6 && nm.includes("-");
        })
        .map((n) => ({ node: n, re: new RegExp(`\\b${escapeRegExp(n.name.toLowerCase())}\\b`, "i") }));

    const referenceEdges: RelationEdge[] = [];
    const seenRef = new Set<string>();
    const addReference = (source: string, target: string) => {
        if (source === target) return;
        const key = `${source}\0${target}`;
        if (seenRef.has(key)) return;
        seenRef.add(key);
        referenceEdges.push({ id: `r:${referenceEdges.length}`, source, target, kind: "reference" });
    };

    for (const node of nodes) {
        const body = bodies.get(node.id);
        if (!body) continue;

        const slash = /\/([a-z0-9][a-z0-9:_-]*)/g;
        let match: RegExpExecArray | null;
        while ((match = slash.exec(body)) !== null) {
            // A trailing slash means this is almost certainly a file path, not a command.
            if (body[slash.lastIndex] === "/") continue;
            const token = match[1];
            const target =
                commandByToken.get(token) ?? commandByToken.get(token.split(":").pop() ?? token);
            if (target) addReference(node.id, target.id);
        }

        for (const entry of namedEntities) {
            if (entry.node.id === node.id) continue;
            if (entry.re.test(body)) addReference(node.id, entry.node.id);
        }
    }

    // --- Reference counts ----------------------------------------------------
    const neighbours = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        let set = neighbours.get(a);
        if (!set) neighbours.set(a, (set = new Set()));
        set.add(b);
    };
    for (const edge of referenceEdges) {
        link(edge.source, edge.target);
        link(edge.target, edge.source);
    }
    for (const node of nodes) node.references = neighbours.get(node.id)?.size ?? 0;

    // --- Membership edges ----------------------------------------------------
    const membershipEdges: RelationEdge[] = nodes.map((n) => ({
        id: `m:${n.id}`,
        source: n.id,
        target: n.clusterId,
        kind: "membership",
    }));

    nodes.sort((a, b) => a.clusterId.localeCompare(b.clusterId) || a.name.localeCompare(b.name));
    const clusterList = [...clusters.values()].sort(
        (a, b) => b.size - a.size || a.label.localeCompare(b.label),
    );

    const graph: RelationGraph = {
        nodes,
        clusters: clusterList,
        edges: [...membershipEdges, ...referenceEdges],
        stats: {
            skills: filteredSkills.length,
            commands: filteredCommands.length,
            clusters: clusterList.length,
            references: referenceEdges.length,
        },
        scannedAt: new Date().toISOString(),
    };

    cache = { graph, at: Date.now(), locale, presetId };
    return graph;
}
