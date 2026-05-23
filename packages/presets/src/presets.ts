// packages/presets/src/presets.ts
import type Database from "better-sqlite3";
import { openDb } from "./db";
import type { Preset, PresetItem, ActiveState, ItemKind } from "./types";

type DbPresetRow = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    color: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
};

function rowToPreset(r: DbPresetRow): Preset {
    return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        color: r.color,
        archivedAt: r.archived_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

function nowIso(): string {
    return new Date().toISOString();
}

export type ListPresetsOptions = { status?: "active" | "archived" | "all" };

export function listPresets(opts: ListPresetsOptions = {}): Preset[] {
    const db = openDb();
    const status = opts.status ?? "active";
    let where = "";
    if (status === "active") where = "WHERE archived_at IS NULL";
    else if (status === "archived") where = "WHERE archived_at IS NOT NULL";
    const rows = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets ${where} ORDER BY updated_at DESC`,
        )
        .all() as DbPresetRow[];
    return rows.map(rowToPreset);
}

export function getPreset(id: number): Preset | null {
    const db = openDb();
    const row = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets WHERE id = ?`,
        )
        .get(id) as DbPresetRow | undefined;
    return row ? rowToPreset(row) : null;
}

export function getPresetBySlug(slug: string): Preset | null {
    const db = openDb();
    const row = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets WHERE slug = ?`,
        )
        .get(slug) as DbPresetRow | undefined;
    return row ? rowToPreset(row) : null;
}

export type CreatePresetInput = {
    slug: string;
    name: string;
    description?: string | null;
    color?: string | null;
};

export class SlugCollisionError extends Error {
    constructor(slug: string) {
        super(`Preset slug already exists: ${slug}`);
        this.name = "SlugCollisionError";
    }
}

export function createPreset(input: CreatePresetInput): Preset {
    const db = openDb();
    const existing = getPresetBySlug(input.slug);
    if (existing) throw new SlugCollisionError(input.slug);
    const ts = nowIso();
    const info = db
        .prepare(
            `INSERT INTO presets (slug, name, description, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
            input.slug,
            input.name,
            input.description ?? null,
            input.color ?? null,
            ts,
            ts,
        );
    const created = getPreset(Number(info.lastInsertRowid));
    if (!created) throw new Error("Failed to load created preset");
    return created;
}

export type UpdatePresetInput = {
    name?: string;
    description?: string | null;
    color?: string | null;
    slug?: string;
};

export function updatePreset(id: number, input: UpdatePresetInput): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (current.archivedAt) throw new Error("Cannot edit an archived preset");
    if (input.slug && input.slug !== current.slug) {
        const collide = getPresetBySlug(input.slug);
        if (collide) throw new SlugCollisionError(input.slug);
    }
    const next = {
        slug: input.slug ?? current.slug,
        name: input.name ?? current.name,
        description:
            input.description === undefined ? current.description : input.description,
        color: input.color === undefined ? current.color : input.color,
        updated_at: nowIso(),
    };
    db.prepare(
        `UPDATE presets SET slug = ?, name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?`,
    ).run(next.slug, next.name, next.description, next.color, next.updated_at, id);
    return getPreset(id)!;
}

export function archivePreset(id: number): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (current.archivedAt) return current;
    const ts = nowIso();
    db.transaction(() => {
        db.prepare(`UPDATE presets SET archived_at = ?, updated_at = ? WHERE id = ?`).run(
            ts,
            ts,
            id,
        );
        // If this preset is active, clear active_preset
        db.prepare(
            `UPDATE active_preset SET preset_id = NULL, activated_at = ? WHERE preset_id = ?`,
        ).run(ts, id);
    })();
    return getPreset(id)!;
}

export function unarchivePreset(id: number): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (!current.archivedAt) return current;
    const ts = nowIso();
    db.prepare(`UPDATE presets SET archived_at = NULL, updated_at = ? WHERE id = ?`).run(
        ts,
        id,
    );
    return getPreset(id)!;
}

// preset_items

type DbPresetItemRow = {
    preset_id: number;
    kind: ItemKind;
    identifier: string;
    added_at: string;
};

function rowToItem(r: DbPresetItemRow): PresetItem {
    return {
        presetId: r.preset_id,
        kind: r.kind,
        identifier: r.identifier,
        addedAt: r.added_at,
    };
}

export function listPresetItems(presetId: number): PresetItem[] {
    const db = openDb();
    const rows = db
        .prepare(
            `SELECT preset_id, kind, identifier, added_at FROM preset_items WHERE preset_id = ? ORDER BY kind, identifier`,
        )
        .all(presetId) as DbPresetItemRow[];
    return rows.map(rowToItem);
}

export function addItem(
    presetId: number,
    kind: ItemKind,
    identifier: string,
): PresetItem {
    const db = openDb();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot edit an archived preset");
    const ts = nowIso();
    db.prepare(
        `INSERT OR IGNORE INTO preset_items (preset_id, kind, identifier, added_at) VALUES (?, ?, ?, ?)`,
    ).run(presetId, kind, identifier, ts);
    db.prepare(`UPDATE presets SET updated_at = ? WHERE id = ?`).run(ts, presetId);
    return {
        presetId,
        kind,
        identifier,
        addedAt: ts,
    };
}

export function removeItem(
    presetId: number,
    kind: ItemKind,
    identifier: string,
): void {
    const db = openDb();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot edit an archived preset");
    const ts = nowIso();
    db.prepare(
        `DELETE FROM preset_items WHERE preset_id = ? AND kind = ? AND identifier = ?`,
    ).run(presetId, kind, identifier);
    db.prepare(`UPDATE presets SET updated_at = ? WHERE id = ?`).run(ts, presetId);
}

// active_preset

export function getActiveState(): ActiveState {
    const db = openDb();
    const row = db
        .prepare(`SELECT preset_id, activated_at FROM active_preset WHERE id = 1`)
        .get() as { preset_id: number | null; activated_at: string } | undefined;
    if (!row) return { presetId: null, activatedAt: null };
    return { presetId: row.preset_id, activatedAt: row.activated_at };
}

export function setActiveState(db: Database.Database, presetId: number | null): void {
    const ts = nowIso();
    db.prepare(
        `INSERT INTO active_preset (id, preset_id, activated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET preset_id = excluded.preset_id, activated_at = excluded.activated_at`,
    ).run(presetId, ts);
}
