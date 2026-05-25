#!/usr/bin/env node
/**
 * vendor-skills - list and install Claude Skills vendored under ./vendor.
 * Bundled with the install-vendor-skill project skill. No dependencies (Node 18+).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
// scripts/ -> install-vendor-skill/ -> skills/ -> .claude/ -> project root
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..", "..", "..");
const SKIP_DIRS = new Set([".git", "node_modules", ".next"]);
// Marker file written into each installed skill, recording where it came from.
const PROVENANCE_FILE = ".vendor-source.json";
// Allowed resolutions when a skill is already installed at the target path.
const ON_CONFLICT_ACTIONS = ["override", "skip", "rename"];

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(1);
}

function claudeHome() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** Display a path relative to the project root with forward slashes; absolute if outside. */
function rel(p) {
    const r = path.relative(PROJECT_ROOT, p);
    return !r || r.startsWith("..") ? p : r.split(path.sep).join("/");
}

function vendorDir(opts) {
    return path.resolve(opts.vendor || path.join(PROJECT_ROOT, "vendor"));
}

function resolveTarget(target) {
    if (!target || target === "personal") return path.join(claudeHome(), "skills");
    if (target === "project") return path.join(PROJECT_ROOT, ".claude", "skills");
    return path.resolve(target);
}

function parseArgs(argv) {
    const opts = { _: [] };
    const take = {
        "--target": "target",
        "-t": "target",
        "--as": "as",
        "--vendor": "vendor",
        "--on-conflict": "onConflict",
    };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i];
        if (a === "--force" || a === "-f") {
            fail(
                "--force is no longer supported. The install policy now stops on conflict and requires an explicit choice. Re-run with one of: --on-conflict=override (replace existing), --on-conflict=skip (keep existing), --on-conflict=rename (install alongside with a datetime suffix)."
            );
        }
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
        if (a.startsWith("-")) fail(`unknown option: ${argv[i]}`);
        opts._.push(a);
    }
    if (opts.onConflict !== undefined && !ON_CONFLICT_ACTIONS.includes(opts.onConflict)) {
        fail(`--on-conflict must be one of: ${ON_CONFLICT_ACTIONS.join(", ")} (got "${opts.onConflict}")`);
    }
    return opts;
}

/** Extract single-line frontmatter values (enough for name/description display). */
function parseFrontmatter(content) {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const out = {};
    if (!m) return out;
    for (const line of m[1].split(/\r?\n/)) {
        const fm = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (!fm) continue;
        let v = fm[2].trim();
        if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
            v = v.slice(1, -1);
        }
        out[fm[1]] = v;
    }
    return out;
}

function findSkillFiles(root) {
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
            if (e.isDirectory()) {
                if (!SKIP_DIRS.has(e.name)) stack.push(path.join(dir, e.name));
            } else if (e.isFile() && e.name === "SKILL.md") {
                found.push(path.join(dir, e.name));
            }
        }
    }
    return found;
}

function collectVendorSkills(opts) {
    const root = vendorDir(opts);
    return findSkillFiles(root).map((file) => {
        const dir = path.dirname(file);
        const fm = parseFrontmatter(fs.readFileSync(file, "utf8"));
        const within = path.relative(root, dir).split(path.sep);
        return {
            dir,
            dirName: path.basename(dir),
            name: fm.name || path.basename(dir),
            description: fm.description || "",
            repo: within[0] || path.basename(root),
        };
    });
}

