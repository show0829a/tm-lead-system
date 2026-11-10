'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CurrentUser } from '../types';

interface AdminHeaderProps {
  currentUser: CurrentUser | null;
  activeTab: 'leads' | 'allocation' | 'sites' | 'simulator';
  onTabChange: (tab: 'leads' | 'allocation' | 'sites' | 'simulator') => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function AdminHeader({
  currentUser,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing = false,
}: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    router.push('/login');
  };

  const navItems = [
    {
      key: 'leads' as const,
      code: '01',
      label: '통합 DB 관리',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: 'allocation' as const,
      code: '02',
      label: 'TM 순번 & 배분 관리',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      key: 'sites' as const,
      code: '03',
      label: '모집 사이트 & API 매핑',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
    {
      key: 'simulator' as const,
      code: '04',
      label: 'SMS 로그 & 유입 시뮬레이터',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-white sticky top-0 z-30">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Logo & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xs bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-xs">
              TM
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                고객 DB 자동 배분 시스템
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold uppercase">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          {/* Right Controls: User info, Refresh, Logout */}
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors duration-150 disabled:opacity-50"
              title="데이터 새로고침"
              aria-label="데이터 새로고침"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* User Profile Badge */}
            {currentUser && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-zinc-200">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                  ({currentUser.loginId})
                </span>
              </div>
            )}

            {/* Quick Link to TM view */}
            <Link
              href="/tm"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 border border-zinc-800 transition-colors duration-150"
            >
              <span>상담원 뷰</span>
              <span className="text-[10px] font-mono text-zinc-400">→</span>
            </Link>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-xs font-medium text-zinc-300 border border-zinc-800 transition-colors duration-150"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-t border-zinc-800 bg-zinc-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none" aria-label="관리자 대시보드 탭">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onTabChange(item.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      isActive ? 'text-zinc-500 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {item.code}
                  </span>
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
