import React from 'react';

// PostPilot wordmark (user, 2026-10-30: renamed from Postiz): the paper-plane mark plus the name, in the active
// theme's colors (--sk-accent / --sk-accent-2 from app/themes.scss), stock purple and pink as the fallback.
export const LogoTextComponent = () => {
  return (
    <svg width="168" height="36" viewBox="0 0 168 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pp-word" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--sk-accent, #7c5cff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sk-accent-2, #ff4fa3)' }} />
        </linearGradient>
        <linearGradient id="pp-word-text" x1="96" y1="0" x2="166" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--sk-accent, #7c5cff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sk-accent-2, #ff4fa3)' }} />
        </linearGradient>
      </defs>
      <rect x="1" y="2" width="32" height="32" rx="9.5" fill="url(#pp-word)" />
      <path d="M8.3 18.4 25.6 10.7l-5.7 17-4.1-6.1-7.5-3.2Z" fill="#fff" />
      <path d="m15.8 21.6 9.8-10.9-11.7 8.9 1.9 2Z" fill="#fff" opacity=".55" />
      <text
        x="42"
        y="25.5"
        fill="currentColor"
        style={{ fontFamily: 'inherit', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        Post<tspan fill="url(#pp-word-text)">Pilot</tspan>
      </text>
    </svg>
  );
};
