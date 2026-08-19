import {
  MarkdownIssue,
  MarkdownRule,
  ScoreResult,
  ValidationResult,
  ValidationSeverity,
} from './types';
import { HeadingRule } from './rules/heading.rule';
import { ListRule } from './rules/list.rule';
import { TableRule } from './rules/table.rule';
import { ReadabilityRule } from './rules/readability.rule';
import { SpacingRule } from './rules/spacing.rule';
import { CodeFenceRule } from './rules/codefence.rule';

// Registration order: deterministic auto-fix runs in this order, with Spacing
// last so it cleans up blank lines / trailing whitespace added by earlier fixes.
export const RULES: MarkdownRule[] = [
  new ReadabilityRule(),
  new ListRule(),
  new HeadingRule(),
  new SpacingRule(),
  new TableRule(),
  new CodeFenceRule(),
];

const SEVERITY_PENALTY: Record<Exclude<ValidationSeverity, 'none'>, number> = {
  minor: 0.25,
  major: 0.7,
};

export function validateMarkdown(
  md: string,
  rules: MarkdownRule[] = RULES,
): ValidationResult {
  const issues: MarkdownIssue[] = [];
  const ruleMetrics: Record<string, number> = {};
  for (const rule of rules) {
    const found = rule.validate(md);
    if (found.length > 0) {
      ruleMetrics[rule.name] = (ruleMetrics[rule.name] ?? 0) + found.length;
      issues.push(...found);
    }
  }
  return { issues, ruleMetrics };
}

export function scoreMarkdown(
  issues: MarkdownIssue[],
  rules: MarkdownRule[] = RULES,
): ScoreResult {
  const byRule = new Map<string, MarkdownIssue[]>();
  for (const issue of issues) {
    const arr = byRule.get(issue.rule) ?? [];
    arr.push(issue);
    byRule.set(issue.rule, arr);
  }

  let total = 0;
  let hasMajor = false;
  let hasMinor = false;
  for (const rule of rules) {
    const ruleIssues = byRule.get(rule.name) ?? [];
    let penalty = 0;
    for (const issue of ruleIssues) {
      penalty += rule.weight * SEVERITY_PENALTY[issue.severity];
      if (issue.severity === 'major') hasMajor = true;
      else hasMinor = true;
    }
    penalty = Math.min(penalty, rule.weight);
    total += rule.weight - penalty;
  }

  const severity: ValidationSeverity = hasMajor
    ? 'major'
    : hasMinor
      ? 'minor'
      : 'none';
  return { score: Math.round(total), severity };
}

export function autoFixMarkdown(
  md: string,
  rules: MarkdownRule[] = RULES,
): string {
  let out = md;
  for (const rule of rules) {
    if (rule.autoFix) out = rule.autoFix(out);
  }
  return out;
}
