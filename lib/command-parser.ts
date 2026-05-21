import fs from "fs";
import matter from "gray-matter";
import {
  asBoolean,
  asString,
  lenientField,
  splitFrontmatter,
  stripBom,
} from "./frontmatter";

export interface ParsedCommand {
  description?: string;
  argumentHint?: string;
  allowedTools?: string;
  model?: string;
  /** Frontmatter disable-model-invocation — true means the command is slash-only. */
  disableModelInvocation?: boolean;
  /** Prompt body with frontmatter stripped. */
  body: string;
  /** Full original file contents. */
  raw: string;
}

/**
 * Parses a slash-command .md file: optional YAML frontmatter + a prompt body.
 *
 * Command files frequently have no frontmatter at all — the whole file is the
 * prompt. When a frontmatter block is present but malformed, its fields are
 * recovered leniently, the same way SKILL.md frontmatter is.
 */
export function parseCommandMd(filePath: string): ParsedCommand {
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { body: "", raw: "" };
  }

  const text = stripBom(raw);
  const { frontmatter, body } = splitFrontmatter(text);

  let description: string | undefined;
  let argumentHint: string | undefined;
  let allowedTools: string | undefined;
  let model: string | undefined;
  let disableModelInvocation: boolean | undefined;

  try {
    const { data } = matter(text);
    description = asString(data.description);
    argumentHint = asString(data["argument-hint"] ?? data.argumentHint);
    allowedTools = asString(data["allowed-tools"] ?? data.allowedTools);
    model = asString(data.model);
    disableModelInvocation = asBoolean(
      data["disable-model-invocation"] ?? data.disableModelInvocation,
    );
  } catch {
    /* invalid YAML — recovered by the lenient fallback below */
  }

  if (!description) description = lenientField(frontmatter, "description");
  if (!argumentHint) argumentHint = lenientField(frontmatter, "argument-hint");
  if (!allowedTools) allowedTools = lenientField(frontmatter, "allowed-tools");
  if (!model) model = lenientField(frontmatter, "model");
  if (disableModelInvocation === undefined) {
    disableModelInvocation = asBoolean(
      lenientField(frontmatter, "disable-model-invocation"),
    );
  }

  return {
    description,
    argumentHint,
    allowedTools,
    model,
    disableModelInvocation,
    body: body.trim(),
    raw,
  };
}