function truncate(s, n) {
    s = s.replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const SCRIPT_REL = rel(SCRIPT_PATH);

function usage() {
    return `vendor-skills - manage Claude Skills vendored under ./vendor

Usage:
  node ${SCRIPT_REL} list [--vendor <dir>]
  node ${SCRIPT_REL} install <name|path> [--target <t>] [--as <name>] [--on-conflict <action>]
  node ${SCRIPT_REL} installed [--target <t>]

Targets (--target):
  personal   ~/.claude/skills        available in every project (default)
  project    <repo>/.claude/skills   available only in this project
  <dir>      any directory you pass

Conflict policy (--on-conflict):
  If a skill with the same name is already installed at the target, install
  STOPS and prints a comparison table — nothing is changed. Re-run with one of:
    override   replace the existing install with the new copy
    skip       keep the existing install, do not install the new copy
    rename     install the new copy under <name>-<datetime> alongside the existing one

Examples:
  node ${SCRIPT_REL} list
  node ${SCRIPT_REL} install debug-mantra
  node ${SCRIPT_REL} install scrutinize --target project
  node ${SCRIPT_REL} install debug-mantra --on-conflict=override
  node ${SCRIPT_REL} install debug-mantra --on-conflict=rename`;
}

function cmdList(opts) {
    const skills = collectVendorSkills(opts);
    if (!skills.length) {
        console.log(`No skills found under ${rel(vendorDir(opts))}/`);
        console.log("Vendor a skills repo first:  git submodule add <repo-url> vendor/<name>");
        return;
    }
    skills.sort((a, b) => a.repo.localeCompare(b.repo) || a.name.localeCompare(b.name));
    console.log(`${skills.length} skill(s) available under ${rel(vendorDir(opts))}/\n`);
    for (const s of skills) {
        console.log(`  ${s.name}  [${s.repo}]`);
        if (s.description) console.log(`      ${truncate(s.description, 100)}`);
        console.log(`      ${rel(s.dir)}\n`);
    }
    console.log("Install one with:");
    console.log(`  node ${SCRIPT_REL} install <name> --target personal`);
}

function resolveSrcPath(query, opts) {
    const candidates = [
        path.resolve(query),
        path.resolve(PROJECT_ROOT, query),
        path.resolve(vendorDir(opts), query),
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, "SKILL.md"))) return c;
    }
    return null;
}

/** Best-effort `git` invocation; returns trimmed stdout, or "" on any failure. */
function gitOutput(args, cwd) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            timeout: 5000,
            stdio: ["ignore", "pipe", "ignore"],
            windowsHide: true,
        }).trim();
    } catch {
        return "";
    }
}

