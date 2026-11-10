'use client';

import React from 'react';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
  className = '',
}: SwitchProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  const dimensions = {
    sm: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-5', text: 'text-[10px]' },
    md: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-7', text: 'text-[11px]' },
    lg: { track: 'w-18 h-9', thumb: 'w-7 h-7', translate: 'translate-x-9', text: 'text-xs' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span
          className={`font-medium ${disabled ? 'text-zinc-400' : 'text-zinc-700'} ${
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}
        >
          {label}
        </span>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || (checked ? '활성화됨' : '비활성화됨')}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex items-center rounded-md border transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
          dimensions.track
        } ${
          disabled
            ? 'bg-zinc-100 border-zinc-200 cursor-not-allowed opacity-60'
            : checked
            ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 cursor-pointer'
            : 'bg-zinc-200 hover:bg-zinc-300 border-zinc-300 cursor-pointer'
        }`}
      >
        <span
          className={`absolute font-mono font-bold uppercase select-none transition-opacity ${
            dimensions.text
          } ${checked ? 'left-1.5 text-white' : 'right-1.5 text-zinc-600'}`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>
        <span
          aria-hidden="true"
          className={`inline-block rounded-xs bg-white shadow-2xs transform transition-transform duration-150 ${
            dimensions.thumb
          } ${checked ? dimensions.translate : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}
