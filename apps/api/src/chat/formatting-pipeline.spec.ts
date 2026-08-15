import {
  runFormattingPipeline,
  isUnstructuredProse,
  preservesNumbers,
} from './formatting-pipeline';
import { autoFixMarkdown } from './validators';

const LONG_PROSE = [
  'The first paragraph explains market context. Trade with the higher timeframe trend rather than against it, and always mark the key supply and demand zones before you consider an entry of any kind.',
  'The second paragraph covers risk management. Size every position so a full stop out costs no more than two percent of the account, and place stops beyond structure rather than at arbitrary pip distances from entry.',
  'The third paragraph covers execution discipline. Wait for a clear trigger such as a break and retest, avoid the high impact news windows, and never average into a losing position without a written plan.',
].join('\n\n');

describe('isUnstructuredProse', () => {
  it('returns false for a short conversational one-liner', () => {
    expect(isUnstructuredProse('Thanks, that makes sense.')).toBe(false);
  });

  it('returns false for a short response', () => {
    expect(
      isUnstructuredProse('The RSI is neutral around 50 with no divergence.'),
    ).toBe(false);
  });

  it('returns false for two short paragraphs', () => {
    const two =
      'The first short paragraph explains the setup.\n\nThe second short paragraph gives the conclusion.';
    expect(isUnstructuredProse(two)).toBe(false);
  });

  it('returns true for long plain prose with 3+ paragraphs', () => {
    expect(isUnstructuredProse(LONG_PROSE)).toBe(true);
  });

  it('returns false when the response already has a heading', () => {
    expect(isUnstructuredProse(`## Overview\n\n${LONG_PROSE}`)).toBe(false);
  });

  it('returns false when the response already has bullets', () => {
    const bullets = LONG_PROSE.split('\n\n')
      .map((p) => `- ${p}`)
      .join('\n');
    expect(isUnstructuredProse(bullets)).toBe(false);
  });

  it('returns false when the response already has a numbered list', () => {
    const numbered = LONG_PROSE.split('\n\n')
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n');
    expect(isUnstructuredProse(numbered)).toBe(false);
  });

  it('returns false when the response already has a markdown table', () => {
    const table =
      '| Setup | Trigger | Risk |\n| --- | --- | --- |\n| Breakout | retest of range high | wider |';
    expect(isUnstructuredProse(table)).toBe(false);
  });

  it('returns false when the response already has a fenced code block', () => {
    const code = `Lead paragraph.\n\n\`\`\`\nconst x = 1;\n\`\`\`\n\nTrailing paragraph.`;
    expect(isUnstructuredProse(code)).toBe(false);
  });
});

describe('runFormattingPipeline — normal (non-forced) path', () => {
  it('ships a well-structured response unchanged without calling the formatter', async () => {
    const structured =
      '## Overview\n\nA **structured** reply.\n\n- item one\n- item two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |';
    const formatter = jest.fn();
    const result = await runFormattingPipeline(structured, { formatter });
    expect(formatter).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
    expect(result.markdown).toBe(structured);
  });

  it('exercises the existing formatter path for a low-score response', async () => {
    const wallOfText = `${'A'.repeat(700)}\n\n${'B'.repeat(700)}`;
    const candidate = `## Summary\n\n${'Short paragraph one with clean structure.'.repeat(12)}\n\n${'Short paragraph two with clean structure.'.repeat(12)}`;
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(wallOfText, { formatter });
    expect(formatter).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(true);
    expect(result.markdown).toBe(candidate);
  });

  it('keeps the existing auto-fix fallback when normal formatter output is rejected', async () => {
    const wallOfText = `${'A'.repeat(700)}\n\n${'B'.repeat(700)}`;
    const formatter = jest.fn().mockResolvedValue('x'); // too short → rejected
    const result = await runFormattingPipeline(wallOfText, { formatter });
    expect(formatter).toHaveBeenCalledTimes(1);
    // Existing behavior: deterministic auto-fix fallback, not the original bypass.
    expect(result.markdown).toBe(autoFixMarkdown(wallOfText));
    expect(result.markdown).not.toBe('x');
  });
});

