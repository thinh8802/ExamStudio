import { describe, it, expect, beforeEach } from 'vitest';
import { soundscapeService } from '../services/soundscape-service';

describe('SoundscapeService', () => {
  beforeEach(() => {
    soundscapeService.stop();
  });

  it('initializes with default state', () => {
    const state = soundscapeService.getState();
    expect(state.currentPreset).toBe('none');
    expect(state.isPlaying).toBe(false);
    expect(state.volume).toBeGreaterThanOrEqual(0);
    expect(state.volume).toBeLessThanOrEqual(1);
  });

  it('updates volume correctly within 0..1 bounds', () => {
    soundscapeService.setVolume(0.8);
    expect(soundscapeService.getState().volume).toBe(0.8);

    soundscapeService.setVolume(1.5);
    expect(soundscapeService.getState().volume).toBe(1.0);

    soundscapeService.setVolume(-0.2);
    expect(soundscapeService.getState().volume).toBe(0.0);
  });

  it('stops sound and resets preset', () => {
    soundscapeService.stop();
    const state = soundscapeService.getState();
    expect(state.currentPreset).toBe('none');
    expect(state.isPlaying).toBe(false);
  });

  it('notifies subscribers on state change', () => {
    let receivedState: any = null;
    const unsub = soundscapeService.subscribe(s => {
      receivedState = s;
    });

    soundscapeService.setVolume(0.65);
    expect(receivedState?.volume).toBe(0.65);

    unsub();
  });

  it('safely handles playLevelUpChime in test environment', () => {
    expect(() => {
      soundscapeService.playLevelUpChime(1);
      soundscapeService.playLevelUpChime(4);
      soundscapeService.playLevelUpChime(7);
    }).not.toThrow();
  });
});

