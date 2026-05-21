import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
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
  if (host.toLowerCase().includes("github.com")) {
    return { kind: "github", label: repoPath, url: `https://github.com/${repoPath}` };
  }
  return { kind: "git", label: host ? `${host}/${repoPath}` : repoPath };
}

const remoteCache = new Map<string, SkillSource>();

/** Resolves where a skill's files came from: a GitHub repo, another git host, or a local directory. */
export function resolveSource(skillDir: string): SkillSource {
  const repoRoot = findRepoRoot(skillDir);
  if (!repoRoot) {
    // Not in a git repo — the "source" is the directory that contains the skill.
    return { kind: "local", label: path.dirname(skillDir) };
  }

  const cached = remoteCache.get(repoRoot);
  if (cached) return cached;

  const remote =
    git(repoRoot, ["remote", "get-url", "origin"]) ||
    git(repoRoot, ["config", "--get", "remote.origin.url"]);
  const branch = git(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? undefined;

  let source: SkillSource;
  if (remote) {
    const norm = normalizeGitUrl(remote);
    source = { kind: norm.kind, label: norm.label, url: norm.url, repoRoot, branch };
  } else {
    source = { kind: "local", label: repoRoot, repoRoot, branch };
  }

  remoteCache.set(repoRoot, source);
  return source;
}

/** Last commit date (ISO) that touched a given path, or null. */
export function lastCommitDate(repoRoot: string, targetPath: string): string | null {
  return git(repoRoot, ["log", "-1", "--format=%cI", "--", targetPath]);
}

/** Clears the per-repo remote cache (call before a forced rescan). */
export function clearGitCache(): void {
  remoteCache.clear();
}
