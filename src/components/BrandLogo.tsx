import React from 'react';

export const BrandLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* Woman Silhouette with Crown Emblem */}
      <div className="relative shrink-0">
        <svg 
          viewBox="0 0 64 64" 
          className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-sm"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle warm glow background */}
          <circle cx="32" cy="32" r="30" fill="url(#bgGlow)" />
          
          {/* Gold 5-point Crown */}
          <path 
            d="M20 18L24 23L32 17L40 23L44 18L42 27H22L20 18Z" 
            fill="url(#goldGrad)" 
            stroke="#B89254" 
            strokeWidth="0.75"
          />
          <circle cx="20" cy="17" r="1.5" fill="#FFEAA7" />
          <circle cx="32" cy="16" r="1.8" fill="#FFEAA7" />
          <circle cx="44" cy="17" r="1.5" fill="#FFEAA7" />

          {/* Woman profile with elegant wavy hair */}
          <path 
            d="M31 27C27 27 24 30 24 34C24 36.5 25.5 38.8 27.5 40C26 42 24.5 45 25 48C25.5 51 28 53 31 53C33 53 34.5 52.2 35.8 51C36.8 52.5 38.5 53.5 40.5 53.5C44 53.5 46.5 50.5 46 47C45.5 44 43 42 41 41.5C43 40.5 44.5 38.5 44 36C43.5 33 41 31 38.5 31C37.5 29 34.5 27 31 27Z" 
            fill="#392632"
          />
          
          {/* Delicate face silhouette profile */}
          <path 
            d="M35 32C36.5 33.5 37 35.5 37 37C37 38.2 36.5 39 36 39.5L37.5 40.5C36.5 41.5 35 42 34 42L33.5 45L31 43.5" 
            stroke="#D6B477" 
            strokeWidth="1" 
            strokeLinecap="round"
          />

          <defs>
            <radialGradient id="bgGlow" cx="0.5" cy="0.5" r="0.5" fx="0.4" fy="0.4">
              <stop offset="0%" stopColor="#FFF9F6" />
              <stop offset="100%" stopColor="#EAC6D1" stopOpacity="0.4" />
            </radialGradient>
            <linearGradient id="goldGrad" x1="20" y1="16" x2="44" y2="27" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F9E2AF" />
              <stop offset="50%" stopColor="#D6B477" />
              <stop offset="100%" stopColor="#B89254" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Wordmark & Tagline */}
      <div className="flex flex-col text-left">
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#392632] leading-tight">
          Beauty Hair
        </h1>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#392632] -mt-1 leading-tight">
          Collection
        </h2>
        
        {/* Subtle decorative gold divider with diamond */}
        <div className="flex items-center gap-2 mt-1">
          <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#D6B477]"></div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] uppercase text-[#D6B477] whitespace-nowrap">
            Premium Wig Boutique
          </span>
          <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#D6B477]"></div>
        </div>
      </div>
    </div>
  );
};
