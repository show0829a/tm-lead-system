'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CurrentUser, TmUser } from '../types';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';

interface TmHeaderProps {
  currentUser: CurrentUser | null;
  activeTargetUser: CurrentUser | TmUser | null;
  tms?: TmUser[];
  selectedTmId?: string;
  onSelectTmId?: (tmId: string) => void;
  onStatusChange: (field: 'isDbReceiveOn' | 'isSmsReceiveOn', value: boolean) => void;
  isUpdatingStatus: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function TmHeader({
  currentUser,
  activeTargetUser,
  tms = [],
  selectedTmId = 'ALL',
  onSelectTmId,
  onStatusChange,
  isUpdatingStatus,
  onRefresh,
  isRefreshing = false,
}: TmHeaderProps) {
  const router = useRouter();
  const isAdmin = currentUser?.role === 'ADMIN';
  const displayUser = activeTargetUser || currentUser;

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
        <div className="py-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Top Row on Mobile / Left on Desktop: Brand & TM Profile + Actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xs bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                TM
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                    {isAdmin && selectedTmId === 'ALL'
                      ? '상담원(TM) 화면 (전체 보기)'
                      : displayUser?.name || '상담원(TM)'}
                  </span>
                  {displayUser?.globalOrder ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium tabular-nums whitespace-nowrap shrink-0">
                      {displayUser.globalOrder}순번 담당 TM
                    </span>
                  ) : isAdmin ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-medium whitespace-nowrap shrink-0">
                      관리자 열람 모드
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium whitespace-nowrap shrink-0">
                      상담원(TM)
                    </span>
                  )}
                  {displayUser?.loginId && (
                    <span className="text-xs text-zinc-400 hidden sm:inline tabular-nums">
                      ({displayUser.loginId})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {isAdmin
                    ? '관리자 권한으로 상담원별 배정 내역 및 수신 상태를 확인합니다'
                    : '내게 배정된 고객 상담 내역 조회 및 진행 상태 관리'}
                </p>
              </div>
            </div>

            {/* Admin Only: TM Perspective Selector */}
            {isAdmin && tms.length > 0 && onSelectTmId && (
              <div className="w-full sm:w-auto">
                <Select
                  size="sm"
                  value={selectedTmId}
                  onChange={onSelectTmId}
                  className="w-full sm:w-48"
                  ariaLabel="확인할 상담원(TM) 선택"
                  searchable
                  searchPlaceholder="상담원 이름, 아이디, 순번 검색..."
                  options={[
                    { value: 'ALL', label: '상담원(TM) 전체 보기' },
                    ...tms.map((tm) => ({
                      value: tm.id,
                      label: `${tm.name} (${tm.globalOrder}순번)`,
                      keywords: `${tm.loginId} ${tm.globalOrder}`,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* Right / Bottom on Mobile: Switches & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 border-t lg:border-t-0 pt-2.5 lg:pt-0 border-zinc-800">
            {/* Show Receive Switches when logged in as TM, or when Admin selects a specific TM */}
            {(!isAdmin || (isAdmin && selectedTmId !== 'ALL' && activeTargetUser)) && (
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                {/* DB Receive Switch */}
                <div className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-zinc-100 whitespace-nowrap">
                      상담 배정 받기
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-zinc-400 whitespace-nowrap">
                      {displayUser?.isDbReceiveOn ? '배정 받는 중' : '배정 제외됨'}
                    </span>
                  </div>
                  <Switch
                    checked={Boolean(displayUser?.isDbReceiveOn)}
                    onChange={(next) => onStatusChange('isDbReceiveOn', next)}
                    disabled={isUpdatingStatus}
                    showStatusText={false}
                    size="sm"
                  />
                </div>

                {/* SMS Receive Switch */}
                <div className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-zinc-100 whitespace-nowrap">
                      문자 알림
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-zinc-400 whitespace-nowrap">
                      {displayUser?.isSmsReceiveOn ? '문자 발송 켜짐' : '문자 꺼짐'}
                    </span>
                  </div>
                  <Switch
                    checked={Boolean(displayUser?.isSmsReceiveOn)}
                    onChange={(next) => onStatusChange('isSmsReceiveOn', next)}
                    disabled={isUpdatingStatus}
                    showStatusText={false}
                    size="sm"
                  />
                </div>
              </div>
            )}

            {/* Actions: Back to Admin (if Admin), Refresh, Logout */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-xs font-semibold text-zinc-950 transition-colors duration-150 whitespace-nowrap shrink-0"
                >
                  <span className="text-[10px] font-mono">←</span>
                  <span>관리자 화면으로 이동</span>
                </Link>
              )}

              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors shrink-0"
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
                className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 text-xs font-medium text-zinc-300 border border-zinc-800 transition-colors whitespace-nowrap shrink-0"
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
