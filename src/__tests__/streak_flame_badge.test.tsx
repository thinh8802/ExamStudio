import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StreakFlameBadge, getStreakTier } from '../components/quiz/StreakFlameBadge';

describe('StreakFlameBadge & getStreakTier', () => {
  it('returns null for streaks less than 3', () => {
    expect(getStreakTier(0)).toBeNull();
    expect(getStreakTier(1)).toBeNull();
    expect(getStreakTier(2)).toBeNull();
  });

  it('maps correct tiers for 7 levels of streak milestones', () => {
    // Tier 1 (3-5): Warm Ember
    const t1 = getStreakTier(3);
    expect(t1?.tier).toBe(1);
    expect(t1?.subtitle).toContain('Cam');

    const t1_5 = getStreakTier(5);
    expect(t1_5?.tier).toBe(1);

    // Tier 2 (6-8): Crimson Blaze
    const t2 = getStreakTier(6);
    expect(t2?.tier).toBe(2);
    expect(t2?.subtitle).toContain('Đỏ');

    // Tier 3 (9-11): Violet Plasma
    const t3 = getStreakTier(9);
    expect(t3?.tier).toBe(3);
    expect(t3?.subtitle).toContain('Tím');

    // Tier 4 (12-14): Cyan Frostfire
    const t4 = getStreakTier(12);
    expect(t4?.tier).toBe(4);
    expect(t4?.subtitle).toContain('Băng');

    // Tier 5 (15-17): Golden Sunfire
    const t5 = getStreakTier(15);
    expect(t5?.tier).toBe(5);
    expect(t5?.subtitle).toContain('Hoàng Kim');

    // Tier 6 (18-20): Prism Mythic
    const t6 = getStreakTier(18);
    expect(t6?.tier).toBe(6);
    expect(t6?.subtitle).toContain('Thần Thoại');

    // Tier 7 (21+): Cosmic Hypernova
    const t7 = getStreakTier(21);
    expect(t7?.tier).toBe(7);
    expect(t7?.subtitle).toContain('Siêu Tân Tinh');

    const t7_extreme = getStreakTier(50);
    expect(t7_extreme?.tier).toBe(7);
  });

  it('renders nothing when streak is less than 3', () => {
    const { container } = render(<StreakFlameBadge streak={2} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge with correct streak count when streak >= 3', () => {
    render(<StreakFlameBadge streak={6} />);
    expect(screen.getByText('x6')).toBeInTheDocument();
    expect(screen.getByText(/Bùng nổ/i)).toBeInTheDocument();
  });
});
