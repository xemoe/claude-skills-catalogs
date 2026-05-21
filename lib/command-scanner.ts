import crypto from "crypto";
import fs from "fs";
import path from "path";
import { claudeHome, personalCommandsDir, pluginsDir } from "./claude-paths";
import { parseCommandMd } from "./command-parser";
import { loadConfig } from "./config";
import { clearGitCache, resolveSource } from "./git";
import { readPluginJson, safeExists, SKIP_DIRS } from "./scanner";
import { excerpt } from "./skill-parser";
import type {
  Command,
  CommandScanResult,
  CommandScope,
  PluginInfo,
  ProjectInfo,
  ScanRoot,
} from "./types";
import { readProjectPaths } from "./usage";

const CACHE_TTL_MS = 8000;
let cache: { result: CommandScanResult; at: number } | null = null;

/** A directory of command files, plus the scope every command inside it inherits. */
interface CommandRoot {
  /** The commands/ directory on disk. */
  dir: string;
  scope: CommandScope;
  label: string;
  plugin?: PluginInfo;
  project?: ProjectInfo;
}

/** Recursively finds every .md file under a commands directory. */
function findCommandFiles(dir: string, maxDepth: number, errors: string[]): string[] {
  const results: string[] = [];
  const walk = (d: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch (e) {
      errors.push(`read ${d}: ${(e as Error).message}`);
      return;
    }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  };
  walk(dir, 0);
  return results;
}

/** Walks the plugins directory to find every plugin root (a dir with .claude-plugin/plugin.json). */
function findPluginRoots(root: string, maxDepth: number, errors: string[]): string[] {
  const results: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    if (safeExists(path.join(dir, ".claude-plugin", "plugin.json"))) {
      results.push(dir);
      return;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      errors.push(`read ${dir}: ${(e as Error).message}`);
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  };
  walk(root, 0);
  return results;
}

/** Resolves every directory that holds slash-command files, tagged with its scope. */
function getCommandRoots(errors: string[]): CommandRoot[] {
  const config = loadConfig();
  const roots: CommandRoot[] = [];

  const personal = personalCommandsDir();
  if (safeExists(personal)) {
    roots.push({ dir: personal, scope: "personal", label: "Personal commands" });
  }

  const plugins = pluginsDir();
  if (safeExists(plugins)) {
    for (const pluginRoot of findPluginRoots(plugins, 9, errors)) {
      const commandsDir = path.join(pluginRoot, "commands");
      if (!safeExists(commandsDir)) continue;
      const plugin = readPluginJson(pluginRoot);
      if (!plugin) continue;
      roots.push({
        dir: commandsDir,
        scope: "plugin",
        label: `Plugin: ${plugin.name}`,
        plugin,
      });
    }
  }

  if (config.includeProjectSkills) {
    const projects = new Set<string>(readProjectPaths());
    projects.add(process.cwd());
    for (const proj of projects) {
      const commandsDir = path.join(proj, ".claude", "commands");
      if (!safeExists(commandsDir)) continue;
      roots.push({
        dir: commandsDir,
        scope: "project",
        label: `Project: ${path.basename(proj)}`,
        project: { name: path.basename(proj) || proj, path: proj },
      });
    }
  }

  const seen = new Set<string>();
  const unique: CommandRoot[] = [];
  for (const r of roots) {
    const key = path.resolve(r.dir).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }
  return unique;
}

/** Derives the invocable command name from a file's path relative to its commands/ root. */
function commandNameFrom(
  commandsDir: string,
  filePath: string,
): { name: string; namespace?: string } {
  const rel = path.relative(commandsDir, filePath);
  const noExt = rel.slice(0, rel.length - path.extname(rel).length);
  const segments = noExt.split(path.sep).filter(Boolean);
  const name = segments.join(":");
  const namespace =
    segments.length > 1 ? segments.slice(0, -1).join(":") : undefined;
  return { name, namespace };
}

function buildCommand(filePath: string, root: CommandRoot): Command | null {
  const { name, namespace } = commandNameFrom(root.dir, filePath);
  if (!name) return null;

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }

  const parsed = parseCommandMd(filePath);
  const source = resolveSource(path.dirname(filePath));
  const idBasis =
    root.scope === "plugin" && root.plugin
      ? `plugin:${root.plugin.name}:${name}`
      : root.scope === "project" && root.project
        ? `project:${root.project.path}:${name}`
        : `personal:${name}`;

  return {
    id: crypto.createHash("sha1").update(idBasis).digest("hex").slice(0, 12),
    name,
    description:
      parsed.description || excerpt(parsed.body, 160) || "(no description)",
    scope: root.scope,
    path: filePath,
    namespace,
    argumentHint: parsed.argumentHint,
    allowedTools: parsed.allowedTools,
    model: parsed.model,
    disableModelInvocation: parsed.disableModelInvocation,
    lastUpdated: new Date(stat.mtimeMs || Date.now()).toISOString(),
    sizeBytes: stat.size,
    source,
    plugin: root.plugin,
    project: root.project,
    bodyExcerpt: excerpt(parsed.body, 240),
  };
}

/** Scans every known location for deployed Claude Code slash commands. */
export function scanCommands(opts: { force?: boolean } = {}): CommandScanResult {
  if (!opts.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.result;
  }

  const started = Date.now();
  clearGitCache();
  const errors: string[] = [];
  const commandRoots = getCommandRoots(errors);

  const byId = new Map<string, Command>();
  const roots: ScanRoot[] = [];
  for (const root of commandRoots) {
    const files = findCommandFiles(root.dir, 6, errors);
    let count = 0;
    for (const file of files) {
      let command: Command | null = null;
      try {
        command = buildCommand(file, root);
      } catch (e) {
        errors.push(`build ${file}: ${(e as Error).message}`);
      }
      if (!command) continue;
      count++;
      const existing = byId.get(command.id);
      if (
        !existing ||
        Date.parse(command.lastUpdated) > Date.parse(existing.lastUpdated)
      ) {
        byId.set(command.id, command);
      }
    }
    roots.push({
      path: root.dir,
      kind: root.scope,
      label: root.label,
      maxDepth: 6,
      exists: true,
      count,
    });
  }

  const commands = [...byId.values()].sort(
    (a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated),
  );

  const result: CommandScanResult = {
    commands,
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

export function getCommandById(id: string): Command | undefined {
  return scanCommands().commands.find((c) => c.id === id);
}
