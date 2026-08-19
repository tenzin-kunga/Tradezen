export const VALIDATION_CONFIG = {
  passScore: 95,
  autoFixScore: 85,
  maxHeadingDepth: 3,
  maxParagraphLength: 600,
  maxBlankLines: 2,
} as const;

export type ValidationSeverity = 'none' | 'minor' | 'major';

export interface MarkdownIssue {
  rule: string;
  dimension: string;
  severity: ValidationSeverity;
  message: string;
}

export interface MarkdownRule {
  name: string;
  dimension: string;
  weight: number;
  validate(markdown: string): MarkdownIssue[];
  autoFix?(markdown: string): string;
}

export interface ValidationResult {
  issues: MarkdownIssue[];
  ruleMetrics: Record<string, number>;
}

export interface ScoreResult {
  score: number;
  severity: ValidationSeverity;
}

export type RepairReason = 'auto_fix' | 'formatting_llm' | 'auto_fix_no_model';

export interface FormattingResult {
  rawMarkdown: string;
  markdown: string;
  changed: boolean;
  scoreBefore: number;
  scoreAfter: number;
  formatterInvoked: boolean;
  repairReason?: RepairReason;
  ruleMetrics: Record<string, number>;
  timings: { validationMs: number; formatterMs: number };
}
