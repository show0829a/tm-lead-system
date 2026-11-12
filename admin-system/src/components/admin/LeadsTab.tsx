'use client';

import React, { useState, useMemo } from 'react';
import { LeadItem, TmUser, SiteItem } from '../types';
import { StatusBadge, STATUS_OPTIONS } from '../ui/StatusBadge';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { formatPhone } from '../ui/format';

interface LeadsTabProps {
  leads: LeadItem[];
  tms: TmUser[];
  sites: SiteItem[];
  onRefresh: () => void;
  statusFilterInitial?: string;
}

export function LeadsTab({
  leads,
  tms,
  sites,
  onRefresh,
  statusFilterInitial = 'ALL',
}: LeadsTabProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(statusFilterInitial);
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [tmFilter, setTmFilter] = useState('ALL');

  // Sync statusFilter if statusFilterInitial changes
  React.useEffect(() => {
    setStatusFilter(statusFilterInitial);
  }, [statusFilterInitial]);

  // Phone reveals mapping { leadId: fullPhone }
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  // Manual Assign Modal state
  const [assignModalLead, setAssignModalLead] = useState<LeadItem | null>(null);
  const [selectedTargetTmId, setSelectedTargetTmId] = useState<string>('');
  const [consumeTurn, setConsumeTurn] = useState<boolean>(true);
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Memo / Detail Modal state
  const [detailModalLead, setDetailModalLead] = useState<LeadItem | null>(null);
  const [newMemoContent, setNewMemoContent] = useState('');
  const [isAddingMemo, setIsAddingMemo] = useState(false);
  const [selectedLeadStatus, setSelectedLeadStatus] = useState<string>('');

  // Manual Add Lead Modal state
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCarModel, setNewCarModel] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newCarYear, setNewCarYear] = useState('');
  const [newMileage, setNewMileage] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [newEstimatedPrice, setNewEstimatedPrice] = useState('');
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  const hasActiveFilter =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    siteFilter !== 'ALL' ||
    tmFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSiteFilter('ALL');
    setTmFilter('ALL');
  };

  // Dropdown Options
  const statusSelectOptions = useMemo(
    () => [
      { value: 'ALL', label: `상태 전체 (${leads.length}건)` },
      ...STATUS_OPTIONS.map((opt) => ({
        value: opt.value,
        label: `${opt.label} (${leads.filter((l) => l.status === opt.value).length}건)`,
      })),
    ],
    [leads]
  );

  const siteSelectOptions = useMemo(
    () => [
      { value: 'ALL', label: '접수 사이트 전체' },
      ...sites.map((site) => ({
        value: site.id,
        label: site.name,
      })),
    ],
    [sites]
  );

  const tmSelectOptions = useMemo(
    () => [
      { value: 'ALL', label: '담당 TM 전체' },
      { value: 'UNASSIGNED', label: '미배정 대기 건만', keywords: '미배정 대기' },
      ...tms.map((tm) => ({
        value: tm.id,
        label: `${tm.name} (${tm.globalOrder}순번)`,
        keywords: `${tm.loginId} ${tm.globalOrder}순번 ${tm.globalOrder}`,
      })),
    ],
    [tms]
  );

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
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

      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      if (siteFilter !== 'ALL' && lead.siteId !== siteFilter) {
        return false;
      }

      if (tmFilter !== 'ALL') {
        if (tmFilter === 'UNASSIGNED') {
          if (lead.assignedTmId !== null) return false;
        } else if (lead.assignedTmId !== tmFilter) {
          return false;
        }
      }

      return true;
    });
  }, [leads, searchTerm, statusFilter, siteFilter, tmFilter]);

  // Reveal Full Phone Handler
  const handleRevealPhone = async (leadId: string) => {
    if (revealedPhones[leadId]) return;

    setRevealingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/reveal-phone`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '연락처 열람 권한이 없습니다.');
      }
      setRevealedPhones((prev) => ({
        ...prev,
        [leadId]: formatPhone(data.fullPhone || data.phone) || '열람 완료',
      }));
    } catch (err: any) {
      alert(err.message || '연락처 복호화에 실패했습니다.');
    } finally {
      setRevealingId(null);
    }
  };

  // Open Assign Modal
  const openAssignModal = (lead: LeadItem) => {
    setAssignModalLead(lead);
    setSelectedTargetTmId(lead.assignedTmId || (tms[0]?.id ?? ''));
    setConsumeTurn(true);
  };

  // Submit Manual Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalLead || !selectedTargetTmId) return;

    setIsAssigning(true);
    try {
      const res = await fetch('/api/admin/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: assignModalLead.id,
          tmId: selectedTargetTmId,
          consumeTurn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '수동 배정에 실패했습니다.');
      }
      setAssignModalLead(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '배정 처리 중 오류가 발생했습니다.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Open Memo / Detail Modal
  const openDetailModal = (lead: LeadItem) => {
    setDetailModalLead(lead);
    setSelectedLeadStatus(lead.status);
    setNewMemoContent('');
  };

  // Submit Memo & Status Change
  const handleSaveMemoAndStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailModalLead) return;

    setIsAddingMemo(true);
    try {
      if (newMemoContent.trim()) {
        await fetch(`/api/tm/leads/${detailModalLead.id}/memos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: newMemoContent.trim(),
            leadStatus: selectedLeadStatus,
          }),
        });
      } else if (selectedLeadStatus !== detailModalLead.status) {
        await fetch(`/api/tm/leads/${detailModalLead.id}/memos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `상태 변경: ${selectedLeadStatus}`,
            leadStatus: selectedLeadStatus,
          }),
        });
      }

      setDetailModalLead(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsAddingMemo(false);
    }
  };

  // Create Manual Lead Submit
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerPhone || !newCarModel) {
      alert('고객명, 연락처, 차종은 필수 입력 항목입니다.');
      return;
    }

    const targetSite = sites.find((s) => s.id === newSiteId) || sites[0];
    if (!targetSite) {
      alert('등록 가능한 모집 사이트가 없습니다.');
      return;
    }

    setIsCreatingLead(true);
    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Api-Key': targetSite.apiKey,
        },
        body: JSON.stringify({
          customerName: newCustomerName,
          customerPhone: newCustomerPhone,
          carModel: newCarModel,
          carNumber: newCarNumber || undefined,
          carYear: newCarYear || undefined,
          mileage: newMileage || undefined,
          region: newRegion || undefined,
          estimatedPrice: newEstimatedPrice ? parseInt(newEstimatedPrice, 10) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '상담 접수에 실패했습니다.');
      }

      setIsAddLeadModalOpen(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCarModel('');
      setNewCarNumber('');
      setNewCarYear('');
      setNewMileage('');
      setNewRegion('');
      setNewEstimatedPrice('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '상담 등록 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar (All controls strictly h-9 aligned) */}
      <div className="p-3.5 rounded-lg bg-white border border-zinc-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="고객명, 차종, 차량번호, 연락처 검색..."
            className="w-full h-9 pl-9 pr-14 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 bg-zinc-50/50 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[11px] text-zinc-400 hover:text-zinc-700 font-medium"
            >
              지우기
            </button>
          )}
        </div>

        {/* Custom Aligned Filter Dropdowns & Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusSelectOptions}
            className="w-full sm:w-40"
            ariaLabel="상담 상태 필터"
          />

          {/* Site Filter */}
          <Select
            value={siteFilter}
            onChange={setSiteFilter}
            options={siteSelectOptions}
            searchable
            searchPlaceholder="접수 사이트 이름 검색..."
            className="w-full sm:w-44"
            ariaLabel="접수 사이트 필터"
          />

          {/* TM Filter */}
          <Select
            value={tmFilter}
            onChange={setTmFilter}
            options={tmSelectOptions}
            searchable
            searchPlaceholder="상담원 이름, 아이디, 순번 검색..."
            className="col-span-2 sm:col-span-1 w-full sm:w-44"
            ariaLabel="담당 상담원 필터"
          />

          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="col-span-2 sm:col-span-1 h-9 px-3 rounded-md border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors whitespace-nowrap"
            >
              필터 초기화
            </button>
          )}

          {/* Manual Add Lead Button */}
          <button
            type="button"
            onClick={() => {
              setNewSiteId(sites[0]?.id || '');
              setIsAddLeadModalOpen(true);
            }}
            className="col-span-2 sm:col-span-1 h-9 px-3.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>+</span>
            <span>상담 직접 등록</span>
          </button>
        </div>
      </div>

      {/* Leads List: Desktop Table (md+) & Mobile Touch Cards (<md) */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
        {/* A. Mobile Touch Card View (<md) */}
        <div className="md:hidden divide-y divide-zinc-200">
          {filteredLeads.length === 0 ? (
            <div className="py-12 px-4 text-center text-zinc-400">
              <p className="text-xs font-semibold text-zinc-600">
                조건에 일치하는 상담 내역이 없습니다.
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                검색어나 필터 조건을 변경하거나 상담을 직접 등록해보세요.
              </p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isRevealed = Boolean(revealedPhones[lead.id]);
              const displayPhone = formatPhone(
                isRevealed ? revealedPhones[lead.id] : lead.phoneMasked
              );
              const isUnassigned = !lead.assignedTmId;

              return (
                <div
                  key={lead.id}
                  className={`p-4 space-y-3 ${
                    isUnassigned ? 'bg-rose-50/20' : ''
                  }`}
                >
                  {/* Top Row: Site + Date + Status */}
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
                    <StatusBadge status={lead.status} size="sm" />
                  </div>

                  {/* Middle Row: Customer Name/Region & Assigned TM */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {lead.customerName}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        {lead.region || '지역 미기재'}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {lead.assignedTm ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 text-xs font-semibold text-zinc-800 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{lead.assignedTm.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300 whitespace-nowrap">
                          미배정
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Spec Box */}
                  <div className="p-2.5 rounded-md bg-zinc-50 border border-zinc-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
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
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 tabular-nums mt-0.5">
                        {lead.carYear && <span>{lead.carYear}년식</span>}
                        {lead.carYear && lead.mileage && <span>&bull;</span>}
                        {lead.mileage && <span>{lead.mileage}</span>}
                      </div>
                    </div>

                    {lead.estimatedPrice && (
                      <span className="text-xs font-mono font-bold text-zinc-900 tabular-nums shrink-0">
                        {lead.estimatedPrice.toLocaleString()}만원
                      </span>
                    )}
                  </div>

                  {/* Bottom Touch Action Row: Phone & Assign/Memo Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      {isRevealed ? (
                        <a
                          href={`tel:${displayPhone.replace(/[^0-9]/g, '')}`}
                          className="h-8 px-2.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-mono text-xs font-bold tabular-nums inline-flex items-center gap-1.5"
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
                            className="h-7 px-2 rounded text-[11px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 whitespace-nowrap"
                          >
                            {revealingId === lead.id ? '확인 중' : '번호보기'}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openAssignModal(lead)}
                        className="h-8 px-2.5 rounded-md text-xs font-semibold bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 border border-zinc-300 transition-colors whitespace-nowrap"
                      >
                        {lead.assignedTmId ? '담당 변경' : 'TM 지정'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDetailModal(lead)}
                        className="h-8 px-2.5 rounded-md text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors tabular-nums whitespace-nowrap"
                      >
                        메모 ({lead.memos?.length || 0})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* B. Desktop Fixed-Column Table (md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500">
                <th className="py-3 px-4 w-28 whitespace-nowrap">접수일시</th>
                <th className="py-3 px-3 w-32 whitespace-nowrap">접수 사이트</th>
                <th className="py-3 px-3 w-24 whitespace-nowrap">고객명</th>
                <th className="py-3 px-4 w-44 whitespace-nowrap">연락처</th>
                <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">차량 사양 / 번호판</th>
                <th className="py-3 px-3 w-32 whitespace-nowrap">지역 / 견적가</th>
                <th className="py-3 px-3 w-36 whitespace-nowrap">담당 TM</th>
                <th className="py-3 px-3 w-28 whitespace-nowrap">상담 상태</th>
                <th className="py-3 px-4 w-40 text-right whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-xs font-semibold text-zinc-500">접수된 상담 내역이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isRevealed = Boolean(revealedPhones[lead.id]);
                  const displayPhone = formatPhone(
                    isRevealed ? revealedPhones[lead.id] : lead.phoneMasked
                  );
                  const isUnassigned = !lead.assignedTmId;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-50/80 transition-colors duration-150 ${
                        isUnassigned ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Created At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-zinc-500 tabular-nums align-middle">
                        {new Date(lead.createdAt).toLocaleDateString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Site Name */}
                      <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {lead.site?.name || '수출 사이트'}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs font-bold text-zinc-900 align-middle">
                        {lead.customerName}
                      </td>

                      {/* Phone with inline Reveal Button (Fixed width cell) */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              isRevealed ? 'text-sky-700 font-bold' : 'text-zinc-600'
                            }`}
                          >
                            {displayPhone}
                          </span>
                          {!isRevealed ? (
                            <button
                              type="button"
                              onClick={() => handleRevealPhone(lead.id)}
                              disabled={revealingId === lead.id}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 transition-colors duration-150 disabled:opacity-50"
                              title="열람 기록 저장 후 전체 번호 확인"
                            >
                              {revealingId === lead.id ? '확인 중' : '번호보기'}
                            </button>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                              열람됨
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Car Info with License Plate Chip */}
                      <td className="py-3.5 px-4 align-middle">
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
                        </div>
                      </td>

                      {/* Region & Price */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs align-middle">
                        <div className="text-zinc-700">{lead.region || '-'}</div>
                        <div className="text-[11px] text-zinc-500 tabular-nums font-mono">
                          {lead.estimatedPrice
                            ? `${lead.estimatedPrice.toLocaleString()}만원`
                            : '-'}
                        </div>
                      </td>

                      {/* Assigned TM */}
                      <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                        {lead.assignedTm ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-zinc-900">
                              {lead.assignedTm.name}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              ({lead.assignType === 'AUTO' ? '자동' : '수동'})
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                            미배정
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap align-middle">
                        <StatusBadge status={lead.status} size="sm" />
                      </td>

                      {/* Actions (Fixed button widths so rows align cleanly) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAssignModal(lead)}
                            className="w-16 py-1 rounded-md text-xs font-semibold bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 border border-zinc-300 transition-colors duration-150 text-center"
                          >
                            {lead.assignedTmId ? '담당 변경' : 'TM 지정'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDetailModal(lead)}
                            className="w-16 py-1 rounded-md text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors duration-150 tabular-nums text-center"
                            title="상담 메모 및 상태 변경"
                          >
                            메모 ({lead.memos?.length || 0})
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      <Modal
        isOpen={Boolean(assignModalLead)}
        onClose={() => setAssignModalLead(null)}
        title="담당 상담원(TM) 직접 배정"
      >
        {assignModalLead && (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">고객명</span>
                <span className="font-bold text-zinc-900">
                  {assignModalLead.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">차량 정보</span>
                <span className="font-semibold text-zinc-800 tabular-nums">
                  {assignModalLead.carModel} ({assignModalLead.carNumber || '번호 미입력'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">현재 담당</span>
                <span className="font-semibold text-sky-700">
                  {assignModalLead.assignedTm?.name || '미배정 (대기 중)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                배정할 상담원 선택
              </label>
              <Select
                value={selectedTargetTmId}
                onChange={setSelectedTargetTmId}
                className="w-full"
                searchable
                searchPlaceholder="상담원 이름, 아이디, 순번 검색..."
                options={tms.map((tm) => ({
                  value: tm.id,
                  label: `${tm.globalOrder}순번 · ${tm.name} (${tm.loginId})`,
                  subLabel: tm.isDbReceiveOn ? '배정 받기 켜짐' : '배정 받기 꺼짐',
                  keywords: `${tm.name} ${tm.loginId} ${tm.globalOrder}`,
                }))}
              />
            </div>

            {/* Consume Turn Checkbox */}
            <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consumeTurn}
                  onChange={(e) => setConsumeTurn(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900">
                    다음 배정 순번 함께 갱신
                  </span>
                  <p className="text-zinc-500 mt-0.5">
                    선택한 상담원의 다음 순번으로 대기열 차례를 넘깁니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setAssignModalLead(null)}
                className="h-9 px-3.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isAssigning ? '배정 중...' : '즉시 배정 확정'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Consultation Memo & Status Modal */}
      <Modal
        isOpen={Boolean(detailModalLead)}
        onClose={() => setDetailModalLead(null)}
        title="상담 메모 및 상태 관리"
        description={`${detailModalLead?.customerName || ''} 고객님 상담 이력 관리`}
        maxWidth="lg"
      >
        {detailModalLead && (
          <form onSubmit={handleSaveMemoAndStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                상담 진행 상태 변경
              </label>
              <Select
                value={selectedLeadStatus}
                onChange={setSelectedLeadStatus}
                className="w-full"
                options={STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-zinc-700 mb-1.5">
                상담 메모 타임라인 ({detailModalLead.memos?.length || 0}건)
              </span>
              <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-zinc-50 rounded-md border border-zinc-200">
                {!detailModalLead.memos || detailModalLead.memos.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">
                    등록된 상담 메모가 없습니다.
                  </p>
                ) : (
                  detailModalLead.memos.map((memo) => (
                    <div
                      key={memo.id}
                      className="p-2.5 rounded-md bg-white border border-zinc-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-700">
                          {memo.author?.name || '작성자'}
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

            <div>
              <label
                htmlFor="newMemoTextarea"
                className="block text-xs font-semibold text-zinc-700 mb-1.5"
              >
                새 상담 메모 입력
              </label>
              <textarea
                id="newMemoTextarea"
                rows={3}
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
                placeholder="상담 통화 내용, 고객 희망 견적, 방문 일정 등을 기록하세요..."
                className="w-full p-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDetailModalLead(null)}
                className="h-9 px-3.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isAddingMemo}
                className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isAddingMemo ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Manual Add Lead Modal */}
      <Modal
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
        title="신규 상담 신청 직접 등록"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLeadSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="createCustName"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                고객명 *
              </label>
              <input
                id="createCustName"
                type="text"
                required
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <div>
              <label
                htmlFor="createCustPhone"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                연락처 *
              </label>
              <input
                id="createCustPhone"
                type="text"
                required
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(formatPhone(e.target.value))}
                placeholder="예: 010-1234-5678"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="createCarModel"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                차종 / 모델 *
              </label>
              <input
                id="createCarModel"
                type="text"
                required
                value={newCarModel}
                onChange={(e) => setNewCarModel(e.target.value)}
                placeholder="예: 현대 아반떼 CN7"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <div>
              <label
                htmlFor="createCarNumber"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                차량 번호
              </label>
              <input
                id="createCarNumber"
                type="text"
                value={newCarNumber}
                onChange={(e) => setNewCarNumber(e.target.value)}
                placeholder="예: 12가 3456"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="createCarYear"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                연식
              </label>
              <input
                id="createCarYear"
                type="text"
                value={newCarYear}
                onChange={(e) => setNewCarYear(e.target.value)}
                placeholder="예: 2021"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="createMileage"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                주행거리
              </label>
              <input
                id="createMileage"
                type="text"
                value={newMileage}
                onChange={(e) => setNewMileage(e.target.value)}
                placeholder="예: 45,000km"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="createRegion"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                지역
              </label>
              <input
                id="createRegion"
                type="text"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                placeholder="예: 서울 강남구"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                접수 사이트
              </label>
              <Select
                value={newSiteId}
                onChange={setNewSiteId}
                className="w-full"
                options={sites.map((site) => ({
                  value: site.id,
                  label: site.name,
                }))}
              />
            </div>
            <div>
              <label
                htmlFor="createEstPrice"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                예상 견적가 (만원)
              </label>
              <input
                id="createEstPrice"
                type="number"
                value={newEstimatedPrice}
                onChange={(e) => setNewEstimatedPrice(e.target.value)}
                placeholder="예: 1850"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(false)}
              className="h-9 px-3.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isCreatingLead}
              className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isCreatingLead ? '등록 및 배정 중...' : '상담 등록 및 자동 배정'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
