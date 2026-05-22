#!/usr/bin/env node
/**
 * git-track - version-control the Claude skills and slash commands directories.
 * Bundled with the track-skill-changes project skill. No dependencies (Node 18+).
 *
 * Puts a git repository over the Claude config directory whose .gitignore scopes
 * version control to skills/ and commands/ only, then reports changes and commits
 * snapshots. The repo lives at ~/.claude (or $CLAUDE_CONFIG_DIR, or --dir).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);

const GITIGNORE_BODY = `# Managed by the track-skill-changes skill.
# Version only skills/ and commands/ in this directory - ignore everything else.
/*
!/.gitignore
!/skills/
!/commands/

# Never track nested git repos or OS clutter inside the tracked folders.
.git/
.DS_Store
Thumbs.db
`;

const FALLBACK_IDENTITY = [
    "-c", "user.name=Claude Skills Tracker",
    "-c", "user.email=skills-tracker@localhost",
];

const CODE_WORDS = {
    A: "added", M: "modified", D: "deleted",
    R: "renamed", C: "copied", T: "type-changed",
};

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(1);
}

/** Root of the Claude config directory, overridable via CLAUDE_CONFIG_DIR. */
function claudeHome() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/**
 * Run git; return stdout with trailing whitespace stripped. Leading whitespace is
 * kept — it is significant in `git status --porcelain` (the index-status column).
 * Throws on failure with stderr in the message.
 */
function git(args) {
    try {
        return execFileSync("git", args, {
            encoding: "utf8",
            timeout: 20000,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
        }).replace(/\s+$/, "");
    } catch (e) {
        const stderr = (e.stderr || "").toString().trim();
        throw new Error(stderr || e.message || "git command failed");
    }
}

/** Best-effort git; returns trimmed stdout, or null on any failure. */
function gitQuiet(args) {
    try {
        return execFileSync("git", args, {
            encoding: "utf8",
            timeout: 20000,
            stdio: ["ignore", "pipe", "ignore"],
            windowsHide: true,
        }).trim();
    } catch {
        return null;
    }
}

function parseArgs(argv) {
    const opts = { _: [] };
    const take = {
        "--dir": "dir", "-d": "dir",
        "--message": "message", "-m": "message",
    };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i];
        if (a === "--help" || a === "-h") { opts.help = true; continue; }
        let inlineVal;
        const eq = a.indexOf("=");
        if (a.startsWith("--") && eq !== -1) { inlineVal = a.slice(eq + 1); a = a.slice(0, eq); }
        if (take[a]) {
            const v = inlineVal !== undefined ? inlineVal : argv[++i];
            if (v === undefined) fail(`${a} needs a value`);
            opts[take[a]] = v;
            continue;
        }
        if (a.length > 1 && a.startsWith("-")) fail(`unknown option: ${argv[i]}`);
        opts._.push(a);
    }
    return opts;
}

/** The directory whose skills/ and commands/ we track (default: the Claude home). */
function resolveTrackDir(opts) {
    let d = opts.dir || claudeHome();
    if (d === "~" || d.startsWith("~/") || d.startsWith("~\\")) {
        d = path.join(os.homedir(), d.slice(1));
    }
    return path.resolve(d);
}

/** A short, copy-pasteable path to this script for hint messages. */
function invocation() {
    const r = path.relative(process.cwd(), SCRIPT_PATH);
    return !r || r.startsWith("..") ? SCRIPT_PATH : r.split(path.sep).join("/");
}

/** Case-insensitive path compare on Windows, case-sensitive elsewhere. */
function samePath(a, b) {
    const na = path.resolve(a);
    const nb = path.resolve(b);
    return process.platform === "win32"
        ? na.toLowerCase() === nb.toLowerCase()
        : na === nb;
}

/**
 * Classifies dir as a git repo:
 *   none   - not inside any git repository
 *   repo   - dir is itself the root of a git repository
 *   nested - dir lies inside some other repository (root reported separately)
 */
function repoState(dir) {
    const top = gitQuiet(["-C", dir, "rev-parse", "--show-toplevel"]);
    if (top === null) return { state: "none" };
    if (samePath(top, dir)) return { state: "repo", root: path.resolve(top) };
    return { state: "nested", root: path.resolve(top) };
}

