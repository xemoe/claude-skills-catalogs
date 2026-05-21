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
  skillCount: number;
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
