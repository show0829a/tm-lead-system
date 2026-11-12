'use client';

import React from 'react';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (nextChecked: boolean) => void;
  disabled?: boolean;
  label?: string;
  showStatusText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  showStatusText = true,
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
    sm: { track: 'w-9 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-4' },
    md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { track: 'w-12 h-7', thumb: 'w-5 h-5', translate: 'translate-x-5' },
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
        aria-label={label || (checked ? '켜짐' : '꺼짐')}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 ${
          dimensions.track
        } ${
          disabled
            ? 'bg-zinc-200 cursor-not-allowed opacity-60'
            : checked
            ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
            : 'bg-zinc-300 hover:bg-zinc-400 cursor-pointer'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block rounded-full bg-white shadow-xs transform transition-transform duration-150 ${
            dimensions.thumb
          } ${checked ? dimensions.translate : 'translate-x-1'}`}
        />
      </button>
      {showStatusText && (
        <span
          className={`text-xs font-semibold select-none w-7 ${
            checked ? 'text-emerald-700' : 'text-zinc-400'
          }`}
        >
          {checked ? '켜짐' : '꺼짐'}
        </span>
      )}
    </div>
  );
}
