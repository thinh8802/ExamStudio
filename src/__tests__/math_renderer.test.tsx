import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MathRenderer } from '../components/common/MathRenderer';

describe('MathRenderer (LaTeX / KaTeX)', () => {
  it('renders plain text without math delimiters directly', () => {
    const { getByText } = render(<MathRenderer text="Đây là câu hỏi thông thường" />);
    expect(getByText('Đây là câu hỏi thông thường')).toBeInTheDocument();
  });

  it('renders inline math with $ ... $ delimiters', () => {
    const { container } = render(<MathRenderer text="Giải phương trình $x^2 + 2x + 1 = 0$ sau:" />);
    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(container.textContent).toContain('Giải phương trình');
  });

  it('renders block math with $$ ... $$ delimiters', () => {
    const { container } = render(<MathRenderer text="Tính tích phân: $$\int_{0}^{1} x dx$$" />);
    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(container.querySelector('.katex-display')).toBeInTheDocument();
  });

  it('safely handles malformed math without throwing', () => {
    expect(() => {
      render(<MathRenderer text="Công thức lỗi: $\frac{1}{$" />);
    }).not.toThrow();
  });
});
