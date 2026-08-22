import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ExamListPage } from '../pages/exam/ExamListPage';
import { ExamBuilderPage } from '../pages/exam/ExamBuilderPage';
import { AutoExamPage } from '../pages/exam/AutoExamPage';
import { db } from '../services/database';
import { useExamStore } from '../stores/exam-store';
import { useSubjectStore } from '../stores/subject-store';
import { useQuestionStore } from '../stores/question-store';
import type { Question, Subject, Chapter } from '../types';

const mockSubject: Subject = {
  id: 'sub-test-1',
  name: 'Toán Học 12',
  description: 'Môn toán lớp 12',
  color: 'blue',
  icon: 'book',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockChapter: Chapter = {
  id: 'chap-test-1',
  subjectId: 'sub-test-1',
  name: 'Chương 1: Khảo sát hàm số',
  description: '',
  order: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockQuestions: Question[] = [
  {
    id: 'q-page-1',
    subjectId: 'sub-test-1',
    chapterId: 'chap-test-1',
    topicId: 't1',
    type: 'single_choice',
    difficulty: 'easy',
    content: 'Câu hỏi kiểm thử 1',
    answers: [
      { id: 'a1', label: 'A', content: 'Đáp án 1', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Đáp án 2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status: 'new',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryScore: 0,
    lastAttemptedAt: null,
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'q-page-2',
    subjectId: 'sub-test-1',
    chapterId: 'chap-test-1',
    topicId: 't1',
    type: 'single_choice',
    difficulty: 'medium',
    content: 'Câu hỏi kiểm thử 2',
    answers: [
      { id: 'a1', label: 'A', content: 'Đáp án 1', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Đáp án 2', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status: 'new',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryScore: 0,
    lastAttemptedAt: null,
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('Exam Module UI Pages Integration', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.exams.clear();
    await db.blueprints.clear();
    await db.questions.clear();
    await db.subjects.clear();
    await db.chapters.clear();
    await db.attempts.clear();

    await db.subjects.put(mockSubject);
    await db.chapters.put(mockChapter);
    for (const q of mockQuestions) {
      await db.questions.put(q);
    }

    useSubjectStore.setState({
      subjects: [mockSubject],
      chapters: [mockChapter],
      topics: [],
    });
    useQuestionStore.setState({
      questions: mockQuestions,
    });
  });

  it('ExamListPage should render header and handle empty/populated state', async () => {
    render(
      <MemoryRouter>
        <ExamListPage />
      </MemoryRouter>
    );

    // Header check
    expect(screen.getByText('Kho & Quản Lý Đề Thi')).toBeTruthy();
    expect(screen.getByText('Tạo thủ công')).toBeTruthy();
    expect(screen.getByText('Tạo tự động')).toBeTruthy();
  });

  it('ExamBuilderPage should render question bank and allow selecting questions into cart', async () => {
    render(
      <MemoryRouter>
        <ExamBuilderPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Tạo Đề Thi Thủ Công')).toBeTruthy();
    expect(screen.getByText(/Ngân Hàng Câu Hỏi/i)).toBeTruthy();
    expect(screen.getByText(/Giỏ Đề Thi/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Câu hỏi kiểm thử 1')).toBeTruthy();
    });

    // Click on question to add to cart
    const qItem = screen.getByText('Câu hỏi kiểm thử 1');
    fireEvent.click(qItem);

    // Verify cart count updated
    await waitFor(() => {
      expect(screen.getByText(/Giỏ Đề Thi \(1 câu\)/i)).toBeTruthy();
    });
  });

  it('AutoExamPage should render matrix steps and validation', async () => {
    render(
      <MemoryRouter>
        <AutoExamPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Tạo Đề Thi Tự Động Theo Ma Trận')).toBeTruthy();
    expect(screen.getByText('Tên đề thi')).toBeTruthy();
    expect(screen.getByText('Phân Bổ Theo Chương')).toBeTruthy();
    expect(screen.getAllByText(/Tỷ Lệ Độ Khó/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Kiểm Tra Ma Trận')).toBeTruthy();
  });
});
