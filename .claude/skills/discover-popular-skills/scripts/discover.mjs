#!/usr/bin/env node
/**
 * discover - find popular Claude Skills repositories on GitHub and clone them
 * into vendor/. Bundled with the discover-popular-skills project skill. No
 * dependencies (Node 18+).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
// scripts/ -> discover-popular-skills/ -> skills/ -> .claude/ -> project root
const PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..", "..", "..");
const MANIFEST_DIR = path.join(PROJECT_ROOT, ".discover");
const MANIFEST_PATH = path.join(MANIFEST_DIR, "results.json");
const SCHEMA_VERSION = 1;
const DEFAULT_TOP = 10;
const DEFAULT_QUERIES = [
    "topic:claude-skills",
    "topic:claude-code-skills",
    "topic:claude-code",
    '"claude skills" in:name,description,readme',
];
// Windows-specific gh.exe fallback when the CLI is installed but off-PATH.
const GH_FALLBACKS = process.platform === "win32"
    ? ["C:\\Program Files\\GitHub CLI\\gh.exe"]
    : [];

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(1);
}

/** Display a path relative to the project root with forward slashes. */
function rel(p) {
    const r = path.relative(PROJECT_ROOT, p);
    return !r || r.startsWith("..") ? p : r.split(path.sep).join("/");
}

function parseArgs(argv) {
    const opts = { _: [] };
    const take = {
        "--top": "top",
        "--queries": "queries",
        "--target": "target",
    };
    for (let i = 0; i < argv.length; i++) {
        let a = argv[i];
        if (a === "--dry-run") { opts.dryRun = true; continue; }
        if (a === "--force" || a === "-f") { opts.force = true; continue; }
        if (a === "--no-gh") { opts.noGh = true; continue; }
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
    return opts;
}

const SCRIPT_REL = rel(SCRIPT_PATH);

function usage() {
    return `discover - find popular Claude Skills repos on GitHub and vendor them

Usage:
  node ${SCRIPT_REL} search [--top <n>] [--queries q1,q2,...] [--no-gh] [--dry-run]
  node ${SCRIPT_REL} clone <name|all> [--force]
  node ${SCRIPT_REL} status

Subcommands:
  search   Query GitHub, rank the top N (default ${DEFAULT_TOP}), write the manifest at
           ${rel(MANIFEST_PATH)}. Uses 'gh api' when the GitHub CLI is available
           (5000 req/hr); falls back to unauthenticated fetch otherwise.
  clone    Read the manifest and 'git submodule add' the chosen repos into vendor/.
           Pass a repo name (matches "owner/repo" or just "repo") or 'all' for every
           entry that is not yet vendored.
  status   Print the manifest as a ranked list with cloned / not-cloned status.

Examples:
  node ${SCRIPT_REL} search
  node ${SCRIPT_REL} search --top 20 --queries topic:claude-skills,topic:claude-code
  node ${SCRIPT_REL} clone 9arm-skills
  node ${SCRIPT_REL} clone all
  node ${SCRIPT_REL} status`;
}

/* ----------------------------- GitHub search ----------------------------- */

function findGh() {
    const candidates = ["gh", ...GH_FALLBACKS];
    for (const cmd of candidates) {
        try {
            execFileSync(cmd, ["--version"], {
                stdio: ["ignore", "ignore", "ignore"],
                timeout: 5000,
                windowsHide: true,
            });
            return cmd;
        } catch {
            /* try next */
        }
    }
    return null;
}

function ghAuthStatus(gh) {
    try {
        execFileSync(gh, ["auth", "status"], {
            stdio: ["ignore", "ignore", "ignore"],
            timeout: 5000,
            windowsHide: true,
        });
        return true;
    } catch {
        return false;
    }
}

function ghSearch(gh, query, perPage) {
    const args = [
        "api",
        "-X", "GET",
        "search/repositories",
        "-f", `q=${query}`,
        "-f", "sort=stars",
        "-f", "order=desc",
        "-f", `per_page=${perPage}`,
    ];
    const out = execFileSync(gh, args, {
        encoding: "utf8",
        timeout: 30000,
        windowsHide: true,
    });
    return JSON.parse(out);
}

async function anonSearch(query, perPage) {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(perPage));
    const res = await fetch(url, {
        headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "skills-lector-discover",
        },
    });
    if (res.status === 403 || res.status === 429) {
        const reset = res.headers.get("x-ratelimit-reset");
        const remaining = res.headers.get("x-ratelimit-remaining");
        const msg = reset
            ? `rate limited (remaining=${remaining ?? "?"}, resets at ${new Date(Number(reset) * 1000).toISOString()})`
            : "rate limited";
        const err = new Error(`GitHub ${res.status}: ${msg}`);
        err.rateLimited = true;
        throw err;
    }
    if (!res.ok) {
        throw new Error(`GitHub ${res.status} ${res.statusText}`);
    }
    return res.json();
}

