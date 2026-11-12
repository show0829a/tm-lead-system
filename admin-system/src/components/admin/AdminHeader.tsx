'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CurrentUser } from '../types';

export type AdminTabKey = 'leads' | 'allocation' | 'sites' | 'simulator';

interface AdminHeaderProps {
  currentUser: CurrentUser | null;
  activeTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  unassignedCount?: number;
  isDebugMode?: boolean;
}

export function getAdminNavItems(isDebugMode: boolean): {
  key: AdminTabKey;
  code: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
}[] {
  return [
    {
      key: 'leads',
      code: '01',
      label: '전체 상담 관리',
      shortLabel: '전체 상담 관리',
      description: '모든 모집 사이트에서 접수된 상담 내역을 조회하고 담당 상담원(TM)을 지정·변경합니다.',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      key: 'allocation',
      code: '02',
      label: '상담원(TM) 순번 및 배정 관리',
      shortLabel: '순번 및 배정 관리',
      description: '자동 배정 대기 순번, 다음 배정 차례 지정, 상담원별 상담 수신 및 문자 알림 스위치를 제어합니다.',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
      ),
    },
    {
      key: 'sites',
      code: '03',
      label: '접수 사이트 및 전담 설정',
      shortLabel: '접수 사이트 설정',
      description: '외부 모집 사이트 연동 키(API Key) 발급 및 사이트별 전담 상담원 배정 순번을 설정합니다.',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
    },
    {
      key: 'simulator',
      code: '04',
      label: isDebugMode ? '가상 접수 테스트 및 문자 내역' : '휴대폰 문자 발송 내역',
      shortLabel: isDebugMode ? '가상 접수·문자 내역' : '문자 발송 내역',
      description: isDebugMode
        ? '가상 상담 신청을 접수하여 순번 배정 및 휴대폰 문자 발송 내역을 실시간으로 점검합니다.'
        : '상담 배정 시 상담원(TM)에게 발송된 실시간 문자 원문 및 수신 상태 기록을 확인합니다.',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
  ];
}

export function AdminHeader({
  currentUser,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing = false,
  unassignedCount = 0,
  isDebugMode = false,
}: AdminHeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = getAdminNavItems(isDebugMode);
  const activeNavItem =
    navItems.find((item) => item.key === activeTab) || navItems[0];

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    router.push('/login');
  };

  const handleSelectTab = (tab: AdminTabKey) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      {/* Top: Brand & Navigation */}
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xs bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-xs shrink-0">
              TM
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white tracking-tight truncate">
                고객 상담 자동 배정
              </div>
              <div className="text-[11px] text-zinc-400 font-medium">
                통합 관리자 시스템
              </div>
            </div>
          </div>

          {/* Mobile Drawer Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="메뉴 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            관리 메뉴
          </div>
          <nav className="space-y-1" aria-label="관리자 사이드바 메뉴">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectTab(item.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full px-3 py-2.5 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center justify-between gap-2 text-left ${
                    isActive
                      ? 'bg-white text-zinc-950 shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-mono text-[10px] tabular-nums shrink-0 ${
                        isActive ? 'text-zinc-500 font-bold' : 'text-zinc-500'
                      }`}
                    >
                      {item.code}
                    </span>
                    <span aria-hidden="true" className="shrink-0">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.key === 'leads' && unassignedCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                        isActive
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      미배정 {unassignedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom: TM View Switcher & Admin Account */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2.5 bg-zinc-950">
        {/* Quick Link to TM View */}
        <Link
          href="/tm"
          onClick={() => setMobileMenuOpen(false)}
          className="w-full h-9 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-800 transition-colors duration-150 flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
            <span>상담원(TM) 화면 보기</span>
          </span>
          <span className="text-xs font-mono text-zinc-400">→</span>
        </Link>

        {/* Admin User Info & Logout */}
        <div className="p-2.5 rounded-md bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-zinc-200 truncate">
                {currentUser?.name || '최고 관리자'}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono tabular-nums truncate mt-0.5">
              계정: {currentUser?.loginId || 'admin'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-[11px] font-medium text-zinc-300 border border-zinc-700 transition-colors shrink-0 whitespace-nowrap"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Left Sidebar (lg and up) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 bg-zinc-950 text-white border-r border-zinc-800 sticky top-0 h-screen z-30 flex-col justify-between select-none">
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile / Tablet Sticky Top Header (below lg) */}
      <header className="lg:hidden sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 text-white">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          {/* Left: Hamburger Button + Active Menu Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
              aria-label="메뉴 열기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="w-6 h-6 rounded-xs bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
              TM
            </div>
            <span className="font-bold text-sm text-white truncate">
              {activeNavItem.shortLabel}
            </span>
          </div>

          {/* Right: Quick TM Link & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tm"
              className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[11px] font-semibold text-zinc-200 border border-zinc-800 whitespace-nowrap"
            >
              상담원(TM) 화면 →
            </Link>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
              aria-label="새로고침"
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
                  strokeWidth={1.75}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Mobile Slide-Over Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="관리자 메뉴"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-zinc-950 text-white h-full shadow-xl border-r border-zinc-800 z-10">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
