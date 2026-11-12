'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  keywords?: string;
}

interface SelectProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  ariaLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder = '선택하세요',
  disabled = false,
  className = 'w-44',
  align = 'left',
  size = 'md',
  ariaLabel,
  searchable,
  searchPlaceholder = '이름, 순번, 키워드 검색...',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search box is opt-in (used for lists that grow, e.g. 상담원 목록)
  const showSearch = Boolean(searchable);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.subLabel?.toLowerCase().includes(q) ||
        opt.keywords?.toLowerCase().includes(q)
    );
  }, [options, showSearch, searchQuery]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    if (showSearch) {
      // Focus search input when popover opens
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showSearch]);

  const heightClass = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full ${heightClass} rounded-md border bg-white flex items-center justify-between gap-2 text-left font-medium tabular-nums transition-colors duration-150 focus:outline-none ${
          disabled
            ? 'border-zinc-200 bg-zinc-100 text-zinc-400 cursor-not-allowed'
            : isOpen
            ? 'border-zinc-900 ring-2 ring-zinc-900/10 text-zinc-900'
            : 'border-zinc-300 hover:border-zinc-400 text-zinc-800'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-zinc-900' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-1 min-w-full w-max max-w-xs z-50 bg-white border border-zinc-200 rounded-md shadow-lg overflow-hidden ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Sticky Search Input inside Dropdown */}
          {showSearch && (
            <div className="p-2 border-b border-zinc-100 bg-zinc-50/70">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredOptions.length > 0) {
                      e.preventDefault();
                      onChange(filteredOptions[0].value);
                      setIsOpen(false);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full h-7 pl-7 pr-6 rounded border border-zinc-300 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-zinc-400 hover:text-zinc-700 text-xs"
                    aria-label="검색어 지우기"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="py-1 max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-400">
                일치하는 항목이 없습니다.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between gap-3 tabular-nums transition-colors duration-100 ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[11px] text-zinc-400 shrink-0">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {isSelected && (
                        <svg
                          className="w-3.5 h-3.5 text-zinc-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
