'use client';

// PostPilot mark (user, 2026-10-30: renamed from Postiz): a paper plane on a rounded square. The colors follow the
// active theme (--sk-accent / --sk-accent-2 from app/themes.scss), with the stock purple and pink as the fallback.
export const Logo = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      className="mt-[8px] min-w-[60px] min-h-[60px]"
    >
      <defs>
        <linearGradient id="pp-mark" x1="6" y1="6" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--sk-accent, #7c5cff)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sk-accent-2, #ff4fa3)' }} />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="48" height="48" rx="14" fill="url(#pp-mark)" />
      <path d="M17 29.5 43 18l-8.5 25.5-6.2-9.2L17 29.5Z" fill="#fff" />
      <path d="m28.3 34.3 14.7-16.3-17.6 13.4 2.9 2.9Z" fill="#fff" opacity=".55" />
      <path d="M28.3 34.3 27 41.5l4.2-3.3" fill="#fff" opacity=".8" />
    </svg>
  );
};
