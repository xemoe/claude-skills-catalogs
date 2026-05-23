import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
    claudeHome,
    personalSettingsPath,
    pluginSettingsPath,
    pluginsDir,
    projectLocalSettingsPath,
    projectSettingsPath,
} from "./claude-paths";
import { loadConfig } from "./config";
import { clearGitCache, resolveSource } from "./git";
import { parseSettingsJson } from "./hook-parser";
import { readPluginJson, safeExists, SKIP_DIRS } from "./scanner";
import type {
    Hook,
    HookScanResult,
    HookScope,
    PluginInfo,
    ProjectInfo,
    ScanRoot,
    ScanRootLabelKey,
} from "./types";
import { readProjectPaths } from "./usage";

const CACHE_TTL_MS = 8000;
let cache: { result: HookScanResult; at: number } | null = null;

/** A single settings.json file, plus the scope every hook inside it inherits. */
interface SettingsRoot {
    /** Absolute path to the settings file. */
    path: string;
    scope: HookScope;
    label: string;
    labelKey: ScanRootLabelKey;
    labelArg?: string;
    plugin?: PluginInfo;
    project?: ProjectInfo;
}

/** Walks the plugins directory to find every plugin root. Mirrors command-scanner. */
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

/** Resolves every settings.json file we should look at, tagged with its scope. */
function getSettingsRoots(errors: string[]): SettingsRoot[] {
    const config = loadConfig();
    const roots: SettingsRoot[] = [];

    const personal = personalSettingsPath();
    if (safeExists(personal)) {
        roots.push({
            path: personal,
            scope: "personal",
            label: "Personal settings",
            labelKey: "personalSettings",
        });
    }

    const plugins = pluginsDir();
    if (safeExists(plugins)) {
        for (const pluginRoot of findPluginRoots(plugins, 9, errors)) {
            const settings = pluginSettingsPath(pluginRoot);
            if (!safeExists(settings)) continue;
            const plugin = readPluginJson(pluginRoot);
            if (!plugin) continue;
            roots.push({
                path: settings,
                scope: "plugin",
                label: `Plugin: ${plugin.name}`,
                labelKey: "plugin",
                labelArg: plugin.name,
                plugin,
            });
        }
    }

    if (config.includeProjectSkills) {
        const projects = new Set<string>(readProjectPaths());
        projects.add(process.cwd());
        for (const proj of projects) {
            const projInfo: ProjectInfo = {
                name: path.basename(proj) || proj,
                path: proj,
            };
            const settings = projectSettingsPath(proj);
            if (safeExists(settings)) {
                roots.push({
                    path: settings,
                    scope: "project",
                    label: `Project: ${projInfo.name}`,
                    labelKey: "projectSettings",
                    labelArg: projInfo.name,
                    project: projInfo,
                });
            }
            const local = projectLocalSettingsPath(proj);
            if (safeExists(local)) {
                roots.push({
                    path: local,
                    scope: "local",
                    label: `Project local: ${projInfo.name}`,
                    labelKey: "projectLocalSettings",
                    labelArg: projInfo.name,
                    project: projInfo,
                });
            }
        }
    }

    const seen = new Set<string>();
    const unique: SettingsRoot[] = [];
    for (const r of roots) {
        const key = path.resolve(r.path).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(r);
    }
    return unique;
}

/** Materializes every hook declaration in a settings file into Hook records. */
function buildHooksFor(root: SettingsRoot, errors: string[]): Hook[] {
    let stat: fs.Stats;
    try {
        stat = fs.statSync(root.path);
    } catch {
        return [];
    }

    const parsed = parseSettingsJson(root.path);
    for (const err of parsed.errors) errors.push(err);

    const lastUpdated = new Date(stat.mtimeMs || Date.now()).toISOString();
    const source = resolveSource(path.dirname(root.path));
    const out: Hook[] = [];

    for (const entry of parsed.entries) {
        const scopeBasis =
            root.scope === "plugin" && root.plugin
                ? `plugin:${root.plugin.name}`
                : root.scope === "project" && root.project
                    ? `project:${root.project.path}`
                    : root.scope === "local" && root.project
                        ? `local:${root.project.path}`
                        : "personal";
        const idBasis = `${scopeBasis}:${entry.event}:${entry.matcher}:${entry.command}:${entry.indexInGroup}`;

        out.push({
            id: crypto.createHash("sha1").update(idBasis).digest("hex").slice(0, 12),
            event: entry.event,
            matcher: entry.matcher,
            type: entry.type,
            command: entry.command,
            timeout: entry.timeout,
            scope: root.scope,
            sourcePath: root.path,
            lastUpdated,
            sourceSizeBytes: stat.size,
            source,
            plugin: root.plugin,
            project: root.project,
            indexInGroup: entry.indexInGroup,
        });
    }
    return out;
}

/** Scans every known settings.json for declared Claude Code hooks. */
export function scanHooks(opts: { force?: boolean } = {}): HookScanResult {
    if (!opts.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
        return cache.result;
    }

    const started = Date.now();
    clearGitCache();
    const errors: string[] = [];
    const settingsRoots = getSettingsRoots(errors);

    const byId = new Map<string, Hook>();
    const roots: ScanRoot[] = [];
    for (const root of settingsRoots) {
        const hooks = buildHooksFor(root, errors);
        let count = 0;
        for (const hook of hooks) {
            count++;
            const existing = byId.get(hook.id);
            if (
                !existing ||
                Date.parse(hook.lastUpdated) > Date.parse(existing.lastUpdated)
            ) {
                byId.set(hook.id, hook);
            }
        }
        roots.push({
            path: root.path,
            kind: root.scope,
            label: root.label,
            labelKey: root.labelKey,
            labelArg: root.labelArg,
            maxDepth: 0,
            exists: true,
            count,
        });
    }

    const hooks = [...byId.values()].sort((a, b) => {
        const t = Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        if (t !== 0) return t;
        const ev = a.event.localeCompare(b.event);
        if (ev !== 0) return ev;
        return a.matcher.localeCompare(b.matcher);
    });

    const result: HookScanResult = {
        hooks,
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

export function getHookById(id: string): Hook | undefined {
    return scanHooks().hooks.find((h) => h.id === id);
}
