export function splitLines(md: string): string[] {
  return md.split(/\r?\n/);
}

export function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

export function isHeading(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line);
}

export function headingDepth(line: string): number {
  const m = line.match(/^(#+)/);
  return m ? m[1].length : 0;
}

export function isBullet(line: string): boolean {
  return /^\s*([-*+]|\d+\.)\s+/.test(line);
}

export function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith('|') && t.includes('|', 1);
}

export function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

export function isCodeFence(line: string): boolean {
  return /^```/.test(line);
}
