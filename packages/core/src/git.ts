import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import {
    clearMarketplaceCache,
    findMarketplacePluginEntry,
    findMarketplaceRoot,
    readMarketplaceJson,
    sourceFromMarketplaceEntry,
} from "./marketplace";
import type { SkillSource } from "./types";

function git(repoRoot: string, args: string[]): string | null {
    try {
        const out = execFileSync("git", ["-C", repoRoot, ...args], {
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
            windowsHide: true,
        });
        return out.trim() || null;
    } catch {
        return null;
    }
}

/** Walks up from a directory to find the nearest enclosing git repo root. */
export function findRepoRoot(startDir: string): string | null {
    let dir = path.resolve(startDir);
    for (let i = 0; i < 40; i++) {
        if (fs.existsSync(path.join(dir, ".git"))) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
    return null;
}

/** Converts any git remote URL into a structured source descriptor. */
export function normalizeGitUrl(raw: string): { kind: "github" | "git"; label: string; url?: string } {
    const url = raw.trim();
    let host = "";
    let repoPath = "";

    const scp = url.match(/^[\w.+-]+@([\w.-]+):(.+)$/);
    if (scp) {
        host = scp[1];
        repoPath = scp[2];
    } else {
        try {
            const u = new URL(url);
            host = u.host;
            repoPath = u.pathname.replace(/^\/+/, "");
        } catch {
            return { kind: "git", label: raw };
        }
    }

    repoPath = repoPath.replace(/\.git$/, "");
    const lowerHost = host.toLowerCase();
    if (lowerHost === "github.com" || lowerHost.endsWith(".github.com")) {
        return { kind: "github", label: repoPath, url: `https://github.com/${repoPath}` };
    }
    return { kind: "git", label: host ? `${host}/${repoPath}` : repoPath };
}

/** Filename of the provenance marker the install-vendor-skill workflow writes into each installed skill. */
export const PROVENANCE_FILE = ".vendor-source.json";

interface VendorProvenance {
    repo?: string;
    pathInRepo?: string;
    commit?: string;
    installedFrom?: string;
    installedAt?: string;
}

/** Reads the .vendor-source.json provenance marker an installed skill may carry. */
function readProvenance(skillDir: string): VendorProvenance | null {
    try {
        const parsed = JSON.parse(fs.readFileSync(path.join(skillDir, PROVENANCE_FILE), "utf8"));
        return parsed && typeof parsed === "object" ? (parsed as VendorProvenance) : null;
    } catch {
        return null;
    }
}

/**
 * Turns an install-time provenance marker into a source descriptor. The URL is the
 * repo root, matching every other GitHub-sourced skill — the exact path and commit
 * stay in the .vendor-source.json record.
 */
function sourceFromProvenance(p: VendorProvenance): SkillSource | null {
    if (p.repo) {
        const norm = normalizeGitUrl(p.repo);
        return { kind: norm.kind, label: norm.label, url: norm.url };
    }
    if (p.installedFrom) {
        return { kind: "local", label: p.installedFrom };
    }
    return null;
}

const remoteCache = new Map<string, SkillSource>();

/** Resolves where a skill's files came from: a GitHub repo, another git host, or a local directory. */
export function resolveSource(skillDir: string): SkillSource {
    // An installed copy carries a provenance marker — trust it over the directory's
    // git context, since the install location is unrelated to the skill's origin.
    const provenance = readProvenance(skillDir);
    if (provenance) {
        const fromProvenance = sourceFromProvenance(provenance);
        if (fromProvenance) return fromProvenance;
    }

    // Prefer a real git remote when one is present (e.g. cached plugins that
    // were git-cloned still know their upstream). The marketplace fallback
    // below covers the no-`.git` case.
    const repoRoot = findRepoRoot(skillDir);
    if (repoRoot) {
        const cached = remoteCache.get(repoRoot);
        if (cached) return cached;
        const remote =
            git(repoRoot, ["remote", "get-url", "origin"]) ||
            git(repoRoot, ["config", "--get", "remote.origin.url"]);
        if (remote) {
            const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? undefined;
            const norm = normalizeGitUrl(remote);
            const source: SkillSource = {
                kind: norm.kind,
                label: norm.label,
                url: norm.url,
                repoRoot,
                branch,
            };
            remoteCache.set(repoRoot, source);
            return source;
        }
    }

    // No usable git remote — try the marketplace.json the plugin was distributed
    // through. Claude Code downloads marketplaces via CDN (no .git on disk), so
    // this is the only place an upstream URL survives for many plugins.
    const marketplaceRoot = findMarketplaceRoot(skillDir);
    if (marketplaceRoot) {
        const data = readMarketplaceJson(marketplaceRoot);
        if (data) {
            const found = findMarketplacePluginEntry(skillDir, marketplaceRoot, data);
            if (found) {
                const fromMarketplace = sourceFromMarketplaceEntry(found.entry, data);
                if (fromMarketplace) {
                    if (repoRoot) {
                        const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? undefined;
                        const enriched: SkillSource = { ...fromMarketplace, repoRoot, branch };
                        remoteCache.set(repoRoot, enriched);
                        return enriched;
                    }
                    return fromMarketplace;
                }
            }
        }
    }

    if (!repoRoot) {
        // Not in a git repo — the "source" is the directory that contains the skill.
        return { kind: "local", label: path.dirname(skillDir) };
    }

    const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? undefined;
    const fallback: SkillSource = { kind: "local", label: repoRoot, repoRoot, branch };
    remoteCache.set(repoRoot, fallback);
    return fallback;
}

/** Last commit date (ISO) that touched a given path, or null. */
export function lastCommitDate(repoRoot: string, targetPath: string): string | null {
    return git(repoRoot, ["log", "-1", "--format=%cI", "--", targetPath]);
}

/** Clears the per-repo remote cache (call before a forced rescan). */
export function clearGitCache(): void {
    remoteCache.clear();
    clearMarketplaceCache();
}
