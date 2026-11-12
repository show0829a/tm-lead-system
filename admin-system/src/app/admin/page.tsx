'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CurrentUser,
  LeadItem,
  TmUser,
  SiteItem,
  SmsLogItem,
  SystemConfig,
} from '@/components/types';
import { AdminHeader, getAdminNavItems, AdminTabKey } from '@/components/admin/AdminHeader';
import { SummaryCards } from '@/components/admin/SummaryCards';
import { LeadsTab } from '@/components/admin/LeadsTab';
import { AllocationTab } from '@/components/admin/AllocationTab';
import { SitesTab } from '@/components/admin/SitesTab';
import { SimulatorTab } from '@/components/admin/SimulatorTab';
import { useDebugMode, DebugModeToggleBar } from '@/components/ui/DebugMode';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isDebugMode] = useDebugMode();

  // Auth & Session
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<AdminTabKey>('leads');
  const [leadsFilterInitial, setLeadsFilterInitial] = useState<string>('ALL');

  // Support direct tab linking via ?tab= URL query
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTabKey;
      if (tabParam && ['leads', 'allocation', 'sites', 'simulator'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Dashboard Data State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [tms, setTms] = useState<TmUser[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load All Dashboard Data (Parallel Fetching)
  const loadDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setDataError(null);

    try {
      const [leadsRes, allocRes, sitesRes, smsRes] = await Promise.all([
        fetch('/api/admin/leads?limit=100').catch(() => null),
        fetch('/api/admin/allocation').catch(() => null),
        fetch('/api/admin/sites').catch(() => null),
        fetch('/api/admin/sms-logs?limit=50').catch(() => null),
      ]);

      if (leadsRes && leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads || []);
      }

      if (allocRes && allocRes.ok) {
        const data = await allocRes.json();
        setConfig(data.config || null);
        setTms(data.tms || []);
      }

      if (sitesRes && sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(data.sites || []);
      }

      if (smsRes && smsRes.ok) {
        const data = await smsRes.json();
        setSmsLogs(data.smsLogs || []);
      }
    } catch (err: any) {
      setDataError(err.message || '데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 1. Check Authentication on Mount
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'ADMIN') {
          if (data.user?.role === 'TM') {
            router.replace('/tm');
            return;
          }
          router.replace('/login');
          return;
        }
        setCurrentUser(data.user);
      } catch (e) {
        router.replace('/login');
        return;
      } finally {
        setAuthLoading(false);
      }
    }

    verifyAuth();
  }, [router]);

  // 2. Fetch Data once Authenticated
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, loadDashboardData]);

  // Derived Summary Metrics
  const { totalLeads, todayLeads, unassignedLeads, nextTm } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = leads.length;
    const todayCount = leads.filter((l) => new Date(l.createdAt) >= today).length;
    const unassignedCount = leads.filter((l) => !l.assignedTmId).length;

    let pointerTm: TmUser | null = null;
    if (config?.nextGlobalTmId) {
      pointerTm = tms.find((t) => t.id === config.nextGlobalTmId) || null;
    }
    if (!pointerTm && tms.length > 0) {
      pointerTm = [...tms].sort((a, b) => a.globalOrder - b.globalOrder)[0];
    }

    return {
      totalLeads: total,
      todayLeads: todayCount,
      unassignedLeads: unassignedCount,
      nextTm: pointerTm,
    };
  }, [leads, config, tms]);

  const navItems = getAdminNavItems(isDebugMode);
  const activeNavMeta =
    navItems.find((item) => item.key === activeTab) || navItems[0];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500">관리자 인증 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col lg:flex-row">
      {/* Left Sidebar (Desktop) & Slide-Over Drawer (Mobile) */}
      <AdminHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setLeadsFilterInitial('ALL');
        }}
        onRefresh={loadDashboardData}
        isRefreshing={isRefreshing}
        unassignedCount={unassignedLeads}
        isDebugMode={isDebugMode}
      />

      {/* Right Dedicated Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Dedicated Page Title Bar */}
        <div className="bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[11px] font-bold tabular-nums shrink-0">
                  {activeNavMeta.code}
                </span>
                <h1 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight truncate">
                  {activeNavMeta.label}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {activeNavMeta.description}
              </p>
            </div>

            {/* Right Status Pill & Refresh Button */}
            <div className="flex items-center gap-2 shrink-0">
              {nextTm && (
                <button
                  type="button"
                  onClick={() => setActiveTab('allocation')}
                  className="h-9 px-3 rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-xs flex items-center gap-2 transition-colors whitespace-nowrap"
                  title="상담원 순번 관리로 이동"
                >
                  <span className="text-zinc-500">다음 배정 차례:</span>
                  <span className="font-bold text-zinc-900 tabular-nums">
                    {nextTm.name} ({nextTm.globalOrder}순번)
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={loadDashboardData}
                disabled={isRefreshing}
                className="hidden sm:inline-flex h-9 px-3 rounded-md bg-white hover:bg-zinc-50 border border-zinc-300 text-xs font-semibold text-zinc-700 items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-zinc-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Error Notice */}
          {dataError && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
              <span>{dataError}</span>
              <button
                type="button"
                onClick={loadDashboardData}
                className="font-semibold underline ml-2 whitespace-nowrap"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* Tab 01: Leads Management (Includes 4-Column Summary Dashboard Cards) */}
          {activeTab === 'leads' && (
            <>
              <SummaryCards
                totalLeads={totalLeads}
                todayLeads={todayLeads}
                unassignedLeads={unassignedLeads}
                nextTm={nextTm}
                onFilterUnassigned={() => {
                  setActiveTab('leads');
                  setLeadsFilterInitial('UNASSIGNED');
                }}
                onNavigateAllocation={() => {
                  setActiveTab('allocation');
                }}
              />
              <LeadsTab
                leads={leads}
                tms={tms}
                sites={sites}
                onRefresh={loadDashboardData}
                statusFilterInitial={leadsFilterInitial}
              />
            </>
          )}

          {/* Tab 02: Dedicated TM Allocation & Queue Control */}
          {activeTab === 'allocation' && (
            <AllocationTab
              tms={tms}
              config={config}
              onRefresh={loadDashboardData}
            />
          )}

          {/* Tab 03: Dedicated Site & Exclusive TM Mapping Settings */}
          {activeTab === 'sites' && (
            <SitesTab
              sites={sites}
              tms={tms}
              onRefresh={loadDashboardData}
            />
          )}

          {/* Tab 04: Dedicated Virtual Lead Simulator (Debug Only) & SMS Logs */}
          {activeTab === 'simulator' && (
            <SimulatorTab
              sites={sites}
              tms={tms}
              smsLogs={smsLogs}
              onRefresh={loadDashboardData}
              isDebugMode={isDebugMode}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200 bg-white py-3.5 text-center text-xs text-zinc-400">
          고객 상담 자동 배정 및 통합 관리 시스템 &bull; 관리자 전용 콘솔
        </footer>

        {/* Floating Debug Mode Toggle */}
        <DebugModeToggleBar />
      </div>
    </div>
  );
}