/** Inline identity args used only when no git identity is configured (never persisted). */
function identityArgs(dir) {
    const name = gitQuiet(["-C", dir, "config", "user.name"]);
    const email = gitQuiet(["-C", dir, "config", "user.email"]);
    return name && email ? [] : FALLBACK_IDENTITY;
}

function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) fail(`directory not found: ${dir}`);
}

/** Humanizes a `git status --porcelain` line into "<verb> <path>". */
function describeChange(porcelainLine) {
    const code = porcelainLine.slice(0, 2);
    const file = porcelainLine.slice(3);
    let what = "changed";
    if (code === "??" || code.includes("A")) what = "added";
    else if (code.includes("D")) what = "deleted";
    else if (code.includes("R")) what = "renamed";
    else if (code.includes("M")) what = "modified";
    return `${what.padEnd(8)} ${file}`;
}

function humanCode(code) {
    return CODE_WORDS[code[0]] || code;
}

/** Builds a default commit message from staged `--name-status` entries. */
function generateMessage(dir, entries) {
    const hasHistory = gitQuiet(["-C", dir, "rev-parse", "--verify", "HEAD"]) !== null;
    if (!hasHistory) return "Initial snapshot of Claude skills and commands";
    const items = new Set();
    for (const entry of entries) {
        const parts = entry.split("\t");
        const file = parts[parts.length - 1].replace(/\\/g, "/");
        const seg = file.split("/");
        if (seg[0] === "skills" && seg[1]) {
            items.add(`skill ${seg[1]}`);
        } else if (seg[0] === "commands" && seg.length > 1) {
            items.add(`command ${seg.slice(1).join(":").replace(/\.md$/i, "")}`);
        }
    }
    const list = [...items];
    if (list.length === 1) return `Update ${list[0]}`;
    if (list.length >= 2 && list.length <= 4) return `Update ${list.join(", ")}`;
    if (list.length > 4) return `Update ${list.length} skills and commands`;
    return `Update Claude skills and commands (${entries.length} file change(s))`;
}

function cmdStatus(opts) {
    const dir = resolveTrackDir(opts);
    ensureDirExists(dir);
    const st = repoState(dir);

    if (st.state === "nested") {
        console.log(`${dir}`);
        console.log(`is inside the git repo at ${st.root}.`);
        console.log("This skill won't operate inside another repo - your skills/ and");
        console.log("commands/ may already be versioned by that repo.");
        return;
    }
    if (st.state === "none") {
        console.log(`Not tracked yet: ${dir}`);
        console.log("Skills and commands here have no git history. Set one up with:");
        console.log(`  node ${invocation()} init`);
        return;
    }

    console.log(`Tracking repo: ${dir}`);
    const porcelain = git(["-C", dir, "status", "--porcelain"]);
    if (!porcelain) {
        console.log("Working tree clean - skills and commands match the last snapshot.");
    } else {
        const lines = porcelain.split(/\r?\n/).filter(Boolean);
        console.log(`\n${lines.length} change(s) since the last snapshot:`);
        for (const line of lines) console.log(`  ${describeChange(line)}`);
        console.log("\nSave a snapshot with:");
        console.log(`  node ${invocation()} commit "<message>"`);
    }
    const head = gitQuiet(["-C", dir, "log", "-1", "--pretty=format:%h  %s  (%cr)"]);
    if (head) console.log(`\nLast snapshot: ${head}`);
}

function cmdInit(opts) {
    const dir = resolveTrackDir(opts);
    ensureDirExists(dir);
    const st = repoState(dir);

    if (st.state === "nested") {
        fail(
            `${dir}\n` +
            `  is inside an existing git repo (${st.root}).\n` +
            `  This skill manages a dedicated repo at the config directory itself;\n` +
            `  your skills/ and commands/ are likely already versioned by that repo.`
        );
    }
    if (st.state === "repo") {
        console.log(`Already tracked: ${dir} is a git repository.`);
        if (!fs.existsSync(path.join(dir, ".gitignore"))) {
            console.log("Note: no .gitignore here, so this repo may be tracking everything");
            console.log("in the directory rather than just skills/ and commands/.");
        }
        console.log(`Run \`node ${invocation()} status\` to see changes.`);
        return;
    }

    // state === "none": create the tracking repo.
    const gitignorePath = path.join(dir, ".gitignore");
    const wroteGitignore = !fs.existsSync(gitignorePath);
    if (wroteGitignore) fs.writeFileSync(gitignorePath, GITIGNORE_BODY);

    git(["-C", dir, "init"]);
    git(["-C", dir, "add", "-A"]);
    const identity = identityArgs(dir);
    git(["-C", dir, ...identity, "commit", "-m", "Initial snapshot of Claude skills and commands"]);

    console.log(`Initialized skill & command tracking at ${dir}`);
    if (wroteGitignore) {
        console.log("  wrote .gitignore - version control is scoped to skills/ and commands/");
    } else {
        console.log("  kept the existing .gitignore");
    }
    if (identity.length) {
        console.log("  committed with a local fallback identity (no global git identity set)");
    }
    const head = gitQuiet(["-C", dir, "log", "-1", "--pretty=format:%h %s"]);
    if (head) console.log(`  first snapshot: ${head}`);
}

