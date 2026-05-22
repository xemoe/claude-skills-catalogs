import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
    claudeHome,
    coworkSkillsDir,
    personalSkillsDir,
    pluginsDir,
    samePath,
} from "./claude-paths";
import { type CatalogConfig, loadConfig } from "./config";
import { clearGitCache, PROVENANCE_FILE, resolveSource } from "./git";
import { excerpt, parseSkillMd } from "./skill-parser";
import type {
    PluginInfo,
    ProjectInfo,
    ScanResult,
    ScanRoot,
    Skill,
    SkillType,
    SkillUsage,
} from "./types";
import { readProjectPaths, readSkillUsage } from "./usage";

export const SKIP_DIRS = new Set([
    "node_modules", ".git", ".next", ".turbo", "dist", "build", "out",
    "coverage", ".cache", ".idea", ".vscode", "vm_bundles", "Crashpad",
    "Cache", "GPUCache", "Code Cache", "DawnGraphiteCache", "DawnWebGPUCache",
    "blob_storage", "IndexedDB", "Local Storage", "Session Storage",
    "Service Worker", "logs", "Network", "Partitions",
]);

const CACHE_TTL_MS = 8000;
let cache: { result: ScanResult; at: number } | null = null;

export function safeExists(p: string): boolean {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

/** Recursively finds every SKILL.md file under a root, skipping noise directories. */
function findSkillFiles(root: string, maxDepth: number, errors: string[]): string[] {
    const results: string[] = [];
    const walk = (dir: string, depth: number) => {
        if (depth > maxDepth) return;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch (e) {
            errors.push(`read ${dir}: ${(e as Error).message}`);
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name)) continue;
                if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
                walk(full, depth + 1);
            } else if (entry.isFile() && entry.name.toLowerCase() === "skill.md") {
                results.push(full);
            }
        }
    };
    walk(root, 0);
    return results;
}

/** Newest mtime, file count and total size for a skill directory. */
function dirStats(dir: string): { newestMtimeMs: number; fileCount: number; sizeBytes: number } {
    let newestMtimeMs = 0;
    let fileCount = 0;
    let sizeBytes = 0;
    const walk = (d: string, depth: number) => {
        if (depth > 8) return;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(d, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRS.has(entry.name)) continue;
                walk(full, depth + 1);
            } else if (entry.isFile() && entry.name !== PROVENANCE_FILE) {
                try {
                    const st = fs.statSync(full);
                    fileCount++;
                    sizeBytes += st.size;
                    if (st.mtimeMs > newestMtimeMs) newestMtimeMs = st.mtimeMs;
                } catch {
                    /* ignore unreadable file */
                }
            }
        }
    };
    walk(dir, 0);
    return { newestMtimeMs, fileCount, sizeBytes };
}

