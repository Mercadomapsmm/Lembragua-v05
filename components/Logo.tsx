'use client';

import React from 'react';

export function Logo({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <div className={`relative rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-500 to-amber-500 p-1 shadow-xs flex items-center justify-center shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoWaterGrad" x1="16" y1="20" x2="48" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284C7" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id="logoPillTop" x1="0" y1="-24" x2="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EF4444" />
            <stop offset="1" stopColor="#F87171" />
          </linearGradient>
          <linearGradient id="logoPillBottom" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#FBBF24" />
          </linearGradient>
          <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.1" />
          </filter>
        </defs>
        {/* Soft squircle background */}
        <rect width="100" height="100" rx="22" fill="#FFFFFF" fillOpacity="0.96" />
        {/* 1. ÁGUA: Water Droplet (Left) */}
        <g filter="url(#logoShadow)" transform="translate(6, 0)">
          <path
            d="M26 22 C26 22 10 44 10 58 C10 69 17.5 77 27 77 C36.5 77 44 69 44 58 C44 44 26 22 26 22 Z"
            fill="url(#logoWaterGrad)"
          />
          {/* Water shine reflection */}
          <path
            d="M20 52 C20 45 24 38 29 36 C26 39 25 44 25 49 C25 54 28 58 28 58 C23 57 20 55 20 52 Z"
            fill="#E0F2FE"
            opacity="0.9"
          />
        </g>
        {/* 2. REMÉDIOS: Medicine Pill Capsule (Right, tilted 35deg) */}
        <g filter="url(#logoShadow)" transform="translate(68, 51) rotate(-35)">
          {/* Capsule Red Top */}
          <rect x="-10" y="-23" width="20" height="23" rx="10" fill="url(#logoPillTop)" />
          {/* Capsule Amber Bottom */}
          <rect x="-10" y="0" width="20" height="23" rx="10" fill="url(#logoPillBottom)" />
          {/* White separator line */}
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#FFFFFF" strokeWidth="2.5" />
          {/* Subtle reflection shine */}
          <path
            d="M-5 -16 C-5 -16 -6 -8 -6 -3"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </g>
      </svg>
    </div>
  );
}
