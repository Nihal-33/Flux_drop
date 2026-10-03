import React from 'react';

interface CinematicBackgroundProps {
  variant?: 'hero' | 'auth' | 'dashboard';
  className?: string;
}

export const CinematicBackground: React.FC<CinematicBackgroundProps> = ({
  variant = 'hero',
  className = '',
}) => {
  // Tailor video opacity and filter based on page context
  const videoClasses = {
    hero: 'opacity-95 brightness-[1.38] contrast-[1.14] saturate-[1.35]',
    auth: 'opacity-85 brightness-[1.28] contrast-[1.12] saturate-[1.25]',
    dashboard: 'opacity-80 brightness-[1.28] contrast-[1.14] saturate-[1.28]',
  }[variant];

  const veilStyle = {
    hero: `
      radial-gradient(110% 70% at 50% 36%, rgba(0,245,255,0.14) 0%, rgba(56,189,248,0.07) 38%, rgba(5,7,11,0.45) 75%, rgba(5,7,11,0.82) 100%),
      linear-gradient(180deg, rgba(5,7,11,0.08) 0%, rgba(5,7,11,0.4) 75%, rgba(5,7,11,0.9) 100%)
    `,
    auth: `
      radial-gradient(120% 70% at 50% 40%, rgba(0,245,255,0.12) 0%, rgba(5,7,11,0.45) 50%, rgba(5,7,11,0.88) 100%),
      linear-gradient(180deg, rgba(5,7,11,0.2) 0%, rgba(5,7,11,0.65) 80%, rgba(5,7,11,0.95) 100%)
    `,
    dashboard: `
      radial-gradient(130% 80% at 50% 25%, rgba(0,245,255,0.12) 0%, rgba(5,7,11,0.4) 55%, rgba(5,7,11,0.82) 100%),
      linear-gradient(180deg, rgba(5,7,11,0.15) 0%, rgba(5,7,11,0.55) 75%, rgba(5,7,11,0.88) 100%)
    `,
  }[variant];

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}>
      {/* Cinematic Looping Video */}
      <video
        className={`fixed inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-1000 ${videoClasses}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4"
      />

      {/* Luminous Protective Veil */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: veilStyle }}
      />

      {/* Volumetric Radiant Ambient Lighting Blooms */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] bg-gradient-to-b from-cyan-400/35 via-blue-500/25 to-purple-600/20 blur-[100px]" />
        <div className="absolute top-[30%] -left-32 w-[750px] h-[750px] bg-gradient-to-br from-cyan-400/25 to-blue-600/15 blur-[130px]" />
        <div className="absolute top-[50%] -right-32 w-[750px] h-[750px] bg-gradient-to-bl from-indigo-500/25 to-pink-500/15 blur-[130px]" />
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-radial from-[#61f7df]/25 via-blue-500/15 to-transparent blur-[85px]" />
      </div>
    </div>
  );
};
