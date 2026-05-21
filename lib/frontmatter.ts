/**
 * Shared helpers for the YAML frontmatter block that opens Claude's markdown
 * files (SKILL.md and slash-command .md files). The block is split off by its
 * `---` fences so a malformed YAML body never leaks into the rendered content.
 */

/** Strips a leading UTF-8 BOM, if present. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Splits markdown text into its raw frontmatter block and the body that follows. */
export function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

/** Coerces a parsed YAML value to a trimmed string (arrays are comma-joined). */
export function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) return value.map(String).join(", ") || undefined;
  return undefined;
}

/** Coerces a parsed YAML value (or a lenient string) to a boolean. */
export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return undefined;
}

/** Lenient line-based extraction for a single field of frontmatter that isn't valid YAML. */
export function lenientField(frontmatter: string, key: string): string | undefined {
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
