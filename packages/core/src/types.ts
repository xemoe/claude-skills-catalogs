/** Where a skill is deployed from. */
export type SkillType = "personal" | "plugin" | "project" | "local";

/** Origin of a skill's files. */
export type SourceKind = "github" | "git" | "local";

export interface SkillSource {
    kind: SourceKind;
    /** Human label: "owner/repo" for GitHub, "host/path" for other git, dir path for local. */
    label: string;
    /** Web-openable URL — only set for kind === "github". */
    url?: string;
    /** Git repo root on disk, when the skill lives inside a repo. */
    repoRoot?: string;
    /** Current git branch, when known. */
    branch?: string;
}

export interface PluginInfo {
    name: string;
    version?: string;
    description?: string;
    author?: string;
    /** Plugin root directory on disk. */
    root: string;
}

export interface ProjectInfo {
    name: string;
    path: string;
}

export interface SkillUsage {
    usageCount: number;
    /** Epoch milliseconds. */
    lastUsedAt: number;
}

export interface Skill {
    /** Stable id derived from the skill's logical identity — used in URLs. */
    id: string;
    name: string;
    description: string;
    type: SkillType;
    /** Absolute path to the skill directory. */
    path: string;
    /** Absolute path to the SKILL.md file. */
    skillMdPath: string;
    /** ISO timestamp — newest file mtime inside the skill directory. */
    lastUpdated: string;
    /** Number of files in the skill directory (recursive). */
    fileCount: number;
    /** Total size of the skill directory in bytes. */
    sizeBytes: number;
    source: SkillSource;
    plugin?: PluginInfo;
    project?: ProjectInfo;
    usage?: SkillUsage;
    allowedTools?: string;
    /** Frontmatter disable-model-invocation — true means the skill is slash-only. */
    disableModelInvocation?: boolean;
    /** First lines of the SKILL.md body, for previews. */
    bodyExcerpt: string;
}

/** Stable identity for a scan root's display label, so the UI can localize it. */
export type ScanRootLabelKey =
    | "personalSkills"
    | "installedPlugins"
    | "coworkSkills"
    | "sampleSkills"
    | "customRoot"
    | "personalCommands"
    | "personalSettings"
    | "projectSettings"
    | "projectLocalSettings"
    | "project"
    | "plugin";

export interface ScanRoot {
    path: string;
    kind: SkillType | "auto";
    /** Canonical English label — kept as a fallback; the UI localizes via labelKey. */
    label: string;
    /** Translation key for the label. */
    labelKey: ScanRootLabelKey;
    /** Dynamic part of the label (project or plugin name), when applicable. */
    labelArg?: string;
    maxDepth: number;
    exists: boolean;
    /** Number of catalog entries (skills or commands) found under this root. */
    count: number;
}

export interface ScanResult {
    skills: Skill[];
    roots: ScanRoot[];
    /** ISO timestamp of when the scan ran. */
    scannedAt: string;
    claudeHome: string;
    platform: string;
    errors: string[];
    durationMs: number;
}

/** Where a slash command is deployed from. */
export type CommandScope = "personal" | "project" | "plugin";

export interface Command {
    /** Stable id derived from the command's logical identity — used in URLs. */
    id: string;
    /** Invocable name, including any namespace from subdirectories (e.g. "git:commit"). */
    name: string;
    description: string;
    scope: CommandScope;
    /** Absolute path to the command's .md file. */
    path: string;
    /** Subdirectory namespace, when the file is nested under commands/. */
    namespace?: string;
    /** Frontmatter argument-hint, shown in the slash-command menu. */
    argumentHint?: string;
    /** Frontmatter allowed-tools. */
    allowedTools?: string;
    /** Frontmatter model override. */
    model?: string;
    /** Frontmatter disable-model-invocation — true means the command is slash-only. */
    disableModelInvocation?: boolean;
    /** ISO timestamp — the .md file's mtime. */
    lastUpdated: string;
    /** Size of the .md file in bytes. */
    sizeBytes: number;
    source: SkillSource;
    plugin?: PluginInfo;
    project?: ProjectInfo;
    /** First lines of the command body, for previews. */
    bodyExcerpt: string;
}

