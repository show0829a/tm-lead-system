'use client';

import React, { useState, useMemo } from 'react';
import { LeadItem, TmUser, SiteItem } from '../types';
import { StatusBadge, STATUS_OPTIONS } from '../ui/StatusBadge';
import { Modal } from '../ui/Modal';

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
        [leadId]: data.fullPhone || data.phone || '열람 완료',
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
        throw new Error(data.error || 'DB 접수에 실패했습니다.');
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
      alert(err.message || 'DB 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingLead(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="p-3.5 rounded-lg bg-white border border-zinc-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
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
            className="w-full pl-9 pr-14 py-1.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-zinc-50/50 focus:bg-white transition-colors"
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-zinc-300 text-xs font-medium text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 tabular-nums"
            aria-label="상태 필터"
          >
            <option value="ALL">상태 전체 ({leads.length})</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({leads.filter((l) => l.status === opt.value).length})
              </option>
            ))}
          </select>

          {/* Site Filter */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-zinc-300 text-xs font-medium text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            aria-label="사이트 필터"
          >
            <option value="ALL">유입 채널 전체</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          {/* TM Filter */}
          <select
            value={tmFilter}
            onChange={(e) => setTmFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-zinc-300 text-xs font-medium text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 tabular-nums"
            aria-label="상담원 필터"
          >
            <option value="ALL">담당 TM 전체</option>
            <option value="UNASSIGNED">미배정 대기 건만</option>
            {tms.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} (#0{tm.globalOrder}순번)
              </option>
            ))}
          </select>

          {/* Manual Add Lead Button */}
          <button
            type="button"
            onClick={() => {
              setNewSiteId(sites[0]?.id || '');
              setIsAddLeadModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>+</span>
            <span>신규 DB 등록</span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">유입일시</th>
                <th className="py-3 px-3">유입 채널</th>
                <th className="py-3 px-3">고객명</th>
                <th className="py-3 px-4">연락처 (AES-256)</th>
                <th className="py-3 px-4">차량 사양 / 번호판</th>
                <th className="py-3 px-3">지역 / 견적가</th>
                <th className="py-3 px-3">담당 TM</th>
                <th className="py-3 px-3">상담 상태</th>
                <th className="py-3 px-4 text-right">관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-xs font-semibold text-zinc-600">조건에 일치하는 DB가 없습니다.</p>
                      <p className="text-[11px] text-zinc-400">
                        검색어나 상태 필터 조건을 초기화해보세요.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isRevealed = Boolean(revealedPhones[lead.id]);
                  const displayPhone = isRevealed
                    ? revealedPhones[lead.id]
                    : lead.phoneMasked;
                  const isUnassigned = !lead.assignedTmId;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-50/80 transition-colors duration-150 ${
                        isUnassigned ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Created At */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-zinc-500 tabular-nums">
                        {new Date(lead.createdAt).toLocaleDateString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Site Name */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                          {lead.site?.name || '수출 사이트'}
                        </span>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs font-bold text-zinc-900">
                        {lead.customerName}
                      </td>

                      {/* Phone with inline Reveal Button */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              isRevealed ? 'text-sky-700 font-bold' : 'text-zinc-600'
                            }`}
                          >
                            {displayPhone}
                          </span>
                          {!isRevealed && (
                            <button
                              type="button"
                              onClick={() => handleRevealPhone(lead.id)}
                              disabled={revealingId === lead.id}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 transition-colors duration-150 disabled:opacity-50"
                              title="감사 로그 기록 후 원문 열람"
                            >
                              {revealingId === lead.id ? '열람 중...' : '번호보기'}
                            </button>
                          )}
                          {isRevealed && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-medium">
                              LOGGED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Car Info with License Plate Chip */}
                      <td className="py-3 px-4">
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
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 tabular-nums mt-0.5">
                            {lead.carYear && <span>{lead.carYear}년식</span>}
                            {lead.carYear && lead.mileage && <span>&bull;</span>}
                            {lead.mileage && <span>{lead.mileage}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Region & Price */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs">
                        <div className="text-zinc-700">{lead.region || '-'}</div>
                        <div className="text-[11px] text-zinc-500 tabular-nums font-mono">
                          {lead.estimatedPrice
                            ? `${lead.estimatedPrice.toLocaleString()}만원`
                            : '-'}
                        </div>
                      </td>

                      {/* Assigned TM */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {lead.assignedTm ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span className="text-xs font-semibold text-zinc-900">
                              {lead.assignedTm.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              ({lead.assignType === 'AUTO' ? 'AUTO' : 'MANUAL'})
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            UNASSIGNED
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={lead.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openAssignModal(lead)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 border border-zinc-300 transition-colors duration-150"
                          >
                            {lead.assignedTmId ? '담당 변경' : 'TM 지정'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDetailModal(lead)}
                            className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors duration-150 tabular-nums"
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
        title="담당 TM 직접 배정 / 변경"
        description="관리자 권한으로 특정 상담원에게 DB를 직접 할당합니다."
      >
        {assignModalLead && (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">고객명:</span>
                <span className="font-bold text-zinc-900">
                  {assignModalLead.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">차량:</span>
                <span className="font-semibold text-zinc-800 font-mono tabular-nums">
                  {assignModalLead.carModel} ({assignModalLead.carNumber || '번호미입력'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">현재 담당:</span>
                <span className="font-semibold text-sky-700">
                  {assignModalLead.assignedTm?.name || '미배정 (대기 중)'}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="targetTmSelect"
                className="block text-xs font-semibold text-zinc-700 mb-1.5"
              >
                배정할 상담원 선택
              </label>
              <select
                id="targetTmSelect"
                value={selectedTargetTmId}
                onChange={(e) => setSelectedTargetTmId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white tabular-nums"
              >
                {tms.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    #{tm.globalOrder}순번: {tm.name} ({tm.loginId}) -{' '}
                    {tm.isDbReceiveOn ? 'DB수신 ON' : 'DB수신 OFF'}
                  </option>
                ))}
              </select>
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
                  <span className="font-bold text-zinc-900">
                    자동 배분 순번 1회 소모 (체크 시 다음 순번으로 포인터 이동)
                  </span>
                  <p className="text-zinc-500 mt-0.5 leading-relaxed">
                    체크 시: 다음 자동 배분 포인터(NEXT)가 선택한 TM의 다음 순번으로 자동 이동합니다.
                    <br />
                    체크 해제 시: 기존 자동 순번 포인터를 변경하지 않고 유지합니다.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setAssignModalLead(null)}
                className="px-3.5 py-2 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isAssigning}
                className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
              <label
                htmlFor="leadStatusSelect"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                상담 진행 상태 변경
              </label>
              <select
                id="leadStatusSelect"
                value={selectedLeadStatus}
                onChange={(e) => setSelectedLeadStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>
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
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                새 상담 메모 입력
              </label>
              <textarea
                id="newMemoTextarea"
                rows={3}
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
                placeholder="상담 통화 내용, 고객 희망 견적, 방문 일정 등을 기록하세요..."
                className="w-full p-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setDetailModalLead(null)}
                className="px-3.5 py-2 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={isAddingMemo}
                className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
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
        title="신규 고객 DB 직접 등록"
        description="유선 인바운드 또는 오프라인 접수 DB를 시스템에 등록하여 자동 배분합니다."
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="예: 010-1234-5678"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="createSiteSelect"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                유입 사이트 채널
              </label>
              <select
                id="createSiteSelect"
                value={newSiteId}
                onChange={(e) => setNewSiteId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.domainUrl})
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(false)}
              className="px-3.5 py-2 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isCreatingLead}
              className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isCreatingLead ? '등록 및 배분 중...' : 'DB 등록 및 자동 배분'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