/** Parses the project's .gitmodules into [{ path, url }] entries. */
function readGitmodules() {
    let text;
    try {
        text = fs.readFileSync(path.join(PROJECT_ROOT, ".gitmodules"), "utf8");
    } catch {
        return [];
    }
    const mods = [];
    let cur = null;
    for (const line of text.split(/\r?\n/)) {
        if (/^\s*\[submodule\b/.test(line)) {
            cur = {};
            mods.push(cur);
        } else if (cur) {
            const m = line.match(/^\s*(path|url)\s*=\s*(.+?)\s*$/);
            if (m) cur[m[1]] = m[2];
        }
    }
    return mods.filter((m) => m.path && m.url);
}

/**
 * Describes where an installed copy came from. When the source is a skill in a
 * vendored submodule, records the upstream repo URL, the path within that repo,
 * and the pinned commit — so the catalog can show the real GitHub origin.
 */
function computeProvenance(srcDir, opts) {
    const prov = {
        installedFrom: rel(srcDir),
        installedAt: new Date().toISOString(),
    };
    const fromVendor = path.relative(vendorDir(opts), srcDir);
    if (fromVendor && !fromVendor.startsWith("..") && !path.isAbsolute(fromVendor)) {
        const parts = fromVendor.split(path.sep);
        const submodulePath = `vendor/${parts[0]}`;
        const mod = readGitmodules().find((m) => m.path === submodulePath);
        if (mod) {
            prov.repo = mod.url;
            const pathInRepo = parts.slice(1).join("/");
            if (pathInRepo) prov.pathInRepo = pathInRepo;
            const status = gitOutput(["submodule", "status", "--", submodulePath], PROJECT_ROOT);
            const commit = (status.match(/[0-9a-f]{7,64}/) || [])[0];
            if (commit) prov.commit = commit;
        }
    }
    return prov;
}

/** Compact, sortable local datetime stamp suitable for a directory suffix. */
function datetimeSuffix(now = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
}

function readExistingProvenance(dest) {
    try {
        return JSON.parse(fs.readFileSync(path.join(dest, PROVENANCE_FILE), "utf8"));
    } catch {
        return null;
    }
}

function readSkillFrontmatter(dir) {
    try {
        return parseFrontmatter(fs.readFileSync(path.join(dir, "SKILL.md"), "utf8"));
    } catch {
        return {};
    }
}

/** Render rows (first row is header) as a left-aligned, space-padded text table. */
function formatTable(rows) {
    if (!rows.length) return "";
    const cols = rows[0].length;
    const widths = Array.from({ length: cols }, (_, c) =>
        Math.max(...rows.map((r) => String(r[c] ?? "").length))
    );
    return rows
        .map((r) =>
            r.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join("  ")
        )
        .join("\n");
}

/** Re-render the user-supplied install flags so the suggested re-run is exact. */
function rerunFlags(opts) {
    const parts = [];
    if (opts.target) parts.push(`--target ${opts.target}`);
    if (opts.as) parts.push(`--as ${opts.as}`);
    if (opts.vendor) parts.push(`--vendor ${opts.vendor}`);
    return parts.length ? " " + parts.join(" ") : "";
}

function reportConflict({ dest, srcDir, installName, query, opts }) {
    const existingProv = readExistingProvenance(dest) || {};
    const existingFm = readSkillFrontmatter(dest);
    const newFm = readSkillFrontmatter(srcDir);
    const newProv = computeProvenance(srcDir, opts);
    const renamedExample = `${installName}-${datetimeSuffix()}`;
    const flags = rerunFlags(opts);

    const rows = [
        ["Field", "Existing install", "New from vendor"],
        ["-----", "----------------", "---------------"],
        ["Name", existingFm.name || path.basename(dest), newFm.name || path.basename(srcDir)],
        ["Path", rel(dest), rel(srcDir)],
        [
            "Source",
            existingProv.repo || existingProv.installedFrom || "(unknown)",
            newProv.repo || newProv.installedFrom || "(unknown)",
        ],
        ["Commit", existingProv.commit || "(unknown)", newProv.commit || "(unknown)"],
        ["Installed at", existingProv.installedAt || "(unknown)", "(would be now)"],
        [
            "Description",
            truncate(existingFm.description || "", 60),
            truncate(newFm.description || "", 60),
        ],
    ];

    console.error("");
    console.error(`CONFLICT: a skill named "${installName}" is already installed.`);
    console.error("Install stopped — nothing on disk was changed.");
    console.error("");
    console.error(formatTable(rows));
    console.error("");
    console.error("Pick one and re-run install with the matching flag:");
    console.error("");
    console.error("  1) override   replace the existing install with the new copy");
    console.error(`     node ${SCRIPT_REL} install ${query}${flags} --on-conflict=override`);
    console.error("");
    console.error("  2) skip       keep the existing install, do nothing");
    console.error(`     node ${SCRIPT_REL} install ${query}${flags} --on-conflict=skip`);
    console.error("");
    console.error("  3) rename     install the new copy under a datetime-suffixed name");
    console.error("                so both coexist and you manage cleanup manually");
    console.error(`                (would install as "${renamedExample}")`);
    console.error(`     node ${SCRIPT_REL} install ${query}${flags} --on-conflict=rename`);
}

function performInstall(srcDir, dest, installName, opts) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(srcDir, dest, {
        recursive: true,
        filter: (src) => path.basename(src) !== ".git",
    });

    const provenance = computeProvenance(srcDir, opts);
    fs.writeFileSync(
        path.join(dest, PROVENANCE_FILE),
        JSON.stringify(provenance, null, 2) + "\n",
    );

    console.log(`Installed "${installName}"`);
    console.log(`  from   ${rel(srcDir)}`);
    console.log(`  to     ${dest}`);
    console.log(`  source ${provenance.repo || provenance.installedFrom}`);
}

