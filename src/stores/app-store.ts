// ============================================
// APP STORE - Global UI state & Settings
// ============================================
import { create } from 'zustand';
import type { Theme } from '@/types';
import { getSetting, setSetting, initializeSettings } from '@/services/database';

import {
  type CustomGradientConfig,
  DEFAULT_CUSTOM_GRADIENT,
  applyCustomGradientToDOM,
  clearCustomGradientFromDOM
} from '@/utils/color-gradient';

export interface ShortcutConfig {
  answerKeys: 'both' | '1-4' | 'a-d';
  nextKey: string;
  prevKey: string;
  markKey: string;
  confirmKey: string;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  answerKeys: 'both',
  nextKey: 'N',
  prevKey: 'P',
  markKey: 'Space',
  confirmKey: 'Enter',
};

interface AppState {
  // UI
  sidebarOpen: boolean;
  theme: Theme;
  colorTheme: string;
  customGradient: CustomGradientConfig;
  shortcuts: ShortcutConfig;
  isInitialized: boolean;
  
  // Settings
  masteryScoreThreshold: number;
  easyDifficultyThreshold: number;
  hardDifficultyThreshold: number;

  // Streak Notification Settings
  streakNotificationEnabled: boolean;
  streakNotificationMode: 'all' | 'milestones_only' | 'min_streak';
  streakMinThreshold: number;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: string) => void;
  setCustomGradient: (config: CustomGradientConfig) => void;
  setShortcuts: (shortcuts: ShortcutConfig) => void;
  resetShortcuts: () => void;
  setMasteryScoreThreshold: (val: number) => void;
  setEasyDifficultyThreshold: (val: number) => void;
  setHardDifficultyThreshold: (val: number) => void;
  setStreakNotificationEnabled: (val: boolean) => void;
  setStreakNotificationMode: (mode: 'all' | 'milestones_only' | 'min_streak') => void;
  setStreakMinThreshold: (val: number) => void;
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  theme: 'light',
  colorTheme: 'blue-ocean',
  customGradient: DEFAULT_CUSTOM_GRADIENT,
  shortcuts: DEFAULT_SHORTCUTS,
  isInitialized: false,
  masteryScoreThreshold: 80,
  easyDifficultyThreshold: 70,
  hardDifficultyThreshold: 60,
  streakNotificationEnabled: true,
  streakNotificationMode: 'all',
  streakMinThreshold: 3,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: async (theme) => {
    set({ theme });
    
    const applyThemeToDOM = () => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }
    };

    // @ts-ignore
    if (document.startViewTransition) {
      // @ts-ignore
      document.startViewTransition(() => {
        applyThemeToDOM();
      });
    } else {
      applyThemeToDOM();
    }

    await setSetting('theme', theme);
  },

  setColorTheme: async (colorTheme) => {
    set({ colorTheme });
    localStorage.setItem('color-theme', colorTheme);
    document.documentElement.setAttribute('data-color', colorTheme);
    
    if (colorTheme !== 'custom') {
      clearCustomGradientFromDOM();
    } else {
      applyCustomGradientToDOM(get().customGradient);
    }

    try {
      await setSetting('colorTheme', colorTheme);
    } catch {
      // ignore
    }
  },

  setCustomGradient: async (config) => {
    set({ customGradient: config, colorTheme: 'custom' });
    localStorage.setItem('color-theme', 'custom');
    localStorage.setItem('custom-gradient', JSON.stringify(config));
    document.documentElement.setAttribute('data-color', 'custom');
    applyCustomGradientToDOM(config);
    try {
      await setSetting('colorTheme', 'custom');
    } catch {}
  },

  setShortcuts: (shortcuts) => {
    set({ shortcuts });
    try {
      localStorage.setItem('examprep_shortcuts', JSON.stringify(shortcuts));
    } catch {}
  },

  resetShortcuts: () => {
    set({ shortcuts: DEFAULT_SHORTCUTS });
    try {
      localStorage.removeItem('examprep_shortcuts');
    } catch {}
  },

  setMasteryScoreThreshold: async (val) => {
    set({ masteryScoreThreshold: val });
    await setSetting('masteryScoreThreshold', val.toString());
  },

  setEasyDifficultyThreshold: async (val) => {
    set({ easyDifficultyThreshold: val });
    await setSetting('easyDifficultyThreshold', val.toString());
  },

  setHardDifficultyThreshold: async (val) => {
    set({ hardDifficultyThreshold: val });
    await setSetting('hardDifficultyThreshold', val.toString());
  },

  setStreakNotificationEnabled: async (val) => {
    set({ streakNotificationEnabled: val });
    localStorage.setItem('streak-notification-enabled', val.toString());
    try {
      await setSetting('streakNotificationEnabled', val.toString());
    } catch {}
  },

  setStreakNotificationMode: async (mode) => {
    set({ streakNotificationMode: mode });
    localStorage.setItem('streak-notification-mode', mode);
    try {
      await setSetting('streakNotificationMode', mode);
    } catch {}
  },

  setStreakMinThreshold: async (val) => {
    set({ streakMinThreshold: val });
    localStorage.setItem('streak-min-threshold', val.toString());
    try {
      await setSetting('streakMinThreshold', val.toString());
    } catch {}
  },

  initialize: async () => {
    await initializeSettings();
    const theme = (await getSetting('theme')) as Theme;
    const sidebarState = localStorage.getItem('sidebar-open');
    const masteryThreshold = parseInt(await getSetting('masteryScoreThreshold'), 10) || 80;
    const easyThreshold = parseInt(await getSetting('easyDifficultyThreshold'), 10) || 70;
    const hardThreshold = parseInt(await getSetting('hardDifficultyThreshold'), 10) || 60;

    // Load streak notification settings
    const storedStreakEnabled = localStorage.getItem('streak-notification-enabled');
    const streakEnabled = storedStreakEnabled !== null ? storedStreakEnabled === 'true' : true;
    const storedStreakMode = (localStorage.getItem('streak-notification-mode') as 'all' | 'milestones_only' | 'min_streak') || 'all';
    const storedStreakMin = parseInt(localStorage.getItem('streak-min-threshold') || '3', 10);

    // Load custom gradient if stored
    let customGradient = DEFAULT_CUSTOM_GRADIENT;
    try {
      const storedGrad = localStorage.getItem('custom-gradient');
      if (storedGrad) customGradient = JSON.parse(storedGrad);
    } catch {}

    // Load custom shortcuts if stored
    let shortcuts = DEFAULT_SHORTCUTS;
    try {
      const storedShortcuts = localStorage.getItem('examprep_shortcuts');
      if (storedShortcuts) shortcuts = { ...DEFAULT_SHORTCUTS, ...JSON.parse(storedShortcuts) };
    } catch {}

    // Apply theme
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme || 'light');
    }
    
    // Apply color theme
    let colorTheme = localStorage.getItem('color-theme');
    if (!colorTheme) {
      try {
        colorTheme = (await getSetting('colorTheme')) || 'blue-ocean';
      } catch {
        colorTheme = 'blue-ocean';
      }
    }
    root.setAttribute('data-color', colorTheme);

    if (colorTheme === 'custom') {
      applyCustomGradientToDOM(customGradient);
    }

    set({
      theme: theme || 'light',
      colorTheme,
      customGradient,
      shortcuts,
      sidebarOpen: sidebarState !== 'false',
      masteryScoreThreshold: masteryThreshold,
      easyDifficultyThreshold: easyThreshold,
      hardDifficultyThreshold: hardThreshold,
      streakNotificationEnabled: streakEnabled,
      streakNotificationMode: storedStreakMode,
      streakMinThreshold: isNaN(storedStreakMin) ? 3 : storedStreakMin,
      isInitialized: true,
    });
  },
}));
