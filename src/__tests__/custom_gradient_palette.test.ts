// ============================================
// TESTS FOR CUSTOM GRADIENT & PALETTE GENERATOR
// ============================================
import { describe, it, expect, beforeEach } from 'vitest';
import { hexToHsl, applyCustomGradientToDOM, clearCustomGradientFromDOM } from '../utils/color-gradient';

describe('Custom Color & Gradient Generator', () => {
  it('converts Hex colors accurately to HSL', () => {
    // Pure Red #ff0000 -> 0, 100%, 50%
    const redHsl = hexToHsl('#ff0000');
    expect(redHsl.h).toBe(0);
    expect(redHsl.s).toBe(100);
    expect(redHsl.l).toBe(50);

    // Pure Green #00ff00 -> 120, 100%, 50%
    const greenHsl = hexToHsl('#00ff00');
    expect(greenHsl.h).toBe(120);
    expect(greenHsl.s).toBe(100);
    expect(greenHsl.l).toBe(50);

    // Pure Blue #0000ff -> 240, 100%, 50%
    const blueHsl = hexToHsl('#0000ff');
    expect(blueHsl.h).toBe(240);
    expect(blueHsl.s).toBe(100);
    expect(blueHsl.l).toBe(50);
  });

  it('handles 3-digit Hex and fallback gracefully', () => {
    const shortHex = hexToHsl('#f00');
    expect(shortHex.h).toBe(0);
    expect(shortHex.s).toBe(100);
    expect(shortHex.l).toBe(50);

    const invalid = hexToHsl('invalid');
    expect(invalid.h).toBe(226);
  });

  it('applies custom gradient properties to the DOM document root', () => {
    const config = {
      color1: '#8b5cf6', // Violet
      color2: '#ec4899', // Pink
      angle: 90,
    };

    applyCustomGradientToDOM(config);

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--gradient-primary')).toContain('linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)');
    expect(root.style.getPropertyValue('--gradient-accent')).toContain('linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)');
    expect(root.style.getPropertyValue('--primary')).not.toBe('');
  });

  it('clears custom gradient properties from the DOM document root', () => {
    clearCustomGradientFromDOM();
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('');
    expect(root.style.getPropertyValue('--gradient-primary')).toBe('');
  });
});
