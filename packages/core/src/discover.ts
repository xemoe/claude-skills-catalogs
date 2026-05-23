import fs from "fs";
import path from "path";
import type {
    DiscoverEntry,
    DiscoverItem,
    DiscoverManifest,
    DiscoverResult,
} from "./types";

const CACHE_TTL_MS = 8000;
let cache: { result: DiscoverResult; at: number; manifestMtime: number } | null = null;

const MANIFEST_REL = path.join(".discover", "results.json");

/**
 * Walks up from `start` looking for the repo root — a directory that holds
 * `.gitmodules`, a `.git` entry, or the bundled `vendor/` directory. Returns
 * `start` itself when nothing matches (so the reader still produces a sensible
 * empty-state response instead of throwing).
 */
function resolveRepoRoot(start: string): string {
    let dir = path.resolve(start);
    for (let i = 0; i < 8; i++) {
        if (
            fs.existsSync(path.join(dir, ".gitmodules")) ||
            fs.existsSync(path.join(dir, ".git")) ||
            fs.existsSync(path.join(dir, "vendor"))
        ) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return path.resolve(start);
}

/** Parses .gitmodules into [{ path, url }] entries. */
function readGitmodules(repoRoot: string): Array<{ path: string; url: string }> {
    let text: string;
    try {
        text = fs.readFileSync(path.join(repoRoot, ".gitmodules"), "utf8");
    } catch {
        return [];
    }
    const mods: Array<{ path?: string; url?: string }> = [];
    let cur: { path?: string; url?: string } | null = null;
    for (const line of text.split(/\r?\n/)) {
        if (/^\s*\[submodule\b/.test(line)) {
            cur = {};
            mods.push(cur);
        } else if (cur) {
            const m = line.match(/^\s*(path|url)\s*=\s*(.+?)\s*$/);
            if (m) (cur as Record<string, string>)[m[1]] = m[2];
        }
    }
    return mods.filter(
        (m): m is { path: string; url: string } =>
            typeof m.path === "string" && typeof m.url === "string",
    );
}

/** Treats https / git / ssh URLs that point at the same GitHub repo as equal. */
function normalizeGithubUrl(url: string | undefined): string {
    if (!url) return "";
    let s = url.trim().toLowerCase().replace(/\.git$/, "");
    s = s.replace(/^git@github\.com:/, "https://github.com/");
    s = s.replace(/^git\+/, "");
    s = s.replace(/^ssh:\/\/git@github\.com\//, "https://github.com/");
    return s;
}

/**
 * Validates and normalizes a raw manifest entry. Drops anything missing the
 * fields the UI relies on so a partially corrupted manifest still renders the
 * good rows.
 */
function normalizeEntry(raw: unknown, fallbackRank: number): DiscoverEntry | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const fullName = typeof r.fullName === "string" ? r.fullName : "";
    const htmlUrl = typeof r.htmlUrl === "string" ? r.htmlUrl : "";
    if (!fullName || !htmlUrl) return null;
    const [ownerFromFull, nameFromFull] = fullName.split("/");
    return {
        rank: typeof r.rank === "number" && r.rank > 0 ? r.rank : fallbackRank,
        fullName,
        owner: typeof r.owner === "string" && r.owner ? r.owner : ownerFromFull,
        name: typeof r.name === "string" && r.name ? r.name : nameFromFull || fullName,
        htmlUrl,
        cloneUrl:
            typeof r.cloneUrl === "string" && r.cloneUrl
                ? r.cloneUrl
                : `${htmlUrl}.git`,
        description: typeof r.description === "string" ? r.description : "",
        stars: typeof r.stars === "number" && r.stars >= 0 ? r.stars : 0,
        topics: Array.isArray(r.topics)
            ? r.topics.filter((t): t is string => typeof t === "string")
            : [],
        defaultBranch:
            typeof r.defaultBranch === "string" && r.defaultBranch
                ? r.defaultBranch
                : "main",
        pushedAt: typeof r.pushedAt === "string" ? r.pushedAt : undefined,
    };
}

/** Parses a manifest blob with best-effort tolerance. */
function parseManifest(raw: string, errors: string[]): DiscoverManifest | undefined {
    let json: unknown;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        errors.push(`manifest parse: ${(e as Error).message}`);
        return undefined;
    }
    if (!json || typeof json !== "object") {
        errors.push("manifest: not an object");
        return undefined;
    }
    const j = json as Record<string, unknown>;
    const rawEntries = Array.isArray(j.entries) ? j.entries : [];
    const entries: DiscoverEntry[] = [];
    rawEntries.forEach((e, i) => {
        const norm = normalizeEntry(e, i + 1);
        if (norm) entries.push(norm);
        else errors.push(`manifest: entry #${i + 1} missing required fields`);
    });
    const auth = j.auth === "gh" || j.auth === "anonymous" ? j.auth : "anonymous";
    return {
        schemaVersion: 1,
        discoveredAt:
            typeof j.discoveredAt === "string" ? j.discoveredAt : new Date(0).toISOString(),
        queries: Array.isArray(j.queries)
            ? j.queries.filter((q): q is string => typeof q === "string")
            : [],
        auth,
        rateLimited: j.rateLimited === true ? true : undefined,
        entries,
    };
}

/**
 * Reads .discover/results.json from the repo root, returning the ranked
 * entries annotated with vendored status. Server-only — uses fs.
 *
 * The web app's cwd is apps/web/ under the npm scripts; this reader walks up
 * to the repo root before resolving the manifest path.
 */
export function readDiscoverManifest(
    opts: { force?: boolean; cwd?: string } = {},
): DiscoverResult {
    const started = Date.now();
    const repoRoot = resolveRepoRoot(opts.cwd || process.cwd());
    const manifestPath = path.join(repoRoot, MANIFEST_REL);

    let manifestMtime = 0;
    let manifestExists = false;
    try {
        const st = fs.statSync(manifestPath);
        manifestMtime = st.mtimeMs;
        manifestExists = true;
    } catch {
        /* not present yet */
    }

    if (
        !opts.force &&
        cache &&
        Date.now() - cache.at < CACHE_TTL_MS &&
        cache.result.manifestPath === manifestPath &&
        cache.manifestMtime === manifestMtime
    ) {
        return cache.result;
    }

    const errors: string[] = [];
    let manifest: DiscoverManifest | undefined;

    if (manifestExists) {
        try {
            const raw = fs.readFileSync(manifestPath, "utf8");
            manifest = parseManifest(raw, errors);
        } catch (e) {
            errors.push(`manifest read: ${(e as Error).message}`);
        }
    }

    const mods = readGitmodules(repoRoot);
    const items: DiscoverItem[] = manifest
        ? manifest.entries.map((entry) => {
              const target = normalizeGithubUrl(entry.htmlUrl);
              const match = mods.find((m) => normalizeGithubUrl(m.url) === target);
              return {
                  ...entry,
                  vendored: Boolean(match),
                  vendorPath: match?.path,
              };
          })
        : [];

    const result: DiscoverResult = {
        repoRoot,
        manifestPath,
        manifestExists,
        manifest,
        items,
        scannedAt: new Date().toISOString(),
        errors,
        durationMs: Date.now() - started,
    };

    cache = { result, at: Date.now(), manifestMtime };
    return result;
}

/** Drops the in-process cache. Tests / the API route use this with ?force=1. */
export function clearDiscoverCache(): void {
    cache = null;
}
