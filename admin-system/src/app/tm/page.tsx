'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CurrentUser, LeadItem } from '@/components/types';
import { TmHeader } from '@/components/tm/TmHeader';
import { TmLeadsView } from '@/components/tm/TmLeadsView';

export default function TmWorkspacePage() {
  const router = useRouter();

  // Session & Auth
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Assigned Leads
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Leads for this TM
  const loadTmLeads = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/tm/leads');
      if (!res.ok) {
        throw new Error('리드 목록을 불러오지 못했습니다.');
      }
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err: any) {
      setErrorMsg(err.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

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

  // Handle Switch Toggles (DB Receive, SMS Receive)
  const handleStatusChange = async (
    field: 'isDbReceiveOn' | 'isSmsReceiveOn',
    nextValue: boolean
  ) => {
    if (!currentUser) return;

    // Optimistic Update
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
      if (data.user) {
        setCurrentUser((prev) => ({ ...prev, ...data.user }));
      }
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
          <p className="text-xs font-mono text-zinc-500">TM_WORKSPACE_LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Sticky Top Bar */}
      <TmHeader
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={isUpdatingStatus}
        onRefresh={loadTmLeads}
        isRefreshing={isRefreshing}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Off State Warning Banners */}
        {currentUser && !currentUser.isDbReceiveOn && (
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
              <strong className="font-bold">내 DB 배정 수신이 [OFF] 상태입니다. (현재 자동 배분에서 제외됩니다)</strong>
              <p className="text-amber-800 mt-0.5">
                신규 고객 DB가 유입되어도 순번에서 자동으로 건너뛰어 다음 상담원에게 배정됩니다.
                상담 재개 시 상단의 스위치를 [ON]으로 전환해주세요.
              </p>
            </div>
          </div>
        )}

        {currentUser && !currentUser.isSmsReceiveOn && (
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
              SMS 문자 알림이 [OFF] 상태입니다. DB는 정상 배정되며 휴대폰 문자만 발송되지 않습니다.
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

        {/* Assigned Leads View */}
        <TmLeadsView leads={leads} onRefresh={loadTmLeads} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-3.5 text-center text-[11px] text-zinc-400 font-mono">
        TM CONSULTATION WORKSPACE &bull; ISOLATED LEAD ACCESS &bull; AES-256-GCM AUDIT LOGGED
      </footer>
    </div>
  );
}
