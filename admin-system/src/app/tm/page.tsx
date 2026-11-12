'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CurrentUser, LeadItem, TmUser } from '@/components/types';
import { TmHeader } from '@/components/tm/TmHeader';
import { TmLeadsView } from '@/components/tm/TmLeadsView';
import { DebugModeToggleBar } from '@/components/ui/DebugMode';

export default function TmWorkspacePage() {
  const router = useRouter();

  // Session & Auth
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Admin preview: list of TMs & selected TM perspective
  const [tms, setTms] = useState<TmUser[]>([]);
  const [selectedTmId, setSelectedTmId] = useState<string>('ALL');

  // Assigned Leads
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Leads for this TM (or filtered TM when Admin is previewing)
  const loadTmLeads = useCallback(async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const query =
        currentUser.role === 'ADMIN' && selectedTmId !== 'ALL'
          ? `?tmId=${encodeURIComponent(selectedTmId)}`
          : '';

      const fetches: Promise<Response | null>[] = [
        fetch(`/api/tm/leads${query}`).catch(() => null),
      ];

      if (currentUser.role === 'ADMIN') {
        fetches.push(fetch('/api/admin/allocation').catch(() => null));
      }

      const [leadsRes, allocRes] = await Promise.all(fetches);

      if (!leadsRes || !leadsRes.ok) {
        throw new Error('상담 목록을 불러오지 못했습니다.');
      }
      const data = await leadsRes.json();
      setLeads(data.leads || []);

      if (allocRes && allocRes.ok) {
        const allocData = await allocRes.json();
        setTms(allocData.tms || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, selectedTmId]);

  // 1. Verify Session on Mount
  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (e) {
        router.replace('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    }

    verifySession();
  }, [router]);

  // 2. Fetch Assigned Leads once User is verified
  useEffect(() => {
    if (currentUser) {
      loadTmLeads();
    }
  }, [currentUser, loadTmLeads]);

  // Determine the active target user (self for TM, or selected TM for Admin)
  const activeTargetUser = useMemo<CurrentUser | TmUser | null>(() => {
    if (!currentUser) return null;
    if (currentUser.role === 'ADMIN') {
      if (selectedTmId === 'ALL') return null;
      return tms.find((t) => t.id === selectedTmId) || null;
    }
    return currentUser;
  }, [currentUser, selectedTmId, tms]);

  // Handle Switch Toggles (DB Receive, SMS Receive)
  const handleStatusChange = async (
    field: 'isDbReceiveOn' | 'isSmsReceiveOn',
    nextValue: boolean
  ) => {
    if (!currentUser) return;

    // Case A: Admin toggling a selected TM's status
    if (currentUser.role === 'ADMIN') {
      if (selectedTmId === 'ALL') return;
      const prevTms = [...tms];
      setTms((prev) =>
        prev.map((t) => (t.id === selectedTmId ? { ...t, [field]: nextValue } : t))
      );
      setIsUpdatingStatus(true);
      try {
        const res = await fetch(`/api/admin/tms/${selectedTmId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: nextValue }),
        });
        if (!res.ok) throw new Error('상담원 상태 변경에 실패했습니다.');
      } catch (err: any) {
        alert(err.message || '설정 저장 중 오류가 발생했습니다.');
        setTms(prevTms);
      } finally {
        setIsUpdatingStatus(false);
      }
      return;
    }

    // Case B: TM toggling their own status
    const prevUser = { ...currentUser };
    setCurrentUser((prev) => (prev ? { ...prev, [field]: nextValue } : null));
    setIsUpdatingStatus(true);

    try {
      const res = await fetch('/api/tm/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: nextValue }),
      });

      if (!res.ok) {
        throw new Error('상태 변경에 실패했습니다.');
      }

      const data = await res.json();
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              isDbReceiveOn: data.isDbReceiveOn ?? prev.isDbReceiveOn,
              isSmsReceiveOn: data.isSmsReceiveOn ?? prev.isSmsReceiveOn,
            }
          : null
      );
    } catch (err: any) {
      alert(err.message || '설정 저장 중 오류가 발생했습니다.');
      setCurrentUser(prevUser); // Rollback
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500">상담원 화면을 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Sticky Top Bar */}
      <TmHeader
        currentUser={currentUser}
        activeTargetUser={activeTargetUser}
        tms={tms}
        selectedTmId={selectedTmId}
        onSelectTmId={setSelectedTmId}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={isUpdatingStatus}
        onRefresh={loadTmLeads}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Off State Warning Banners (Only when viewing a specific TM or logged in as TM) */}
        {activeTargetUser && !activeTargetUser.isDbReceiveOn && (
          <div className="mb-4 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
            <svg
              className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <strong className="font-bold">
                신규 상담 배정 받기가 꺼져 있습니다. (현재 자동 배정에서 제외 중)
              </strong>
              <p className="text-amber-800 mt-0.5">
                새로운 고객 상담이 접수되어도 내 차례를 자동으로 건너뛰고 다음 상담원에게 배정됩니다.
                상담을 다시 받으시려면 상단의 스위치를 켜주세요.
              </p>
            </div>
          </div>
        )}

        {activeTargetUser && !activeTargetUser.isSmsReceiveOn && (
          <div className="mb-4 p-3 rounded-lg bg-white border border-zinc-200 text-zinc-700 text-xs flex items-center gap-2">
            <svg
              className="w-4 h-4 text-zinc-500 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              휴대폰 문자 알림이 꺼져 있습니다. 상담 건은 정상 배정되며 휴대폰 문자 알림만 생략됩니다.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={loadTmLeads} className="underline font-bold">
              다시 시도
            </button>
          </div>
        )}

        {/* Assigned Leads Dashboard & Table View */}
        <TmLeadsView leads={leads} onRefresh={loadTmLeads} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-3.5 text-center text-xs text-zinc-400">
        고객 상담 자동 배정 및 통합 관리 시스템 &bull; 상담원(TM) 전용 화면
      </footer>

      {/* Floating Debug Mode Toggle */}
      <DebugModeToggleBar />
    </div>
  );
}