function normalizeItem(item, rank) {
    return {
        rank,
        fullName: item.full_name,
        owner: item.owner?.login || item.full_name.split("/")[0],
        name: item.name,
        htmlUrl: item.html_url,
        cloneUrl: item.clone_url || `${item.html_url}.git`,
        description: item.description || "",
        stars: item.stargazers_count ?? 0,
        topics: Array.isArray(item.topics) ? item.topics : [],
        defaultBranch: item.default_branch || "main",
        pushedAt: item.pushed_at || undefined,
    };
}

async function cmdSearch(opts) {
    const top = Number(opts.top || DEFAULT_TOP);
    if (!Number.isFinite(top) || top < 1) fail("--top must be a positive integer");
    const queries = opts.queries ? opts.queries.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_QUERIES;
    const perPage = Math.max(top * 2, 20);

    const gh = opts.noGh ? null : findGh();
    const ghReady = gh ? ghAuthStatus(gh) : false;
    const auth = ghReady ? "gh" : "anonymous";
    console.log(`discover: using ${auth === "gh" ? `gh (${gh})` : "unauthenticated fetch"}`);
    console.log(`discover: querying GitHub with ${queries.length} ${queries.length === 1 ? "query" : "queries"}`);

    const byFullName = new Map();
    let rateLimited = false;
    for (const q of queries) {
        process.stdout.write(`  - ${q} ... `);
        let data;
        try {
            data = ghReady ? ghSearch(gh, q, perPage) : await anonSearch(q, perPage);
        } catch (e) {
            if (e.rateLimited) {
                rateLimited = true;
                console.log("rate-limited");
                if (auth === "anonymous") {
                    console.log("    hint: install and 'gh auth login' to raise the GitHub search limit from ~10/min to 30/min.");
                }
                continue;
            }
            console.log("error");
            console.error(`    ${e.message}`);
            continue;
        }
        const items = Array.isArray(data.items) ? data.items : [];
        console.log(`${items.length} result(s)`);
        for (const item of items) {
            if (!item || !item.full_name) continue;
            const existing = byFullName.get(item.full_name);
            if (!existing || (item.stargazers_count ?? 0) > (existing.stargazers_count ?? 0)) {
                byFullName.set(item.full_name, item);
            }
        }
    }

    const ranked = [...byFullName.values()]
        .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
        .slice(0, top)
        .map((item, i) => normalizeItem(item, i + 1));

    if (!ranked.length) {
        console.error("discover: no results — every query failed or returned empty");
        if (rateLimited) {
            console.error("discover: at least one query was rate-limited; try again later or install gh");
        }
        process.exit(1);
    }

    const manifest = {
        schemaVersion: SCHEMA_VERSION,
        discoveredAt: new Date().toISOString(),
        queries,
        auth,
        rateLimited: rateLimited || undefined,
        entries: ranked,
    };

    if (opts.dryRun) {
        console.log(`\ndiscover: --dry-run, not writing manifest. Top ${ranked.length}:`);
    } else {
        fs.mkdirSync(MANIFEST_DIR, { recursive: true });
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
        console.log(`\ndiscover: wrote ${rel(MANIFEST_PATH)} (${ranked.length} entries)`);
    }
    printManifest(manifest);
    if (!opts.dryRun) {
        console.log("\nNext: clone one of the above into vendor/ with");
        console.log(`  node ${SCRIPT_REL} clone <name>`);
        console.log("or `clone all` for every entry not yet vendored.");
    }
}

/* --------------------------------- Clone --------------------------------- */

function readManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        fail(`no manifest at ${rel(MANIFEST_PATH)}. Run \`search\` first.`);
    }
    try {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    } catch (e) {
        fail(`could not parse ${rel(MANIFEST_PATH)}: ${e.message}`);
    }
}

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

