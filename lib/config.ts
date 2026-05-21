import fs from "fs";
import path from "path";

export interface CatalogConfig {
  /** Extra directories to scan recursively for SKILL.md files. */
  extraRoots: string[];
  /** Scan project-level .claude/skills directories from ~/.claude.json. */
  includeProjectSkills: boolean;
  /** Scan agent / Cowork session skills. */
  includeCoworkSkills: boolean;
}

const DEFAULT: CatalogConfig = {
  extraRoots: [],
  includeProjectSkills: true,
  includeCoworkSkills: true,
};

/** Reads skills-catalog.config.json from the project root, if present. */
export function loadConfig(): CatalogConfig {
  const file = path.join(process.cwd(), "skills-catalog.config.json");
  let fromFile: Partial<CatalogConfig> = {};
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    fromFile = {
      extraRoots: Array.isArray(j.extraRoots)
        ? j.extraRoots.filter((x: unknown): x is string => typeof x === "string")
        : [],
      includeProjectSkills: j.includeProjectSkills !== false,
      includeCoworkSkills: j.includeCoworkSkills !== false,
    };
  } catch {
    fromFile = {};
  }

  const envRoots = (process.env.SKILLS_SCAN_ROOTS || "")
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    extraRoots: [...(fromFile.extraRoots ?? DEFAULT.extraRoots), ...envRoots],
    includeProjectSkills: fromFile.includeProjectSkills ?? DEFAULT.includeProjectSkills,
    includeCoworkSkills: fromFile.includeCoworkSkills ?? DEFAULT.includeCoworkSkills,
  };
}
