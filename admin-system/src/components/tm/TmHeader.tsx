'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CurrentUser } from '../types';
import { Switch } from '../ui/Switch';

interface TmHeaderProps {
  currentUser: CurrentUser | null;
  onStatusChange: (field: 'isDbReceiveOn' | 'isSmsReceiveOn', value: boolean) => void;
  isUpdatingStatus: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function TmHeader({
  currentUser,
  onStatusChange,
  isUpdatingStatus,
  onRefresh,
  isRefreshing = false,
}: TmHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Left: Brand & TM Profile */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-xs">
              TM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                  {currentUser?.name || '상담원'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-600 text-white font-bold tabular-nums">
                  {currentUser?.globalOrder
                    ? `QUEUE #0${currentUser.globalOrder} (${currentUser.globalOrder}순번)`
                    : 'TM AGENT'}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline tabular-nums">
                  ({currentUser?.loginId})
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                1:1 전담 고객 DB 상담 및 매입 견적 워크스페이스
              </p>
            </div>
          </div>

          {/* Center / Right: Separate Switches for DB Receive & SMS Receive */}
          <div className="flex items-center gap-2.5 sm:gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2.5 md:pt-0 border-zinc-800 flex-wrap">
            {/* DB Receive Switch */}
            <div className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-100">
                    내 DB 배정 수신
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser?.isDbReceiveOn ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">
                  {currentUser?.isDbReceiveOn
                    ? 'ACTIVE (정상 자동 배분)'
                    : 'OFF (현재 자동 배분 제외)'}
                </p>
              </div>
              <Switch
                checked={Boolean(currentUser?.isDbReceiveOn)}
                onChange={(next) => onStatusChange('isDbReceiveOn', next)}
                disabled={isUpdatingStatus}
                size="md"
              />
            </div>

            {/* SMS Receive Switch */}
            <div className="px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-100">
                    내 SMS 문자 알림
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentUser?.isSmsReceiveOn ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-400">
                  {currentUser?.isSmsReceiveOn
                    ? 'SMS ON (배정 시 문자 발송)'
                    : 'OFF (DB만 배정, 문자생략)'}
                </p>
              </div>
              <Switch
                checked={Boolean(currentUser?.isSmsReceiveOn)}
                onChange={(next) => onStatusChange('isSmsReceiveOn', next)}
                disabled={isUpdatingStatus}
                size="md"
              />
            </div>

            {/* Actions: Refresh & Logout */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                title="새로고침"
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
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-xs font-medium text-zinc-300 border border-zinc-800 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
