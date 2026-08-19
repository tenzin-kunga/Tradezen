export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\0/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
