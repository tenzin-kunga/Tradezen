import { MarkdownRule } from '../types';
import { VALIDATION_CONFIG } from '../types';
import { isBlank, isBullet, isHeading, isTableRow, splitLines } from '../utils';

export class ReadabilityRule implements MarkdownRule {
  name = 'ReadabilityRule';
  dimension = 'readability';
  weight = 30;

  validate(
    md: string,
  ): MarkdownRule['validate'] extends never
    ? never
    : ReturnType<MarkdownRule['validate']> {
    const lines = splitLines(md);
    const issues: ReturnType<MarkdownRule['validate']> = [];
    let para: string[] = [];
    let consecutiveLongParas = 0;
    let wallFlagged = false;
    const flush = (block: string[]) => {
      if (block.length > 0) {
        const isLong =
          block.length === 1 &&
          block[0].length > VALIDATION_CONFIG.maxParagraphLength;
        if (isLong) {
          consecutiveLongParas += 1;
        } else {
          consecutiveLongParas = 0;
          wallFlagged = false;
        }
        // ponytail: only a wall of 2+ stacked long single-line blocks is a
        // readability problem; one long paragraph is normal prose.
        if (consecutiveLongParas >= 2 && !wallFlagged) {
          issues.push({
            rule: this.name,
            dimension: this.dimension,
            severity: 'major',
            message: `Unbroken wall of text (${consecutiveLongParas} stacked lines over ${VALIDATION_CONFIG.maxParagraphLength} chars)`,
          });
          wallFlagged = true;
        }
      }
      para = [];
    };
    for (const line of lines) {
      if (
        isBlank(line) ||
        isHeading(line) ||
        isBullet(line) ||
        isTableRow(line) ||
        line.startsWith('```')
      ) {
        flush(para);
      } else {
        para.push(line);
      }
    }
    flush(para);
    return issues;
  }

  // Readability repair needs semantic rewriting → handled by the formatting LLM, not auto-fix.
}
