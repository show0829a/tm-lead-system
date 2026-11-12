'use client';

import React from 'react';
import { TmUser } from '../types';

interface SummaryCardsProps {
  totalLeads: number;
  todayLeads: number;
  unassignedLeads: number;
  nextTm: TmUser | null;
  onFilterUnassigned: () => void;
  onNavigateAllocation: () => void;
}

export function SummaryCards({
  totalLeads,
  todayLeads,
  unassignedLeads,
  nextTm,
  onFilterUnassigned,
  onNavigateAllocation,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 bg-white border border-zinc-200 rounded-lg shadow-2xs mb-6 overflow-hidden">
      {/* 1. Total Leads */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
            전체 누적 상담
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium whitespace-nowrap shrink-0">
            전체 사이트
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums tracking-tight">
            {totalLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          전체 사이트 접수 누적
        </p>
      </div>

      {/* 2. Today Leads */}
      <div className="p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
            오늘 신규 접수
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap shrink-0">
            당일 접수
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums tracking-tight">
            {todayLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          금일 신규 접수 건수
        </p>
      </div>

      {/* 3. Unassigned Leads (Clickable Filter) */}
      <div
        onClick={onFilterUnassigned}
        className={`p-4 transition-colors duration-150 cursor-pointer flex flex-col justify-between group ${
          unassignedLeads > 0
            ? 'bg-rose-50/40 hover:bg-rose-50/80'
            : 'hover:bg-zinc-50'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFilterUnassigned();
        }}
        aria-label="미배정 대기 건만 보기"
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-semibold whitespace-nowrap ${
              unassignedLeads > 0 ? 'text-rose-700' : 'text-zinc-600'
            }`}
          >
            미배정 대기 건
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded font-medium whitespace-nowrap shrink-0 ${
              unassignedLeads > 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            {unassignedLeads > 0 ? '수동 배정 필요' : '대기 없음'}
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span
            className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
              unassignedLeads > 0 ? 'text-rose-600' : 'text-zinc-900'
            }`}
          >
            {unassignedLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          <span className={`truncate ${unassignedLeads > 0 ? 'text-rose-700 font-medium' : 'text-zinc-400'}`}>
            {unassignedLeads > 0 ? '수동 배정 필요' : '정상 배정 완료'}
          </span>
          <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold whitespace-nowrap shrink-0">
            목록 보기 →
          </span>
        </div>
      </div>

      {/* 4. Next Allocation TM Pointer */}
      <div
        onClick={onNavigateAllocation}
        className="p-4 hover:bg-zinc-50 transition-colors duration-150 cursor-pointer flex flex-col justify-between group"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNavigateAllocation();
        }}
        aria-label="상담원 순번 관리 탭으로 이동하기"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
            다음 배정 예정 상담원(TM)
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-white font-medium whitespace-nowrap shrink-0">
            현재 차례
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
          {nextTm ? (
            <>
              <span className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight whitespace-nowrap">
                {nextTm.name}
              </span>
              <span className="text-xs text-zinc-500 font-medium tabular-nums whitespace-nowrap">
                ({nextTm.globalOrder}순번 · {nextTm.loginId})
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-400">지정된 상담원 없음</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
          <span className={`truncate ${nextTm?.isDbReceiveOn ? 'text-zinc-500' : 'text-amber-700 font-medium'}`}>
            {nextTm?.isDbReceiveOn ? '배정 대기 중' : '수신 제외 (차순위 배정)'}
          </span>
          <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold whitespace-nowrap shrink-0">
            순번 관리 →
          </span>
        </div>
      </div>
    </div>
  );
}
