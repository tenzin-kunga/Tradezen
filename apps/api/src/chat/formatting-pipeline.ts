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
}

// Pure, side-effect-free formatting pipeline:
//   validate → score
//     ≥ passScore: ship as-is
//     85..passScore: deterministic auto-fix → re-score
//     < autoFixScore: formatting LLM (if provided) → re-score, else auto-fix
// Returns both raw and formatted markdown plus telemetry. The caller decides
// what to persist, emit, and log.
export async function runFormattingPipeline(
  buffer: string,
  options: FormattingOptions = {},
): Promise<FormattingResult> {
  const config = options.config ?? VALIDATION_CONFIG;
  const rules = options.rules ?? RULES;
  const t0 = Date.now();

  const before = validateMarkdown(buffer, rules);
  const scoreBefore = scoreMarkdown(before.issues, rules).score;
  const ruleMetrics = before.ruleMetrics;

  let current = buffer;
  let formatterInvoked = false;
  let repairReason: RepairReason | undefined;
  let formatterMs = 0;

  if (scoreBefore < config.passScore) {
    if (scoreBefore >= config.autoFixScore) {
      const fixed = autoFixMarkdown(buffer, rules);
      if (fixed !== buffer) repairReason = 'auto_fix';
      current = fixed;
    } else if (options.formatter) {
      formatterInvoked = true;
      const tf = Date.now();
      const corrected = (await options.formatter(buffer)).trim();
      formatterMs = Date.now() - tf;
      const reScore = scoreMarkdown(
        validateMarkdown(corrected, rules).issues,
        rules,
      ).score;
      // ponytail: empty/degraded replies score 100 and would wipe the original —
      // require non-empty AND at least half the length AND not worse than the baseline.
      const keptEnough =
        corrected.length >= Math.floor(buffer.trim().length * 0.5);
      if (corrected.length > 0 && keptEnough && reScore >= scoreBefore) {
        current = corrected;
        repairReason = 'formatting_llm';
      } else {
        const fixed = autoFixMarkdown(buffer, rules);
        if (fixed !== buffer) repairReason = 'auto_fix';
        current = fixed;
      }
    } else {
      const fixed = autoFixMarkdown(buffer, rules);
      if (fixed !== buffer) repairReason = 'auto_fix_no_model';
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
