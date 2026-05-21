import fs from "fs";
import path from "path";
import { claudeHome } from "./claude-paths";
import { safeExists } from "./scanner";

/** How an invocation reached Claude Code. */
export type InvocationVia = "skill-tool" | "slash";

/** A single skill/command invocation recovered from a session transcript. */
export interface ActivityEvent {
  /** Raw invocation name as it appears in the transcript. */
  name: string;
  /** Epoch milliseconds. */
  ts: number;
  via: InvocationVia;
}

export interface ActivityResult {
  /** Every recovered invocation, sorted oldest → newest. */
  events: ActivityEvent[];
  /** Transcript files successfully read. */
  fileCount: number;
  scannedAt: string;
  errors: string[];
  durationMs: number;
}

const CACHE_TTL_MS = 8000;
/** Skip pathologically large transcripts so the scan stays bounded. */
const MAX_FILE_BYTES = 64 * 1024 * 1024;
/** Read only the newest N transcripts. */
const MAX_FILES = 2000;
const COMMAND_RE = /<command-name>\s*([^<]+?)\s*<\/command-name>/;

let cache: { result: ActivityResult; at: number } | null = null;

/** Recursively collects every .jsonl transcript under a directory. */
function findTranscripts(root: string, errors: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 6) return;
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
        walk(full, depth + 1);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) {
        out.push(full);
      }
    }
  };
  walk(root, 0);
  return out;
}

/** Extracts skill/command invocations from one parsed transcript line. */
function eventsFromLine(obj: any): ActivityEvent[] {
  const ts = Date.parse(obj?.timestamp);
  if (!ts || Number.isNaN(ts)) return [];
  const content = obj?.message?.content;
  const out: ActivityEvent[] = [];

  if (Array.isArray(content)) {
    // A model-invoked skill surfaces as a `Skill` tool_use block.
    for (const block of content) {
      if (block?.type === "tool_use" && block?.name === "Skill") {
        const skill = block?.input?.skill;
        if (typeof skill === "string" && skill.trim()) {
          out.push({ name: skill.trim(), ts, via: "skill-tool" });
        }
      }
    }
  } else if (typeof content === "string" && obj?.type === "user") {
    // A typed slash invocation is wrapped in a <command-name> tag.
    const m = content.match(COMMAND_RE);
    if (m && m[1].trim()) {
      out.push({ name: m[1].trim(), ts, via: "slash" });
    }
  }
  return out;
}

/** Scans every Claude Code session transcript for skill and command invocations. */
export function scanActivity(opts: { force?: boolean } = {}): ActivityResult {
  if (!opts.force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.result;
  }

  const started = Date.now();
  const errors: string[] = [];
  const root = path.join(claudeHome(), "projects");
  const events: ActivityEvent[] = [];
  let fileCount = 0;

  if (safeExists(root)) {
    const files = findTranscripts(root, errors)
      .map((f) => {
        let mtime = 0;
        try {
          mtime = fs.statSync(f).mtimeMs;
        } catch {
          /* ignore — handled when the file is read */
        }
        return { f, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, MAX_FILES);

    for (const { f } of files) {
      try {
        if (fs.statSync(f).size > MAX_FILE_BYTES) continue;
        const text = fs.readFileSync(f, "utf8");
        fileCount++;
        for (const line of text.split("\n")) {
          if (!line) continue;
          let obj: any;
          try {
            obj = JSON.parse(line);
          } catch {
            continue;
          }
          for (const ev of eventsFromLine(obj)) events.push(ev);
        }
      } catch (e) {
        errors.push(`read ${f}: ${(e as Error).message}`);
      }
    }
  }

  events.sort((a, b) => a.ts - b.ts);

  const result: ActivityResult = {
    events,
    fileCount,
    scannedAt: new Date().toISOString(),
    errors,
    durationMs: Date.now() - started,
  };
  cache = { result, at: Date.now() };
  return result;
}
