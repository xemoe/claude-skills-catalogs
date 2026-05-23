// packages/presets/src/db.ts
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    "migrations",
);

let cached: Database.Database | null = null;
let cachedPath: string | null = null;

function resolveDbPath(): string {
    const fromEnv = process.env.SKILLS_LECTOR_PRESETS_DB;
    if (fromEnv && fromEnv.trim()) return expandHome(fromEnv.trim());
    return join(homedir(), ".skills-lector", "presets.db");
}

function expandHome(p: string): string {
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) {
        return join(homedir(), p.slice(2));
    }
    return p;
}

function loadMigrations(): Array<{ version: number; sql: string; file: string }> {
    if (!existsSync(MIGRATIONS_DIR)) return [];
    const entries = readdirSync(MIGRATIONS_DIR)
        .filter((f) => /^\d{3}_.*\.sql$/.test(f))
        .sort();
    return entries.map((file) => {
        const version = Number(file.slice(0, 3));
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        return { version, sql, file };
    });
}

function currentVersion(db: Database.Database): number {
    try {
        const row = db
            .prepare("SELECT MAX(version) AS v FROM schema_version")
            .get() as { v: number | null } | undefined;
        return row?.v ?? 0;
    } catch {
        return 0; // schema_version table does not exist yet
    }
}

function runMigrations(db: Database.Database): void {
    const migrations = loadMigrations();
    const current = currentVersion(db);
    for (const m of migrations) {
        if (m.version <= current) continue;
        db.exec("BEGIN");
        try {
            db.exec(m.sql);
            db.exec("COMMIT");
        } catch (err) {
            db.exec("ROLLBACK");
            throw new Error(
                `Migration ${m.file} failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }
}

export function openDb(): Database.Database {
    const path = resolveDbPath();
    if (cached && cachedPath === path) return cached;
    if (cached) {
        cached.close();
        cached = null;
    }
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    cached = db;
    cachedPath = path;
    return db;
}

export function closeDb(): void {
    if (cached) {
        cached.close();
        cached = null;
        cachedPath = null;
    }
}

export function getDbPath(): string {
    return resolveDbPath();
}
