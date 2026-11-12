'use client';

import React, { useState } from 'react';
import { SiteItem, SmsLogItem, TmUser } from '../types';
import { Select } from '../ui/Select';
import { formatPhone } from '../ui/format';

interface SimulatorTabProps {
  sites: SiteItem[];
  tms: TmUser[];
  smsLogs: SmsLogItem[];
  onRefresh: () => void;
  isDebugMode?: boolean;
}

interface TestPreset {
  label: string;
  siteNameKeyword?: string;
  customerName: string;
  carModel: string;
  carNumber: string;
  carYear: string;
  mileage: string;
  region: string;
  estimatedPrice: number;
}

const PRESETS: TestPreset[] = [
  {
    label: '현대 그랜저 IG (수출용)',
    siteNameKeyword: '수출',
    customerName: '김수출',
    carModel: '현대 그랜저 IG 2.4 가솔린 프리미엄',
    carNumber: '45도 8812',
    carYear: '2018',
    mileage: '125,000km',
    region: '인천 연수구',
    estimatedPrice: 1450,
  },
  {
    label: '기아 카니발 4세대 (내수용)',
    siteNameKeyword: '내수매입 1',
    customerName: '이내수',
    carModel: '기아 카니발 4세대 디젤 9인승 노블레스',
    carNumber: '128가 4567',
    carYear: '2021',
    mileage: '48,000km',
    region: '경기 수원시 영통구',
    estimatedPrice: 3200,
  },
  {
    label: '제네시스 G80 (전용 상담원 채널)',
    siteNameKeyword: '내수매입 2',
    customerName: '박세단',
    carModel: '제네시스 G80 3.5T AWD 시그니처 디자인',
    carNumber: '24고 1234',
    carYear: '2022',
    mileage: '28,000km',
    region: '서울 서초구 반포동',
    estimatedPrice: 5100,
  },
  {
    label: '현대 아반떼 AD (당일 처분)',
    customerName: '최급매',
    carModel: '현대 아반떼 AD 1.6 밸류 플러스',
    carNumber: '08누 9988',
    carYear: '2017',
    mileage: '83,000km',
    region: '충남 천안시 서북구',
    estimatedPrice: 850,
  },
];

