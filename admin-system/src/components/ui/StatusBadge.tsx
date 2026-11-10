'use client';

import React from 'react';

export type LeadStatusType =
  | 'UNASSIGNED'
  | 'NEW'
  | 'RECALL'
  | 'PROGRESS'
  | 'VISIT'
  | 'COMPLETED'
  | 'CANCELED';

interface StatusBadgeProps {
  status: LeadStatusType | string;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_CONFIG: Record<
  LeadStatusType,
  { label: string; style: string; dotColor: string }
> = {
  UNASSIGNED: {
    label: '미배정 대기',
    style: 'bg-rose-50 text-rose-800 border-rose-300 font-semibold',
    dotColor: 'bg-rose-600',
  },
  NEW: {
    label: '신규배정',
    style: 'bg-sky-50 text-sky-800 border-sky-200 font-medium',
    dotColor: 'bg-sky-600',
  },
  RECALL: {
    label: '부재/재통화',
    style: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
    dotColor: 'bg-amber-500',
  },
  PROGRESS: {
    label: '상담중',
    style: 'bg-zinc-100 text-zinc-900 border-zinc-300 font-medium',
    dotColor: 'bg-zinc-700',
  },
  VISIT: {
    label: '방문/견적진행',
    style: 'bg-teal-50 text-teal-800 border-teal-200 font-medium',
    dotColor: 'bg-teal-600',
  },
  COMPLETED: {
    label: '매입완료',
    style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
    dotColor: 'bg-emerald-600',
  },
  CANCELED: {
    label: '진행불가/취소',
    style: 'bg-zinc-50 text-zinc-500 border-zinc-200 font-normal',
    dotColor: 'bg-zinc-400',
  },
};

export const STATUS_OPTIONS: { value: LeadStatusType; label: string }[] = [
  { value: 'UNASSIGNED', label: '미배정 대기' },
  { value: 'NEW', label: '신규배정' },
  { value: 'RECALL', label: '부재/재통화' },
  { value: 'PROGRESS', label: '상담중' },
  { value: 'VISIT', label: '방문/견적진행' },
  { value: 'COMPLETED', label: '매입완료' },
  { value: 'CANCELED', label: '진행불가/취소' },
];

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as LeadStatusType] || {
    label: status,
    style: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotColor: 'bg-zinc-400',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.style} ${sizeClass} transition-colors duration-150 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
