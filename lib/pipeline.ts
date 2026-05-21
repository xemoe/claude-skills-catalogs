/**
 * Turns a SKILL.md / command body into an ordered "pipeline" of steps.
 *
 * The body rarely declares its workflow in a single machine-readable shape, so
 * a priority cascade is used:
 *   1. numbered headings  — `### 1. Foo`, `## Step 2: Bar`
 *   2. the main numbered list — the longest `1. 2. 3.` run not under a
 *      decorative heading (Tips / Notes / Rules …)
 *   3. the section outline — `##` headings, then `###` headings
 */

export type PipelineKind = "steps" | "outline";

export interface PipelineStep {
  /** 1-based position in the pipeline. */
  index: number;
  title: string;
  /** Short supporting line — may be empty. */
  detail: string;
}

export interface Pipeline {
  /** `steps` = an explicit procedure; `outline` = the document's section flow. */
  kind: PipelineKind;
  steps: PipelineStep[];
}

const DECORATIVE_HEADING =
  /\b(tips?|notes?|examples?|faq|caveats?|warnings?|gotchas?|rules?|references?)\b/i;

const NUMBERED_HEADING =
  /^(?:(?:step|phase|stage|part)\s+)?(\d+)\s*[.):–-]\s*(.+)$/i;

const MAX_STEPS = 24;

function stripInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

interface Heading {
  level: number;
  text: string;
  line: number;
}

/** First line of plain prose under a heading — skips lists, tables and images. */
function firstProse(lines: string[], from: number, to: number): string {
  for (let i = from + 1; i < Math.min(to, lines.length); i++) {
    const ln = lines[i].trim();
    if (!ln) continue;
    if (/^#{1,6}\s/.test(ln)) break;
    if (/^[-*+]\s/.test(ln) || /^\d+[.)]\s/.test(ln)) continue;
    if (/^[|>]/.test(ln) || /^!?\[/.test(ln)) continue;
    return truncate(stripInline(ln), 96);
  }
  return "";
}

/** Splits a numbered-list item into a bold/leading title and the rest. */
function splitListItem(text: string): { title: string; detail: string } {
  const bold = text.match(/^\*\*(.+?)\*\*/);
  if (bold) {
    const rest = text.slice(bold[0].length).replace(/^[\s—–:.\-]+/, "");
    return { title: stripInline(bold[1]), detail: stripInline(rest) };
  }
  const split = text.match(/^(.+?)(?:\s+[—–-]\s+|:\s+|\.\s+)(.+)$/);
  if (split) return { title: stripInline(split[1]), detail: stripInline(split[2]) };
  return { title: stripInline(text), detail: "" };
}

export function extractPipeline(body: string): Pipeline {
  if (!body || !body.trim()) return { kind: "outline", steps: [] };

  // Drop fenced code blocks so ASCII diagrams and examples don't pollute parsing.
  const lines = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .split(/\r?\n/);

  const headings: Heading[] = [];
  lines.forEach((ln, i) => {
    const m = ln.match(/^(#{1,6})\s+(.*\S)\s*$/);
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i });
  });
  const headingEnd = (idx: number): number =>
    idx + 1 < headings.length ? headings[idx + 1].line : lines.length;

  // --- Priority 1: numbered headings ---------------------------------------
  const numbered = headings
    .map((h, idx) => {
      const m = h.text.match(NUMBERED_HEADING);
      return m ? { title: m[2].trim(), idx, line: h.line } : null;
    })
    .filter((x): x is { title: string; idx: number; line: number } => x !== null);
  if (numbered.length >= 2) {
    return {
      kind: "steps",
      steps: numbered.slice(0, MAX_STEPS).map((h, i) => ({
        index: i + 1,
        title: truncate(stripInline(h.title), 72),
        detail: firstProse(lines, h.line, headingEnd(h.idx)),
      })),
    };
  }

  // --- Priority 2: the main numbered list ----------------------------------
  interface Item {
    num: number;
    text: string;
    line: number;
  }
  const runs: Item[][] = [];
  let run: Item[] = [];
  lines.forEach((ln, i) => {
    const m = ln.match(/^\s{0,3}(\d+)[.)]\s+(.+\S)\s*$/);
    if (!m) return;
    const item: Item = { num: parseInt(m[1], 10), text: m[2].trim(), line: i };
    if (run.length && item.num <= run[run.length - 1].num) {
      runs.push(run);
      run = [];
    }
    run.push(item);
  });
  if (run.length) runs.push(run);

  const headingFor = (line: number): Heading | null => {
    let found: Heading | null = null;
    for (const h of headings) {
      if (h.line < line) found = h;
      else break;
    }
    return found;
  };

  let best: Item[] | null = null;
  for (const candidate of runs) {
    if (candidate.length < 3) continue;
    const owner = headingFor(candidate[0].line);
    if (owner && DECORATIVE_HEADING.test(owner.text)) continue;
    if (!best || candidate.length > best.length) best = candidate;
  }
  if (best) {
    return {
      kind: "steps",
      steps: best.slice(0, MAX_STEPS).map((it, i) => {
        const { title, detail } = splitListItem(it.text);
        return { index: i + 1, title: truncate(title, 72), detail: truncate(detail, 96) };
      }),
    };
  }

  // --- Priority 3: the section outline -------------------------------------
  for (const level of [2, 3]) {
    const sections = headings
      .map((h, idx) => ({ h, idx }))
      .filter((entry) => entry.h.level === level);
    if (sections.length >= 2) {
      return {
        kind: "outline",
        steps: sections.slice(0, MAX_STEPS).map((entry, i) => ({
          index: i + 1,
          title: truncate(stripInline(entry.h.text), 72),
          detail: firstProse(lines, entry.h.line, headingEnd(entry.idx)),
        })),
      };
    }
  }

  return { kind: "outline", steps: [] };
}
