import fs from "fs";
import { claudeJsonPath } from "./claude-paths";
import type { SkillUsage } from "./types";

interface ClaudeJson {
  skillUsage?: Record<string, { usageCount?: number; lastUsedAt?: number }>;
  projects?: Record<string, unknown>;
}

function readClaudeJson(): ClaudeJson {
  try {
    return JSON.parse(fs.readFileSync(claudeJsonPath(), "utf8")) as ClaudeJson;
  } catch {
    return {};
  }
}

/** Per-skill usage counters from ~/.claude.json, keyed by skill name. */
export function readSkillUsage(): Record<string, SkillUsage> {
  const raw = readClaudeJson().skillUsage ?? {};
  const out: Record<string, SkillUsage> = {};
  for (const [name, value] of Object.entries(raw)) {
    out[name] = {
      usageCount: typeof value.usageCount === "number" ? value.usageCount : 0,
      lastUsedAt: typeof value.lastUsedAt === "number" ? value.lastUsedAt : 0,
    };
  }
  return out;
}

/** Absolute project paths Claude Code has seen, from ~/.claude.json. */
export function readProjectPaths(): string[] {
  return Object.keys(readClaudeJson().projects ?? {});
}