/** Walks up to find a Claude plugin root (a dir holding .claude-plugin/plugin.json). */
function findPluginRoot(skillDir: string): string | null {
    let dir = skillDir;
    for (let i = 0; i < 6; i++) {
        if (safeExists(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

export function readPluginJson(pluginRoot: string): PluginInfo | null {
    try {
        const j = JSON.parse(
            fs.readFileSync(path.join(pluginRoot, ".claude-plugin", "plugin.json"), "utf8"),
        );
        const author =
            typeof j.author === "string"
                ? j.author
                : j.author && typeof j.author.name === "string"
                    ? j.author.name
                    : undefined;
        return {
            name: typeof j.name === "string" && j.name.trim() ? j.name.trim() : path.basename(pluginRoot),
            version: typeof j.version === "string" ? j.version : undefined,
            description: typeof j.description === "string" ? j.description : undefined,
            author,
            root: pluginRoot,
        };
    } catch {
        return null;
    }
}

/** Determines a skill's deployment type from its location on disk. */
function classify(skillMdPath: string): {
    type: SkillType;
    plugin?: PluginInfo;
    project?: ProjectInfo;
} {
    const skillDir = path.dirname(skillMdPath);

    const pluginRoot = findPluginRoot(skillDir);
    if (pluginRoot) {
        const plugin = readPluginJson(pluginRoot);
        if (plugin) return { type: "plugin", plugin };
    }

    if (samePath(path.dirname(skillDir), personalSkillsDir())) {
        return { type: "personal" };
    }

    const segs = skillMdPath.split(path.sep);
    for (let i = segs.length - 2; i >= 1; i--) {
        if (segs[i] === ".claude" && segs[i + 1] === "skills") {
            const projPath = segs.slice(0, i).join(path.sep);
            if (projPath) {
                return {
                    type: "project",
                    project: { name: path.basename(projPath) || projPath, path: projPath },
                };
            }
        }
    }

    return { type: "local" };
}

function buildSkill(
    skillMdPath: string,
    rootHint: ScanRoot["kind"],
    usage: Record<string, SkillUsage>,
): Skill | null {
    const skillDir = path.dirname(skillMdPath);
    const parsed = parseSkillMd(skillMdPath);
    const name = parsed.name || path.basename(skillDir);
    if (!name) return null;

    const classified = classify(skillMdPath);
    let type = classified.type;
    if (type === "local" && rootHint !== "auto" && rootHint !== "local") {
        type = rootHint;
    }

    const stats = dirStats(skillDir);
    const source = resolveSource(skillDir);
    const idBasis =
        type === "plugin" && classified.plugin
            ? `plugin:${classified.plugin.name}:${name}`
            : type === "personal"
                ? `personal:${name}`
                : type === "project" && classified.project
                    ? `project:${classified.project.path}:${name}`
                    : `local:${skillMdPath}`;

    return {
        id: crypto.createHash("sha1").update(idBasis).digest("hex").slice(0, 12),
        name,
        description: parsed.description || excerpt(parsed.body, 160) || "(no description)",
        type,
        path: skillDir,
        skillMdPath,
        lastUpdated: new Date(stats.newestMtimeMs || Date.now()).toISOString(),
        fileCount: stats.fileCount,
        sizeBytes: stats.sizeBytes,
        source,
        plugin: classified.plugin,
        project: classified.project,
        usage: usage[name],
        allowedTools: parsed.allowedTools,
        disableModelInvocation: parsed.disableModelInvocation,
        bodyExcerpt: excerpt(parsed.body, 240),
    };
}

function getScanRoots(config: CatalogConfig): ScanRoot[] {
    const candidates: Omit<ScanRoot, "exists" | "count">[] = [
        {
            path: personalSkillsDir(),
            kind: "personal",
            label: "Personal skills",
            labelKey: "personalSkills",
            maxDepth: 3,
        },
        {
            path: pluginsDir(),
            kind: "plugin",
            label: "Installed plugins",
            labelKey: "installedPlugins",
            maxDepth: 9,
        },
    ];

    if (config.includeCoworkSkills) {
        candidates.push({
            path: coworkSkillsDir(),
            kind: "plugin",
            label: "Agent / Cowork skills",
            labelKey: "coworkSkills",
            maxDepth: 12,
        });
    }

    if (config.includeProjectSkills) {
        for (const proj of readProjectPaths()) {
            candidates.push({
                path: path.join(proj, ".claude", "skills"),
                kind: "project",
                label: `Project: ${path.basename(proj)}`,
                labelKey: "project",
                labelArg: path.basename(proj),
                maxDepth: 3,
            });
        }
    }

    candidates.push({
        path: path.join(process.cwd(), "sample-skills"),
        kind: "local",
        label: "Bundled sample skills",
        labelKey: "sampleSkills",
        maxDepth: 3,
    });

    for (const extra of config.extraRoots) {
        candidates.push({
            path: extra,
            kind: "auto",
            label: "Custom root",
            labelKey: "customRoot",
            maxDepth: 12,
        });
    }

    const seen = new Set<string>();
    const roots: ScanRoot[] = [];
    for (const c of candidates) {
        const key = path.resolve(c.path).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        roots.push({ ...c, exists: safeExists(c.path), count: 0 });
    }
    return roots.filter((r) => r.exists);
}

/** Scans every known location for deployed Claude Skills. */
export function scanSkills(opts: { force?: boolean } = {}): ScanResult {
    if (!opts.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
        return cache.result;
    }

    const started = Date.now();
    clearGitCache();
    const errors: string[] = [];
    const config = loadConfig();
    const roots = getScanRoots(config);
    const usage = readSkillUsage();

    const byId = new Map<string, Skill>();
    for (const root of roots) {
        const files = findSkillFiles(root.path, root.maxDepth, errors);
        let count = 0;
        for (const file of files) {
            let skill: Skill | null = null;
            try {
                skill = buildSkill(file, root.kind, usage);
            } catch (e) {
                errors.push(`build ${file}: ${(e as Error).message}`);
            }
            if (!skill) continue;
            count++;
            const existing = byId.get(skill.id);
            if (!existing || Date.parse(skill.lastUpdated) > Date.parse(existing.lastUpdated)) {
                byId.set(skill.id, skill);
            }
        }
        root.count = count;
    }

    const skills = [...byId.values()].sort(
        (a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated),
    );

    const result: ScanResult = {
        skills,
        roots,
        scannedAt: new Date().toISOString(),
        claudeHome: claudeHome(),
        platform: process.platform,
        errors,
        durationMs: Date.now() - started,
    };

    cache = { result, at: Date.now() };
    return result;
}

export function getSkillById(id: string): Skill | undefined {
    return scanSkills().skills.find((s) => s.id === id);
}
