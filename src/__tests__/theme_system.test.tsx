import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { THEME_PRESETS } from '../constants/themes';
import { useAppStore } from '../stores/app-store';
import { SettingsPage } from '../pages/OtherPages';

describe('ExamStudio Theme & Gradient Design System', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-color');
    document.documentElement.className = '';
  });

  it('should have 10 comprehensive theme presets defined with valid metadata', () => {
    expect(THEME_PRESETS).toHaveLength(10);
    const ids = THEME_PRESETS.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    THEME_PRESETS.forEach(theme => {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.description).toBeTruthy();
      expect(theme.previewGradient).toContain('linear-gradient');
      expect(theme.primaryColor).toBeTruthy();
      expect(theme.accentColor).toBeTruthy();
      expect(['calm', 'vibrant', 'warm', 'dark-tech']).toContain(theme.category);
    });
  });

  it('should update data-color attribute and localStorage when setColorTheme is called', () => {
    const { setColorTheme } = useAppStore.getState();

    setColorTheme('purple-nebula');
    expect(document.documentElement.getAttribute('data-color')).toBe('purple-nebula');
    expect(localStorage.getItem('color-theme')).toBe('purple-nebula');
    expect(useAppStore.getState().colorTheme).toBe('purple-nebula');

    setColorTheme('emerald-mint');
    expect(document.documentElement.getAttribute('data-color')).toBe('emerald-mint');
    expect(localStorage.getItem('color-theme')).toBe('emerald-mint');
    expect(useAppStore.getState().colorTheme).toBe('emerald-mint');

    setColorTheme('sunset-glow');
    expect(document.documentElement.getAttribute('data-color')).toBe('sunset-glow');
    expect(localStorage.getItem('color-theme')).toBe('sunset-glow');
    expect(useAppStore.getState().colorTheme).toBe('sunset-glow');
  });

  it('should render all 10 theme cards in SettingsPage and allow user to switch themes', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Verify all 10 theme names are displayed
    THEME_PRESETS.forEach(preset => {
      expect(screen.getByText(preset.name)).toBeTruthy();
    });

    // Click on Sunset Glow theme card
    const sunsetCard = screen.getByText('Hoàng Hôn Rực Rỡ (Sunset Glow)');
    fireEvent.click(sunsetCard);

    expect(useAppStore.getState().colorTheme).toBe('sunset-glow');
    expect(document.documentElement.getAttribute('data-color')).toBe('sunset-glow');

    // Click on Aurora theme card
    const auroraCard = screen.getByText('Cực Quang Huyền Diệu (Aurora)');
    fireEvent.click(auroraCard);

    expect(useAppStore.getState().colorTheme).toBe('aurora-borealis');
    expect(document.documentElement.getAttribute('data-color')).toBe('aurora-borealis');
  });
});
