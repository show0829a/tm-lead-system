'use client';

import React, { useState } from 'react';
import { TmUser, SystemConfig } from '../types';
import { Switch } from '../ui/Switch';
import { Modal } from '../ui/Modal';
import { formatPhone } from '../ui/format';

interface AllocationTabProps {
  tms: TmUser[];
  config: SystemConfig | null;
  onRefresh: () => void;
}

export function AllocationTab({ tms, config, onRefresh }: AllocationTabProps) {
  const [updatingTmId, setUpdatingTmId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);
  const [isSettingPointer, setIsSettingPointer] = useState<string | null>(null);

  // New TM Modal State
  const [isAddTmModalOpen, setIsAddTmModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOrder, setNewOrder] = useState<number>(tms.length + 1);
  const [isSubmittingTm, setIsSubmittingTm] = useState(false);

  // Optimistic local state
  const [localTms, setLocalTms] = useState<TmUser[]>(tms);
  const [tmSearch, setTmSearch] = useState('');
  const [tmReceiveFilter, setTmReceiveFilter] = useState<'ALL' | 'ON' | 'OFF'>('ALL');

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [localPointerId, setLocalPointerId] = useState<string | null>(
    config?.nextGlobalTmId || null
  );

  // Sync if props update
  React.useEffect(() => {
    setLocalTms(tms);
  }, [tms]);

  React.useEffect(() => {
    if (config?.nextGlobalTmId) {
      setLocalPointerId(config.nextGlobalTmId);
    }
  }, [config?.nextGlobalTmId]);

  // Toggle DB Receive Switch
  const handleToggleDbReceive = async (tm: TmUser, nextState: boolean) => {
    setUpdatingTmId(tm.id);
    setLocalTms((prev) =>
      prev.map((t) => (t.id === tm.id ? { ...t, isDbReceiveOn: nextState } : t))
    );

    try {
      const res = await fetch(`/api/admin/tms/${tm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDbReceiveOn: nextState }),
      });
      if (!res.ok) {
        throw new Error('상태 변경 실패');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || '상담 배정 수신 설정 변경에 실패했습니다.');
      setLocalTms((prev) =>
        prev.map((t) => (t.id === tm.id ? { ...t, isDbReceiveOn: tm.isDbReceiveOn } : t))
      );
    } finally {
      setUpdatingTmId(null);
    }
  };

  // Toggle SMS Receive Switch
  const handleToggleSmsReceive = async (tm: TmUser, nextState: boolean) => {
    setUpdatingTmId(tm.id);
    setLocalTms((prev) =>
      prev.map((t) => (t.id === tm.id ? { ...t, isSmsReceiveOn: nextState } : t))
    );

    try {
      const res = await fetch(`/api/admin/tms/${tm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSmsReceiveOn: nextState }),
      });
      if (!res.ok) {
        throw new Error('상태 변경 실패');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || '문자 알림 수신 설정 변경에 실패했습니다.');
      setLocalTms((prev) =>
        prev.map((t) => (t.id === tm.id ? { ...t, isSmsReceiveOn: tm.isSmsReceiveOn } : t))
      );
    } finally {
      setUpdatingTmId(null);
    }
  };

  // Bulk Toggle DB or SMS for all TMs
  const handleBulkToggle = async (
    field: 'isDbReceiveOn' | 'isSmsReceiveOn',
    targetValue: boolean
  ) => {
    setIsBulkUpdating(true);
    const prevTms = [...localTms];
    setLocalTms((prev) => prev.map((t) => ({ ...t, [field]: targetValue })));

    try {
      await Promise.all(
        localTms.map((tm) =>
          fetch(`/api/admin/tms/${tm.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: targetValue }),
          })
        )
      );
      onRefresh();
    } catch (e) {
      alert('일괄 상태 변경 중 오류가 발생했습니다.');
      setLocalTms(prevTms);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Set as Next Pointer
  const handleSetPointer = async (tmId: string) => {
    setIsSettingPointer(tmId);
    setLocalPointerId(tmId);

    try {
      const res = await fetch('/api/admin/allocation/pointer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextGlobalTmId: tmId }),
      });
      if (!res.ok) {
        throw new Error('배정 차례 변경 실패');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || '배정 차례 변경 중 오류가 발생했습니다.');
      setLocalPointerId(config?.nextGlobalTmId || null);
    } finally {
      setIsSettingPointer(null);
    }
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox compatibility
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Avoid flicker
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentSorted = [...localTms].sort((a, b) => a.globalOrder - b.globalOrder);
    const itemToMove = currentSorted[draggedIndex];
    if (!itemToMove) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Splice and reorder
    const nextList = [...currentSorted];
    nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, itemToMove);

    // Calculate updated orders
    const updates: { id: string; globalOrder: number }[] = [];
    const reorderedWithOrders = nextList.map((tm, idx) => {
      const newOrder = idx + 1;
      if (tm.globalOrder !== newOrder) {
        updates.push({ id: tm.id, globalOrder: newOrder });
      }
      return { ...tm, globalOrder: newOrder };
    });

    setLocalTms(reorderedWithOrders);
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (updates.length > 0) {
      setIsReordering(true);
      try {
        await Promise.all(
          updates.map((u) =>
            fetch(`/api/admin/tms/${u.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ globalOrder: u.globalOrder }),
            })
          )
        );
        onRefresh();
      } catch (err: any) {
        alert(err.message || '순번 저장 중 오류가 발생했습니다.');
        onRefresh();
      } finally {
        setIsReordering(false);
      }
    }
  };

  // Move TM Order Up / Down
  const handleMoveOrder = async (tmIndex: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? tmIndex - 1 : tmIndex + 1;
    if (targetIndex < 0 || targetIndex >= localTms.length) return;

    const sourceTm = localTms[tmIndex];
    const targetTm = localTms[targetIndex];

    const sourceNewOrder = targetTm.globalOrder;
    const targetNewOrder = sourceTm.globalOrder;

    const nextList = [...localTms];
    nextList[tmIndex] = { ...sourceTm, globalOrder: sourceNewOrder };
    nextList[targetIndex] = { ...targetTm, globalOrder: targetNewOrder };
    nextList.sort((a, b) => a.globalOrder - b.globalOrder);
    setLocalTms(nextList);

    try {
      await Promise.all([
        fetch(`/api/admin/tms/${sourceTm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ globalOrder: sourceNewOrder }),
        }),
        fetch(`/api/admin/tms/${targetTm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ globalOrder: targetNewOrder }),
        }),
      ]);
      onRefresh();
    } catch (e) {
      alert('순번 변경에 실패했습니다.');
      onRefresh();
    }
  };

  // Create New TM
  const handleCreateTmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLoginId.trim() || !newPassword.trim()) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setIsSubmittingTm(true);
    try {
      const res = await fetch('/api/admin/tms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          loginId: newLoginId.trim(),
          password: newPassword.trim(),
          phone: newPhone.trim() || undefined,
          globalOrder: Number(newOrder),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '상담원 등록에 실패했습니다.');
      }

      setIsAddTmModalOpen(false);
      setNewName('');
      setNewLoginId('');
      setNewPassword('');
      setNewPhone('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '등록 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingTm(false);
    }
  };

  const sortedTms = [...localTms].sort((a, b) => a.globalOrder - b.globalOrder);
  const allDbOn = sortedTms.length > 0 && sortedTms.every((t) => t.isDbReceiveOn);
  const allSmsOn = sortedTms.length > 0 && sortedTms.every((t) => t.isSmsReceiveOn);

  // TM search & receive-status filter (for large teams)
  const isTmFiltering = tmSearch.trim() !== '' || tmReceiveFilter !== 'ALL';
  const matchesTmFilter = (tm: TmUser) => {
    if (tmReceiveFilter === 'ON' && !tm.isDbReceiveOn) return false;
    if (tmReceiveFilter === 'OFF' && tm.isDbReceiveOn) return false;
    const q = tmSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      tm.name.toLowerCase().includes(q) ||
      tm.loginId.toLowerCase().includes(q) ||
      String(tm.globalOrder) === q.replace('순번', '').trim()
    );
  };
  const visibleTmCount = sortedTms.filter(matchesTmFilter).length;

  return (
    <div className="space-y-4">
      {/* Unified Ledger Container */}
      <div className="bg-white border border-zinc-200 rounded-lg shadow-2xs overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-zinc-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900">
                상담원(TM) 배정 순번 및 수신 상태 관리
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium tabular-nums">
                총 {sortedTms.length}명
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              신규 상담 접수 시 현재 차례부터 순서대로 자동 배정됩니다.
            </p>
          </div>

          {/* Bulk Controls & Add TM Button */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
            <div className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
              <span className="px-2.5 py-1 text-zinc-500 font-medium">상담 배정 일괄:</span>
              <button
                type="button"
                disabled={isBulkUpdating || allDbOn}
                onClick={() => handleBulkToggle('isDbReceiveOn', true)}
                className="px-2.5 py-1 rounded-xs font-medium text-zinc-700 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-colors"
              >
                전체 켜기
              </button>
              <button
                type="button"
                disabled={isBulkUpdating || sortedTms.every((t) => !t.isDbReceiveOn)}
                onClick={() => handleBulkToggle('isDbReceiveOn', false)}
                className="px-2.5 py-1 rounded-xs font-medium text-zinc-700 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-colors"
              >
                전체 끄기
              </button>
            </div>

            <div className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs">
              <span className="px-2.5 py-1 text-zinc-500 font-medium">문자 알림 일괄:</span>
              <button
                type="button"
                disabled={isBulkUpdating || allSmsOn}
                onClick={() => handleBulkToggle('isSmsReceiveOn', true)}
                className="px-2.5 py-1 rounded-xs font-medium text-zinc-700 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-colors"
              >
                전체 켜기
              </button>
              <button
                type="button"
                disabled={isBulkUpdating || sortedTms.every((t) => !t.isSmsReceiveOn)}
                onClick={() => handleBulkToggle('isSmsReceiveOn', false)}
                className="px-2.5 py-1 rounded-xs font-medium text-zinc-700 hover:bg-white hover:shadow-2xs disabled:opacity-40 transition-colors"
              >
                전체 끄기
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewOrder(sortedTms.length + 1);
                setIsAddTmModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors duration-150 shrink-0"
            >
              + 신규 상담원(TM) 등록
            </button>
          </div>
        </div>

        {/* TM Search & Status Filter Bar */}
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={tmSearch}
              onChange={(e) => setTmSearch(e.target.value)}
              placeholder="상담원 이름, 아이디, 순번 검색..."
              className="w-full h-9 pl-9 pr-12 rounded-md border border-zinc-300 bg-white text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
            {tmSearch && (
              <button
                type="button"
                onClick={() => setTmSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[11px] text-zinc-400 hover:text-zinc-700 font-medium"
              >
                지우기
              </button>
            )}
          </div>
          <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white p-0.5 text-xs self-start sm:self-auto">
            {([
              { key: 'ALL', label: '전체' },
              { key: 'ON', label: '배정 받는 중' },
              { key: 'OFF', label: '배정 꺼짐' },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setTmReceiveFilter(opt.key)}
                className={`h-8 px-3 rounded-xs font-medium whitespace-nowrap transition-colors ${
                  tmReceiveFilter === opt.key
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isTmFiltering && (
            <span className="text-[11px] text-zinc-500 sm:ml-auto tabular-nums whitespace-nowrap">
              {visibleTmCount}명 표시 중 · 검색 중에는 순번 이동(▲▼)이 잠깁니다
            </span>
          )}
        </div>

        {/* Strictly Aligned Fixed-Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-semibold text-zinc-500">
                <th className="py-2.5 px-4 w-28">배정 순번</th>
                <th className="py-2.5 px-4">상담원(TM) 정보</th>
                <th className="py-2.5 px-4 w-40">연락처</th>
                <th className="py-2.5 px-4 w-44">신규 상담 배정</th>
                <th className="py-2.5 px-4 w-44">휴대폰 문자 알림</th>
                <th className="py-2.5 px-4 w-36 text-right">배정 차례</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs">
              {isTmFiltering && visibleTmCount === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-zinc-400">
                    조건에 일치하는 상담원이 없습니다.
                  </td>
                </tr>
              )}
              {sortedTms.map((tm, idx) => {
                if (!matchesTmFilter(tm)) return null;
                const isPointer = localPointerId === tm.id;
                const isFirst = idx === 0 || isTmFiltering;
                const isLast = idx === sortedTms.length - 1 || isTmFiltering;
                const isDraggingThis = draggedIndex === idx;
                const isDragOverThis = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <tr
                    key={tm.id}
                    draggable={!isTmFiltering && !isReordering}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-150 ${
                      isDraggingThis
                        ? 'opacity-30 bg-zinc-200'
                        : isDragOverThis
                        ? 'bg-sky-50 ring-2 ring-inset ring-zinc-900'
                        : isPointer
                        ? 'bg-zinc-50/90'
                        : 'bg-white hover:bg-zinc-50/70'
                    }`}
                  >
                    {/* 1. Order & Up/Down + Drag Grip Handle */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        {/* Drag Handle Grip Icon */}
                        <div
                          className={`p-1 rounded text-zinc-400 hover:text-zinc-900 transition-colors select-none ${
                            isTmFiltering || isReordering
                              ? 'opacity-20 cursor-not-allowed'
                              : 'cursor-grab active:cursor-grabbing hover:bg-zinc-100'
                          }`}
                          title={
                            isTmFiltering
                              ? '검색 중 순번 이동 잠김'
                              : '순번 이동'
                          }
                          aria-label="순번 드래그 핸들"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="8.5" cy="6" r="1.5" />
                            <circle cx="15.5" cy="6" r="1.5" />
                            <circle cx="8.5" cy="12" r="1.5" />
                            <circle cx="15.5" cy="12" r="1.5" />
                            <circle cx="8.5" cy="18" r="1.5" />
                            <circle cx="15.5" cy="18" r="1.5" />
                          </svg>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveOrder(idx, 'UP')}
                            className="w-5 h-4 flex items-center justify-center rounded-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 disabled:opacity-30 text-[9px] leading-none"
                            title="순번 위로 이동"
                            aria-label="순번 위로 이동"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveOrder(idx, 'DOWN')}
                            className="w-5 h-4 flex items-center justify-center rounded-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 disabled:opacity-30 text-[9px] leading-none"
                            title="순번 아래로 이동"
                            aria-label="순번 아래로 이동"
                          >
                            ▼
                          </button>
                        </div>
                        <span
                          className={`inline-flex items-center justify-center w-12 h-7 rounded text-xs font-bold tabular-nums border ${
                            isPointer
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {tm.globalOrder}순번
                        </span>
                      </div>
                    </td>

                    {/* 2. TM Name & ID */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">
                          {tm.name}
                        </span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          ({tm.loginId})
                        </span>
                        {!tm.isDbReceiveOn && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
                            배정 제외 중
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Phone */}
                    <td className="py-3.5 px-4 align-middle font-mono tabular-nums text-zinc-600">
                      {formatPhone(tm.phoneMasked || tm.phone) || '-'}
                    </td>

                    {/* 4. DB Receive Switch (Fixed column alignment) */}
                    <td className="py-3.5 px-4 align-middle">
                      <Switch
                        checked={tm.isDbReceiveOn}
                        onChange={(next) => handleToggleDbReceive(tm, next)}
                        disabled={updatingTmId === tm.id || isBulkUpdating}
                        size="sm"
                      />
                    </td>

                    {/* 5. SMS Receive Switch (Fixed column alignment) */}
                    <td className="py-3.5 px-4 align-middle">
                      <Switch
                        checked={tm.isSmsReceiveOn}
                        onChange={(next) => handleToggleSmsReceive(tm, next)}
                        disabled={updatingTmId === tm.id || isBulkUpdating}
                        size="sm"
                      />
                    </td>

                    {/* 6. Next Turn Action (Fixed width button so layout never shifts) */}
                    <td className="py-3.5 px-4 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => handleSetPointer(tm.id)}
                        disabled={isPointer || isSettingPointer === tm.id}
                        className={`w-28 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 text-center ${
                          isPointer
                            ? 'bg-zinc-900 text-white border border-zinc-900 cursor-default'
                            : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300'
                        }`}
                      >
                        {isPointer
                          ? '현재 배정 차례'
                          : isSettingPointer === tm.id
                          ? '변경 중...'
                          : '차례 지정'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New TM Modal */}
      <Modal
        isOpen={isAddTmModalOpen}
        onClose={() => setIsAddTmModalOpen(false)}
        title="신규 상담원(TM) 계정 등록"
      >
        <form onSubmit={handleCreateTmSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="tmNameInput"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              상담원 이름 *
            </label>
            <input
              id="tmNameInput"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="예: 상담원 5 (박과장)"
              className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tmLoginIdInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                로그인 아이디 *
              </label>
              <input
                id="tmLoginIdInput"
                type="text"
                required
                value={newLoginId}
                onChange={(e) => setNewLoginId(e.target.value)}
                placeholder="예: tm5"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label
                htmlFor="tmPassInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                초기 비밀번호 *
              </label>
              <input
                id="tmPassInput"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tmPhoneInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                문자 알림 받을 휴대폰 번호
              </label>
              <input
                id="tmPhoneInput"
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label
                htmlFor="tmOrderInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                배정 순번 (숫자)
              </label>
              <input
                id="tmOrderInput"
                type="number"
                min={1}
                required
                value={newOrder}
                onChange={(e) => setNewOrder(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAddTmModalOpen(false)}
              className="px-4 py-2 rounded-md border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmittingTm}
              className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isSubmittingTm ? '등록 중...' : '상담원 등록'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
