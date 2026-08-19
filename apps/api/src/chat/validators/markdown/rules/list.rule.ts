import { MarkdownIssue, MarkdownRule, ValidationSeverity } from '../types';
import { isBlank, isBullet, isHeading, splitLines } from '../utils';

export class ListRule implements MarkdownRule {
  name = 'ListRule';
  dimension = 'lists';
  weight = 20;

  validate(md: string): MarkdownIssue[] {
    const lines = splitLines(md);
    const issues: MarkdownIssue[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!isBullet(line)) continue;
      const prev = lines[i - 1];
      if (
        prev !== undefined &&
        !isBlank(prev) &&
        !isBullet(prev) &&
        !isHeading(prev)
      ) {
        issues.push(
          this.issue(
            'minor',
            'List item rammed against previous paragraph (missing blank line)',
          ),
        );
      }
    }
    return issues;
  }

  autoFix(md: string): string {
    const lines = splitLines(md);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isBullet(line)) {
        const prev = out[out.length - 1];
        if (prev !== undefined && !isBlank(prev) && !isBullet(prev))
          out.push('');
      }
      out.push(line);
    }
    return out.join('\n');
  }

  private issue(severity: ValidationSeverity, message: string): MarkdownIssue {
    return { rule: this.name, dimension: this.dimension, severity, message };
  }
}
