// packages/presets/src/enrich.ts
import { scanSkills } from "@lector/core/scanner";
import { scanCommands } from "@lector/core/command-scanner";
import type { Skill, Command } from "@lector/core/types";
import type { PresetItem } from "./types";

export type EnrichedPresetItem =
    | {
          kind: "skill";
          identifier: string;
          addedAt: string;
          missing: false;
          skill: Skill;
      }
    | {
          kind: "command";
          identifier: string;
          addedAt: string;
          missing: false;
          command: Command;
      }
    | {
          kind: "skill" | "command";
          identifier: string;
          addedAt: string;
          missing: true;
      };

export async function enrichPresetItems(
    items: PresetItem[],
): Promise<EnrichedPresetItem[]> {
    const [skillsResult, commandsResult] = await Promise.all([
        safeScanSkills(),
        safeScanCommands(),
    ]);

    const skillByName = new Map<string, Skill>();
    for (const s of skillsResult) {
        if (s.type === "personal") skillByName.set(s.name, s);
    }
    const commandByName = new Map<string, Command>();
    for (const c of commandsResult) {
        if (c.scope === "personal") commandByName.set(c.name, c);
    }

    return items.map((item): EnrichedPresetItem => {
        if (item.kind === "skill") {
            const skill = skillByName.get(item.identifier);
            if (skill) {
                return {
                    kind: "skill",
                    identifier: item.identifier,
                    addedAt: item.addedAt,
                    missing: false,
                    skill,
                };
            }
        } else {
            const command = commandByName.get(item.identifier);
            if (command) {
                return {
                    kind: "command",
                    identifier: item.identifier,
                    addedAt: item.addedAt,
                    missing: false,
                    command,
                };
            }
        }
        return {
            kind: item.kind,
            identifier: item.identifier,
            addedAt: item.addedAt,
            missing: true,
        };
    });
}

async function safeScanSkills(): Promise<Skill[]> {
    try {
        return scanSkills().skills;
    } catch {
        return [];
    }
}

async function safeScanCommands(): Promise<Command[]> {
    try {
        return scanCommands().commands;
    } catch {
        return [];
    }
}