export function SimulatorTab({
  sites,
  tms,
  smsLogs,
  onRefresh,
  isDebugMode = false,
}: SimulatorTabProps) {
  // Form fields
  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || '');
  const [customerName, setCustomerName] = useState('김고객');
  const [customerPhone, setCustomerPhone] = useState(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `010-${Math.floor(2000 + Math.random() * 7000)}-${randomSuffix}`;
  });
  const [carModel, setCarModel] = useState('현대 그랜저 IG 2.4');
  const [carNumber, setCarNumber] = useState('34가 5678');
  const [carYear, setCarYear] = useState('2019');
  const [mileage, setMileage] = useState('72,000km');
  const [region, setRegion] = useState('경기 성남시 분당구');
  const [estimatedPrice, setEstimatedPrice] = useState<number>(1850);

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    leadId?: string;
    assignedTmName?: string;
    status?: string;
    siteName?: string;
    error?: string;
  } | null>(null);

  // SMS filter
  const [smsStatusFilter, setSmsStatusFilter] = useState<'ALL' | 'MOCK_SENT' | 'SKIPPED'>('ALL');

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || sites[0];

  // Apply Preset
  const handleApplyPreset = (preset: TestPreset) => {
    if (preset.siteNameKeyword) {
      const matched = sites.find((s) => s.name.includes(preset.siteNameKeyword!));
      if (matched) setSelectedSiteId(matched.id);
    }
    setCustomerName(preset.customerName);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCustomerPhone(`010-${Math.floor(2000 + Math.random() * 7000)}-${randomSuffix}`);
    setCarModel(preset.carModel);
    setCarNumber(preset.carNumber);
    setCarYear(preset.carYear);
    setMileage(preset.mileage);
    setRegion(preset.region);
    setEstimatedPrice(preset.estimatedPrice);
    setSimResult(null);
  };

  // Submit Mock Ingestion
  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite) {
      alert('연동할 사이트를 먼저 등록해주세요.');
      return;
    }

    setIsSimulating(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Api-Key': selectedSite.apiKey,
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          carModel,
          carNumber: carNumber || undefined,
          carYear: carYear || undefined,
          mileage: mileage || undefined,
          region: region || undefined,
          estimatedPrice: Number(estimatedPrice) || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '유입 시뮬레이션 요청에 실패했습니다.');
      }

      const assignedTm = tms.find((t) => t.id === data.assignedTmId);

      setSimResult({
        success: true,
        leadId: data.leadId,
        assignedTmName: assignedTm
          ? `${assignedTm.name} (${assignedTm.globalOrder}순번)`
          : '미배정 (대기열 적재)',
        status: data.status === 'NEW' ? '신규 배정' : '미배정 대기',
        siteName: selectedSite.name,
      });

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setCustomerPhone(`010-${Math.floor(2000 + Math.random() * 7000)}-${randomSuffix}`);

      onRefresh();
    } catch (err: any) {
      setSimResult({
        success: false,
        error: err.message || '가상 유입 처리 중 에러 발생',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredSmsLogs = smsLogs.filter((log) => {
    if (smsStatusFilter === 'ALL') return true;
    return log.status === smsStatusFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Left Column: Lead Ingestion Simulator (5 cols — Shown only in Debug Mode) */}
      {isDebugMode && (
      <div className="lg:col-span-5 space-y-4">
        <div className="p-4 rounded-lg bg-white border border-amber-300 shadow-2xs">
          <div className="flex items-start justify-between gap-3 min-h-[40px] mb-3 pb-3 border-b border-zinc-200">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-zinc-900 tracking-tight">
                가상 상담 접수 테스트
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                고객 상담 접수 및 순번 자동 배정 시뮬레이션
              </p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold whitespace-nowrap shrink-0">
              디버그 전용
            </span>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <span className="block text-xs font-semibold text-zinc-600 mb-1.5">
              테스트 프리셋
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-400 text-left transition-colors duration-150"
                >
                  <span className="block text-xs font-bold text-zinc-900 truncate">
                    {preset.label}
                  </span>
                  <span className="block text-[11px] text-zinc-500 truncate mt-0.5 tabular-nums">
                    {preset.customerName} &bull; {preset.carNumber}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Form */}
          <form onSubmit={handleRunSimulation} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                접수 사이트 선택 *
              </label>
              <Select
                value={selectedSiteId}
                onChange={setSelectedSiteId}
                className="w-full"
                options={sites.map((site) => ({
                  value: site.id,
                  label: site.name,
                  subLabel: site.useCustomMapping ? '전용 순번' : '통합 순번',
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="simCustName"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  고객명 *
                </label>
                <input
                  id="simCustName"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label
                  htmlFor="simCustPhone"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  연락처 *
                </label>
                <input
                  id="simCustPhone"
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="simCarModel"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  차량 모델 *
                </label>
                <input
                  id="simCarModel"
                  type="text"
                  required
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label
                  htmlFor="simCarNumber"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  차량 번호
                </label>
                <input
                  id="simCarNumber"
                  type="text"
                  value={carNumber}
                  onChange={(e) => setCarNumber(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label
                  htmlFor="simCarYear"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  연식
                </label>
                <input
                  id="simCarYear"
                  type="text"
                  value={carYear}
                  onChange={(e) => setCarYear(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="simMileage"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  주행거리
                </label>
                <input
                  id="simMileage"
                  type="text"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono tabular-nums"
                />
              </div>
              <div>
                <label
                  htmlFor="simRegion"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  지역
                </label>
                <input
                  id="simRegion"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSimulating}
                className="w-full h-10 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <span>순번 배정 처리 중...</span>
                ) : (
                  <span>가상 상담 신청 접수하기</span>
                )}
              </button>
            </div>
          </form>

          {/* Simulation Result Card */}
          {simResult && (
            <div
              className={`mt-4 p-3.5 rounded-md border text-xs ${
                simResult.success
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              {simResult.success ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-emerald-900 text-xs">
                    <span>상담 접수 및 순번 배정 완료</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-semibold">
                      정상 접수
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                    <div>
                      <span className="text-emerald-700 font-medium">접수 사이트: </span>
                      <span className="font-semibold">{simResult.siteName}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">배정 상담원: </span>
                      <strong className="text-emerald-950 font-semibold tabular-nums">
                        {simResult.assignedTmName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">상태: </span>
                      <span className="font-semibold">{simResult.status}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-medium">접수 번호: </span>
                      <span className="font-mono tabular-nums">{simResult.leadId?.slice(0, 8)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800 pt-1.5 border-t border-emerald-200">
                    배정 완료와 동시에 다음 배정 차례가 그 다음 순번 상담원으로 자동 이동되었습니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold text-rose-800">접수 실패</div>
                  <p className="text-rose-700">{simResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Right Column: SMS Dispatch Logs (7 cols in Debug Mode / 12 cols in Production Mode) */}
      <div className={`${isDebugMode ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
        <div className="p-4 rounded-lg bg-white border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between min-h-[40px] mb-3 pb-3 border-b border-zinc-200 gap-2">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 tracking-tight">
                휴대폰 문자 발송 내역
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                상담 배정 시 상담원에게 발송된 실시간 문자 원문 및 수신 상태 기록입니다.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select
                value={smsStatusFilter}
                onChange={(val) => setSmsStatusFilter(val as any)}
                className="w-44"
                align="right"
                ariaLabel="문자 발송 상태 필터"
                options={[
                  { value: 'ALL', label: `전체 내역 (${smsLogs.length}건)` },
                  { value: 'MOCK_SENT', label: '발송 완료' },
                  { value: 'SKIPPED', label: '발송 생략 (알림 꺼짐)' },
                ]}
              />

              <button
                type="button"
                onClick={onRefresh}
                className="h-9 w-9 flex items-center justify-center rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-colors"
                title="내역 새로고침"
                aria-label="내역 새로고침"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredSmsLogs.length === 0 ? (
              <div className="py-14 text-center text-zinc-400">
                <p className="text-xs font-semibold text-zinc-500">발송된 문자 내역이 없습니다.</p>
              </div>
            ) : (
              filteredSmsLogs.map((log) => {
                const isSkipped = log.status === 'SKIPPED';

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-md border text-xs transition-colors ${
                      isSkipped
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-zinc-50/60 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isSkipped
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isSkipped ? '발송 생략 (문자 알림 꺼짐)' : '발송 완료'}
                        </span>
                        <span className="font-bold text-zinc-900">
                          수신 상담원: {log.tm?.name || '상담원'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                        {new Date(log.createdAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Masked receiver phone */}
                    <div className="text-[11px] text-zinc-500 mb-2 flex items-center gap-2">
                      <span>수신 번호:</span>
                      <span className="font-mono font-semibold text-zinc-700 tabular-nums">
                        {formatPhone(log.receiverPhoneMasked)}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="p-2.5 rounded bg-white border border-zinc-200 font-mono text-[11px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
                      {log.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
