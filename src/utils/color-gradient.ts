// ============================================
// COLOR & GRADIENT UTILITIES - Custom Palette Generator
// ============================================

export interface CustomGradientConfig {
  color1: string; // Hex (e.g. #3b82f6)
  color2: string; // Hex (e.g. #06b6d4)
  angle: number;  // Degrees (e.g. 135)
}

export const DEFAULT_CUSTOM_GRADIENT: CustomGradientConfig = {
  color1: '#4f46e5',
  color2: '#06b6d4',
  angle: 135,
};

/**
 * Converts Hex string (#RRGGBB) to HSL values
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) {
    return { h: 226, s: 70, l: 55 }; // Default indigo
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Injects custom gradient and HSL properties onto the document root
 */
export function applyCustomGradientToDOM(config: CustomGradientConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const hsl1 = hexToHsl(config.color1);
  const hsl2 = hexToHsl(config.color2);

  // Set Primary color token to color1
  root.style.setProperty('--primary', `${hsl1.h} ${hsl1.s}% ${hsl1.l}%`);
  root.style.setProperty('--primary-subtle', `${hsl1.h} ${hsl1.s}% 94%`);
  root.style.setProperty('--ring', `${hsl1.h} ${hsl1.s}% ${hsl1.l}%`);

  // Set Accent Cyan / Secondary token to color2
  root.style.setProperty('--accent-cyan', `${hsl2.h} ${hsl2.s}% ${hsl2.l}%`);
  root.style.setProperty('--accent-cyan-subtle', `${hsl2.h} ${hsl2.s}% 94%`);

  // Set Gradients
  const grad1 = `linear-gradient(${config.angle}deg, ${config.color1} 0%, ${config.color2} 100%)`;
  const grad2 = `linear-gradient(${config.angle}deg, ${config.color2} 0%, ${config.color1} 100%)`;
  root.style.setProperty('--gradient-primary', grad1);
  root.style.setProperty('--gradient-accent', grad2);
}

/**
 * Removes custom overrides when switching to standard presets
 */
export function clearCustomGradientFromDOM() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-subtle');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--accent-cyan');
  root.style.removeProperty('--accent-cyan-subtle');
  root.style.removeProperty('--gradient-primary');
  root.style.removeProperty('--gradient-accent');
}
