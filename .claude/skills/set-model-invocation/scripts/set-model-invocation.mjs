#!/usr/bin/env node
/**
 * set-model-invocation - inspect and change the `disable-model-invocation`
 * frontmatter of Claude Skills and slash commands.
 * Bundled with the set-model-invocation project skill. No dependencies (Node 18+).
 *
 * `disable-model-invocation: true` makes a skill or command slash-only - Claude
 * will not invoke it on its own, only the user can via `/`. Absent (or false),
 * Claude may invoke it automatically when its description matches.
 *
 * This script lists every personal and project skill/command with that setting,
 * and edits a single SKILL.md / command .md file in place. Plugin skills are
 * left alone - they are owned by the plugin that ships them.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const KEY = "disable-model-invocation";
const SKIP_DIRS = new Set([".git", "node_modules", ".next"]);
// Matches the disable-model-invocation key line in either kebab or camel case.
const KEY_LINE = /^[ \t]*(?:disable-model-invocation|disableModelInvocation)[ \t]*:/i;

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(1);
}

/** Root of the Claude config directory, overridable via CLAUDE_CONFIG_DIR. */
function claudeHome() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** Case-insensitive path compare on Windows, case-sensitive elsewhere. */
function samePath(a, b) {
    const na = path.resolve(a);
    const nb = path.resolve(b);
    return process.platform === "win32"
        ? na.toLowerCase() === nb.toLowerCase()
        : na === nb;
}

/** A short, copy-pasteable path to this script for hint messages. */
function invocation() {
    const r = path.relative(process.cwd(), SCRIPT_PATH);
    return !r || r.startsWith("..") ? SCRIPT_PATH : r.split(path.sep).join("/");
}

/**
 * The directories searched for editable skills and commands: the personal
 * ~/.claude ones and the current project's .claude ones. A project root that
 * resolves to the same path as a personal root (running from ~ itself) is
 * dropped so nothing is listed twice.
 */
function resolvedRoots() {
    const home = claudeHome();
    const project = path.join(process.cwd(), ".claude");
    const raw = [
        { kind: "skill", scope: "personal", dir: path.join(home, "skills") },
        { kind: "command", scope: "personal", dir: path.join(home, "commands") },
        { kind: "skill", scope: "project", dir: path.join(project, "skills") },
        { kind: "command", scope: "project", dir: path.join(project, "commands") },
    ];
    const seen = [];
    const out = [];
    for (const r of raw) {
        const dir = path.resolve(r.dir);
        if (seen.some((s) => samePath(s, dir))) continue;
        seen.push(dir);
        out.push({ ...r, dir });
    }
    return out;
}

/** Recursively collects files under root whose name satisfies predicate. */
function walkFiles(root, predicate) {
    const found = [];
    if (!fs.existsSync(root)) return found;
    const stack = [root];
    while (stack.length) {
        const dir = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (!SKIP_DIRS.has(e.name)) stack.push(full);
            } else if (e.isFile() && predicate(e.name)) {
                found.push(full);
            }
        }
    }
    return found;
}

/** Reads the raw frontmatter block of a markdown file, or "" when there is none. */
function frontmatterBlock(file) {
    let text;
    try {
        text = fs.readFileSync(file, "utf8");
    } catch {
        return "";
    }
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    return m ? m[1] : "";
}

