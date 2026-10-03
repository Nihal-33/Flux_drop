import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'gradient' | 'white' | 'monochrome';
  showTagline?: boolean;
}

export const FluxDropLogo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
  showTagline = false,
}) => {
  const sizeMap = {
    sm: { icon: 30, text: 'text-base', tracking: '-tracking-[0.03em]', gap: 'gap-2.5', tagline: 'text-[9px] tracking-[3px]' },
    md: { icon: 42, text: 'text-xl', tracking: '-tracking-[0.04em]', gap: 'gap-3', tagline: 'text-[10px] tracking-[4px]' },
    lg: { icon: 54, text: 'text-2xl', tracking: '-tracking-[0.04em]', gap: 'gap-3.5', tagline: 'text-[11px] tracking-[5px]' },
    xl: { icon: 70, text: 'text-3xl', tracking: '-tracking-[0.05em]', gap: 'gap-4', tagline: 'text-[12px] tracking-[6px]' },
    '2xl': { icon: 110, text: 'text-5xl', tracking: '-tracking-[0.06em]', gap: 'gap-6', tagline: 'text-[15px] tracking-[7px]' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center ${currentSize.gap} select-none group cursor-pointer ${className}`}>
      {/* Exact FluxDrop Dual-Card Icon */}
      <div className="relative shrink-0">
        <svg
          width={currentSize.icon}
          height={currentSize.icon}
          viewBox="0 0 260 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-all duration-400 ease-out group-hover:scale-105 group-hover:-translate-y-1 group-hover:-rotate-1"
          style={{
            filter: 'drop-shadow(0 0 18px rgba(0, 255, 220, 0.22)) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.6))',
          }}
        >
          <defs>
            {/* Outer Base Gradient */}
            <linearGradient id="fluxOuterBg" x1="15" y1="15" x2="245" y2="245" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(255, 255, 255, 0.12)" />
              <stop offset="0.5" stopColor="rgba(10, 22, 22, 0.85)" />
              <stop offset="1" stopColor="rgba(3, 7, 7, 0.95)" />
            </linearGradient>

            {/* Transfer Card Gradient */}
            <linearGradient id="cardGrad" x1="0" y1="0" x2="105" y2="105" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="1" stopColor="rgba(0, 0, 0, 0.4)" />
            </linearGradient>

            {/* Connecting Pill Gradient */}
            <linearGradient id="connectionGrad" x1="0" y1="0" x2="92" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#61f7df" />
              <stop offset="0.5" stopColor="#ffffff" />
              <stop offset="1" stopColor="#b8c2c0" />
            </linearGradient>

            {/* Cyan Arrow Glow */}
            <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#61f7df" floodOpacity="0.85" />
            </filter>

            {/* White Arrow Glow */}
            <filter id="whiteGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.4" />
            </filter>

            {/* Connection Glow */}
            <filter id="pillGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="rgba(80, 255, 220, 0.6)" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Outer Squircle Container */}
          <rect
            x="3"
            y="3"
            width="254"
            height="254"
            rx="55"
            fill="url(#fluxOuterBg)"
            stroke="rgba(100, 255, 230, 0.85)"
            strokeWidth="3"
          />

          {/* Inner Highlight Ring */}
          <rect
            x="6"
            y="6"
            width="248"
            height="248"
            rx="52"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1.5"
          />

          {/* Connecting Element (Rotated Pill between Cards) */}
          <g transform="rotate(-20 129 124.5)" filter="url(#pillGlow)">
            <rect
              x="83"
              y="112"
              width="92"
              height="25"
              rx="12.5"
              fill="url(#connectionGrad)"
            />
          </g>

          {/* Card One (Top-Left) with Cyan Border */}
          <g className="transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1">
            <rect
              x="38"
              y="43"
              width="105"
              height="105"
              rx="25"
              fill="url(#cardGrad)"
              stroke="#61f7df"
              strokeWidth="5"
            />
            {/* Arrow Down-Right: ↘ */}
            <text
              x="90.5"
              y="112"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="52"
              fontWeight="700"
              fill="#61f7df"
              filter="url(#cyanGlow)"
            >
              ↘
            </text>
          </g>

          {/* Card Two (Bottom-Right) with Silver Border */}
          <g className="transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1">
            <rect
              x="117"
              y="122"
              width="105"
              height="105"
              rx="25"
              fill="url(#cardGrad)"
              stroke="#d2d9d7"
              strokeWidth="5"
            />
            {/* Arrow Up-Left: ↖ */}
            <text
              x="169.5"
              y="191"
              textAnchor="middle"
              fontFamily="Arial, sans-serif"
              fontSize="52"
              fontWeight="700"
              fill="#eeeeee"
              filter="url(#whiteGlow)"
            >
              ↖
            </text>
          </g>
        </svg>
      </div>

      {/* Brand Text Area */}
      {!iconOnly && (
        <div className="flex flex-col items-start leading-none">
          <div className={`font-black ${currentSize.tracking} ${currentSize.text} flex items-baseline whitespace-nowrap`}>
            {/* FLUX in Pure Crisp White */}
            <span
              className="text-white"
              style={{
                textShadow: '0 3px 20px rgba(255, 255, 255, 0.15)',
              }}
            >
              FLUX
            </span>

            {/* DROP in Metallic to Mint Gradient */}
            <span
              className="ml-1 font-black"
              style={{
                background: 'linear-gradient(120deg, #ffffff 0%, #e2faf5 30%, #63ead6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 12px rgba(99, 234, 214, 0.45))',
              }}
            >
              DROP
            </span>
          </div>

          {/* Tagline: SAVE • TRANSFER • GROW */}
          {showTagline && (
            <div className={`flex items-center gap-2 mt-1 text-[#aab5b3] font-medium uppercase ${currentSize.tagline}`}>
              <span>SAVE</span>
              <span className="text-[#62ead5] font-bold text-xs shadow-sm drop-shadow-[0_0_6px_rgba(98,234,213,0.7)]">•</span>
              <span>TRANSFER</span>
              <span className="text-[#62ead5] font-bold text-xs shadow-sm drop-shadow-[0_0_6px_rgba(98,234,213,0.7)]">•</span>
              <span>GROW</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
