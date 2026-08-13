// ponytail: best-effort markdown normalizer for assistant output. Hardens
// borderline model responses (missing blank lines, rammed headings, tables
// without a separator row) so ReactMarkdown parses them as structured blocks.
// It cannot recover text where the model omitted every delimiter — the system
// prompt is the reliable lever for that.

export function normalizeAssistantMarkdown(input: string): string {
  if (!input) return input;
  let s = input;

  // 1. Blank line before any heading that isn't at the very start.
  s = s.replace(/([^\n])(#{2,3}\s)/g, "$1\n\n$2");

  // 2. Blank line before bullet / numbered-list lines.
  s = s.replace(/([^\n])\n([-*]\s|\d+\.\s)/g, "$1\n\n$2");

  // 3. Guarantee a table separator row under header rows.
  s = ensureTableSeparators(s);

  // 4. Collapse 3+ newlines into a single blank line.
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.includes("|", 1);
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes("-");
}

function ensureTableSeparators(s: string): string {
  const lines = s.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);
    const next = lines[i + 1];
    if (
      isTableRow(line) &&
      next !== undefined &&
      isTableRow(next) &&
      !isSeparatorRow(next)
    ) {
      const cols = Math.max(line.split("|").length - 1, 2);
      out.push("|" + Array(cols).fill(" --- ").join("|") + "|");
    }
  }
  return out.join("\n");
}