/** Pulls a single scalar frontmatter field, stripping surrounding quotes. */
function frontmatterField(block, key) {
    const m = block.match(
        new RegExp(`^[ \\t]*${key}[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, "im"),
    );
    if (!m) return undefined;
    let v = m[1].trim();
    if (
        v.length >= 2 &&
        ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))
    ) {
        v = v.slice(1, -1);
    }
    return v.trim() || undefined;
}

/** Current disable-model-invocation value of a file: true, false, or undefined. */
function readCurrent(file) {
    const block = frontmatterBlock(file);
    if (!block) return undefined;
    const line = block.match(
        /^[ \t]*(?:disable-model-invocation|disableModelInvocation)[ \t]*:[ \t]*(.+?)[ \t]*$/im,
    );
    if (!line) return undefined;
    let v = line[1].trim().toLowerCase();
    if (
        v.length >= 2 &&
        ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))
    ) {
        v = v.slice(1, -1).trim();
    }
    if (v === "true") return true;
    if (v === "false") return false;
    return undefined;
}

/** Every editable skill and command across the personal and project roots. */
function collectItems() {
    const items = [];
    for (const root of resolvedRoots()) {
        if (root.kind === "skill") {
            for (const file of walkFiles(root.dir, (n) => n === "SKILL.md")) {
                const dir = path.dirname(file);
                const handle = path.basename(dir);
                items.push({
                    kind: "skill",
                    scope: root.scope,
                    name: frontmatterField(frontmatterBlock(file), "name") || handle,
                    handle,
                    file,
                    current: readCurrent(file),
                });
            }
        } else {
            for (const file of walkFiles(root.dir, (n) => /\.md$/i.test(n))) {
                const name = path
                    .relative(root.dir, file)
                    .replace(/\.md$/i, "")
                    .split(path.sep)
                    .join(":");
                items.push({
                    kind: "command",
                    scope: root.scope,
                    name,
                    handle: name,
                    file,
                    current: readCurrent(file),
                });
            }
        }
    }
    return items;
}

/** Human-readable state of a disable-model-invocation value. */
function describeState(val) {
    if (val === true) return `slash-only (${KEY}: true)`;
    if (val === false) return `model-invokable (${KEY}: false)`;
    return `model-invokable (${KEY} not set)`;
}

/** True when query names this item (directory/command name, frontmatter name, or command leaf). */
function itemMatches(it, query) {
    const q = query.toLowerCase();
    if (it.handle.toLowerCase() === q) return true;
    if (it.name.toLowerCase() === q) return true;
    if (it.kind === "command" && it.handle.toLowerCase().split(":").pop() === q) {
        return true;
    }
    return false;
}

/** Resolves a path-form query to a SKILL.md / command .md file, or null. */
function resolvePathQuery(query) {
    const abs = path.resolve(query);
    let stat;
    try {
        stat = fs.statSync(abs);
    } catch {
        return null;
    }
    if (stat.isFile() && /\.md$/i.test(abs)) return abs;
    if (stat.isDirectory()) {
        const skillMd = path.join(abs, "SKILL.md");
        if (fs.existsSync(skillMd)) return skillMd;
    }
    return null;
}

/** Resolves a query (name or path) to exactly one item, or exits with guidance. */
function resolveQuery(query, opts) {
    const looksPath =
        /[\\/]/.test(query) || /\.md$/i.test(query) || fs.existsSync(query);
    if (looksPath) {
        const file = resolvePathQuery(query);
        if (!file) fail(`no SKILL.md or command .md found at "${query}"`);
        const kind =
            path.basename(file).toLowerCase() === "skill.md" ? "skill" : "command";
        const name =
            kind === "skill"
                ? path.basename(path.dirname(file))
                : path.basename(file).replace(/\.md$/i, "");
        return { kind, scope: "path", name, handle: query, file, current: readCurrent(file) };
    }

    let matches = collectItems().filter((it) => itemMatches(it, query));
    if (opts.type) matches = matches.filter((it) => it.kind === opts.type);

    if (matches.length === 0) {
        fail(
            `no skill or command named "${query}" in the personal (~/.claude) ` +
                `or project (.claude) directories. Run \`list\` to see them.`,
        );
    }
    if (matches.length > 1) {
        console.error(`error: "${query}" is ambiguous - ${matches.length} matches:`);
        for (const m of matches) {
            console.error(`  [${m.kind} / ${m.scope}]  ${m.file}`);
        }
        console.error("Narrow it with --type skill|command, or pass a full file path.");
        process.exit(1);
    }
    return matches[0];
}

/**
 * Writes the disable-model-invocation key into a file's frontmatter.
 *   value === true | false  -> the key is written with that value
 *   value === null          -> the key is removed (model invocation, the default)
 * The body, key order, line endings and BOM are preserved.
 * With dryRun the file is left untouched but the result still reports whether
 * it would have changed. Returns { changed, value }.
 */
function applyValue(file, value, dryRun = false) {
    const original = fs.readFileSync(file, "utf8");
    const hasBom = original.charCodeAt(0) === 0xfeff;
    const text = hasBom ? original.slice(1) : original;
    const eol = /\r\n/.test(text) ? "\r\n" : "\n";
    const newLine = `${KEY}: ${value}`;

    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
    let updated;

    if (fmMatch) {
        const inner = fmMatch[1].split(/\r?\n/);
        const idx = inner.findIndex((l) => KEY_LINE.test(l));
        let nextInner;
        if (idx !== -1) {
            nextInner =
                value === null
                    ? inner.filter((_, i) => i !== idx)
                    : inner.map((l, i) => (i === idx ? newLine : l));
        } else {
            nextInner = value === null ? inner : [...inner, newLine];
        }
        const rest = text.slice(fmMatch[0].length);
        if (nextInner.every((l) => l.trim() === "")) {
            // Frontmatter is now empty - drop the whole block and a blank line.
            updated = rest.replace(/^\r?\n/, "");
        } else {
            updated = `---${eol}${nextInner.join(eol)}${eol}---${fmMatch[2]}${rest}`;
        }
    } else {
        updated =
            value === null
                ? text
                : `---${eol}${newLine}${eol}---${eol}${eol}${text}`;
    }

    const finalText = hasBom ? String.fromCharCode(0xfeff) + updated : updated;
    if (finalText === original) return { changed: false, value };
    if (!dryRun) fs.writeFileSync(file, finalText);
    return { changed: true, value };
}

