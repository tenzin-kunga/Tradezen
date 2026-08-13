import { MarkdownRule } from '../types';
import { isCodeFence, splitLines } from '../utils';

export class CodeFenceRule implements MarkdownRule {
  name = 'CodeFenceRule';
  dimension = 'code';
  weight = 10;

  validate(md: string): ReturnType<MarkdownRule['validate']> {
    const lines = splitLines(md);
    const issues: ReturnType<MarkdownRule['validate']> = [];
    let fences = 0;
    for (const line of lines) if (isCodeFence(line)) fences++;
    if (fences % 2 !== 0) {
      issues.push({
        rule: this.name,
        dimension: this.dimension,
        severity: 'major',
        message: 'Unclosed code fence (odd number of ``` markers)',
      });
    }
    return issues;
  }

  // Cannot safely auto-close a fence without knowing where the block ends.
}
