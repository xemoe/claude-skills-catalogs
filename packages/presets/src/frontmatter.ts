// packages/presets/src/frontmatter.ts
//
// Core's packages/core/src/frontmatter.ts is a read-only parsing helper
// (splitFrontmatter, asBoolean, lenientField, etc.) — it has no write API.
// skill-parser.ts already uses gray-matter for parsing, and matter.stringify
// is the established write path in this codebase. We use gray-matter directly
// here rather than pulling in core's wrapper.

import matter from "gray-matter";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { InvocationState } from "./types.js";

/**
 * Read the disable-model-invocation flag from a file's frontmatter.
 * Returns "disabled" if the flag is truthy, "enabled" otherwise (including missing key).
 * Throws if the file is unreadable or the frontmatter cannot be parsed at all.
 */
export function readInvocation(filePath: string): InvocationState {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = matter(src);
    const flag = parsed.data?.["disable-model-invocation"];
    return flag === true ? "disabled" : "enabled";
}

/**
 * Atomically write the disable-model-invocation flag to a file's frontmatter.
 * - to "enabled":   removes the key entirely (cleaner than setting to false)
 * - to "disabled":  sets the key to true
 * Uses temp-file + rename for atomicity. exFAT supports rename for files
 * (it's symlinks that fail).
 */
export function writeInvocation(filePath: string, state: InvocationState): void {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = matter(src);
    const data = { ...(parsed.data ?? {}) };
    if (state === "disabled") {
        data["disable-model-invocation"] = true;
    } else {
        delete data["disable-model-invocation"];
    }
    const out = matter.stringify(parsed.content, data);
    const tmp = filePath + ".tmp-preset-" + process.pid + "-" + Date.now();
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(tmp, out, "utf8");
    renameSync(tmp, filePath);
}
