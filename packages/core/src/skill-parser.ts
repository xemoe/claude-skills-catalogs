import fs from "fs";
import matter from "gray-matter";
import {
    asBoolean,
    asString,
    lenientField,
    splitFrontmatter,
    stripBom,
} from "./frontmatter";

export interface ParsedSkill {
    name?: string;
    description?: string;
    allowedTools?: string;
    /** Frontmatter disable-model-invocation — true means the skill is slash-only. */
    disableModelInvocation?: boolean;
    /** Markdown body with frontmatter stripped. */
    body: string;
    /** Full original file contents. */
    raw: string;
}

/**
 * Parses a SKILL.md file: YAML frontmatter + markdown body.
 *
 * Strict YAML parsing is attempted first; if it fails, fields are recovered
 * leniently from the raw frontmatter block.
 */
export function parseSkillMd(filePath: string): ParsedSkill {
    let raw = "";
    try {
        raw = fs.readFileSync(filePath, "utf8");
    } catch {
        return { body: "", raw: "" };
    }

    const text = stripBom(raw);
    const { frontmatter, body } = splitFrontmatter(text);

    let name: string | undefined;
    let description: string | undefined;
    let allowedTools: string | undefined;
    let disableModelInvocation: boolean | undefined;

    try {
        const { data } = matter(text);
        name = asString(data.name);
        description = asString(data.description);
        allowedTools = asString(data["allowed-tools"] ?? data.allowedTools);
        disableModelInvocation = asBoolean(
            data["disable-model-invocation"] ?? data.disableModelInvocation,
        );
    } catch {
        /* invalid YAML — recovered by the lenient fallback below */
    }

    if (!name) name = lenientField(frontmatter, "name");
    if (!description) description = lenientField(frontmatter, "description");
    if (!allowedTools) allowedTools = lenientField(frontmatter, "allowed-tools");
    if (disableModelInvocation === undefined) {
        disableModelInvocation = asBoolean(
            lenientField(frontmatter, "disable-model-invocation"),
        );
    }

    return {
        name,
        description,
        allowedTools,
        disableModelInvocation,
        body: body.trim(),
        raw,
    };
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