function parseArgs(argv) {
    const opts = { _: [] };
    const take = { "--type": "type", "-t": "type" };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i];
        if (a === "--help" || a === "-h") {
            opts.help = true;
            continue;
        }
        if (a === "--dry-run" || a === "-n") {
            opts.dryRun = true;
            continue;
        }
        let inlineVal;
        const eq = a.indexOf("=");
        if (a.startsWith("--") && eq !== -1) {
            inlineVal = a.slice(eq + 1);
            a = a.slice(0, eq);
        }
        if (take[a]) {
            const v = inlineVal !== undefined ? inlineVal : argv[++i];
            if (v === undefined) fail(`${a} needs a value`);
            opts[take[a]] = v;
            continue;
        }
        if (a.length > 1 && a.startsWith("-")) fail(`unknown option: ${argv[i]}`);
        opts._.push(a);
    }
    if (opts.type) {
        opts.type = opts.type.toLowerCase();
        if (opts.type !== "skill" && opts.type !== "command") {
            fail('--type must be "skill" or "command"');
        }
    }
    return opts;
}

function cmdList() {
    const items = collectItems();
    if (!items.length) {
        console.log(
            "No skills or commands found in the personal (~/.claude) or " +
                "project (.claude) directories.",
        );
        return;
    }
    console.log("Model invocation status - personal & project skills and commands\n");
    for (const kind of ["skill", "command"]) {
        const ofKind = items.filter((it) => it.kind === kind);
        if (!ofKind.length) continue;
        console.log(kind === "skill" ? "SKILLS" : "COMMANDS");
        for (const scope of ["personal", "project"]) {
            const group = ofKind
                .filter((it) => it.scope === scope)
                .sort((a, b) => a.name.localeCompare(b.name));
            if (!group.length) continue;
            console.log(`  [${scope}]`);
            for (const it of group) {
                const state =
                    it.current === true ? "slash-only" : "model-invokable";
                const note =
                    it.current === true
                        ? `${KEY}: true`
                        : it.current === false
                          ? `${KEY}: false`
                          : `${KEY} not set`;
                console.log(
                    `    ${state.padEnd(16)}${it.name.padEnd(30)}${note}`,
                );
            }
        }
        console.log("");
    }
    console.log(
        `Change one with:  node ${invocation()} set <name> <true|false|unset|toggle>`,
    );
}

function cmdGet(opts) {
    const query = opts._[1];
    if (!query) fail("get: missing skill or command name. Run `list` to see options.");
    const item = resolveQuery(query, opts);
    console.log(`${item.kind}  "${item.name}"  [${item.scope}]`);
    console.log(`  ${item.file}`);
    console.log(`  ${describeState(item.current)}`);
}

function cmdSet(opts) {
    const query = opts._[1];
    const rawValue = opts._[2];
    if (!query) fail("set: missing skill or command name. Run `list` to see options.");
    if (rawValue === undefined) {
        fail("set: missing value. Use true | false | unset | toggle.");
    }

    const item = resolveQuery(query, opts);

    let value;
    switch (rawValue.toLowerCase()) {
        case "true":
            value = true;
            break;
        case "false":
            value = false;
            break;
        case "unset":
        case "remove":
        case "none":
            value = null;
            break;
        case "toggle":
            value = item.current === true ? null : true;
            break;
        default:
            fail(`set: invalid value "${rawValue}". Use true | false | unset | toggle.`);
    }

    const before = item.current;
    const result = applyValue(item.file, value, opts.dryRun);

    if (!result.changed) {
        console.log(
            `No change - ${item.kind} "${item.name}" is already ${describeState(before)}.`,
        );
        console.log(`  ${item.file}`);
        return;
    }
    const after = value === null ? undefined : value;
    console.log(
        `${opts.dryRun ? "[dry run] Would update" : "Updated"} ${item.kind} "${item.name}"`,
    );
    console.log(`  ${item.file}`);
    console.log(`  ${describeState(before)}`);
    console.log(`  -> ${describeState(after)}`);
    console.log(
        opts.dryRun
            ? "\nRe-run without --dry-run to apply."
            : "\nOpen the catalog and click Rescan to see it update (npm run dev).",
    );
}

/** Compact form of a disable-model-invocation value for set-all transition lines. */
function briefState(val) {
    if (val === true) return "true";
    if (val === false) return "false";
    return "unset";
}

