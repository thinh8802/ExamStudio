// ============================================
// SOUNDSCAPE WIDGET - Ambient Sound Controller
// Provides exam room ambience, binaural beats, and volume control
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { soundscapeService, type SoundscapePreset, type SoundscapeState } from '@/services/soundscape-service';
import { Headphones, Volume2, VolumeX, Clock, CloudRain, Sparkles, X, Waves, Zap } from 'lucide-react';

export const SoundscapeWidget: React.FC = () => {
  const [state, setState] = useState<SoundscapeState>(soundscapeService.getState());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = soundscapeService.subscribe(setState);
    return () => unsubscribe();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [isOpen]);

  const presets: { id: SoundscapePreset; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'none', label: 'Tắt âm', icon: <VolumeX size={15} />, desc: 'Không phát âm thanh' },
    { id: 'clock', label: 'Tích tắc phòng thi', icon: <Clock size={15} className="text-amber-500" />, desc: 'Nhịp đập đồng hồ rèn luyện phản xạ' },
    { id: 'rain', label: 'Mưa rào êm dịu', icon: <CloudRain size={15} className="text-cyan-500" />, desc: 'Tiếng ồn trắng che phủ tạp âm (có LFO gió)' },
    { id: 'brown', label: 'Tiếng ồn nâu (Thác nước)', icon: <Waves size={15} className="text-emerald-500" />, desc: 'Âm trầm sâu ấm, giảm xao nhãng & ADHD' },
    { id: 'binaural', label: 'Sóng não Alpha 10Hz', icon: <Sparkles size={15} className="text-purple-500" />, desc: 'Kích hoạt trạng thái tập trung sâu' },
    { id: 'beta', label: 'Sóng não Beta 20Hz', icon: <Zap size={15} className="text-rose-500" />, desc: 'Tỉnh táo, phản xạ giải trắc nghiệm tốc độ' },
  ];

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
          state.isPlaying && state.currentPreset !== 'none'
            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            : 'bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] border-[hsl(var(--border))]'
        }`}
        title="Âm thanh phòng thi & Tập trung"
      >
        <Headphones size={15} className={state.isPlaying ? 'animate-pulse text-indigo-500' : ''} />
        <span className="hidden md:inline">
          {state.isPlaying && state.currentPreset !== 'none'
            ? presets.find(p => p.id === state.currentPreset)?.label
            : 'Âm thanh'}
        </span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl z-50 space-y-3.5 animate-fade-in text-[hsl(var(--foreground))]">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2">
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-[hsl(var(--foreground))]">
              <Headphones size={14} className="text-indigo-500" />
              Âm Thanh Tập Trung (Soundscapes)
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          {/* Preset Options */}
          <div className="space-y-1.5">
            {presets.map(p => {
              const isSelected = state.currentPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    soundscapeService.play(p.id);
                  }}
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30'
                      : 'hover:bg-[hsl(var(--muted)/0.5)] text-[hsl(var(--foreground))] border border-transparent'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-[hsl(var(--muted)/0.5)] shrink-0">
                    {p.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block leading-tight">{p.label}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-normal truncate block">
                      {p.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Volume Slider */}
          {state.currentPreset !== 'none' && (
            <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1">
                  <Volume2 size={12} /> Âm lượng
                </span>
                <span>{Math.round(state.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.volume}
                onChange={e => soundscapeService.setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[hsl(var(--muted))] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
