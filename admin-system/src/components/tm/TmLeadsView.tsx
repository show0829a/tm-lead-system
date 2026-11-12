'use client';

import React, { useState, useMemo } from 'react';
import { LeadItem } from '../types';
import { StatusBadge, STATUS_OPTIONS } from '../ui/StatusBadge';
import { Select } from '../ui/Select';
import { formatPhone } from '../ui/format';

interface TmLeadsViewProps {
  leads: LeadItem[];
  onRefresh: () => void;
}

export function TmLeadsView({ leads, onRefresh }: TmLeadsViewProps) {
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Revealed full phones: { [leadId]: fullPhone }
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Expanded memo & edit drawers { [leadId]: boolean }
  const [expandedMemos, setExpandedMemos] = useState<Record<string, boolean>>({});
  const [memoInputs, setMemoInputs] = useState<Record<string, string>>({});
  const [savingMemoId, setSavingMemoId] = useState<string | null>(null);

  // Inline edit state for price & car number inside drawer
  const [editingFields, setEditingFields] = useState<
    Record<string, { estimatedPrice: string; carNumber: string; isSaving?: boolean }>
  >({});

  // Dashboard Summary Metrics for TM
  const summaryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newCount = leads.filter((l) => l.status === 'NEW').length;
    const todayNewCount = leads.filter(
      (l) => new Date(l.createdAt) >= today
    ).length;
    const recallCount = leads.filter((l) => l.status === 'RECALL').length;
    const progressCount = leads.filter(
      (l) => l.status === 'PROGRESS' || l.status === 'VISIT'
    ).length;
    const completedLeads = leads.filter((l) => l.status === 'COMPLETED');
    const completedCount = completedLeads.length;
    const completedTotalPrice = completedLeads.reduce(
      (sum, l) => sum + (l.estimatedPrice || 0),
      0
    );

    return {
      newCount,
      todayNewCount,
      recallCount,
      progressCount,
      completedCount,
      completedTotalPrice,
    };
  }, [leads]);

  // Status Filter Tabs
  const statusTabs = [
    { key: 'ALL', label: '전체 상담', count: leads.length },
    { key: 'NEW', label: '신규배정', count: leads.filter((l) => l.status === 'NEW').length },
    { key: 'RECALL', label: '부재/재통화', count: leads.filter((l) => l.status === 'RECALL').length },
    { key: 'PROGRESS', label: '상담중', count: leads.filter((l) => l.status === 'PROGRESS').length },
    { key: 'VISIT', label: '방문/견적진행', count: leads.filter((l) => l.status === 'VISIT').length },
    { key: 'COMPLETED', label: '매입완료', count: leads.filter((l) => l.status === 'COMPLETED').length },
    { key: 'CANCELED', label: '취소', count: leads.filter((l) => l.status === 'CANCELED').length },
  ];

  // Filtered Leads (Smart unified search across name, car, plate, phone, region, site, and memos)
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedStatusTab !== 'ALL' && lead.status !== selectedStatusTab) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const nameMatch = lead.customerName.toLowerCase().includes(term);
        const carMatch = lead.carModel.toLowerCase().includes(term);
        const carNoMatch = lead.carNumber?.toLowerCase().includes(term);
        const phoneMatch =
          lead.phoneMasked.toLowerCase().includes(term) ||
          revealedPhones[lead.id]?.toLowerCase().includes(term);
        const regionMatch = lead.region?.toLowerCase().includes(term);
        const siteMatch = lead.site?.name?.toLowerCase().includes(term);
        const memoMatch = lead.memos?.some((m) =>
          m.content.toLowerCase().includes(term)
        );

        if (
          !nameMatch &&
          !carMatch &&
          !carNoMatch &&
          !phoneMatch &&
          !regionMatch &&
          !siteMatch &&
          !memoMatch
        ) {
          return false;
        }
      }
      return true;
    });
  }, [leads, selectedStatusTab, searchTerm, revealedPhones]);

  // Reveal Phone
  const handleRevealPhone = async (leadId: string) => {
    if (revealedPhones[leadId]) return;

    setRevealingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/reveal-phone`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '연락처 열람에 실패했습니다.');
      }
      setRevealedPhones((prev) => ({
        ...prev,
        [leadId]: formatPhone(data.fullPhone || data.phone) || '열람 완료',
      }));
    } catch (err: any) {
      alert(err.message || '연락처 복호화 중 오류가 발생했습니다.');
    } finally {
      setRevealingId(null);
    }
  };

  // Toggle Memo Drawer
  const toggleMemoDrawer = (lead: LeadItem) => {
    const nextOpen = !expandedMemos[lead.id];
    setExpandedMemos((prev) => ({
      ...prev,
      [lead.id]: nextOpen,
    }));
    if (nextOpen && !editingFields[lead.id]) {
      setEditingFields((prev) => ({
        ...prev,
        [lead.id]: {
          carNumber: lead.carNumber || '',
          estimatedPrice: lead.estimatedPrice ? String(lead.estimatedPrice) : '',
        },
      }));
    }
  };

  // Add Memo Submit
  const handleAddMemo = async (lead: LeadItem, customContent?: string) => {
    const content = customContent || memoInputs[lead.id];
    if (!content || !content.trim()) return;

    setSavingMemoId(lead.id);
    try {
      const res = await fetch(`/api/tm/leads/${lead.id}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          leadStatus: lead.status,
        }),
      });

      if (!res.ok) {
        throw new Error('메모 저장 실패');
      }

      setMemoInputs((prev) => ({ ...prev, [lead.id]: '' }));
      onRefresh();
    } catch (err: any) {
      alert(err.message || '메모 저장에 실패했습니다.');
    } finally {
      setSavingMemoId(null);
    }
  };

  // Quick Change Status
  const handleStatusChange = async (lead: LeadItem, newStatus: string) => {
    if (newStatus === lead.status) return;
    try {
      const statusLabel =
        STATUS_OPTIONS.find((o) => o.value === newStatus)?.label || newStatus;
      const res = await fetch(`/api/tm/leads/${lead.id}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `상담 상태 변경: ${statusLabel}`,
          leadStatus: newStatus,
        }),
      });
      if (!res.ok) {
        throw new Error('상태 변경 실패');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || '상태 변경 중 오류가 발생했습니다.');
    }
  };

  // Save Vehicle Car Number & Estimate Price
  const handleSaveVehicleFields = async (lead: LeadItem) => {
    const editState = editingFields[lead.id];
    if (!editState) return;

    setEditingFields((prev) => ({
      ...prev,
      [lead.id]: { ...editState, isSaving: true },
    }));

    try {
      const res = await fetch(`/api/tm/leads/${lead.id}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `차량 제원/견적 업데이트: 차량번호(${editState.carNumber || '미입력'}), 예상견적(${editState.estimatedPrice || '0'}만원)`,
          estimatedPrice: editState.estimatedPrice
            ? parseInt(editState.estimatedPrice, 10)
            : undefined,
          carNumber: editState.carNumber || undefined,
        }),
      });

      if (!res.ok) throw new Error('정보 저장 실패');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setEditingFields((prev) => ({
        ...prev,
        [lead.id]: { ...editState, isSaving: false },
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TM Personal Dashboard Summary Cards (4-Column Strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 bg-white border border-zinc-200 rounded-lg shadow-2xs overflow-hidden">
        {/* Card 1: New Assigned (Immediate Call Target) */}
        <div
          onClick={() =>
            setSelectedStatusTab((prev) => (prev === 'NEW' ? 'ALL' : 'NEW'))
          }
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedStatusTab((prev) => (prev === 'NEW' ? 'ALL' : 'NEW'));
            }
          }}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-colors duration-150 group ${
            selectedStatusTab === 'NEW'
              ? 'bg-sky-50/70'
              : summaryStats.newCount > 0
              ? 'bg-sky-50/30 hover:bg-sky-50/60'
              : 'hover:bg-zinc-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              신규 배정 (미연락)
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium tabular-nums ${
                summaryStats.newCount > 0
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              오늘 배정 +{summaryStats.todayNewCount}건
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span
              className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${
                summaryStats.newCount > 0 ? 'text-sky-700' : 'text-zinc-900'
              }`}
            >
              {summaryStats.newCount.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">건</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">최우선 첫 통화 대기 건</span>
            <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold">
              {selectedStatusTab === 'NEW' ? '전체 보기' : '목록 보기 →'}
            </span>
          </div>
        </div>

        {/* Card 2: Recall Waiting */}
        <div
          onClick={() =>
            setSelectedStatusTab((prev) => (prev === 'RECALL' ? 'ALL' : 'RECALL'))
          }
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedStatusTab((prev) =>
                prev === 'RECALL' ? 'ALL' : 'RECALL'
              );
            }
          }}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-colors duration-150 group ${
            selectedStatusTab === 'RECALL'
              ? 'bg-amber-50/70'
              : 'hover:bg-zinc-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              부재 / 재통화 대기
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
              재연락 필요
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {summaryStats.recallCount.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">건</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">부재중 또는 재통화 요청 고객</span>
            <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold">
              {selectedStatusTab === 'RECALL' ? '전체 보기' : '목록 보기 →'}
            </span>
          </div>
        </div>

        {/* Card 3: In Progress / Visit */}
        <div
          onClick={() =>
            setSelectedStatusTab((prev) =>
              prev === 'PROGRESS' ? 'ALL' : 'PROGRESS'
            )
          }
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedStatusTab((prev) =>
                prev === 'PROGRESS' ? 'ALL' : 'PROGRESS'
              );
            }
          }}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-colors duration-150 group ${
            selectedStatusTab === 'PROGRESS' || selectedStatusTab === 'VISIT'
              ? 'bg-zinc-100/80'
              : 'hover:bg-zinc-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              상담 / 방문 진행 중
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
              견적·방문 조율
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {summaryStats.progressCount.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">건</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">상담 진행 및 현장 방문 예정 건</span>
            <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold">
              {selectedStatusTab === 'PROGRESS' ? '전체 보기' : '목록 보기 →'}
            </span>
          </div>
        </div>

        {/* Card 4: Completed Deals */}
        <div
          onClick={() =>
            setSelectedStatusTab((prev) =>
              prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'
            )
          }
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedStatusTab((prev) =>
                prev === 'COMPLETED' ? 'ALL' : 'COMPLETED'
              );
            }
          }}
          className={`p-4 flex flex-col justify-between cursor-pointer transition-colors duration-150 group ${
            selectedStatusTab === 'COMPLETED'
              ? 'bg-emerald-50/70'
              : 'hover:bg-zinc-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              매입 완료 실적
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium tabular-nums">
              {summaryStats.completedTotalPrice > 0
                ? `총 ${summaryStats.completedTotalPrice.toLocaleString()}만원`
                : '계약 성사'}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tabular-nums tracking-tight">
              {summaryStats.completedCount.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500">건</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">매입 계약 및 대금 지급 완료</span>
            <span className="text-zinc-600 group-hover:text-zinc-950 font-semibold">
              {selectedStatusTab === 'COMPLETED' ? '전체 보기' : '목록 보기 →'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Status Filter Tabs & Unified Smart Search Bar (Strictly h-9 aligned) */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatusTab(tab.key)}
                className={`h-9 px-3 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums font-mono ${
                    isActive
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Smart Unified Search Input */}
        <div className="relative w-full lg:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="고객명, 연락처, 차량번호, 차종, 지역, 메모 검색..."
            className="w-full h-9 pl-9 pr-12 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 bg-zinc-50/50 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[11px] text-zinc-400 hover:text-zinc-700 font-medium"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* 3. Consultation List: Mobile Touch Cards (<md) & Desktop Fixed-Column Table (md+) */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-visible">
        {/* A. Mobile Field Card View (<md) */}
        <div className="md:hidden divide-y divide-zinc-200">
          {filteredLeads.length === 0 ? (
            <div className="py-12 px-4 text-center text-zinc-400">
              <p className="text-xs font-semibold text-zinc-500">
                배정된 상담 내역이 없습니다.
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isRevealed = Boolean(revealedPhones[lead.id]);
              const displayPhone = formatPhone(
                isRevealed ? revealedPhones[lead.id] : lead.phoneMasked
              );
              const isMemoExpanded = Boolean(expandedMemos[lead.id]);
              const latestMemo =
                lead.memos && lead.memos.length > 0 ? lead.memos[0] : null;
              const editState = editingFields[lead.id] || {
                carNumber: lead.carNumber || '',
                estimatedPrice: lead.estimatedPrice ? String(lead.estimatedPrice) : '',
              };

              return (
                <div
                  key={lead.id}
                  className={`p-4 space-y-3 ${
                    isMemoExpanded ? 'bg-zinc-50/70' : ''
                  }`}
                >
                  {/* Top Row: Site + Date + Quick Status Select */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200 whitespace-nowrap shrink-0">
                        {lead.site?.name || '수출 사이트'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <Select
                      size="sm"
                      align="right"
                      value={lead.status}
                      onChange={(nextStatus) => handleStatusChange(lead, nextStatus)}
                      className="w-36 shrink-0"
                      options={STATUS_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      ariaLabel="상담 상태 변경"
                    />
                  </div>

                  {/* Customer Name & Region */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {lead.customerName}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        {lead.region || '지역 미기재'}
                      </span>
                    </div>
                    {lead.estimatedPrice ? (
                      <span className="text-xs font-mono font-bold text-zinc-900 tabular-nums shrink-0">
                        견적 {lead.estimatedPrice.toLocaleString()}만원
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400 shrink-0">
                        견적 미책정
                      </span>
                    )}
                  </div>

                  {/* Vehicle Details & 1-Line Latest Memo */}
                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {lead.carNumber && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-white border border-zinc-300 font-mono text-[11px] font-bold text-zinc-900 tabular-nums">
                          {lead.carNumber}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-zinc-900">
                        {lead.carModel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 tabular-nums">
                      {lead.carYear && <span>{lead.carYear}년식</span>}
                      {lead.carYear && lead.mileage && <span>&bull;</span>}
                      {lead.mileage && <span>{lead.mileage}</span>}
                    </div>
                    {latestMemo && (
                      <div
                        onClick={() => toggleMemoDrawer(lead)}
                        className="text-[11px] text-zinc-700 bg-white px-2 py-1 rounded border border-zinc-200/80 truncate cursor-pointer"
                      >
                        <span className="font-semibold text-zinc-500 mr-1">
                          최근 메모:
                        </span>
                        {latestMemo.content}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Row: Phone Call / Reveal + Memo Drawer Button */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      {isRevealed ? (
                        <a
                          href={`tel:${displayPhone.replace(/[^0-9]/g, '')}`}
                          className="h-8 px-3 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-mono text-xs font-bold tabular-nums inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>📞 {displayPhone}</span>
                        </a>
                      ) : (
                        <>
                          <span className="font-mono text-xs text-zinc-700 tabular-nums">
                            {formatPhone(lead.phoneMasked)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevealPhone(lead.id)}
                            disabled={revealingId === lead.id}
                            className="h-8 px-2.5 rounded-md text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 whitespace-nowrap"
                          >
                            {revealingId === lead.id ? '확인 중' : '번호보기'}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleMemoDrawer(lead)}
                      className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border tabular-nums whitespace-nowrap shrink-0 ${
                        isMemoExpanded
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <span>메모/수정</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          isMemoExpanded
                            ? 'bg-zinc-700 text-white'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {lead.memos?.length || 0}
                      </span>
                    </button>
                  </div>

                  {/* Mobile Expanded Memo & Vehicle Edit Drawer */}
                  {isMemoExpanded && (
                    <div className="pt-2 space-y-3 border-t border-zinc-200">
                      {/* Vehicle Plate & Price Edit */}
                      <div className="p-3 rounded-md bg-white border border-zinc-200 space-y-2.5">
                        <span className="block text-xs font-bold text-zinc-900">
                          차량 번호 및 예상 견적가 입력
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                              차량 등록번호
                            </label>
                            <input
                              type="text"
                              value={editState.carNumber}
                              onChange={(e) =>
                                setEditingFields((prev) => ({
                                  ...prev,
                                  [lead.id]: {
                                    ...editState,
                                    carNumber: e.target.value,
                                  },
                                }))
                              }
                              placeholder="예: 12가 3456"
                              className="w-full h-8 px-2.5 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:border-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                              예상 견적가 (만원)
                            </label>
                            <input
                              type="number"
                              value={editState.estimatedPrice}
                              onChange={(e) =>
                                setEditingFields((prev) => ({
                                  ...prev,
                                  [lead.id]: {
                                    ...editState,
                                    estimatedPrice: e.target.value,
                                  },
                                }))
                              }
                              placeholder="예: 1850"
                              className="w-full h-8 px-2.5 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:border-zinc-900"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={editState.isSaving}
                          onClick={() => handleSaveVehicleFields(lead)}
                          className="w-full h-8 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {editState.isSaving ? '저장 중...' : '차량번호 / 견적가 저장'}
                        </button>
                      </div>

                      {/* Memo Input & Timeline */}
                      <div className="p-3 rounded-md bg-white border border-zinc-200 space-y-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[
                            '고객 부재중, 오후 재통화 예정',
                            '현장 방문 견적 일정 조율 완료',
                            '희망 매입가 조율 진행 중',
                            '당일 계약 및 매입 대금 송금 완료',
                          ].map((tmpl) => (
                            <button
                              key={tmpl}
                              type="button"
                              onClick={() =>
                                setMemoInputs((prev) => ({
                                  ...prev,
                                  [lead.id]: tmpl,
                                }))
                              }
                              className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[11px]"
                            >
                              + {tmpl}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={memoInputs[lead.id] || ''}
                            onChange={(e) =>
                              setMemoInputs((prev) => ({
                                ...prev,
                                [lead.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMemo(lead);
                              }
                            }}
                            placeholder="상담 메모 입력..."
                            className="flex-1 h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddMemo(lead)}
                            disabled={
                              savingMemoId === lead.id || !memoInputs[lead.id]?.trim()
                            }
                            className="h-9 px-3.5 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
                          >
                            등록
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                          {!lead.memos || lead.memos.length === 0 ? (
                            <p className="text-xs text-zinc-400 text-center py-1">
                              작성된 상담 메모가 없습니다.
                            </p>
                          ) : (
                            lead.memos.map((memo) => (
                              <div
                                key={memo.id}
                                className="px-2.5 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-xs flex items-center justify-between gap-2"
                              >
                                <span className="text-zinc-800">{memo.content}</span>
                                <span className="text-[10px] font-mono text-zinc-400 tabular-nums shrink-0">
                                  {new Date(memo.createdAt).toLocaleString('ko-KR', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* B. Desktop Fixed-Column Consultation Table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500">
                <th className="py-3 px-4 w-28 whitespace-nowrap">배정일시</th>
                <th className="py-3 px-3 w-32 whitespace-nowrap">접수 사이트</th>
                <th className="py-3 px-3 w-32 whitespace-nowrap">고객명 / 지역</th>
                <th className="py-3 px-4 w-44 whitespace-nowrap">연락처</th>
                <th className="py-3 px-4 min-w-[220px] whitespace-nowrap">차량 사양 / 최근 메모</th>
                <th className="py-3 px-3 w-28 whitespace-nowrap">예상 견적가</th>
                <th className="py-3 px-3 w-40 whitespace-nowrap">상담 진행 상태</th>
                <th className="py-3 px-4 w-32 text-right whitespace-nowrap">상담 메모 / 수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-zinc-400">
                    <svg className="w-7 h-7 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-xs font-semibold text-zinc-500">배정된 상담 내역이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isRevealed = Boolean(revealedPhones[lead.id]);
                  const displayPhone = formatPhone(
                    isRevealed ? revealedPhones[lead.id] : lead.phoneMasked
                  );
                  const isMemoExpanded = Boolean(expandedMemos[lead.id]);
                  const latestMemo =
                    lead.memos && lead.memos.length > 0 ? lead.memos[0] : null;
                  const editState = editingFields[lead.id] || {
                    carNumber: lead.carNumber || '',
                    estimatedPrice: lead.estimatedPrice ? String(lead.estimatedPrice) : '',
                  };

                  return (
                    <React.Fragment key={lead.id}>
                      <tr
                        className={`transition-colors duration-150 ${
                          isMemoExpanded ? 'bg-zinc-50/70' : 'hover:bg-zinc-50/50'
                        }`}
                      >
                        {/* 1. Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-zinc-500 tabular-nums align-middle">
                          {new Date(lead.createdAt).toLocaleDateString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* 2. Channel */}
                        <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {lead.site?.name || '수출 사이트'}
                          </span>
                        </td>

                        {/* 3. Customer Name & Region */}
                        <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                          <div className="text-xs font-bold text-zinc-900">
                            {lead.customerName}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {lead.region || '지역 미기재'}
                          </div>
                        </td>

                        {/* 4. Phone Reveal */}
                        <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-2">
                            {isRevealed ? (
                              <>
                                <a
                                  href={`tel:${displayPhone.replace(/[^0-9]/g, '')}`}
                                  className="font-mono text-xs font-bold text-sky-700 hover:underline tabular-nums"
                                >
                                  {displayPhone}
                                </a>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                                  열람됨
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-xs text-zinc-600 tabular-nums">
                                  {formatPhone(lead.phoneMasked)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRevealPhone(lead.id)}
                                  disabled={revealingId === lead.id}
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 transition-colors disabled:opacity-50"
                                >
                                  {revealingId === lead.id ? '확인 중' : '번호보기'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 5. Car Details & 1-Line Latest Memo Preview */}
                        <td className="py-3.5 px-4 align-middle max-w-[280px]">
                          <div className="text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {lead.carNumber && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs bg-zinc-100 border border-zinc-300 font-mono text-[11px] font-bold text-zinc-900 tabular-nums">
                                  {lead.carNumber}
                                </span>
                              )}
                              <span className="font-semibold text-zinc-900">
                                {lead.carModel}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 tabular-nums mt-0.5">
                              {lead.carYear && <span>{lead.carYear}년식</span>}
                              {lead.carYear && lead.mileage && <span>&bull;</span>}
                              {lead.mileage && <span>{lead.mileage}</span>}
                            </div>
                            {latestMemo && (
                              <div
                                onClick={() => toggleMemoDrawer(lead)}
                                className="mt-1 text-[11px] text-zinc-600 bg-zinc-100/80 px-2 py-0.5 rounded truncate cursor-pointer hover:bg-zinc-200/70 transition-colors"
                                title={latestMemo.content}
                              >
                                <span className="font-semibold text-zinc-500 mr-1">
                                  메모:
                                </span>
                                {latestMemo.content}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Estimated Price */}
                        <td className="py-3.5 px-3 whitespace-nowrap align-middle text-xs font-mono tabular-nums">
                          {lead.estimatedPrice ? (
                            <span className="font-bold text-zinc-900">
                              {lead.estimatedPrice.toLocaleString()}만원
                            </span>
                          ) : (
                            <span className="text-zinc-400">미책정</span>
                          )}
                        </td>

                        {/* 7. Status Custom Dropdown */}
                        <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                          <Select
                            size="sm"
                            value={lead.status}
                            onChange={(nextStatus) => handleStatusChange(lead, nextStatus)}
                            className="w-36"
                            options={STATUS_OPTIONS.map((opt) => ({
                              value: opt.value,
                              label: opt.label,
                            }))}
                            ariaLabel="상담 상태 변경"
                          />
                        </td>

                        {/* 8. Toggle Memo & Edit Drawer Button (Fixed width) */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right align-middle">
                          <button
                            type="button"
                            onClick={() => toggleMemoDrawer(lead)}
                            className={`w-28 h-8 rounded-md text-xs font-semibold transition-colors duration-150 inline-flex items-center justify-center gap-1.5 border tabular-nums ${
                              isMemoExpanded
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                            }`}
                          >
                            <span>메모/수정</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                                isMemoExpanded
                                  ? 'bg-zinc-700 text-white'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {lead.memos?.length || 0}
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Full-Width Drawer Row */}
                      {isMemoExpanded && (
                        <tr className="bg-zinc-50/90 border-b border-zinc-200">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                              {/* Left 4 Cols: Vehicle Plate & Estimated Price Edit */}
                              <div className="lg:col-span-4 p-3.5 rounded-md bg-white border border-zinc-200 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-900">
                                    차량 번호 및 예상 견적가 입력
                                  </span>
                                  <StatusBadge status={lead.status} size="sm" />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                      차량 등록번호
                                    </label>
                                    <input
                                      type="text"
                                      value={editState.carNumber}
                                      onChange={(e) =>
                                        setEditingFields((prev) => ({
                                          ...prev,
                                          [lead.id]: {
                                            ...editState,
                                            carNumber: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="예: 12가 3456"
                                      className="w-full h-8 px-2.5 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:border-zinc-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                                      예상 견적가 (만원)
                                    </label>
                                    <input
                                      type="number"
                                      value={editState.estimatedPrice}
                                      onChange={(e) =>
                                        setEditingFields((prev) => ({
                                          ...prev,
                                          [lead.id]: {
                                            ...editState,
                                            estimatedPrice: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="예: 1850"
                                      className="w-full h-8 px-2.5 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:border-zinc-900"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={editState.isSaving}
                                  onClick={() => handleSaveVehicleFields(lead)}
                                  className="w-full h-8 rounded bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                  {editState.isSaving ? '저장 중...' : '차량번호 / 견적가 저장'}
                                </button>
                              </div>

                              {/* Right 8 Cols: Consultation Memo Input & Timeline */}
                              <div className="lg:col-span-8 p-3.5 rounded-md bg-white border border-zinc-200 space-y-3">
                                {/* Quick Template Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-semibold text-zinc-500">
                                    빠른 메모 입력:
                                  </span>
                                  {[
                                    '고객 부재중, 오후 재통화 예정',
                                    '현장 방문 견적 일정 조율 완료',
                                    '차량 등록증 및 사진 요청 완료',
                                    '희망 매입가 조율 진행 중',
                                    '당일 계약 및 매입 대금 송금 완료',
                                  ].map((tmpl) => (
                                    <button
                                      key={tmpl}
                                      type="button"
                                      onClick={() =>
                                        setMemoInputs((prev) => ({
                                          ...prev,
                                          [lead.id]: tmpl,
                                        }))
                                      }
                                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 text-[11px] transition-colors"
                                    >
                                      + {tmpl}
                                    </button>
                                  ))}
                                </div>

                                {/* Memo Input Box */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={memoInputs[lead.id] || ''}
                                    onChange={(e) =>
                                      setMemoInputs((prev) => ({
                                        ...prev,
                                        [lead.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddMemo(lead);
                                      }
                                    }}
                                    placeholder="상담 통화 내용, 일정, 특이사항을 입력 후 등록을 누르세요..."
                                    className="flex-1 h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddMemo(lead)}
                                    disabled={
                                      savingMemoId === lead.id || !memoInputs[lead.id]?.trim()
                                    }
                                    className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
                                  >
                                    {savingMemoId === lead.id ? '저장 중...' : '메모 등록'}
                                  </button>
                                </div>

                                {/* Past Memos Timeline */}
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                                  {!lead.memos || lead.memos.length === 0 ? (
                                    <p className="text-xs text-zinc-400 text-center py-2">
                                      아직 작성된 상담 메모가 없습니다.
                                    </p>
                                  ) : (
                                    lead.memos.map((memo) => (
                                      <div
                                        key={memo.id}
                                        className="px-3 py-2 rounded bg-zinc-50 border border-zinc-200 text-xs flex items-center justify-between gap-4"
                                      >
                                        <span className="text-zinc-800">{memo.content}</span>
                                        <span className="text-[11px] font-mono text-zinc-400 tabular-nums shrink-0">
                                          {memo.author?.name || '상담원'} &bull;{' '}
                                          {new Date(memo.createdAt).toLocaleString('ko-KR', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