function cmdInstall(opts) {
    const query = opts._[1];
    if (!query) fail("install: missing skill name or path. Run `list` to see options.");

    let srcDir;
    if (query.includes("/") || query.includes("\\")) {
        srcDir = resolveSrcPath(query, opts);
        if (!srcDir) fail(`no SKILL.md found at "${query}"`);
    } else {
        const matches = collectVendorSkills(opts).filter(
            (s) => s.name === query || s.dirName === query
        );
        if (matches.length === 0) {
            fail(`no vendored skill named "${query}". Run \`list\` to see options.`);
        }
        if (matches.length > 1) {
            console.error(`error: "${query}" is ambiguous - ${matches.length} matches:`);
            for (const m of matches) console.error(`  ${rel(m.dir)}`);
            console.error("Re-run install with one of the paths above.");
            process.exit(1);
        }
        srcDir = matches[0].dir;
    }

    const installName = opts.as || path.basename(srcDir);
    const targetDir = resolveTarget(opts.target);
    const dest = path.join(targetDir, installName);

    if (!fs.existsSync(dest)) {
        if (opts.onConflict) {
            console.log(
                `note: no existing install at ${rel(dest)} — --on-conflict=${opts.onConflict} had no effect.`
            );
        }
        performInstall(srcDir, dest, installName, opts);
        return;
    }

    // An install already exists at dest. The default policy is to STOP and ask
    // the user to choose; an explicit --on-conflict flag bypasses the prompt.
    switch (opts.onConflict) {
        case "override": {
            fs.rmSync(dest, { recursive: true, force: true });
            performInstall(srcDir, dest, installName, opts);
            return;
        }
        case "skip": {
            console.log(
                `Skipped "${installName}" — existing install kept at ${rel(dest)}.`
            );
            return;
        }
        case "rename": {
            const renamed = `${installName}-${datetimeSuffix()}`;
            const newDest = path.join(targetDir, renamed);
            if (fs.existsSync(newDest)) {
                fail(`rename target ${rel(newDest)} already exists — try again in a second.`);
            }
            performInstall(srcDir, newDest, renamed, opts);
            console.log(`  note   existing "${installName}" left in place at ${rel(dest)}.`);
            return;
        }
        default: {
            reportConflict({ dest, srcDir, installName, query, opts });
            process.exit(2);
        }
    }
}

function cmdInstalled(opts) {
    const targetDir = resolveTarget(opts.target);
    if (!fs.existsSync(targetDir)) {
        console.log(`Nothing installed - ${targetDir} does not exist yet.`);
        return;
    }
    const skills = fs
        .readdirSync(targetDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(targetDir, e.name, "SKILL.md")));
    if (!skills.length) {
        console.log(`No skills installed in ${targetDir}`);
        return;
    }
    console.log(`${skills.length} skill(s) installed in ${targetDir}\n`);
    for (const e of skills) {
        const fm = parseFrontmatter(fs.readFileSync(path.join(targetDir, e.name, "SKILL.md"), "utf8"));
        console.log(`  ${fm.name || e.name}`);
        if (fm.description) console.log(`      ${truncate(fm.description, 100)}`);
    }
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const cmd = opts._[0];
    if (opts.help || !cmd) {
        console.log(usage());
        process.exit(opts.help ? 0 : 1);
    }
    switch (cmd) {
        case "list":
            cmdList(opts);
            break;
        case "install":
            cmdInstall(opts);
            break;
        case "installed":
            cmdInstalled(opts);
            break;
        default:
            fail(`unknown command: ${cmd}. Use list | install | installed.`);
    }
}

main();
