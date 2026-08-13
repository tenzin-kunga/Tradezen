import { MarkdownIssue, MarkdownRule, ValidationSeverity } from '../types';
import { VALIDATION_CONFIG } from '../types';
import { isBlank, splitLines } from '../utils';

export class SpacingRule implements MarkdownRule {
  name = 'SpacingRule';
  dimension = 'spacing';
  weight = 15;

  validate(md: string): MarkdownIssue[] {
    const lines = splitLines(md);
    const issues: MarkdownIssue[] = [];
    let blankRun = 0;
    for (const line of lines) {
      if (isBlank(line)) {
        blankRun++;
        if (blankRun > VALIDATION_CONFIG.maxBlankLines) {
          issues.push(
            this.issue(
              'minor',
              `More than ${VALIDATION_CONFIG.maxBlankLines} consecutive blank lines`,
            ),
          );
        }
      } else {
        blankRun = 0;
      }
      if (line.length > line.trimEnd().length) {
        issues.push(this.issue('minor', 'Trailing whitespace on a line'));
      }
    }
    return issues;
  }

  autoFix(md: string): string {
    const lines = splitLines(md);
    const out: string[] = [];
    let blankRun = 0;
    for (const line of lines) {
      const trimmed = line.replace(/[ \t]+$/, '');
      if (trimmed.length === 0) {
        blankRun++;
        if (blankRun <= VALIDATION_CONFIG.maxBlankLines) out.push('');
      } else {
        blankRun = 0;
        out.push(trimmed);
      }
    }
    return out.join('\n').replace(/\s+$/, '');
  }

  private issue(severity: ValidationSeverity, message: string): MarkdownIssue {
    return { rule: this.name, dimension: this.dimension, severity, message };
  }
}
