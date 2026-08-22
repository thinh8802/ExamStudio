import * as pdfjsLib from 'pdfjs-dist';
import type { DocxParagraph } from './types';

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface TextItemInfo {
  str: string;
  transform: number[]; // [ scaleX, skewY, skewX, scaleY, translateX, translateY ]
  width: number;
  height: number;
}

export async function readPdfFile(file: File): Promise<DocxParagraph[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const paragraphs: DocxParagraph[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort items by Y descending (top to bottom), then by X ascending (left to right)
    const items = textContent.items as TextItemInfo[];
    
    // Y coordinate in pdfjs is from bottom to top, so higher Y means higher on page.
    items.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const xA = a.transform[4];
      const xB = b.transform[4];

      // Tolerance for same line (e.g. 5 pixels)
      if (Math.abs(yA - yB) < 5) {
        return xA - xB;
      }
      return yB - yA;
    });

    // Group items into lines
    const lines: string[] = [];
    let currentLineY: number | null = null;
    let currentLineText = '';

    for (const item of items) {
      if (!item.str.trim() && item.str.length > 0) {
        currentLineText += ' '; // handle spaces
        continue;
      }
      
      const y = item.transform[5];
      if (currentLineY === null) {
        currentLineY = y;
        currentLineText += item.str;
      } else if (Math.abs(y - currentLineY) < 5) {
        // Same line
        currentLineText += (currentLineText.endsWith(' ') ? '' : ' ') + item.str;
      } else {
        // New line
        lines.push(currentLineText.trim());
        currentLineY = y;
        currentLineText = item.str;
      }
    }
    if (currentLineText) {
      lines.push(currentLineText.trim());
    }

    // Convert lines to DocxParagraph
    for (const line of lines) {
      if (line) {
        paragraphs.push({
          text: line,
          runs: [{ text: line }] // Formatting from PDF is omitted for simplicity/reliability
        });
      }
    }
  }

  return paragraphs;
}
