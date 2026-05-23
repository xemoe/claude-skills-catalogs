-- v1 initial schema for Skills Lector preset engine

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS presets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL,
    description  TEXT,
    color        TEXT,
    archived_at  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_presets_archived ON presets(archived_at);

CREATE TABLE IF NOT EXISTS preset_items (
    preset_id    INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
    identifier   TEXT    NOT NULL,
    added_at     TEXT    NOT NULL,
    PRIMARY KEY (preset_id, kind, identifier)
);

CREATE INDEX IF NOT EXISTS idx_preset_items_by_identity ON preset_items(kind, identifier);

CREATE TABLE IF NOT EXISTS pinned_items (
    kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
    identifier   TEXT    NOT NULL,
    pinned_at    TEXT    NOT NULL,
    reason       TEXT,
    archived_at  TEXT,
    PRIMARY KEY (kind, identifier)
);

CREATE TABLE IF NOT EXISTS active_preset (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    preset_id     INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    activated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS apply_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              TEXT    NOT NULL,
    from_preset_id  INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    to_preset_id    INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    enabled_count   INTEGER NOT NULL DEFAULT 0,
    disabled_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count   INTEGER NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL,
    status          TEXT    NOT NULL CHECK (status IN ('success','partial','failed'))
);

CREATE TABLE IF NOT EXISTS apply_log_items (
    log_id       INTEGER NOT NULL REFERENCES apply_log(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL,
    identifier   TEXT    NOT NULL,
    action       TEXT    NOT NULL CHECK (action IN ('enabled','disabled','skipped','error','missing')),
    message      TEXT,
    PRIMARY KEY (log_id, kind, identifier)
);

CREATE INDEX IF NOT EXISTS idx_apply_log_items_log ON apply_log_items(log_id);

INSERT OR IGNORE INTO schema_version(version) VALUES (1);
