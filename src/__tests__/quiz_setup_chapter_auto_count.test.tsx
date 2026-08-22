import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';

describe('Quiz Setup - Chapter Auto Question Count Calculation', () => {
  it('should automatically update questionCount to the exact available questions when selecting/unselecting chapters', () => {
    const mockQuestions = [
      ...Array.from({ length: 24 }, (_, i) => ({ id: `q1_${i}`, subjectId: 'sub_1', chapterId: 'chap_1' })),
      ...Array.from({ length: 98 }, (_, i) => ({ id: `q2_${i}`, subjectId: 'sub_1', chapterId: 'chap_2' })),
      ...Array.from({ length: 61 }, (_, i) => ({ id: `q3_${i}`, subjectId: 'sub_1', chapterId: 'chap_3' })),
    ];

    const computeAvailable = (chapterIds: string[]) => {
      return mockQuestions.filter(q => q.subjectId === 'sub_1' && chapterIds.includes(q.chapterId)).length;
    };

    const { result } = renderHook(() => {
      const [config, setConfig] = useState({
        subjectId: 'sub_1',
        chapterIds: [] as string[],
        questionCount: 0,
      });

      const toggleChapter = (chapterId: string) => {
        setConfig(prev => {
          const nextChapterIds = prev.chapterIds.includes(chapterId)
            ? prev.chapterIds.filter(id => id !== chapterId)
            : [...prev.chapterIds, chapterId];
          const maxCount = computeAvailable(nextChapterIds);
          return {
            ...prev,
            chapterIds: nextChapterIds,
            questionCount: maxCount,
          };
        });
      };

      const selectAll = (allIds: string[]) => {
        setConfig(prev => {
          const maxCount = computeAvailable(allIds);
          return {
            ...prev,
            chapterIds: allIds,
            questionCount: maxCount,
          };
        });
      };

      const clearAll = () => {
        setConfig(prev => ({
          ...prev,
          chapterIds: [],
          questionCount: 0,
        }));
      };

      return { config, toggleChapter, selectAll, clearAll };
    });

    // 1. Initially 0 chapters selected -> 0 questions
    expect(result.current.config.chapterIds).toEqual([]);
    expect(result.current.config.questionCount).toBe(0);

    // 2. Select Chapter 1 (24 questions) -> questionCount should auto-jump to 24
    act(() => {
      result.current.toggleChapter('chap_1');
    });
    expect(result.current.config.chapterIds).toEqual(['chap_1']);
    expect(result.current.config.questionCount).toBe(24);

    // 3. Select Chapter 2 (98 questions) -> questionCount should auto-jump to 122 (24 + 98)
    act(() => {
      result.current.toggleChapter('chap_2');
    });
    expect(result.current.config.chapterIds).toEqual(['chap_1', 'chap_2']);
    expect(result.current.config.questionCount).toBe(122);

    // 4. Select All (24 + 98 + 61 = 183 questions) -> questionCount should auto-jump to 183
    act(() => {
      result.current.selectAll(['chap_1', 'chap_2', 'chap_3']);
    });
    expect(result.current.config.chapterIds).toHaveLength(3);
    expect(result.current.config.questionCount).toBe(183);

    // 5. Clear All -> questionCount should become 0
    act(() => {
      result.current.clearAll();
    });
    expect(result.current.config.chapterIds).toEqual([]);
    expect(result.current.config.questionCount).toBe(0);
  });
});
