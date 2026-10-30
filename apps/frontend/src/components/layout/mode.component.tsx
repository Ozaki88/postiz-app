'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useCookie from 'react-use-cookie';
import EventEmitter from 'events';

export const modeEmitter = new EventEmitter();

// Freya: a theme picker instead of the dark / light toggle (user, 2026-10-30). Each theme is a stock mode (dark or
// light, which the rest of Postiz listens to through modeEmitter) plus an optional skin class on <body>, styled in
// app/themes.scss.
const THEMES = [
  { id: 'aurora', label: 'Aurora Glass', mode: 'dark', skin: 'skin-aurora', swatch: 'linear-gradient(135deg,#7c5cff,#ff4fa3)' },
  { id: 'neon', label: 'Neon Cyber', mode: 'dark', skin: 'skin-neon', swatch: 'linear-gradient(135deg,#c6ff00,#00f0ff)' },
  { id: 'sunset', label: 'Sunset Pop', mode: 'dark', skin: 'skin-sunset', swatch: 'linear-gradient(135deg,#ffb347,#ff3d77)' },
  { id: 'luxe', label: 'Warm Luxe', mode: 'light', skin: 'skin-luxe', swatch: 'linear-gradient(135deg,#f5efe3,#b8893a)' },
  { id: 'dark', label: 'Classic dark', mode: 'dark', skin: '', swatch: '#0e0e0e' },
  { id: 'light', label: 'Classic light', mode: 'light', skin: '', swatch: '#f0f2f4' },
] as const;
const SKINS = THEMES.map((t) => t.skin).filter(Boolean) as string[];

const ModeComponent = () => {
  const [mode, setMode] = useCookie('mode', 'dark');
  const [themeId, setThemeId] = useCookie('theme', 'aurora');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];

  const pick = useCallback(
    (id: string) => {
      const t = THEMES.find((x) => x.id === id) || THEMES[0];
      setThemeId(t.id);
      if (t.mode !== mode) {
        modeEmitter.emit('mode', t.mode);
        setMode(t.mode);
      }
      setOpen(false);
    },
    [mode]
  );

  useEffect(() => {
    document.body.classList.remove('dark', 'light', ...SKINS);
    document.body.classList.add(theme.mode);
    if (theme.skin) document.body.classList.add(theme.skin);
    if (theme.mode !== mode) setMode(theme.mode);
  }, [theme, mode]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={box} className="relative select-none">
      <div
        onClick={() => setOpen(!open)}
        className="cursor-pointer flex items-center"
        title={`Theme: ${theme.label}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="11" r="1.3" fill="currentColor" />
          <circle cx="10" cy="7" r="1.3" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1.3" fill="currentColor" />
        </svg>
      </div>
      {open && (
        <div
          className="absolute end-0 top-[34px] z-[1000] min-w-[200px] rounded-[12px] p-[6px] bg-newBgColorInner border border-newBorder"
          style={{ boxShadow: 'var(--menu-shadow)' }}
        >
          <div className="px-[10px] py-[6px] text-[12px] text-textItemBlur">Theme</div>
          {THEMES.map((t) => (
            <div
              key={t.id}
              onClick={() => pick(t.id)}
              className={`flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] cursor-pointer text-[14px] hover:bg-boxHover ${
                t.id === theme.id ? 'font-[600]' : ''
              }`}
            >
              <span
                className="inline-block w-[18px] h-[18px] rounded-full"
                style={{ background: t.swatch, boxShadow: '0 0 0 1px rgba(128,128,128,.35)' }}
              />
              <span className="flex-1">{t.label}</span>
              {t.id === theme.id && <span>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default ModeComponent;
