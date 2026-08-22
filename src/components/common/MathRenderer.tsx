// ============================================
// MATH & LATEX RENDERER (KaTeX)
// Safely renders inline ($...$, \(...\)) and block ($$...$$, \[...\]) math formulas
// ============================================
import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  text?: string;
  content?: string;
  className?: string;
  inline?: boolean;
}

interface TextSegment {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, content, className = '', inline = false }) => {
  const rawText = text ?? content ?? '';

  const segments = useMemo<TextSegment[]>(() => {
    if (!rawText) return [];

    // Fast path: if no math markers at all, return single text segment
    if (!rawText.includes('$') && !rawText.includes('\\(') && !rawText.includes('\\[')) {
      return [{ type: 'text', content: rawText }];
    }

    const result: TextSegment[] = [];
    
    // Regex matching:
    // 1. $$...$$ (display block math)
    // 2. \[...\] (display block math)
    // 3. $...$ (inline math)
    // 4. \(...\) (inline math)
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?!\$)[\s\S]*?\$|\\\([\s\S]*?\\\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(rawText)) !== null) {
      // Text before math
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: rawText.slice(lastIndex, match.index),
        });
      }

      const matchText = match[0];
      if (matchText.startsWith('$$') && matchText.endsWith('$$')) {
        result.push({
          type: 'block-math',
          content: matchText.slice(2, -2).trim(),
        });
      } else if (matchText.startsWith('\\[') && matchText.endsWith('\\]')) {
        result.push({
          type: 'block-math',
          content: matchText.slice(2, -2).trim(),
        });
      } else if (matchText.startsWith('$') && matchText.endsWith('$')) {
        result.push({
          type: 'inline-math',
          content: matchText.slice(1, -1).trim(),
        });
      } else if (matchText.startsWith('\\(') && matchText.endsWith('\\)')) {
        result.push({
          type: 'inline-math',
          content: matchText.slice(2, -2).trim(),
        });
      }

      lastIndex = match.index + matchText.length;
    }

    // Remaining text after last match
    if (lastIndex < rawText.length) {
      result.push({
        type: 'text',
        content: rawText.slice(lastIndex),
      });
    }

    return result;
  }, [rawText]);

  if (!rawText) return null;

  // If simple text without math
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{rawText}</span>;
  }

  return (
    <span className={`inline-math-container ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <span key={idx}>{seg.content}</span>;
        }

        const isBlock = seg.type === 'block-math' && !inline;
        try {
          const html = katex.renderToString(seg.content, {
            displayMode: isBlock,
            throwOnError: false,
            output: 'htmlAndMathml',
          });

          return (
            <span
              key={idx}
              className={isBlock ? 'block my-2 text-center overflow-x-auto' : 'inline-block px-0.5'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          // Fallback if parsing fails
          return (
            <code key={idx} className="bg-[hsl(var(--muted))] text-xs px-1 rounded">
              {seg.content}
            </code>
          );
        }
      })}
    </span>
  );
};
