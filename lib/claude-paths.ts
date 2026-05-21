import os from "os";
import path from "path";

/** Root of the Claude config directory (~/.claude), overridable via CLAUDE_CONFIG_DIR. */
export function claudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

/** Path to ~/.claude.json (holds skillUsage and the projects map). */
export function claudeJsonPath(): string {
  return path.join(os.homedir(), ".claude.json");
}

/** Personal skills directory: ~/.claude/skills */
export function personalSkillsDir(): string {
  return path.join(claudeHome(), "skills");
}

/** Personal slash-commands directory: ~/.claude/commands */
export function personalCommandsDir(): string {
  return path.join(claudeHome(), "commands");
}

/** Installed plugins directory: ~/.claude/plugins */
export function pluginsDir(): string {
  return path.join(claudeHome(), "plugins");
}

/** OS-specific application support directory. */
export function appConfigDir(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  }
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

/** Agent / Cowork session skills directory. */
export function coworkSkillsDir(): string {
  return path.join(appConfigDir(), "claude", "local-agent-mode-sessions");
}

/** Case-insensitive path compare on Windows, case-sensitive elsewhere. */
export function samePath(a: string, b: string): boolean {
  const na = path.resolve(a);
  const nb = path.resolve(b);
  return process.platform === "win32"
    ? na.toLowerCase() === nb.toLowerCase()
    : na === nb;
}
