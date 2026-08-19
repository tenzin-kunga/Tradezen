import { MarkdownIssue, MarkdownRule, ValidationSeverity } from '../types';
import { headingDepth, isBlank, isHeading, splitLines } from '../utils';

export class HeadingRule implements MarkdownRule {
  name = 'HeadingRule';
  dimension = 'headings';
  weight = 15;

  validate(md: string): MarkdownIssue[] {
    const lines = splitLines(md);
    const issues: MarkdownIssue[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!isHeading(line)) continue;
      if (headingDepth(line) > 3) {
        issues.push(
          this.issue('minor', `Heading depth exceeds recommended max of 3`),
        );
      }
      const prev = lines[i - 1];
      if (prev !== undefined && !isBlank(prev) && !isHeading(prev)) {
        issues.push(
          this.issue('minor', 'Heading missing a blank line before it'),
        );
      }
      const next = lines[i + 1];
      if (next !== undefined && !isBlank(next) && !isHeading(next)) {
        issues.push(
          this.issue('minor', 'Heading missing a blank line after it'),
        );
      }
      if (/^#{1,6}\s*$/.test(line)) {
        issues.push(this.issue('major', 'Empty heading with no text'));
      }
    }
    return issues;
  }

  autoFix(md: string): string {
    const lines = splitLines(md);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isHeading(line)) {
        const prev = out[out.length - 1];
        if (prev !== undefined && !isBlank(prev)) out.push('');
        out.push(line);
        const next = lines[i + 1];
        if (next !== undefined && !isBlank(next) && !isHeading(next))
          out.push('');
      } else {
        out.push(line);
      }
    }
    return out.join('\n');
  }

  private issue(severity: ValidationSeverity, message: string): MarkdownIssue {
    return { rule: this.name, dimension: this.dimension, severity, message };
  }
}
