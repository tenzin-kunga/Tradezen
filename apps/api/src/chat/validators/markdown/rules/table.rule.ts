import { MarkdownIssue, MarkdownRule, ValidationSeverity } from '../types';
import { isSeparatorRow, isTableRow, splitLines } from '../utils';

export class TableRule implements MarkdownRule {
  name = 'TableRule';
  dimension = 'tables';
  weight = 10;

  validate(md: string): MarkdownIssue[] {
    const lines = splitLines(md);
    const issues: MarkdownIssue[] = [];
    let inTable = false;
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const next = lines[i + 1];
      const isRow = isTableRow(line) && !isSeparatorRow(line);
      const isSep = isSeparatorRow(line);

      if (isRow && !inTable) {
        // First row of a table block must be followed by a separator row.
        if (!(isTableRow(next) && isSeparatorRow(next))) {
          issues.push(
            this.issue(
              'major',
              "Table header row missing a '| --- |' separator row",
            ),
          );
        }
        inTable = true;
      } else if (isSep) {
        inTable = true;
      } else if (!isRow && !isSep) {
        inTable = false;
      }

      if (isRow && isSeparatorRow(next)) {
        const cols = line.split('|').length - 2;
        const sepCols = next.split('|').length - 2;
        if (cols > 0 && sepCols > 0 && cols !== sepCols) {
          issues.push(
            this.issue(
              'major',
              `Table column count mismatch (header ${cols} vs separator ${sepCols})`,
            ),
          );
        }
      }
    }
    return issues;
  }

  autoFix(md: string): string {
    const lines = splitLines(md);
    const out: string[] = [];
    let inTable = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      out.push(line);
      const next = lines[i + 1];
      const isRow = isTableRow(line) && !isSeparatorRow(line);
      const isSep = isSeparatorRow(line);
      if (
        isRow &&
        !inTable &&
        next !== undefined &&
        isTableRow(next) &&
        !isSeparatorRow(next)
      ) {
        const cols = Math.max(line.split('|').length - 2, 2);
        out.push('|' + Array(cols).fill(' --- ').join('|') + '|');
        inTable = true;
      } else if (isSep) {
        inTable = true;
      } else if (!isRow && !isSep) {
        inTable = false;
      }
    }
    return out.join('\n');
  }

  private issue(severity: ValidationSeverity, message: string): MarkdownIssue {
    return { rule: this.name, dimension: this.dimension, severity, message };
  }
}
