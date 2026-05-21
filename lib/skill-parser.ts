import fs from "fs";
import matter from "gray-matter";

export interface ParsedSkill {
  name?: string;
  description?: string;
  allowedTools?: string;
  /** Markdown body with frontmatter stripped. */
  body: string;
  /** Full original file contents. */
  raw: string;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) return value.map(String).join(", ") || undefined;
  return undefined;
}

/** Lenient line-based extraction for frontmatter that isn't valid YAML. */
function lenientField(frontmatter: string, key: string): string | undefined {
  if (!frontmatter) return undefined;
  const match = frontmatter.match(
    new RegExp(`^[ \\t]*${key}[ \\t]*:[ \\t]*(.+?)[ \\t]*$`, "im"),
  );
  if (!match) return undefined;
  let value = match[1].trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  } else if (value.startsWith('"') || value.startsWith("'")) {
    value = value.slice(1);
  }
  return value.trim() || undefined;
}

/**
 * Parses a SKILL.md file: YAML frontmatter + markdown body.
 *
 * The frontmatter block is split off manually (by the `---` fences) so that
 * a malformed YAML block never leaks into the body. Strict YAML parsing is
 * attempted first; if it fails, fields are recovered leniently.
 */
export function parseSkillMd(filePath: string): ParsedSkill {
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { body: "", raw: "" };
  }

  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  let frontmatter = "";
  let body = text;
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = text.slice(fmMatch[0].length);
  }

  let name: string | undefined;
  let description: string | undefined;
  let allowedTools: string | undefined;

  try {
    const { data } = matter(text);
    name = asString(data.name);
    description = asString(data.description);
    allowedTools = asString(data["allowed-tools"] ?? data.allowedTools);
  } catch {
    /* invalid YAML — recovered by the lenient fallback below */
  }

  if (!name) name = lenientField(frontmatter, "name");
  if (!description) description = lenientField(frontmatter, "description");
  if (!allowedTools) allowedTools = lenientField(frontmatter, "allowed-tools");

  return { name, description, allowedTools, body: body.trim(), raw };
}

/** Short single-line preview of a markdown body. */
export function excerpt(body: string, max = 240): string {
  const flat = body
    .replace(/^#+\s.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_>`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}
