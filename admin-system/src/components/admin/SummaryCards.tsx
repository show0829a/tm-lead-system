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
      <div className="p-4 border-t-2 border-t-zinc-900 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
            TOTAL INGESTED LEADS
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
            누적 DB
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-zinc-900 font-mono tabular-nums tracking-tight">
            {totalLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          전 채널 통합 수집 리드
        </p>
      </div>

      {/* 2. Today Leads */}
      <div className="p-4 border-t-2 border-t-emerald-600 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
            TODAY INBOUND (00:00~)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            당일 접수
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-zinc-900 font-mono tabular-nums tracking-tight">
            {todayLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건</span>
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">
          금일 00시 이후 실시간 유입
        </p>
      </div>

      {/* 3. Unassigned Leads (Clickable Filter) */}
      <div
        onClick={onFilterUnassigned}
        className={`p-4 border-t-2 transition-colors duration-150 cursor-pointer flex flex-col justify-between group ${
          unassignedLeads > 0
            ? 'border-t-rose-600 bg-rose-50/40 hover:bg-rose-50/80'
            : 'border-t-zinc-300 hover:bg-zinc-50'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFilterUnassigned();
        }}
        aria-label="미배정 대기 DB 필터링하기"
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              unassignedLeads > 0 ? 'text-rose-700' : 'text-zinc-500'
            }`}
          >
            UNASSIGNED QUEUE
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              unassignedLeads > 0
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                : 'bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}
          >
            {unassignedLeads > 0 ? '수동배정 필요' : '대기 없음'}
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span
            className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
              unassignedLeads > 0 ? 'text-rose-600' : 'text-zinc-900'
            }`}
          >
            {unassignedLeads.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">건 대기</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={unassignedLeads > 0 ? 'text-rose-700 font-medium' : 'text-zinc-400'}>
            {unassignedLeads > 0 ? '전원 수신 OFF 시 유입 건' : '누수 없이 즉시 배정 완료'}
          </span>
          <span className="font-mono text-zinc-600 group-hover:text-zinc-950 font-semibold">
            필터 →
          </span>
        </div>
      </div>

      {/* 4. Next Allocation TM Pointer */}
      <div
        onClick={onNavigateAllocation}
        className="p-4 border-t-2 border-t-sky-600 bg-zinc-50/40 hover:bg-sky-50/40 transition-colors duration-150 cursor-pointer flex flex-col justify-between group"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNavigateAllocation();
        }}
        aria-label="TM 배분 관리 탭으로 이동하기"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
            NEXT DISPATCH POINTER
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-600 text-white">
            NEXT
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          {nextTm ? (
            <>
              <span className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {nextTm.name}
              </span>
              <span className="text-xs font-mono text-sky-700 font-semibold tabular-nums">
                (#0{nextTm.globalOrder} / {nextTm.loginId})
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-400">지정된 순번 없음</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={nextTm?.isDbReceiveOn ? 'text-zinc-500' : 'text-amber-700 font-medium'}>
            {nextTm?.isDbReceiveOn ? 'DB 수신 ON (정상 대기)' : 'DB 수신 OFF (자동 스킵 예정)'}
          </span>
          <span className="font-mono text-sky-700 font-semibold group-hover:underline">
            순번 제어 →
          </span>
        </div>
      </div>
    </div>
  );
}
