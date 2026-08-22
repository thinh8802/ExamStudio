import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserGuidePage } from '../pages/UserGuidePage';

describe('UserGuidePage Component', () => {
  it('renders header banner and all 7 chapter navigation tabs', () => {
    render(
      <MemoryRouter>
        <UserGuidePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Cẩm Nang Hướng Dẫn Sử Dụng/i)).toBeDefined();
    expect(screen.getAllByText(/Bắt đầu với ExamPrep Studio/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Quản lý Ngân hàng Câu hỏi/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Nhập & Xuất Dữ liệu/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Luyện tập, Thi trắc nghiệm/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Thiết kế & Quản lý Đề thi/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Flashcard & Spaced Repetition/i)[0]).toBeDefined();
    expect(screen.getAllByText(/Cài đặt, Sao lưu & Quản trị dữ liệu/i)[0]).toBeDefined();
  });

  it('allows clicking chapter tabs to switch active content', () => {
    render(
      <MemoryRouter>
        <UserGuidePage />
      </MemoryRouter>
    );

    // Switch to Chapter 4 (Luyện tập & Thi trắc nghiệm)
    const chapter4Button = screen.getByText(/Luyện tập, Thi trắc nghiệm & Phân tích nhịp độ/i);
    fireEvent.click(chapter4Button);

    // Verify Chapter 4 sections appear
    expect(screen.getByText(/Thiết Lập Bài Thi Thông Minh & Bộ Preset 1-Chạm/i)).toBeDefined();
    expect(screen.getByText(/Phân biệt Chế độ Luyện tập vs Chế độ Thi thử/i)).toBeDefined();
    expect(screen.getByText(/Phân Tích Nhịp Độ Làm Bài & Bẫy Thời Gian/i)).toBeDefined();
  });

  it('filters sections dynamically when typing in search query', () => {
    render(
      <MemoryRouter>
        <UserGuidePage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm hướng dẫn/i);
    fireEvent.change(searchInput, { target: { value: 'Spaced Repetition' } });

    // Should show Flashcard & SuperMemo SM-2 section
    expect(screen.getByText(/SuperMemo SM-2/i)).toBeDefined();
    expect(screen.getByText(/Ý nghĩa 4 nút đánh giá khi lật thẻ/i)).toBeDefined();
  });

  it('navigates sequentially using Next/Previous chapter buttons', () => {
    render(
      <MemoryRouter>
        <UserGuidePage />
      </MemoryRouter>
    );

    // Click Next Chapter button
    const nextButton = screen.getByText(/Chương tiếp theo/i);
    fireEvent.click(nextButton);

    // Now Chapter 2 is active
    expect(screen.getByText(/Cấu trúc Quản lý 3 Cấp/i)).toBeDefined();
  });
});