export interface CommandScanResult {
    commands: Command[];
    roots: ScanRoot[];
    /** ISO timestamp of when the scan ran. */
    scannedAt: string;
    claudeHome: string;
    platform: string;
    errors: string[];
    durationMs: number;
}

/** Lifecycle events Claude Code can wire a hook to. */
export type HookEvent =
    | "PreToolUse"
    | "PostToolUse"
    | "UserPromptSubmit"
    | "Notification"
    | "Stop"
    | "SubagentStop"
    | "SessionStart"
    | "SessionEnd"
    | "PreCompact";

/**
 * Where a hook is declared. `personal`, `plugin`, `project` mirror Skill/Command
 * semantics; `local` is the project-scoped `.claude/settings.local.json` file
 * (git-ignored, machine-specific).
 */
export type HookScope = "personal" | "plugin" | "project" | "local";

export interface Hook {
    /** Stable id derived from scope + event + matcher + command + index. */
    id: string;
    /** Lifecycle event the hook is wired to. */
    event: HookEvent;
    /** Matcher string; empty string means "match every invocation of this event". */
    matcher: string;
    /** Hook entry type — almost always "command". */
    type: string;
    /** Shell command the hook runs. */
    command: string;
    /** Timeout in seconds, when the settings file declares one. */
    timeout?: number;
    scope: HookScope;
    /** Absolute path to the settings file that declares this hook. */
    sourcePath: string;
    /** ISO timestamp — the source settings file's mtime. */
    lastUpdated: string;
    /** Size of the source settings file in bytes (the whole file). */
    sourceSizeBytes: number;
    source: SkillSource;
    plugin?: PluginInfo;
    project?: ProjectInfo;
    /** 0-based index within the matcher group, so adjacent duplicates stay distinct. */
    indexInGroup: number;
}

export interface HookScanResult {
    hooks: Hook[];
    roots: ScanRoot[];
    /** ISO timestamp of when the scan ran. */
    scannedAt: string;
    claudeHome: string;
    platform: string;
    errors: string[];
    durationMs: number;
}

/**
 * A single GitHub repository ranked by the discover skill. Stored verbatim in
 * the on-disk manifest (.discover/results.json) — keep field names stable.
 */
export interface DiscoverEntry {
    /** 1-based rank within the manifest (1 = top). */
    rank: number;
    /** GitHub "owner/repo". */
    fullName: string;
    owner: string;
    /** Bare repo name (the part after the slash in fullName). */
    name: string;
    htmlUrl: string;
    cloneUrl: string;
    description: string;
    stars: number;
    topics: string[];
    defaultBranch: string;
    /** ISO timestamp of the repo's last push, when GitHub returns it. */
    pushedAt?: string;
}

/**
 * Persisted shape of .discover/results.json. The discover skill writes this;
 * the /discover web page reads it. Schema is versioned so we can evolve it
 * safely — bump schemaVersion on any breaking field change.
 */
export interface DiscoverManifest {
    schemaVersion: 1;
    /** ISO timestamp of when the discover run completed. */
    discoveredAt: string;
    /** Search queries that produced this set (for transparency in the UI). */
    queries: string[];
    /** Which auth path the discover skill used. */
    auth: "gh" | "anonymous";
    /** Whether the GitHub API rate-limited the run (manifest may be partial). */
    rateLimited?: boolean;
    entries: DiscoverEntry[];
}

/** A `DiscoverEntry` annotated with vendored status, computed at read time. */
export interface DiscoverItem extends DiscoverEntry {
    /** True when a submodule under vendor/ already tracks this repo. */
    vendored: boolean;
    /** vendor/<name> path when vendored, else undefined. */
    vendorPath?: string;
}

/** Result returned by the manifest reader to the /discover page. */
export interface DiscoverResult {
    /** Resolved repo root the reader walked from. */
    repoRoot: string;
    /** Absolute path to the manifest file. */
    manifestPath: string;
    /** True when the manifest file exists on disk. */
    manifestExists: boolean;
    /** Parsed manifest, when one exists. */
    manifest?: DiscoverManifest;
    /** Ranked items with vendored status, empty when no manifest. */
    items: DiscoverItem[];
    /** ISO timestamp of when the reader ran. */
    scannedAt: string;
    /** Non-fatal errors during read (e.g. malformed manifest). */
    errors: string[];
    durationMs: number;
}
