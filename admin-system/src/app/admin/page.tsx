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
import { AdminHeader } from '@/components/admin/AdminHeader';
import { SummaryCards } from '@/components/admin/SummaryCards';
import { LeadsTab } from '@/components/admin/LeadsTab';
import { AllocationTab } from '@/components/admin/AllocationTab';
import { SitesTab } from '@/components/admin/SitesTab';
import { SimulatorTab } from '@/components/admin/SimulatorTab';

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & Session
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'leads' | 'allocation' | 'sites' | 'simulator'>('leads');
  const [leadsFilterInitial, setLeadsFilterInitial] = useState<string>('ALL');

  // Dashboard Data State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [tms, setTms] = useState<TmUser[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load All Dashboard Data (Parallel Fetching per vercel-react-nextjs)
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

  // Derived Summary Metrics (Computed during render, no useEffect sync)
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-zinc-500">ADMIN_SESSION_VERIFYING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Header */}
      <AdminHeader
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setLeadsFilterInitial('ALL');
        }}
        onRefresh={loadDashboardData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Notice */}
        {dataError && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
            <span>{dataError}</span>
            <button
              type="button"
              onClick={loadDashboardData}
              className="font-semibold underline ml-2"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Operational Metric Ledger Strip */}
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

        {/* Active Tab View */}
        {activeTab === 'leads' && (
          <LeadsTab
            leads={leads}
            tms={tms}
            sites={sites}
            onRefresh={loadDashboardData}
            statusFilterInitial={leadsFilterInitial}
          />
        )}

        {activeTab === 'allocation' && (
          <AllocationTab
            tms={tms}
            config={config}
            onRefresh={loadDashboardData}
          />
        )}

        {activeTab === 'sites' && (
          <SitesTab
            sites={sites}
            tms={tms}
            onRefresh={loadDashboardData}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorTab
            sites={sites}
            tms={tms}
            smsLogs={smsLogs}
            onRefresh={loadDashboardData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-3.5 text-center text-[11px] text-zinc-400 font-mono">
        TM LEAD DISPATCH TERMINAL &bull; ROUND-ROBIN CONCURRENCY &bull; AES-256-GCM SECURED
      </footer>
    </div>
  );
}
