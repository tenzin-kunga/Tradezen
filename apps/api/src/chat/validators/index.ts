export {
  RULES,
  validateMarkdown,
  scoreMarkdown,
  autoFixMarkdown,
} from './markdown';
export { VALIDATION_CONFIG } from './markdown/types';
export type {
  MarkdownRule,
  MarkdownIssue,
  ValidationSeverity,
  ValidationResult,
  ScoreResult,
  FormattingResult,
  RepairReason,
} from './markdown/types';
