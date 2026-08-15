import {
  RULES,
  VALIDATION_CONFIG,
  autoFixMarkdown,
  scoreMarkdown,
  validateMarkdown,
} from './validators';
import type { FormattingResult, RepairReason } from './validators';

export interface FormattingOptions {
  // Pure function that repairs markdown via an external formatter (e.g. an LLM).
  // Supplied by the caller so this pipeline stays free of side effects / I/O.
  formatter?: (text: string) => Promise<string>;
  config?: typeof VALIDATION_CONFIG;
  rules?: typeof RULES;
  promptVersion?: string;
  // Bypass the normal formatter score gate (e.g. for under-structured prose).
  forceFormatter?: boolean;
}

// Number-preservation safeguard for formatter output. Every numeric token in
// the original must still appear in the candidate (set-subset), so formatter
// Markdown list markers like "1." never cause false failures. Changed or
// dropped financial figures, percentages, dates, and quantities are rejected
// where they are represented as numeric tokens. This is ONLY one semantic-safety
// signal — it does not verify non-numeric facts, conclusions, polarity, or
// wording.
const NUMBER_TOKEN = /[0-9]+(?:\.[0-9]+)?/g;

function numericTokens(text: string): Set<string> {
  return new Set(text.match(NUMBER_TOKEN) ?? []);
}

export function preservesNumbers(original: string, candidate: string): boolean {
  const originalTokens = numericTokens(original);
  if (originalTokens.size === 0) return true;
  const candidateTokens = numericTokens(candidate);
  for (const token of originalTokens) {
    if (!candidateTokens.has(token)) return false;
  }
  return true;
}

// Internal prompt/context template tokens (e.g. {{documents}}) must never reach
// user-visible output. The AI service now resolves every {{variable}} at the
// source; this guard is defense-in-depth: a formatter candidate that INTRODUCES
// a placeholder absent from the original is rejected.
const TEMPLATE_PLACEHOLDER = /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/g;

function templatePlaceholders(text: string): Set<string> {
  return new Set(text.match(TEMPLATE_PLACEHOLDER) ?? []);
}

export function preservesPlaceholders(
  original: string,
  candidate: string,
): boolean {
  const originalTokens = templatePlaceholders(original);
  const candidateTokens = templatePlaceholders(candidate);
  for (const token of candidateTokens) {
    if (!originalTokens.has(token)) return false;
  }
  return true;
}

const MIN_PROSE_LENGTH = 400;
const MIN_PROSE_PARAGRAPHS = 3;
const PROSE_STRUCTURE_MARKERS = [
  /\*\*/, // bold
  /^#{1,6}\s/m, // headings
  /^[-*+]\s+/m, // unordered lists
  /^\d+[.)]\s+/m, // numbered lists
  /^\s*\|/m, // markdown tables
  /```/, // fenced code
];

// Detects the actual problematic case this remediation targets: a long plain
// prose answer with multiple paragraphs and essentially no useful Markdown
// structure. Deterministic and cheap — no LLM classification. It must NOT fire
// on short conversational one-liners, short responses, normal two-paragraph
// explanations, or anything already carrying Markdown structure (headings,
// lists, tables, code blocks).
export function isUnstructuredProse(buffer: string): boolean {
  if (!buffer || buffer.length < MIN_PROSE_LENGTH) return false;
  const paragraphs = buffer.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < MIN_PROSE_PARAGRAPHS) return false;
  return !PROSE_STRUCTURE_MARKERS.some((re) => re.test(buffer));
}

// Pure, side-effect-free formatting pipeline:
//   validate → score
//     ≥ passScore: ship as-is
//     85..passScore: deterministic auto-fix → re-score
//     < autoFixScore: formatting LLM (if provided) → re-score, else auto-fix
//   forceFormatter: bypass only the formatter score gate (a high-scoring
//     plain-prose original can legitimately lose a few points when real
//     Markdown structure is added). Safety checks — non-empty, minimum length,
//     numeric preservation, no hard (major) validation failure — still apply.
// Returns both raw and formatted markdown plus telemetry. The caller decides
// what to persist, emit, and log.
export async function runFormattingPipeline(
  buffer: string,
  options: FormattingOptions = {},
): Promise<FormattingResult> {
  const config = options.config ?? VALIDATION_CONFIG;
  const rules = options.rules ?? RULES;
  const forced = options.forceFormatter === true;
  const t0 = Date.now();

  const before = validateMarkdown(buffer, rules);
  const scoreBefore = scoreMarkdown(before.issues, rules).score;
  const ruleMetrics = before.ruleMetrics;

  let current = buffer;
  let formatterInvoked = false;
  let repairReason: RepairReason | undefined;
  let formatterMs = 0;

  const formatter = options.formatter;
  if (scoreBefore < config.passScore || forced) {
    if (formatter && (forced || scoreBefore < config.autoFixScore)) {
      formatterInvoked = true;
      const tf = Date.now();
      const corrected = (await formatter(buffer)).trim();
      formatterMs = Date.now() - tf;
      const after = validateMarkdown(corrected, rules);
      const reScoreResult = scoreMarkdown(after.issues, rules);
      const reScore = reScoreResult.score;
      // ponytail: empty/degraded replies score 100 and would wipe the original —
      // require non-empty AND at least half the length.
      const keptEnough =
        corrected.length >= Math.floor(buffer.trim().length * 0.5);
      const safe =
        corrected.length > 0 &&
        keptEnough &&
        preservesNumbers(buffer, corrected) &&
        preservesPlaceholders(buffer, corrected);
      // NORMAL path keeps the existing score requirement (candidate must not be
      // worse than the baseline). FORCED prose path bypasses ONLY that gate and
      // instead rejects candidates carrying a hard (major) validation failure.
      const accepted =
        safe &&
        (forced ? reScoreResult.severity !== 'major' : reScore >= scoreBefore);
      if (accepted) {
        current = corrected;
        repairReason = 'formatting_llm';
      } else if (forced) {
        // Forced formatter output failed safety checks → keep the original
        // response; the chat request must still succeed.
        current = buffer;
      } else {
        // Existing normal-path fallback: deterministic auto-fix.
        const fixed = autoFixMarkdown(buffer, rules);
        if (fixed !== buffer) repairReason = 'auto_fix';
        current = fixed;
      }
    } else if (!forced && scoreBefore >= config.autoFixScore) {
      const fixed = autoFixMarkdown(buffer, rules);
      if (fixed !== buffer) repairReason = 'auto_fix';
      current = fixed;
    } else {
      const fixed = autoFixMarkdown(buffer, rules);
      if (fixed !== buffer)
        repairReason = forced ? 'auto_fix' : 'auto_fix_no_model';
      current = fixed;
    }
  }

  const scoreAfter = scoreMarkdown(
    validateMarkdown(current, rules).issues,
    rules,
  ).score;
  const validationMs = Date.now() - t0;

  return {
    rawMarkdown: buffer,
    markdown: current,
    changed: current !== buffer,
    scoreBefore,
    scoreAfter,
    formatterInvoked,
    repairReason,
    ruleMetrics,
    timings: { validationMs, formatterMs },
  };
}
