'use client';

import React, { useState, useMemo } from 'react';
import { LeadItem } from '../types';
import { StatusBadge, STATUS_OPTIONS } from '../ui/StatusBadge';

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

  // Expanded memo drawers { [leadId]: boolean }
  const [expandedMemos, setExpandedMemos] = useState<Record<string, boolean>>({});
  const [memoInputs, setMemoInputs] = useState<Record<string, string>>({});
  const [savingMemoId, setSavingMemoId] = useState<string | null>(null);

  // Inline edit state for price & car number: { [leadId]: { price, carNumber, isSaving } }
  const [editingRows, setEditingRows] = useState<
    Record<string, { estimatedPrice: string; carNumber: string; isSaving?: boolean }>
  >({});

  // Status Filter Tabs
  const statusTabs = [
    { key: 'ALL', label: '전체 DB', count: leads.length },
    { key: 'NEW', label: '신규배정', count: leads.filter((l) => l.status === 'NEW').length },
    { key: 'RECALL', label: '부재/재통화', count: leads.filter((l) => l.status === 'RECALL').length },
    { key: 'PROGRESS', label: '상담중', count: leads.filter((l) => l.status === 'PROGRESS').length },
    { key: 'VISIT', label: '방문/견적', count: leads.filter((l) => l.status === 'VISIT').length },
    { key: 'COMPLETED', label: '매입완료', count: leads.filter((l) => l.status === 'COMPLETED').length },
    { key: 'CANCELED', label: '취소', count: leads.filter((l) => l.status === 'CANCELED').length },
  ];

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedStatusTab !== 'ALL' && lead.status !== selectedStatusTab) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = lead.customerName.toLowerCase().includes(term);
        const carMatch = lead.carModel.toLowerCase().includes(term);
        const carNoMatch = lead.carNumber?.toLowerCase().includes(term);
        const phoneMatch = lead.phoneMasked.includes(term);
        if (!nameMatch && !carMatch && !carNoMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [leads, selectedStatusTab, searchTerm]);

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
        [leadId]: data.fullPhone || data.phone || '열람 완료',
      }));
    } catch (err: any) {
      alert(err.message || '연락처 복호화 중 오류가 발생했습니다.');
    } finally {
      setRevealingId(null);
    }
  };

  // Toggle Memo Drawer
  const toggleMemoDrawer = (leadId: string) => {
    setExpandedMemos((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }));
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
    try {
      const res = await fetch(`/api/tm/leads/${lead.id}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `상담 상태 변경: ${newStatus}`,
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

  // Save Inline Edit (Price & Car Number)
  const handleSaveInlineFields = async (lead: LeadItem) => {
    const editState = editingRows[lead.id];
    if (!editState) return;

    setEditingRows((prev) => ({
      ...prev,
      [lead.id]: { ...editState, isSaving: true },
    }));

    try {
      const res = await fetch(`/api/tm/leads/${lead.id}/memos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `차량 정보 업데이트: 차량번호(${editState.carNumber}), 예상견적(${editState.estimatedPrice}만원)`,
          estimatedPrice: editState.estimatedPrice ? parseInt(editState.estimatedPrice, 10) : undefined,
          carNumber: editState.carNumber || undefined,
        }),
      });

      if (!res.ok) throw new Error('정보 저장 실패');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[lead.id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs & Search Bar */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex space-x-1 overflow-x-auto scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = selectedStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] tabular-nums font-mono ${
                    isActive ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="고객명, 차종, 차량번호 검색..."
            className="w-full pl-8 pr-12 py-1.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-zinc-50/50 focus:bg-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[11px] text-zinc-400 hover:text-zinc-700"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* Leads List / Cards */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center text-zinc-400">
            <svg className="w-7 h-7 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-xs font-semibold text-zinc-600">배정된 상담 DB가 없습니다.</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              상단에서 DB 배정 수신 스위치가 [ON] 상태인지 확인해주세요.
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const isRevealed = Boolean(revealedPhones[lead.id]);
            const displayPhone = isRevealed
              ? revealedPhones[lead.id]
              : lead.phoneMasked;
            const isMemoExpanded = Boolean(expandedMemos[lead.id]);
            const isEditing = Boolean(editingRows[lead.id]);

            return (
              <div
                key={lead.id}
                className="p-4 rounded-lg bg-white border border-zinc-200 shadow-2xs hover:border-zinc-300 transition-colors duration-150"
              >
                {/* Card Top: Site, Date, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                      {lead.site?.name || '수출 사이트'}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums font-mono">
                      {new Date(lead.createdAt).toLocaleDateString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lead.status} size="sm" />
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead, e.target.value)}
                      className="px-2.5 py-1 rounded-md border border-zinc-300 text-xs font-semibold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer"
                      title="상담 상태 바로 변경"
                      aria-label="상담 상태 변경"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          → {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Card Main: Customer & Vehicle Info */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Customer & Phone (4 cols) */}
                  <div className="md:col-span-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-zinc-900 tracking-tight">
                        {lead.customerName}
                      </span>
                      <span className="text-xs text-zinc-500">고객님</span>
                    </div>

                    {/* Phone Reveal Area */}
                    <div className="flex items-center gap-2">
                      {isRevealed ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${displayPhone.replace(/[^0-9]/g, '')}`}
                            className="font-mono text-sm font-bold text-sky-700 hover:underline tabular-nums flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{displayPhone}</span>
                          </a>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                            LOGGED
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-600 tabular-nums">
                            {lead.phoneMasked}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevealPhone(lead.id)}
                            disabled={revealingId === lead.id}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white transition-colors duration-150 disabled:opacity-50"
                          >
                            {revealingId === lead.id ? '열람 중...' : '번호 확인'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500">
                      <span>지역: </span>
                      <strong className="text-zinc-800 font-medium">{lead.region || '전국'}</strong>
                    </div>
                  </div>

                  {/* Vehicle Details (5 cols) */}
                  <div className="md:col-span-5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {lead.carNumber && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs bg-zinc-100 border border-zinc-300 font-mono text-xs font-bold text-zinc-900 tabular-nums">
                          {lead.carNumber}
                        </span>
                      )}
                      <span className="font-bold text-zinc-900 text-sm">
                        {lead.carModel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-zinc-500 font-mono tabular-nums">
                      {lead.carYear && <span>연식: {lead.carYear}년</span>}
                      {lead.mileage && <span>주행: {lead.mileage}</span>}
                    </div>

                    {/* Editable Vehicle Number & Estimate */}
                    {isEditing ? (
                      <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={editingRows[lead.id]?.carNumber}
                          onChange={(e) =>
                            setEditingRows((prev) => ({
                              ...prev,
                              [lead.id]: { ...prev[lead.id], carNumber: e.target.value },
                            }))
                          }
                          placeholder="차량번호"
                          className="w-28 px-2 py-1 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                        <input
                          type="number"
                          value={editingRows[lead.id]?.estimatedPrice}
                          onChange={(e) =>
                            setEditingRows((prev) => ({
                              ...prev,
                              [lead.id]: { ...prev[lead.id], estimatedPrice: e.target.value },
                            }))
                          }
                          placeholder="예상가(만)"
                          className="w-28 px-2 py-1 rounded border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineFields(lead)}
                          className="px-2.5 py-1 rounded bg-zinc-900 text-white text-xs font-semibold"
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRows((prev) => {
                              const copy = { ...prev };
                              delete copy[lead.id];
                              return copy;
                            })
                          }
                          className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-0.5">
                        <span className="font-mono text-zinc-600 tabular-nums">
                          {lead.carNumber ? `차량번호: ${lead.carNumber}` : '차량번호 미입력'}
                        </span>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="font-mono font-bold text-zinc-900 tabular-nums">
                          {lead.estimatedPrice
                            ? `예상 견적: ${lead.estimatedPrice.toLocaleString()}만원`
                            : '견적가 미책정'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRows((prev) => ({
                              ...prev,
                              [lead.id]: {
                                carNumber: lead.carNumber || '',
                                estimatedPrice: lead.estimatedPrice ? String(lead.estimatedPrice) : '',
                              },
                            }))
                          }
                          className="text-[11px] font-semibold text-sky-700 hover:underline"
                        >
                          [견적/번호 수정]
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Toggle Memo Drawer Button (3 cols) */}
                  <div className="md:col-span-3 flex md:justify-end items-center">
                    <button
                      type="button"
                      onClick={() => toggleMemoDrawer(lead.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 border ${
                        isMemoExpanded
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      <span>상담 메모</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums ${
                          isMemoExpanded ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {lead.memos?.length || 0}
                      </span>
                      <span className="text-[10px]">{isMemoExpanded ? '▲' : '▼'}</span>
                    </button>
                  </div>
                </div>

                {/* Consultation Memo Timeline Drawer */}
                {isMemoExpanded && (
                  <div className="mt-4 pt-3.5 border-t border-zinc-200 space-y-3">
                    {/* Quick Template Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold text-zinc-500">
                        상용구:
                      </span>
                      {[
                        '고객 부재중, 오후 재통화 예정',
                        '현장 방문 견적 일정 조율 완료',
                        '차량 등록증 및 계기판 사진 요청',
                        '희망 매입가 조율 진행 중',
                        '서류 확인 및 당일 매입 송금 완료',
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
                      <textarea
                        rows={2}
                        value={memoInputs[lead.id] || ''}
                        onChange={(e) =>
                          setMemoInputs((prev) => ({
                            ...prev,
                            [lead.id]: e.target.value,
                          }))
                        }
                        placeholder="상담 통화 내용, 일정, 특이사항을 기록하세요..."
                        className="flex-1 p-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMemo(lead)}
                        disabled={savingMemoId === lead.id || !memoInputs[lead.id]?.trim()}
                        className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {savingMemoId === lead.id ? '저장 중...' : '메모 등록'}
                      </button>
                    </div>

                    {/* Past Memos Timeline */}
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                      {!lead.memos || lead.memos.length === 0 ? (
                        <p className="text-xs text-zinc-400 text-center py-2">
                          아직 작성된 상담 메모가 없습니다.
                        </p>
                      ) : (
                        lead.memos.map((memo) => (
                          <div
                            key={memo.id}
                            className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span className="font-semibold text-zinc-700">
                                {memo.author?.name || '상담원'}
                              </span>
                              <span className="font-mono tabular-nums">
                                {new Date(memo.createdAt).toLocaleString('ko-KR')}
                              </span>
                            </div>
                            <p className="text-zinc-800 whitespace-pre-wrap">{memo.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
