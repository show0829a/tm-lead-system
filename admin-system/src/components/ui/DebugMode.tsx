'use client';

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'tm_system_debug_mode';
const EVENT_NAME = 'tm-debug-mode-change';

export function useDebugMode(): [boolean, (next: boolean) => void] {
  const defaultEnvDebug =
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  const [isDebugMode, setIsDebugMode] = useState<boolean>(defaultEnvDebug);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsDebugMode(saved === 'true');
      }
    } catch (e) {
      // ignore storage errors
    }

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsDebugMode(Boolean(customEvent.detail));
    };

    window.addEventListener(EVENT_NAME, handleCustomChange);
    return () => window.removeEventListener(EVENT_NAME, handleCustomChange);
  }, []);

  const updateDebugMode = (nextValue: boolean) => {
    setIsDebugMode(nextValue);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextValue));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextValue }));
    } catch (e) {
      // ignore
    }
  };

  return [isDebugMode, updateDebugMode];
}

export function DebugModeToggleBar() {
  const [isDebugMode, setIsDebugMode] = useDebugMode();

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none">
      <div
        className={`flex items-center gap-2.5 px-3 py-2 rounded-full border shadow-lg text-xs transition-colors duration-150 ${
          isDebugMode
            ? 'bg-amber-950/95 border-amber-700 text-amber-100'
            : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isDebugMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
          }`}
        />
        <span className="font-semibold whitespace-nowrap">
          {isDebugMode ? '디버그·테스트 모드' : '실제 운영 모드'}
        </span>
        <button
          type="button"
          onClick={() => setIsDebugMode(!isDebugMode)}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
            isDebugMode
              ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
              : 'bg-white text-zinc-950 hover:bg-zinc-200'
          }`}
        >
          {isDebugMode ? '운영 화면으로 전환' : '디버그 켜기'}
        </button>
      </div>
    </div>
  );
}
