import fs from "fs";
import path from "path";
import type { PluginInfo, SkillSource } from "./types";

/**
 * One plugin entry inside a marketplace.json. Field shapes follow Claude Code's
 * marketplace schema — we keep them lenient (everything optional except `name`)
 * because the file is human-authored.
 */
export interface MarketplacePluginEntry {
    name: string;
    description?: string;
    author?: { name?: string; email?: string } | string;
    category?: string;
    homepage?: string;
    /**
     * Either a string pointer like `"./plugins/X"` (local source in the same
     * marketplace tree), or a structured `{ source: "git-subdir" | "url", url, path, ref, sha }`
     * record pointing at the upstream git repo.
     */
    source?: string | { source?: string; url?: string; path?: string; ref?: string; sha?: string };
}

export interface MarketplaceData {
    /** Marketplace name, e.g. "claude-plugins-official". */
    name: string;
    description?: string;
    owner?: { name?: string; email?: string };
    plugins: MarketplacePluginEntry[];
}

interface MarketplaceCacheEntry {
    data: MarketplaceData | null;
    mtimeMs: number;
}

const marketplaceCache = new Map<string, MarketplaceCacheEntry>();

/** Walks up from `startDir` looking for the nearest `.claude-plugin/marketplace.json`. */
export function findMarketplaceRoot(startDir: string): string | null {
    let dir = path.resolve(startDir);
    for (let i = 0; i < 8; i++) {
        if (fs.existsSync(path.join(dir, ".claude-plugin", "marketplace.json"))) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

/** Reads and caches the marketplace.json at the given marketplace root. */
export function readMarketplaceJson(marketplaceRoot: string): MarketplaceData | null {
    const filePath = path.join(marketplaceRoot, ".claude-plugin", "marketplace.json");
    let stat: fs.Stats;
    try {
        stat = fs.statSync(filePath);
    } catch {
        return null;
    }
    const cached = marketplaceCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        const name =
            typeof parsed?.name === "string" && parsed.name.trim()
                ? parsed.name.trim()
                : path.basename(marketplaceRoot);
        const plugins: MarketplacePluginEntry[] = Array.isArray(parsed?.plugins)
            ? parsed.plugins.filter(
                  (p: unknown): p is MarketplacePluginEntry =>
                      !!p && typeof p === "object" && typeof (p as { name?: unknown }).name === "string",
              )
            : [];
        const data: MarketplaceData = {
            name,
            description: typeof parsed?.description === "string" ? parsed.description : undefined,
            owner: parsed?.owner && typeof parsed.owner === "object" ? parsed.owner : undefined,
            plugins,
        };
        marketplaceCache.set(filePath, { data, mtimeMs: stat.mtimeMs });
        return data;
    } catch {
        marketplaceCache.set(filePath, { data: null, mtimeMs: stat.mtimeMs });
        return null;
    }
}

/** Detects the "source pointer is the marketplace root itself" case (e.g. sentry-skills). */
function isSelfRootSource(source: MarketplacePluginEntry["source"]): boolean {
    if (typeof source !== "string") return false;
    const trimmed = source.trim();
    return trimmed === "." || trimmed === "./" || trimmed === "";
}

/**
 * Given a path under a marketplace root, locate the plugin it belongs to.
 * Handles three layouts:
 *
 *   1. `plugins/<name>/...` or `external_plugins/<name>/...` — the standard
 *      marketplace layout. If the marketplace lists an entry by that name we
 *      return it; otherwise we synthesize a minimal entry from the folder name.
 *   2. The marketplace itself IS the plugin — one entry whose `source` is `"./"`
 *      (or `"."` / `""`). The whole marketplace tree belongs to that entry.
 */
export function findMarketplacePluginEntry(
    insideDir: string,
    marketplaceRoot: string,
    data: MarketplaceData,
): { entry: MarketplacePluginEntry; pluginRoot: string } | null {
    const rel = path.relative(marketplaceRoot, insideDir);
    if (rel.startsWith("..")) return null;
    const segs = rel.split(path.sep).filter(Boolean);

    if (segs.length >= 2 && (segs[0] === "plugins" || segs[0] === "external_plugins")) {
        const pluginDirName = segs[1];
        const pluginRoot = path.join(marketplaceRoot, segs[0], pluginDirName);
        const entry = data.plugins.find((p) => p.name === pluginDirName);
        if (entry) return { entry, pluginRoot };
        // Folder exists but no marketplace entry: synthesize one so the source
        // still gets a friendly marketplace label instead of a disk path.
        return { entry: { name: pluginDirName }, pluginRoot };
    }

    const selfEntry = data.plugins.find((p) => isSelfRootSource(p.source));
    if (selfEntry) {
        return { entry: selfEntry, pluginRoot: marketplaceRoot };
    }

    return null;
}

/** Parses a GitHub web URL (including deep `/tree/<branch>/<sub-path>` ones) into label + canonical URL. */
function parseGitHubWebUrl(raw: string): { label: string; url: string } | null {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return null;
    }
    if (u.host.toLowerCase() !== "github.com") return null;
    const repoPath = u.pathname.replace(/^\/+/, "").replace(/\.git$/, "");
    const segs = repoPath.split("/").filter(Boolean);
    if (segs.length < 2) return null;
    const label = `${segs[0]}/${segs[1]}`;
    return { label, url: `https://github.com/${label}` };
}

