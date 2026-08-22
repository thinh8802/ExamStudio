import JSZip from 'jszip';
import type { DocxParagraph, DocxTextRun } from './types';

export async function readDocxFile(file: File): Promise<DocxParagraph[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Invalid DOCX file: missing word/document.xml');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(documentXml, 'application/xml');

  const paragraphs: DocxParagraph[] = [];
  
  // w:p elements represent paragraphs
  const pNodes = xmlDoc.getElementsByTagName('w:p');

  for (let i = 0; i < pNodes.length; i++) {
    const pNode = pNodes[i];
    const runs: DocxTextRun[] = [];
    let pText = '';
    let isListItem = false;

    // Check for numbering
    const pPrNodes = pNode.getElementsByTagName('w:pPr');
    if (pPrNodes.length > 0) {
      const numPrNodes = pPrNodes[0].getElementsByTagName('w:numPr');
      if (numPrNodes.length > 0) {
        isListItem = true;
      } else {
        const pStyleNodes = pPrNodes[0].getElementsByTagName('w:pStyle');
        if (pStyleNodes.length > 0) {
          const styleVal = pStyleNodes[0].getAttribute('w:val');
          if (styleVal && styleVal.toLowerCase().includes('list')) {
            isListItem = true;
          }
        }
      }
    }

    // Extract base formatting from paragraph properties (w:pPr > w:rPr)
    const baseFormatting: Partial<DocxTextRun> = {};
    if (pPrNodes.length > 0) {
      const pRPrNodes = pPrNodes[0].getElementsByTagName('w:rPr');
      if (pRPrNodes.length > 0) {
        const rPr = pRPrNodes[0];
        const bNode = rPr.getElementsByTagName('w:b');
        if (bNode.length > 0) {
          const val = bNode[0].getAttribute('w:val');
          if (val !== 'false' && val !== '0') baseFormatting.bold = true;
        }
        const uNode = rPr.getElementsByTagName('w:u');
        if (uNode.length > 0) {
          const val = uNode[0].getAttribute('w:val');
          if (val && val !== 'none') baseFormatting.underline = true;
        }
        const colorNode = rPr.getElementsByTagName('w:color');
        if (colorNode.length > 0) {
          const val = colorNode[0].getAttribute('w:val') || colorNode[0].getAttribute('w:themeColor');
          if (val && val !== 'auto' && val !== '000000') baseFormatting.color = val;
        }
      }
    }

    // To handle deeply nested w:r (e.g. in hyperlinks), we recursively find all w:r / m:r in order
    function getRunsInOrder(node: Node): Element[] {
      let result: Element[] = [];
      if (node.nodeName === 'w:r' || node.nodeName === 'm:r') {
        result.push(node as Element);
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          result.push(...getRunsInOrder(node.childNodes[i]));
        }
      }
      return result;
    }
    const rNodes = getRunsInOrder(pNode);

    for (let j = 0; j < rNodes.length; j++) {
      const rNode = rNodes[j];
      
      const childNodes = Array.from(rNode.childNodes);
      
      let currentRunText = '';

      // Extract formatting first, it applies to all text in this w:r
      const runFormatting: Partial<DocxTextRun> = { ...baseFormatting };
      const rPrNodes = rNode.getElementsByTagName('w:rPr');
      if (rPrNodes.length > 0) {
        const rPr = rPrNodes[0];

        // Bold
        const bNode = rPr.getElementsByTagName('w:b');
        if (bNode.length > 0) {
          const val = bNode[0].getAttribute('w:val');
          if (val !== 'false' && val !== '0') runFormatting.bold = true;
        }

        // Underline
        const uNode = rPr.getElementsByTagName('w:u');
        if (uNode.length > 0) {
          const val = uNode[0].getAttribute('w:val');
          if (val && val !== 'none') runFormatting.underline = true;
        }

        // Highlight
        const highlightNode = rPr.getElementsByTagName('w:highlight');
        if (highlightNode.length > 0) {
          const val = highlightNode[0].getAttribute('w:val');
          if (val && val !== 'none') runFormatting.highlight = val;
        }

        // Shading
        const shdNode = rPr.getElementsByTagName('w:shd');
        if (shdNode.length > 0) {
          const fill = shdNode[0].getAttribute('w:fill');
          if (fill && fill !== 'auto' && fill !== '000000') runFormatting.highlight = fill;
        }

        // Color
        const colorNode = rPr.getElementsByTagName('w:color');
        if (colorNode.length > 0) {
          const val = colorNode[0].getAttribute('w:val') || colorNode[0].getAttribute('w:themeColor');
          if (val && val !== 'auto' && val !== '000000') runFormatting.color = val;
        }
      }

      for (let k = 0; k < childNodes.length; k++) {
        const child = childNodes[k];
        if (child.nodeName === 'w:t' || child.nodeName === 'm:t') {
          currentRunText += child.textContent || '';
        } else if (child.nodeName === 'w:br') {
          // If we hit a <w:br>, we must push the current text (if any) as a run,
          // then flush the entire paragraph, and start a new one!
          if (currentRunText) {
            runs.push({ text: currentRunText, ...runFormatting });
            pText += currentRunText;
            currentRunText = '';
          }
          
          if (pText.trim() || runs.length > 0) {
            paragraphs.push({ text: pText, runs: [...runs], isListItem });
          }
          
          // Reset for new paragraph (soft line break acts as new paragraph)
          runs.length = 0;
          pText = '';
          // List item formatting usually carries over to soft line breaks? Actually no, 
          // a soft line break is technically part of the same list item, but in our parser 
          // it's safer to just treat it as a normal paragraph, or inherit the list item status.
          // We'll inherit it.
        }
      }

      if (currentRunText) {
        runs.push({ text: currentRunText, ...runFormatting });
        pText += currentRunText;
      }
    }

    if (pText.trim() || runs.length > 0) {
      paragraphs.push({
        text: pText,
        runs,
        isListItem
      });
    }
  }

  return paragraphs;
}
