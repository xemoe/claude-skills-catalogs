/**
 * Parse the `?preset=` query value used to filter explorers and to carry
 * preset context across the preset detail → skill/command detail navigation.
 * Returns null for empty, non-string, non-integer, or non-positive input.
 */
export function parsePresetId(value: string | string[] | undefined): number | null {
    if (typeof value !== "string" || value.length === 0) return null;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}