/** Treats https / git / ssh URLs that point at the same GitHub repo as equal. */
function normalizeGithubUrl(url) {
    if (!url) return "";
    let s = url.trim().toLowerCase().replace(/\.git$/, "");
    s = s.replace(/^git@github\.com:/, "https://github.com/");
    s = s.replace(/^git\+/, "");
    s = s.replace(/^ssh:\/\/git@github\.com\//, "https://github.com/");
    return s;
}

function vendoredFor(entry) {
    const target = normalizeGithubUrl(entry.htmlUrl);
    for (const mod of readGitmodules()) {
        if (normalizeGithubUrl(mod.url) === target) return mod.path;
    }
    return null;
}

function entryMatches(entry, query) {
    const q = query.toLowerCase();
    return (
        entry.name.toLowerCase() === q ||
        entry.fullName.toLowerCase() === q ||
        entry.name.toLowerCase().includes(q)
    );
}

function cmdClone(opts) {
    const target = opts._[1];
    if (!target) fail("clone: missing target. Pass a repo name or 'all'.");

    const manifest = readManifest();
    if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
        fail("manifest has no entries.");
    }

    let toClone;
    if (target === "all") {
        toClone = manifest.entries;
    } else {
        const matches = manifest.entries.filter((e) => entryMatches(e, target));
        if (matches.length === 0) {
            console.error(`clone: no manifest entry matches "${target}". Available:`);
            for (const e of manifest.entries) console.error(`  ${e.name}  (${e.fullName})`);
            process.exit(1);
        }
        if (matches.length > 1 && target.toLowerCase() !== matches[0].fullName.toLowerCase() && target.toLowerCase() !== matches[0].name.toLowerCase()) {
            console.error(`clone: "${target}" is ambiguous — ${matches.length} matches:`);
            for (const m of matches) console.error(`  ${m.fullName}`);
            console.error('Re-run with the full "owner/repo" name.');
            process.exit(1);
        }
        toClone = matches.slice(0, 1);
    }

    let added = 0;
    let skipped = 0;
    let failed = 0;
    for (const entry of toClone) {
        const existing = vendoredFor(entry);
        if (existing && !opts.force) {
            console.log(`skip   ${entry.fullName}  (already at ${existing})`);
            skipped++;
            continue;
        }
        const submodulePath = `vendor/${entry.name}`;
        const dest = path.join(PROJECT_ROOT, submodulePath);
        if (fs.existsSync(dest) && !opts.force) {
            console.log(`skip   ${entry.fullName}  (${submodulePath} already exists)`);
            skipped++;
            continue;
        }
        console.log(`clone  ${entry.fullName}  ->  ${submodulePath}`);
        try {
            execFileSync("git", ["submodule", "add", entry.cloneUrl, submodulePath], {
                cwd: PROJECT_ROOT,
                stdio: "inherit",
                timeout: 120000,
                windowsHide: true,
            });
            added++;
        } catch (e) {
            console.error(`  failed: ${e.message.split("\n")[0]}`);
            failed++;
        }
    }
    console.log(`\nclone: ${added} added, ${skipped} skipped, ${failed} failed`);
    if (added > 0) {
        console.log("Next: `git status` to review the staged changes. Install a skill from a vendored repo with `/vendor-install`.");
    }
}

/* -------------------------------- Status --------------------------------- */

function printManifest(manifest) {
    console.log(`\nTop ${manifest.entries.length} (sorted by stars):\n`);
    for (const e of manifest.entries) {
        const vendored = vendoredFor(e);
        const tag = vendored ? "[vendored]" : "[not vendored]";
        console.log(`  ${String(e.rank).padStart(2, " ")}. ${e.fullName}  ★ ${e.stars}  ${tag}`);
        if (e.description) console.log(`      ${e.description}`);
        if (e.topics.length) console.log(`      topics: ${e.topics.join(", ")}`);
        console.log(`      ${e.htmlUrl}\n`);
    }
}

function cmdStatus() {
    const manifest = readManifest();
    console.log(`Manifest: ${rel(MANIFEST_PATH)}`);
    console.log(`Discovered at: ${manifest.discoveredAt}`);
    console.log(`Auth: ${manifest.auth}${manifest.rateLimited ? " (rate-limited during run)" : ""}`);
    console.log(`Queries: ${manifest.queries.join(" | ")}`);
    printManifest(manifest);
}

/* ---------------------------------- Main --------------------------------- */

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const cmd = opts._[0];
    if (opts.help || !cmd) {
        console.log(usage());
        process.exit(opts.help ? 0 : 1);
    }
    switch (cmd) {
        case "search":
            await cmdSearch(opts);
            break;
        case "clone":
            cmdClone(opts);
            break;
        case "status":
            cmdStatus();
            break;
        default:
            fail(`unknown command: ${cmd}. Use search | clone | status.`);
    }
}

main().catch((e) => {
    console.error(`error: ${e.message}`);
    process.exit(1);
});
