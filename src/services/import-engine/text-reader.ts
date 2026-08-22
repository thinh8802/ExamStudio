import type { DocxParagraph } from './types';

export function readTextFile(text: string): DocxParagraph[] {
  const lines = text.split('\n');
  return lines.map(line => ({
    text: line,
    runs: [{ text: line }]
  }));
}