describe('runFormattingPipeline — forced (under-structured prose) path', () => {
  const original =
    'The stop goes at 42 points.\n\nTake profit sits at 88 points.\n\nRisk stays at two percent.';

  it('calls the formatter even when the original scores above the threshold', async () => {
    const candidate = `## Overview\n\n${LONG_PROSE}`;
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(LONG_PROSE, {
      formatter,
      forceFormatter: true,
    });
    expect(formatter).toHaveBeenCalledTimes(1);
    expect(result.changed).toBe(true);
    expect(result.markdown).toBe(candidate);
  });

  it('accepts a candidate with a slightly lower score but valid structure (regression)', async () => {
    const candidate = `## Overview \n\n${LONG_PROSE}`; // trailing space → minor issue, score < 100
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(LONG_PROSE, {
      formatter,
      forceFormatter: true,
    });
    expect(formatter).toHaveBeenCalledTimes(1);
    expect(result.scoreBefore).toBeGreaterThan(result.scoreAfter);
    // Forced prose path: accepted on safety checks alone, not on score gain.
    expect(result.changed).toBe(true);
    expect(result.markdown).toBe(candidate);
  });

  it('rejects a candidate that changes a number and returns the original', async () => {
    const candidate =
      'The stop goes at 43 points.\n\nTake profit sits at 88 points.\n\nRisk stays at two percent.';
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(original, {
      formatter,
      forceFormatter: true,
    });
    expect(result.changed).toBe(false);
    expect(result.markdown).toBe(original);
  });

  it('rejects a candidate that drops a figure and returns the original', async () => {
    const candidate =
      'The stop distance is not shown.\n\nTake profit sits at 88 points.\n\nRisk stays at two percent.';
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(original, {
      formatter,
      forceFormatter: true,
    });
    expect(result.changed).toBe(false);
    expect(result.markdown).toBe(original);
  });

  it('rejects an empty / too-short candidate and returns the original', async () => {
    const formatter = jest.fn().mockResolvedValue('x');
    const result = await runFormattingPipeline(original, {
      formatter,
      forceFormatter: true,
    });
    expect(result.changed).toBe(false);
    expect(result.markdown).toBe(original);
  });

  it('rejects a candidate failing hard validation (unclosed code fence)', async () => {
    const candidate = `## Heading\n\n${'Some long body text to pass the length gate. '.repeat(8)}\n\n\`\`\`\nunclosed`;
    const formatter = jest.fn().mockResolvedValue(candidate);
    const result = await runFormattingPipeline(LONG_PROSE, {
      formatter,
      forceFormatter: true,
    });
    expect(result.changed).toBe(false);
    expect(result.markdown).toBe(LONG_PROSE);
  });

  it('propagates a formatter throw so the caller keeps the original response', async () => {
    const formatter = jest.fn().mockRejectedValue(new Error('formatter down'));
    await expect(
      runFormattingPipeline(original, { formatter, forceFormatter: true }),
    ).rejects.toThrow('formatter down');
  });
});

describe('preservesNumbers', () => {
  it('passes when all original numeric tokens remain', () => {
    expect(
      preservesNumbers(
        '1.5% risk at 42 points',
        '## Risk\n\n- 1.5% risk at 42 points',
      ),
    ).toBe(true);
  });

  it('fails when a number changes', () => {
    expect(preservesNumbers('42 points', '43 points')).toBe(false);
  });

  it('fails when a number is dropped', () => {
    expect(preservesNumbers('stop at 42 points', 'stop distance unknown')).toBe(
      false,
    );
  });

  it('does not false-fail on formatter-added list markers', () => {
    expect(preservesNumbers('First, second.', '1. First\n2. Second')).toBe(
      true,
    );
  });

  it('passes trivially when the original has no numbers', () => {
    expect(
      preservesNumbers('plain prose only', '## Heading\n\nplain prose only'),
    ).toBe(true);
  });
});
