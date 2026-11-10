'use client';

import React, { useState } from 'react';
import { TmUser, SystemConfig } from '../types';
import { Switch } from '../ui/Switch';
import { Modal } from '../ui/Modal';

interface AllocationTabProps {
  tms: TmUser[];
  config: SystemConfig | null;
  onRefresh: () => void;
}

export function AllocationTab({ tms, config, onRefresh }: AllocationTabProps) {
  const [updatingTmId, setUpdatingTmId] = useState<string | null>(null);
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
      alert(err.message || 'DB 수신 설정 변경에 실패했습니다.');
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
      alert(err.message || 'SMS 수신 설정 변경에 실패했습니다.');
      setLocalTms((prev) =>
        prev.map((t) => (t.id === tm.id ? { ...t, isSmsReceiveOn: tm.isSmsReceiveOn } : t))
      );
    } finally {
      setUpdatingTmId(null);
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
        throw new Error('포인터 변경 실패');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || '다음 배정 차례 포인터 변경 중 오류가 발생했습니다.');
      setLocalPointerId(config?.nextGlobalTmId || null);
    } finally {
      setIsSettingPointer(null);
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
        throw new Error(data.error || 'TM 등록에 실패했습니다.');
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

  return (
    <div className="space-y-4">
      {/* Overview Header Bar */}
      <div className="p-4 rounded-lg bg-white border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
              통합 순번 대기열 & 실시간 배분 포인터 제어
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 font-semibold border border-zinc-200 tabular-nums">
              QUEUE: {sortedTms.length}명
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            신규 DB 접수 시 <strong className="text-sky-700 font-mono">NEXT</strong> 포인터 위치의 상담원부터 순차 배정됩니다.
            DB 수신이 OFF인 상담원은 자동으로 건너뜁니다(Skip).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewOrder(sortedTms.length + 1);
            setIsAddTmModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 shrink-0"
        >
          <span>+</span>
          <span>신규 상담원(TM) 등록</span>
        </button>
      </div>

      {/* TM Cards Queue */}
      <div className="space-y-2.5">
        {sortedTms.map((tm, idx) => {
          const isPointer = localPointerId === tm.id;
          const isFirst = idx === 0;
          const isLast = idx === sortedTms.length - 1;

          return (
            <div
              key={tm.id}
              className={`p-4 rounded-lg border transition-colors duration-150 ${
                isPointer
                  ? 'ring-2 ring-sky-600 bg-sky-50/30 border-sky-300 shadow-2xs'
                  : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Left: Order, Reorder buttons, Pointer badge, User info */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(idx, 'UP')}
                      className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-100 text-[10px]"
                      title="순번 올리기"
                      aria-label="순번 올리기"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(idx, 'DOWN')}
                      className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 disabled:opacity-30 disabled:hover:bg-zinc-100 text-[10px]"
                      title="순번 내리기"
                      aria-label="순번 내리기"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Order Number Badge */}
                  <div
                    className={`flex items-center justify-center w-12 h-10 rounded-md font-mono font-bold text-xs tabular-nums border ${
                      isPointer
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-zinc-900 text-white border-zinc-950'
                    }`}
                  >
                    #{String(tm.globalOrder).padStart(2, '0')}
                  </div>

                  {/* User Profile */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">
                        {tm.name}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono tabular-nums">
                        ({tm.loginId})
                      </span>
                      {isPointer && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-600 text-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          <span>NEXT (다음 배정 차례)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-zinc-500 mt-0.5">
                      {tm.phone && (
                        <span className="tabular-nums font-mono">
                          연락처: {tm.phone}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span className="font-mono text-[11px]">
                        순번: {tm.globalOrder}순번
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Switch Toggles & Set Pointer Button */}
                <div className="flex items-center gap-4 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-200 flex-wrap">
                  {/* DB Receive Switch */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] font-semibold text-zinc-600">
                      DB 배정 수신
                    </span>
                    <Switch
                      checked={tm.isDbReceiveOn}
                      onChange={(next) => handleToggleDbReceive(tm, next)}
                      disabled={updatingTmId === tm.id}
                      size="sm"
                    />
                    <span className="text-[10px] font-mono text-zinc-400">
                      {tm.isDbReceiveOn ? 'ACTIVE (정상 배정)' : 'SKIPPED (건너뜀)'}
                    </span>
                  </div>

                  {/* SMS Receive Switch */}
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] font-semibold text-zinc-600">
                      SMS 문자 알림
                    </span>
                    <Switch
                      checked={tm.isSmsReceiveOn}
                      onChange={(next) => handleToggleSmsReceive(tm, next)}
                      disabled={updatingTmId === tm.id}
                      size="sm"
                    />
                    <span className="text-[10px] font-mono text-zinc-400">
                      {tm.isSmsReceiveOn ? 'SMS ON (발송)' : 'MUTED (발송생략)'}
                    </span>
                  </div>

                  {/* Set As Next Pointer Button */}
                  <div className="pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleSetPointer(tm.id)}
                      disabled={isPointer || isSettingPointer === tm.id}
                      className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors duration-150 ${
                        isPointer
                          ? 'bg-zinc-100 text-zinc-400 cursor-default border border-zinc-200 font-mono'
                          : 'bg-white hover:bg-sky-600 hover:text-white hover:border-sky-600 text-zinc-800 border border-zinc-300'
                      }`}
                    >
                      {isPointer
                        ? '현재 배정 차례 (NEXT)'
                        : isSettingPointer === tm.id
                        ? '설정 중...'
                        : '다음 차례로 지정'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New TM Modal */}
      <Modal
        isOpen={isAddTmModalOpen}
        onClose={() => setIsAddTmModalOpen(false)}
        title="신규 상담원(TM) 계정 등록"
        description="통합 순번 배분 대기열에 새로운 상담원을 추가합니다."
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

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="tmPasswordInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                비밀번호 *
              </label>
              <input
                id="tmPasswordInput"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="tmPhoneInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                휴대폰 번호 (SMS 수신용)
              </label>
              <input
                id="tmPhoneInput"
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="예: 010-9999-8888"
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="tmOrderInput"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                배분 순번 (globalOrder)
              </label>
              <input
                id="tmOrderInput"
                type="number"
                min={1}
                value={newOrder}
                onChange={(e) => setNewOrder(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAddTmModalOpen(false)}
              className="px-3.5 py-2 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmittingTm}
              className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isSubmittingTm ? '등록 중...' : '상담원 등록 완료'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
