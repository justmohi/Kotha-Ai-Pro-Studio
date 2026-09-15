import React from 'react';

interface KothaMonogramProps {
  size?: number;
  className?: string;
}

export const KothaMonogram: React.FC<KothaMonogramProps> = ({ 
  size = 40, 
  className = '' 
}) => {
  return (
    <div 
      className={`relative rounded-xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 border border-amber-400/30 shadow-md shadow-indigo-950/25 flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle ambient lens/glow overlay */}
      <div className="absolute inset-0 bg-radial from-amber-400/10 via-transparent to-transparent pointer-events-none" />

      <svg 
        viewBox="0 0 44 44" 
        className="w-[78%] h-[78%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Studio-Grade Matte Gold Finish */}
          <linearGradient id="kothaMatteGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2D1" />
            <stop offset="25%" stopColor="#E6BD5E" />
            <stop offset="65%" stopColor="#C49226" />
            <stop offset="85%" stopColor="#B37F1A" />
            <stop offset="100%" stopColor="#F5DB88" />
          </linearGradient>

          {/* Accent Gold Gradient for Cardioid Ring & Waves */}
          <linearGradient id="kothaGoldWave" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B37F1A" />
            <stop offset="50%" stopColor="#E6BD5E" />
            <stop offset="100%" stopColor="#FFF2D1" />
          </linearGradient>
        </defs>

        {/* 1. Microphone Capsule (Vertical Spine of 'K' - Head) */}
        <rect 
          x="7.5" 
          y="6.5" 
          width="9" 
          height="14.5" 
          rx="4.5" 
          fill="url(#kothaMatteGold)" 
        />

        {/* Acoustic Grille Slits in Capsule */}
        <line x1="9.5" y1="10.5" x2="14.5" y2="10.5" stroke="#0B0F19" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" stroke="#0B0F19" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <line x1="9.5" y1="16.5" x2="14.5" y2="16.5" stroke="#0B0F19" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

        {/* Microphone Collar Band */}
        <rect 
          x="6.5" 
          y="20.5" 
          width="11" 
          height="2.5" 
          rx="1" 
          fill="url(#kothaMatteGold)" 
        />

        {/* Microphone Handle / Lower Spine */}
        <rect 
          x="10" 
          y="23" 
          width="4" 
          height="13.5" 
          rx="2" 
          fill="url(#kothaMatteGold)" 
        />

        {/* Cardioid / Shock-Mount Acoustic Arc Intertwining the Mic Base */}
        <path 
          d="M 6.5 19 C 4.5 22.5, 4.5 27.5, 8.5 30.5 C 12.5 33.5, 17 32, 19.5 28.5" 
          stroke="url(#kothaGoldWave)" 
          strokeWidth="1.8" 
          strokeLinecap="round" 
        />

        {/* 2. Stylized 'K' Upper Dynamic Arm */}
        <path 
          d="M 15.5 19.5 L 29.5 7.8 C 30.5 7, 31.8 7.2, 32.6 8.1 L 33.2 8.8 C 34 9.7, 33.8 11.1, 32.9 11.9 L 19.5 23.5 Z" 
          fill="url(#kothaMatteGold)" 
        />

        {/* 3. Stylized 'K' Lower Dynamic Arm */}
        <path 
          d="M 15.5 22.5 L 31.8 35.8 C 32.7 36.5, 32.9 37.9, 32.2 38.8 L 31.5 39.5 C 30.7 40.3, 29.3 40.2, 28.5 39.4 L 15 26.5 Z" 
          fill="url(#kothaMatteGold)" 
        />

        {/* 4. Sleek Soundwave Synthesis Waves Radiating from the 'K' */}
        <path 
          d="M 34.5 16 C 37 19, 37 24.5, 34.5 27.5" 
          stroke="url(#kothaGoldWave)" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
        <path 
          d="M 38 13.5 C 41.5 17.5, 41.5 26, 38 30" 
          stroke="url(#kothaGoldWave)" 
          strokeWidth="1.6" 
          strokeLinecap="round" 
          opacity="0.8" 
        />
      </svg>
    </div>
  );
};

interface KothaBrandHeaderProps {
  monogramSize?: number;
  className?: string;
  theme?: 'light' | 'dark';
}

export const KothaBrandHeader: React.FC<KothaBrandHeaderProps> = ({
  monogramSize = 42,
  className = '',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Monogram */}
      <KothaMonogram size={monogramSize} />

      {/* Brand Typography */}
      <div className="flex flex-col select-none">
        <span className={`text-xl sm:text-[22px] font-extrabold tracking-tight font-sans leading-none ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          Kotha
        </span>
        <span className={`text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase mt-1 leading-none ${
          isDark ? 'text-amber-300/80' : 'text-slate-500'
        }`}>
          AI Voice Studio
        </span>
      </div>
    </div>
  );
};