/** Strips leading `./` and slashes from a relative source string. */
function normalizeLocalSource(raw: string): string {
    return raw.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Tries to deduce the marketplace's own GitHub `owner/repo` and default branch
 * by inspecting any sibling entry whose `homepage` points at a `/tree/<branch>/<path>`
 * URL that matches the entry's local `source` pointer. Cached on the data object.
 */
function deriveMarketplaceRepo(data: MarketplaceData): { label: string; url: string; branch: string } | null {
    const cacheKey = "__marketplaceRepo" as const;
    const cached = (data as unknown as Record<string, unknown>)[cacheKey];
    if (cached === null) return null;
    if (cached && typeof cached === "object") {
        return cached as { label: string; url: string; branch: string };
    }
    for (const entry of data.plugins) {
        if (typeof entry.source !== "string" || typeof entry.homepage !== "string") continue;
        const localPath = normalizeLocalSource(entry.source);
        if (!localPath) continue;
        let u: URL;
        try {
            u = new URL(entry.homepage);
        } catch {
            continue;
        }
        if (u.host.toLowerCase() !== "github.com") continue;
        const segs = u.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/").filter(Boolean);
        if (segs.length < 4 || segs[2] !== "tree") continue;
        const branch = segs[3];
        const tail = segs.slice(4).join("/");
        if (tail !== localPath) continue;
        const label = `${segs[0]}/${segs[1]}`;
        const repo = { label, url: `https://github.com/${label}`, branch };
        Object.defineProperty(data, cacheKey, {
            value: repo,
            enumerable: false,
            configurable: true,
            writable: true,
        });
        return repo;
    }
    Object.defineProperty(data, cacheKey, {
        value: null,
        enumerable: false,
        configurable: true,
        writable: true,
    });
    return null;
}

/**
 * Converts a marketplace plugin entry into a `SkillSource`. Resolution order:
 *   1. Structured `source.url` (e.g. `git-subdir`).
 *   2. GitHub `homepage`.
 *   3. Local `source` like `./plugins/X` combined with the marketplace's own
 *      derived GitHub repo (taken from any sibling entry's `tree/<branch>/...` homepage).
 *   4. A `local` `<marketplace>/<plugin>` label — short but recognizable.
 */
export function sourceFromMarketplaceEntry(
    entry: MarketplacePluginEntry,
    data: MarketplaceData,
): SkillSource | null {
    if (entry.source && typeof entry.source === "object") {
        const url = typeof entry.source.url === "string" ? entry.source.url.trim() : "";
        if (url) {
            const gh = parseGitHubWebUrl(url);
            if (gh) return { kind: "github", label: gh.label, url: gh.url };
            return { kind: "git", label: url };
        }
    }
    if (typeof entry.homepage === "string" && entry.homepage.trim()) {
        const gh = parseGitHubWebUrl(entry.homepage);
        if (gh) return { kind: "github", label: gh.label, url: entry.homepage };
    }
    if (typeof entry.source === "string") {
        const localPath = normalizeLocalSource(entry.source);
        const repo = deriveMarketplaceRepo(data);
        if (repo && localPath) {
            return {
                kind: "github",
                label: repo.label,
                url: `${repo.url}/tree/${repo.branch}/${localPath}`,
            };
        }
        if (repo && !localPath) {
            return { kind: "github", label: repo.label, url: repo.url };
        }
    }
    return { kind: "local", label: `${data.name}/${entry.name}` };
}

/**
 * Synthesizes a `PluginInfo` from a marketplace entry, for plugins that ship
 * inside a marketplace tree without their own `.claude-plugin/plugin.json`.
 */
export function pluginInfoFromMarketplaceEntry(
    entry: MarketplacePluginEntry,
    pluginRoot: string,
): PluginInfo {
    const author =
        typeof entry.author === "string"
            ? entry.author
            : entry.author && typeof entry.author === "object" && typeof entry.author.name === "string"
                ? entry.author.name
                : undefined;
    return {
        name: entry.name,
        description: typeof entry.description === "string" ? entry.description : undefined,
        author,
        root: pluginRoot,
    };
}

/** Clears the in-process marketplace.json cache (called by force-rescans). */
export function clearMarketplaceCache(): void {
    marketplaceCache.clear();
}
