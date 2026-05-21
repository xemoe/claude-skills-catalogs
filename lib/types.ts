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
  /** First lines of the SKILL.md body, for previews. */
  bodyExcerpt: string;
}

export interface ScanRoot {
  path: string;
  kind: SkillType | "auto";
  label: string;
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
