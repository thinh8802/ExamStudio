import React from 'react';
import { cn } from '@/utils';

interface ChibiMascotProps {
  variant: 'water' | 'fire';
  state: 'idle' | 'correct' | 'wrong';
  className?: string;
}

export const ChibiMascot: React.FC<ChibiMascotProps> = ({ variant, state, className }) => {
  const isFire = variant === 'fire';
  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  
  // ==========================================
  // WATER CHIBI RENDERING
  // ==========================================
  if (!isFire) {
    return (
      <div className={cn("relative w-40 h-40 flex flex-col items-center justify-end", className)}>
        {/* Base Water Ripple (Static) */}
        <div className="absolute bottom-[-5px] w-32 h-6 rounded-[100%] border-[2px] border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-0 flex items-center justify-center">
           <div className="absolute w-24 h-4 rounded-[100%] border-[1.5px] border-blue-400/40"></div>
           <div className="absolute w-16 h-2 rounded-[100%] border border-cyan-300/30"></div>
        </div>

        {/* Floating Bubbles */}
        <div className="absolute w-3 h-3 rounded-full border-[1.5px] border-cyan-200/60 top-8 left-2 animate-float-slow opacity-60"></div>
        <div className="absolute w-2 h-2 rounded-full border border-cyan-200/60 top-16 right-4 animate-float-slow opacity-60" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute w-4 h-4 rounded-full border-[2px] border-cyan-200/40 top-4 right-8 animate-float-slow opacity-40" style={{animationDelay: '3s'}}></div>

        {/* Animated Character Group */}
        <div className={cn(
          "relative flex flex-col items-center justify-end z-10 transition-all duration-300 w-full h-full pb-4",
          state === 'idle' ? 'animate-breathe' : '',
          isCorrect ? 'animate-bounce' : '',
          isWrong ? 'scale-95 translate-y-2 opacity-90' : ''
        )}>
          
          {/* Head Droplet */}
          <div className={cn(
             "absolute w-14 h-14 rounded-[0_50%_50%_50%] rotate-45 bg-gradient-to-br from-cyan-200 via-blue-400 to-blue-600 shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.2),0_0_20px_rgba(59,130,246,0.6)] z-20 flex items-center justify-center transition-all duration-500",
             isWrong ? "top-4 rotate-[70deg] scale-75 opacity-80" : "top-0 animate-float-slow"
          )}>
             <div className="absolute top-2 left-2 w-4 h-6 rounded-full bg-white/50 -rotate-45 blur-[0.5px]"></div>
             <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/30 blur-[0.5px]"></div>
          </div>

          {/* Main Spherical Body */}
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-blue-700 shadow-[inset_-12px_-12px_25px_rgba(0,0,0,0.3),inset_5px_5px_15px_rgba(255,255,255,0.4),0_0_25px_rgba(59,130,246,0.8)] z-10 flex flex-col items-center justify-center transition-all duration-300">
             
             {/* Left Arm */}
             <div className={cn(
               "absolute top-12 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.3)] transition-all duration-300",
               isCorrect ? "left-6 z-30 animate-clap-left scale-110" : "-left-5 -z-10",
               isWrong ? "top-14" : ""
             )}>
                <div className="absolute top-1 left-2 w-3 h-4 bg-white/40 rounded-[100%] rotate-[-20deg] blur-[0.5px]"></div>
             </div>

             {/* Right Arm */}
             <div className={cn(
               "absolute top-12 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 shadow-[inset_-3px_-3px_10px_rgba(0,0,0,0.3)] transition-all duration-300",
               isCorrect ? "right-6 z-30 animate-clap-right scale-110" : "-right-5 -z-10",
               isWrong ? "top-14" : ""
             )}>
                <div className="absolute top-1 right-2 w-3 h-4 bg-white/40 rounded-[100%] rotate-[20deg] blur-[0.5px]"></div>
             </div>

             {/* Main Body Gloss Highlights */}
             <div className="absolute top-2 left-3 w-14 h-7 bg-white/50 rounded-[100%] rotate-[-35deg] blur-[1px]"></div>
             <div className="absolute top-10 left-2 w-4 h-8 bg-white/30 rounded-[100%] rotate-[-15deg] blur-[1px]"></div>
             <div className="absolute bottom-1 w-20 h-5 bg-cyan-200/50 rounded-[100%] blur-[3px]"></div>

             {/* Face Container */}
             <div className="relative z-20 mt-4 flex flex-col items-center">
                {/* Eyes */}
                <div className="flex gap-7">
                  {isCorrect ? (
                    <>
                      <div className="w-5 h-5 border-t-[4px] border-blue-950 rounded-[50%_50%_0_0]"></div>
                      <div className="w-5 h-5 border-t-[4px] border-blue-950 rounded-[50%_50%_0_0]"></div>
                    </>
                  ) : isWrong ? (
                    <>
                      <div className="w-5 h-5 border-b-[4px] border-blue-950 rounded-[0_0_50%_50%] mt-2"></div>
                      <div className="w-5 h-5 border-b-[4px] border-blue-950 rounded-[0_0_50%_50%] mt-2"></div>
                    </>
                  ) : (
                    <>
                       <div className="w-5 h-6 bg-blue-950 rounded-[50%] relative animate-blink shadow-sm">
                          <div className="absolute top-0.5 left-1 w-2 h-2.5 bg-white rounded-full"></div>
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-cyan-200 rounded-full blur-[0.5px]"></div>
                       </div>
                       <div className="w-5 h-6 bg-blue-950 rounded-[50%] relative animate-blink shadow-sm" style={{animationDelay: '0.1s'}}>
                          <div className="absolute top-0.5 left-1 w-2 h-2.5 bg-white rounded-full"></div>
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-cyan-200 rounded-full blur-[0.5px]"></div>
                       </div>
                    </>
                  )}
                </div>
                {/* Cheeks */}
                <div className="absolute top-4 w-full flex justify-between px-[-16px] w-[130%] -ml-[15%]">
                   <div className="w-5 h-3 bg-pink-500/70 rounded-full blur-[2px]"></div>
                   <div className="w-5 h-3 bg-pink-500/70 rounded-full blur-[2px]"></div>
                </div>
                {/* Mouth */}
                <div className="mt-1">
                   {isCorrect ? (
                     <div className="w-4 h-5 bg-blue-950 rounded-[0_0_15px_15px] overflow-hidden relative mt-1">
                       <div className="absolute bottom-0 w-full h-2 bg-pink-400"></div>
                     </div>
                   ) : isWrong ? (
                     <div className="w-3 h-1.5 border-t-[3px] border-blue-950 rounded-[50%_50%_0_0] mt-1.5"></div>
                   ) : (
                     <div className="w-3 h-2 border-b-[3px] border-blue-950 rounded-[0_0_50%_50%]"></div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CAMPFIRE CHIBI RENDERING (V4 - Masterpiece Morphing SVG)
  // ==========================================
  const eyeColor = "bg-[#2d1b11]"; // Deep brown/black
  const lineColor = "border-[#2d1b11]";

  return (
    <div className={cn("relative w-56 h-56 flex flex-col items-center justify-end", className)}>
      
      {/* Soft floating sparkles */}
      <div className="absolute w-2 h-2 bg-yellow-200 rounded-full top-8 left-14 animate-ping opacity-80 shadow-[0_0_8px_#fef08a] z-20"></div>
      
      {/* Animated Character Container */}
      <div className={cn(
        "relative w-full h-44 flex flex-col items-center justify-end z-10 transition-all duration-500",
        state === 'idle' ? 'animate-breathe' : '',
        isCorrect ? 'animate-bounce' : '',
        isWrong ? 'scale-90 translate-y-4 opacity-90' : ''
      )}>
        
        {/* Morphing SVG Flame Body - Exactly matching the 5-point concept art */}
        <div className="absolute bottom-10 w-[160px] h-[160px] drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <defs>
              {/* Radial gradient creates a glowing core that fades to red edges naturally */}
              <radialGradient id="fireGrad" cx="50%" cy="80%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />     {/* Core white */}
                <stop offset="25%" stopColor="#fef08a" />    {/* Yellow glow */}
                <stop offset="55%" stopColor="#f97316" />    {/* Orange body */}
                <stop offset="85%" stopColor="#ef4444" />    {/* Red outer */}
                <stop offset="100%" stopColor="#b91c1c" />   {/* Dark red edge */}
              </radialGradient>
            </defs>
            
            {/* The 5-Point Flame Path with organic morphing animation */}
            <path fill="url(#fireGrad)">
              <animate 
                attributeName="d" 
                dur="2.5s" 
                repeatCount="indefinite" 
                values="
                  M 50 95 C 30 95, 20 85, 15 75 Q 5 65, 10 55 Q 15 65, 20 60 Q 10 35, 25 25 Q 30 40, 35 45 Q 45 15, 50 5 Q 55 15, 65 45 Q 70 40, 75 25 Q 80 35, 80 60 Q 85 65, 90 55 Q 95 65, 85 75 C 80 85, 70 95, 50 95 Z;
                  M 50 95 C 30 95, 20 85, 15 75 Q 3 62, 8 52 Q 13 62, 22 58 Q 15 30, 22 20 Q 32 38, 37 43 Q 48 10, 52 0 Q 58 12, 63 43 Q 73 38, 78 20 Q 83 33, 78 58 Q 83 63, 92 53 Q 95 65, 85 75 C 80 85, 70 95, 50 95 Z;
                  M 50 95 C 30 95, 20 85, 15 75 Q 5 65, 10 55 Q 15 65, 20 60 Q 10 35, 25 25 Q 30 40, 35 45 Q 45 15, 50 5 Q 55 15, 65 45 Q 70 40, 75 25 Q 80 35, 80 60 Q 85 65, 90 55 Q 95 65, 85 75 C 80 85, 70 95, 50 95 Z
                " 
              />
            </path>
          </svg>
        </div>

        {/* Face Overlay */}
        <div className="absolute bottom-14 w-28 flex flex-col items-center z-20">
          {/* Eyes */}
          <div className="flex gap-8 items-center">
            {isCorrect ? (
               // Happy eyes ^ ^
               <>
                 <div className={cn("w-5 h-5 border-t-[4px] rounded-[50%_50%_0_0] transition-all", lineColor)}></div>
                 <div className={cn("w-5 h-5 border-t-[4px] rounded-[50%_50%_0_0] transition-all", lineColor)}></div>
               </>
            ) : isWrong ? (
               // Sad drooping eyes + Tears
               <>
                 <div className="relative">
                   <div className={cn("w-5 h-5 border-b-[4px] rounded-[0_0_50%_50%] mt-2 transition-all", lineColor)}></div>
                   <div className="absolute -bottom-3 left-1 w-2 h-3 bg-cyan-400 rounded-full animate-bounce shadow-sm"></div>
                 </div>
                 <div className="relative">
                   <div className={cn("w-5 h-5 border-b-[4px] rounded-[0_0_50%_50%] mt-2 transition-all", lineColor)}></div>
                   <div className="absolute -bottom-3 right-1 w-2 h-3 bg-cyan-400 rounded-full animate-bounce shadow-sm" style={{animationDelay: '0.2s'}}></div>
                 </div>
               </>
            ) : (
               // Cute large oval eyes
               <>
                 <div className={cn("w-5 h-7 rounded-[50%] relative animate-blink shadow-sm", eyeColor)}>
                   <div className="absolute top-1 left-1.5 w-2 h-2.5 bg-white rounded-full"></div>
                 </div>
                 <div className={cn("w-5 h-7 rounded-[50%] relative animate-blink shadow-sm", eyeColor)} style={{ animationDelay: '0.1s' }}>
                   <div className="absolute top-1 left-1.5 w-2 h-2.5 bg-white rounded-full"></div>
                 </div>
               </>
            )}
          </div>

          {/* Cheeks */}
          <div className="absolute top-6 w-[120%] flex justify-between px-1 -ml-[10%]">
             <div className="w-6 h-3.5 bg-red-500/80 rounded-full blur-[2px]"></div>
             <div className="w-6 h-3.5 bg-red-500/80 rounded-full blur-[2px]"></div>
          </div>

          {/* Mouth */}
          <div className="mt-1">
             {isCorrect ? (
               <div className={cn("w-5 h-5 rounded-[0_0_20px_20px] overflow-hidden relative shadow-inner", eyeColor)}>
                 <div className="absolute bottom-0 w-full h-2.5 bg-pink-400"></div>
               </div>
             ) : isWrong ? (
               <div className={cn("w-4 h-2 border-t-[3px] rounded-[50%_50%_0_0] mt-1.5 transition-all", lineColor)}></div>
             ) : (
               <div className={cn("w-4 h-2.5 border-b-[3px] rounded-[0_0_50%_50%] transition-all", lineColor)}></div>
             )}
          </div>
        </div>
      </div>

      {/* Static Campfire Base (Logs & Rocks) */}
      <div className="absolute bottom-0 w-[180px] h-[70px] z-0">
        <svg viewBox="0 0 160 60" className="w-full h-full overflow-visible">
          {/* Rocks Base */}
          <g transform="translate(0, 20)">
             {/* Back Rocks */}
             <circle cx="30" cy="25" r="16" fill="#475569" stroke="#1e293b" strokeWidth="2.5" />
             <circle cx="130" cy="25" r="16" fill="#475569" stroke="#1e293b" strokeWidth="2.5" />
             <circle cx="55" cy="20" r="18" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />
             <circle cx="105" cy="20" r="18" fill="#334155" stroke="#1e293b" strokeWidth="2.5" />
             {/* Front Rock */}
             <circle cx="80" cy="28" r="18" fill="#64748b" stroke="#1e293b" strokeWidth="2.5" />
             
             {/* Rock Highlights */}
             <path d="M 22 18 Q 30 12 38 18" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
             <path d="M 45 12 Q 55 5 65 12" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
             <path d="M 70 20 Q 80 14 90 20" stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
             <path d="M 95 12 Q 105 5 115 12" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
             <path d="M 122 18 Q 130 12 138 18" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/>
          </g>
          
          {/* Wooden Logs */}
          {/* Back Log */}
          <g transform="translate(80, 25) rotate(8) translate(-80, -25)">
             <rect x="25" y="15" width="110" height="18" rx="6" fill="#78350f" stroke="#451a03" strokeWidth="2.5" />
             <ellipse cx="135" cy="24" rx="6" ry="9" fill="#fcd34d" stroke="#451a03" strokeWidth="2.5" />
             <circle cx="135" cy="24" r="2.5" fill="#451a03" />
             <path d="M 35 20 L 100 20" stroke="#451a03" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
          </g>
          {/* Front Left Log */}
          <g transform="translate(80, 25) rotate(-18) translate(-80, -25)">
             <rect x="20" y="20" width="100" height="18" rx="6" fill="#92400e" stroke="#451a03" strokeWidth="2.5" />
             <ellipse cx="20" cy="29" rx="6" ry="9" fill="#fcd34d" stroke="#451a03" strokeWidth="2.5" />
             <circle cx="20" cy="29" r="2.5" fill="#451a03" />
             <path d="M 40 25 L 110 25" stroke="#451a03" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
          </g>
          {/* Front Right Log */}
          <g transform="translate(80, 25) rotate(22) translate(-80, -25)">
             <rect x="40" y="25" width="100" height="18" rx="6" fill="#b45309" stroke="#451a03" strokeWidth="2.5" />
             <ellipse cx="140" cy="34" rx="6" ry="9" fill="#fcd34d" stroke="#451a03" strokeWidth="2.5" />
             <circle cx="140" cy="34" r="2.5" fill="#451a03" />
             <path d="M 50 30 L 120 30" stroke="#451a03" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
          </g>
        </svg>
      </div>

    </div>
  );
}