/**
 * Applies one value to every personal & project skill and command at once -
 * the bulk operation behind "disable model invocation everywhere for an audit".
 * Honours --type and --dry-run; one unreadable file is reported, not fatal.
 */
function cmdSetAll(opts) {
    const rawValue = opts._[1];
    if (rawValue === undefined) {
        fail("set-all: missing value. Use true | false | unset.");
    }
    let value;
    switch (rawValue.toLowerCase()) {
        case "true":
            value = true;
            break;
        case "false":
            value = false;
            break;
        case "unset":
        case "remove":
        case "none":
            value = null;
            break;
        default:
            fail(`set-all: invalid value "${rawValue}". Use true | false | unset.`);
    }

    let items = collectItems();
    if (opts.type) items = items.filter((it) => it.kind === opts.type);
    if (!items.length) {
        console.log("No skills or commands found to change.");
        return;
    }

    const dry = Boolean(opts.dryRun);
    const valueLabel = value === null ? "unset (remove the key)" : String(value);
    const scopeNote = opts.type ? `${opts.type}s` : "skills and commands";
    console.log(
        `${dry ? "[dry run] " : ""}Setting ${KEY} = ${valueLabel} on all ` +
            `personal & project ${scopeNote} - ${items.length} item(s)\n`,
    );

    let changed = 0;
    let failed = 0;
    for (const kind of ["skill", "command"]) {
        const ofKind = items.filter((it) => it.kind === kind);
        if (!ofKind.length) continue;
        console.log(kind === "skill" ? "SKILLS" : "COMMANDS");
        for (const scope of ["personal", "project"]) {
            const group = ofKind
                .filter((it) => it.scope === scope)
                .sort((a, b) => a.name.localeCompare(b.name));
            if (!group.length) continue;
            console.log(`  [${scope}]`);
            for (const it of group) {
                let result;
                try {
                    result = applyValue(it.file, value, dry);
                } catch (e) {
                    failed++;
                    console.log(
                        `    ${"error".padEnd(11)}${it.name.padEnd(30)}${e.message}`,
                    );
                    continue;
                }
                if (result.changed) changed++;
                const mark = (
                    result.changed ? (dry ? "would set" : "set") : "unchanged"
                ).padEnd(11);
                const detail = result.changed
                    ? `${briefState(it.current)} -> ${briefState(value)}`
                    : `already ${briefState(it.current)}`;
                console.log(`    ${mark}${it.name.padEnd(30)}${detail}`);
            }
        }
        console.log("");
    }

    console.log(
        `${dry ? "Would change" : "Changed"} ${changed}, ` +
            `${items.length - changed - failed} already in that state` +
            (failed ? `, ${failed} could not be edited` : "") +
            ".",
    );
    if (dry) {
        console.log("Re-run without --dry-run to apply.");
    } else {
        console.log("Open the catalog and click Rescan to see it (npm run dev).");
    }
}

function usage() {
    const inv = invocation();
    return `set-model-invocation - inspect and change the ${KEY} frontmatter
of Claude Skills and slash commands.

Usage:
  node ${inv} list
  node ${inv} get <name> [--type skill|command]
  node ${inv} set <name> <true|false|unset|toggle> [--type skill|command] [--dry-run]
  node ${inv} set-all <true|false|unset> [--type skill|command] [--dry-run]

Values for \`set\` and \`set-all\` (the ${KEY} frontmatter key):
  true     slash-only - Claude will not invoke it on its own
  false    model-invokable - the key is written explicitly as false
  unset    remove the key entirely - model-invokable (the default)
  toggle   flip between slash-only and model-invokable (with set only)

set-all applies the same true/false/unset value to every personal and project
skill and command at once - the way to turn model invocation off everywhere to
audit it, then re-enable the vetted ones with set. Preview it with --dry-run.

Options:
  --type skill|command   limit the command to just skills or just commands
  --dry-run, -n          preview the change(s) without writing any file

<name> is a skill directory name or a command name (subdirectories namespaced
with \`:\`). A path to a SKILL.md, a command .md, or a skill directory also works.

Only the personal (~/.claude) and current-project (.claude) skills and commands
are scanned and edited; plugin skills are left untouched.`;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const cmd = opts._[0];
    if (opts.help || !cmd) {
        console.log(usage());
        process.exit(opts.help ? 0 : 1);
    }
    try {
        switch (cmd) {
            case "list":
                cmdList();
                break;
            case "get":
                cmdGet(opts);
                break;
            case "set":
                cmdSet(opts);
                break;
            case "set-all":
                cmdSetAll(opts);
                break;
            default:
                fail(`unknown command: ${cmd}. Use list | get | set | set-all.`);
        }
    } catch (e) {
        fail(e.message);
    }
}

main();
