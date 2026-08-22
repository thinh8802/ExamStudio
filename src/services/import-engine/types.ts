export interface ParsedAnswer {
  label: string;
  content: string;
}

export interface ParsedQuestion {
  sourceIndex: number;
  questionNumber?: string;
  isExplicitlyNumbered?: boolean;
  content: string;
  answers: ParsedAnswer[];
  correctAnswer: string | null;
  explanation: string;
  answerDetectionSource: 'text-marker' | 'formatting' | 'combined' | 'unresolved' | 'conflict' | 'manual' | 'answer-key-table';
  confidence: 'very_high' | 'high' | 'medium' | 'low' | 'conflict' | 'unresolved';
  warnings: string[];
  isValid: boolean;
}

export interface DocxTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: string;
  color?: string;
}

export interface DocxParagraph {
  text: string;
  runs: DocxTextRun[];
  isListItem?: boolean;
}

export interface QuestionBlock {
  sourceIndex: number;
  questionNumber?: string;
  contentParagraphs: DocxParagraph[];
  answerParagraphs: {
    label: string;
    paragraphs: DocxParagraph[];
  }[];
  explanationParagraphs: DocxParagraph[];
  explicitCorrectMarker?: string; // e.g. "B"
}
