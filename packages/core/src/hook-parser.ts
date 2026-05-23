import fs from "fs";
import type { HookEvent } from "./types";

/** Lifecycle events Claude Code currently understands. */
const KNOWN_EVENTS: readonly HookEvent[] = [
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "Notification",
    "Stop",
    "SubagentStop",
    "SessionStart",
    "SessionEnd",
    "PreCompact",
];

export interface ParsedHookEntry {
    event: HookEvent;
    matcher: string;
    type: string;
    command: string;
    timeout?: number;
    /** 0-based index within the matcher group, so duplicates remain addressable. */
    indexInGroup: number;
}

export interface ParsedSettings {
    /** Full file contents (utf8), or empty string when unreadable. */
    raw: string;
    /** Flattened list of every hook declaration in the file. */
    entries: ParsedHookEntry[];
    /** Non-fatal parse errors (malformed JSON, unknown event names, …). */
    errors: string[];
}

/**
 * Reads `hooks` out of a Claude Code settings.json and flattens every
 * declaration into a flat list. Tolerates malformed JSON the same way
 * skill-parser.ts tolerates malformed YAML: anything that cannot be parsed
 * is reported in `errors`, never thrown.
 *
 * Every other key in the settings file is intentionally ignored.
 */
export function parseSettingsJson(filePath: string): ParsedSettings {
    let raw = "";
    try {
        raw = fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return { raw: "", entries: [], errors: [`read ${filePath}: ${(e as Error).message}`] };
    }

    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return {
            raw,
            entries: [],
            errors: [`parse ${filePath}: ${(e as Error).message}`],
        };
    }

    if (!data || typeof data !== "object") {
        return { raw, entries: [], errors: [] };
    }
    const hooks = (data as Record<string, unknown>).hooks;
    if (!hooks || typeof hooks !== "object") {
        return { raw, entries: [], errors: [] };
    }

    const errors: string[] = [];
    const entries: ParsedHookEntry[] = [];

    for (const [event, groups] of Object.entries(hooks as Record<string, unknown>)) {
        if (!KNOWN_EVENTS.includes(event as HookEvent)) {
            errors.push(`unknown hook event "${event}" in ${filePath}`);
            continue;
        }
        if (!Array.isArray(groups)) continue;
        for (const group of groups) {
            if (!group || typeof group !== "object") continue;
            const g = group as Record<string, unknown>;
            const matcher = typeof g.matcher === "string" ? g.matcher : "";
            const list = g.hooks;
            if (!Array.isArray(list)) continue;
            list.forEach((entry, idx) => {
                if (!entry || typeof entry !== "object") return;
                const e = entry as Record<string, unknown>;
                const type = typeof e.type === "string" && e.type.trim() ? e.type : "command";
                const command = typeof e.command === "string" ? e.command : "";
                if (!command.trim()) return;
                const timeout =
                    typeof e.timeout === "number" && Number.isFinite(e.timeout)
                        ? e.timeout
                        : undefined;
                entries.push({
                    event: event as HookEvent,
                    matcher,
                    type,
                    command,
                    timeout,
                    indexInGroup: idx,
                });
            });
        }
    }

    return { raw, entries, errors };
}