function cmdCommit(opts) {
    const dir = resolveTrackDir(opts);
    ensureDirExists(dir);
    const st = repoState(dir);

    if (st.state === "none") {
        fail(`${dir} is not tracked yet. Run \`node ${invocation()} init\` first.`);
    }
    if (st.state === "nested") {
        fail(
            `${dir}\n` +
            `  is inside the git repo at ${st.root}.\n` +
            `  This skill won't commit inside another repo.`
        );
    }

    git(["-C", dir, "add", "-A"]);
    const staged = git(["-C", dir, "diff", "--cached", "--name-status"]);
    if (!staged) {
        console.log("Nothing to commit - skills and commands are already up to date.");
        return;
    }
    const entries = staged.split(/\r?\n/).filter(Boolean);
    const message =
        (opts.message || opts._.slice(1).join(" ")).trim() || generateMessage(dir, entries);
    const identity = identityArgs(dir);
    git(["-C", dir, ...identity, "commit", "-m", message]);

    const head = git(["-C", dir, "log", "-1", "--pretty=format:%h"]);
    console.log(`Committed ${entries.length} change(s) as ${head}:`);
    console.log(`  "${message}"`);
    for (const entry of entries) {
        const parts = entry.split("\t");
        console.log(`    ${humanCode(parts[0]).padEnd(8)} ${parts.slice(1).join(" -> ")}`);
    }
    if (identity.length) {
        console.log("  (used a local fallback identity - no global git identity is set)");
    }
}

function cmdLog(opts) {
    const dir = resolveTrackDir(opts);
    ensureDirExists(dir);
    const st = repoState(dir);

    if (st.state === "none") {
        console.log(`Not tracked yet: ${dir}. Run \`node ${invocation()} init\` first.`);
        return;
    }
    if (st.state === "nested") {
        console.log(`${dir} is inside the git repo at ${st.root}; not managed by this skill.`);
        return;
    }

    const raw = Number(opts._[1]);
    const count = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 15;
    const out = git([
        "-C", dir, "log", "-n", String(count),
        "--pretty=format:%h  %ad  %s", "--date=short",
    ]);
    if (!out) {
        console.log(`No snapshots yet in ${dir}.`);
        return;
    }
    console.log(`Recent snapshots in ${dir}:\n`);
    console.log(out);
}

function usage() {
    const inv = invocation();
    return `git-track - version-control your Claude skills and slash commands with git

Usage:
  node ${inv} status             show whether tracking is set up and what changed
  node ${inv} init               create the tracking repo (scoped to skills/ + commands/)
  node ${inv} commit ["message"] stage and commit the current skills/commands state
  node ${inv} log [count]        list recent snapshots (default 15)

Options:
  -d, --dir <path>     directory to track (default: ~/.claude, or $CLAUDE_CONFIG_DIR)
  -m, --message <msg>  commit message (alternative to the positional argument)

The tracking git repo lives at the Claude config directory itself; its .gitignore
scopes version control to the skills/ and commands/ subfolders only. It is local -
nothing is pushed to any remote.`;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const cmd = opts._[0];
    if (opts.help || !cmd) {
        console.log(usage());
        process.exit(opts.help ? 0 : 1);
    }
    if (gitQuiet(["--version"]) === null) {
        fail("git is not installed or not on PATH.");
    }
    try {
        switch (cmd) {
            case "status": cmdStatus(opts); break;
            case "init": cmdInit(opts); break;
            case "commit": cmdCommit(opts); break;
            case "log": cmdLog(opts); break;
            default:
                fail(`unknown command: ${cmd}. Use status | init | commit | log.`);
        }
    } catch (e) {
        fail(e.message);
    }
}

main();
