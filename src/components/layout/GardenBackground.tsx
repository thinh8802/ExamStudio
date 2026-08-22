import React from 'react';
import { cn } from '@/utils';
import { ChibiMascot } from '@/components/ui';

interface GardenBackgroundProps {
  isOnFire?: boolean;
  mascotState?: 'idle' | 'correct' | 'wrong';
}

export const GardenBackground: React.FC<GardenBackgroundProps> = ({ isOnFire, mascotState = 'idle' }) => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#020617] transition-all duration-1000">
      {/* The Garden Image */}
      <div 
        className={cn(
          "absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000",
          isOnFire 
            ? "saturate-[1.5] brightness-[0.7] sepia-[0.3] hue-rotate-[-10deg] scale-105" 
            : "saturate-[1.1] brightness-[0.4] scale-100"
        )}
        style={{ backgroundImage: `url('/assets/garden-bg.jpg')` }}
      />
      
      {/* Dark Overlay for readability */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        isOnFire ? "bg-gradient-to-t from-red-950/80 via-black/40 to-orange-950/40" : "bg-black/50"
      )} />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden mix-blend-screen">
        {Array.from({ length: 25 }).map((_, i) => {
          const delay = Math.random() * 5;
          const duration = isOnFire ? 2 + Math.random() * 2 : 4 + Math.random() * 4;
          const left = Math.random() * 100;
          const size = isOnFire ? 3 + Math.random() * 5 : 2 + Math.random() * 3;
          
          return (
            <div
              key={i}
              className={cn(
                "absolute rounded-full blur-[1px]",
                isOnFire ? "bg-orange-400 animate-float-fire" : "bg-green-200 animate-float-slow"
              )}
              style={{
                left: `${left}%`,
                bottom: '-10%',
                width: size,
                height: size,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationIterationCount: 'infinite',
                animationName: isOnFire ? 'floatUpFire' : 'floatUp',
                animationTimingFunction: 'ease-in',
              }}
            />
          );
        })}
      </div>

      {/* Fiery Orbs when on fire */}
      {isOnFire && (
        <>
          <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-600/30 blur-[120px] rounded-full animate-pulse-slow mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/30 blur-[120px] rounded-full animate-pulse-slow mix-blend-screen" style={{ animationDelay: '2s' }} />
        </>
      )}

      {/* Chibi Characters */}
      <div className={cn(
        "absolute bottom-[2%] left-[2%] md:bottom-[5%] md:left-[5%] transition-opacity duration-1000",
        isOnFire ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <ChibiMascot variant="water" state={isOnFire ? 'idle' : mascotState} />
      </div>

      <div className={cn(
        "absolute bottom-[2%] right-[2%] md:bottom-[5%] md:right-[5%] transition-opacity duration-1000",
        isOnFire ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <ChibiMascot variant="fire" state={isOnFire ? mascotState : 'idle'} />
      </div>

      {/* Cinematic Noise */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
    </div>
  );
};
