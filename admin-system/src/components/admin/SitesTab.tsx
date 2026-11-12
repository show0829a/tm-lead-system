'use client';

import React, { useState } from 'react';
import { SiteItem, TmUser } from '../types';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';

interface SitesTabProps {
  sites: SiteItem[];
  tms: TmUser[];
  onRefresh: () => void;
}

export function SitesTab({ sites, tms, onRefresh }: SitesTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Edit Site Modal
  const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomainUrl, setEditDomainUrl] = useState('');
  const [editUseCustomMapping, setEditUseCustomMapping] = useState(false);
  const [editCustomSmsTemplate, setEditCustomSmsTemplate] = useState('');
  const [editSelectedTmIds, setEditSelectedTmIds] = useState<string[]>([]);
  const [isSavingSite, setIsSavingSite] = useState(false);

  // Mapping Drag & Drop state
  const [mappingDraggedIdx, setMappingDraggedIdx] = useState<number | null>(null);
  const [mappingDragOverIdx, setMappingDragOverIdx] = useState<number | null>(null);

  // Add Site Modal
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDomainUrl, setAddDomainUrl] = useState('');
  const [addCustomSmsTemplate, setAddCustomSmsTemplate] = useState('');
  const [isAddingSite, setIsAddingSite] = useState(false);

  // Copy API Key
  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(apiKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy config.js Snippet
  const handleCopySnippet = (site: SiteItem) => {
    const snippet = `window.LANDING_CONFIG = {
  SITE_NAME: '${site.name}',
  API_BASE_URL: 'http://localhost:3000',
  SITE_API_KEY: '${site.apiKey}',
};`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(site.id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Open Edit Modal
  const openEditModal = (site: SiteItem) => {
    setEditingSite(site);
    setEditName(site.name);
    setEditDomainUrl(site.domainUrl);
    setEditUseCustomMapping(site.useCustomMapping);
    setEditCustomSmsTemplate(site.customSmsTemplate || '');

    const orderedTmIds = (site.siteTmMappings || [])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((m) => m.tmId);
    setEditSelectedTmIds(
      orderedTmIds.length > 0 ? orderedTmIds : tms.map((t) => t.id)
    );
  };

  // Toggle TM selection for custom mapping
  const toggleTmSelection = (tmId: string) => {
    setEditSelectedTmIds((prev) =>
      prev.includes(tmId) ? prev.filter((id) => id !== tmId) : [...prev, tmId]
    );
  };

  // Move selected TM order in mapping
  const moveTmInMapping = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= editSelectedTmIds.length) return;

    const copy = [...editSelectedTmIds];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setEditSelectedTmIds(copy);
  };

  // Drag and Drop reordering in site mapping
  const handleMappingDragStart = (e: React.DragEvent, index: number) => {
    setMappingDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleMappingDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (mappingDragOverIdx !== index) {
      setMappingDragOverIdx(index);
    }
  };

  const handleMappingDragEnd = () => {
    setMappingDraggedIdx(null);
    setMappingDragOverIdx(null);
  };

  const handleMappingDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (mappingDraggedIdx === null || mappingDraggedIdx === targetIndex) {
      setMappingDraggedIdx(null);
      setMappingDragOverIdx(null);
      return;
    }

    const copy = [...editSelectedTmIds];
    const [moved] = copy.splice(mappingDraggedIdx, 1);
    copy.splice(targetIndex, 0, moved);

    setEditSelectedTmIds(copy);
    setMappingDraggedIdx(null);
    setMappingDragOverIdx(null);
  };

  // Save Site Edit
  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    setIsSavingSite(true);
    try {
      const mappingsPayload = editUseCustomMapping
        ? editSelectedTmIds.map((tmId, idx) => ({ tmId, orderIndex: idx + 1 }))
        : [];

      const res = await fetch(`/api/admin/sites/${editingSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          domainUrl: editDomainUrl.trim(),
          useCustomMapping: editUseCustomMapping,
          customSmsTemplate: editCustomSmsTemplate.trim() || null,
          mappings: mappingsPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('사이트 설정 저장 실패');
      }

      setEditingSite(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || '사이트 정보 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSavingSite(false);
    }
  };

  // Add New Site Submit
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addDomainUrl.trim()) {
      alert('사이트명과 도메인 URL을 입력해주세요.');
      return;
    }

    setIsAddingSite(true);
    try {
      const res = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          domainUrl: addDomainUrl.trim(),
          customSmsTemplate: addCustomSmsTemplate.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('사이트 생성 실패');
      }

      setIsAddSiteModalOpen(false);
      setAddName('');
      setAddDomainUrl('');
      setAddCustomSmsTemplate('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '사이트 등록 중 오류가 발생했습니다.');
    } finally {
      setIsAddingSite(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="p-4 rounded-lg bg-white border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900 tracking-tight">
              접수 사이트 관리 및 전담 상담원(TM) 설정
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium tabular-nums">
              총 {sites.length}개 사이트
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            각 모집 사이트에서 고객이 상담을 신청하면, 사이트별로 지정된 전담 TM 순번 또는 기본 통합 순번에 따라 자동 배정됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddSiteModalOpen(true)}
          className="h-9 px-3.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 shrink-0"
        >
          <span>+</span>
          <span>신규 접수 사이트 추가</span>
        </button>
      </div>

      {/* Sites Grid (Horizontally aligned cards across the row) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {sites.map((site) => {
          const mappingCount = site.siteTmMappings?.length || 0;

          return (
            <div
              key={site.id}
              className="p-4 rounded-lg bg-white border border-zinc-200 shadow-2xs hover:border-zinc-300 transition-colors duration-150 flex flex-col justify-between"
            >
              <div>
                {/* Header: Name, Active Status */}
                <div className="flex items-start justify-between gap-2 mb-3 min-h-[42px]">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-zinc-900 tracking-tight truncate">
                      {site.name}
                    </h3>
                    <a
                      href={site.domainUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-zinc-500 hover:text-zinc-900 hover:underline flex items-center gap-1 mt-0.5 truncate"
                    >
                      <span className="truncate">{site.domainUrl}</span>
                      <span className="text-[10px] shrink-0">↗</span>
                    </a>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      site.isActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {site.isActive ? '운영 중' : '일시중지'}
                  </span>
                </div>

                {/* Allocation Mode Box (Fixed min-h-[76px] so all 3 cards align horizontally) */}
                <div className="mb-3">
                  {site.useCustomMapping ? (
                    <div className="min-h-[76px] p-3 rounded-md bg-sky-50/70 border border-sky-200 text-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-sky-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                          <span>이 사이트 전용 순번 사용</span>
                        </span>
                        <span className="text-[11px] tabular-nums font-semibold">
                          {mappingCount}명 지정
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {site.siteTmMappings && site.siteTmMappings.length > 0 ? (
                          site.siteTmMappings
                            .sort((a, b) => a.orderIndex - b.orderIndex)
                            .map((m) => (
                              <span
                                key={m.id}
                                className="px-2 py-0.5 rounded bg-white text-sky-900 text-[11px] border border-sky-200 font-medium tabular-nums"
                              >
                                {m.orderIndex}순번: {m.tm?.name || '상담원'}
                              </span>
                            ))
                        ) : (
                          <span className="text-[11px] text-sky-700">
                            지정된 전담 상담원 없음
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[76px] p-3 rounded-md bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900">기본 통합 순번 사용</span>
                        <span className="text-[11px] text-zinc-500 font-medium">전체 순환</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-2">
                        현재 통합 대기열에 등록된 전체 상담원 순서대로 자동 배분됩니다.
                      </p>
                    </div>
                  )}
                </div>

                {/* API Key Box */}
                <div className="p-3 rounded-md bg-zinc-950 text-white text-xs space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 font-medium">
                      사이트 연동 고유 키
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyApiKey(site.apiKey)}
                      className="w-16 py-0.5 rounded text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors text-center"
                    >
                      {copiedKey === site.apiKey ? '복사됨' : '키 복사'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-sky-300 break-all select-all tabular-nums">
                    {site.apiKey}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleCopySnippet(site)}
                  className="h-8 px-2.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedSnippet === site.id ? '설정 코드 복사됨' : '연동 코드 복사'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(site)}
                  className="h-8 px-3 rounded-md text-xs font-semibold bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 border border-zinc-300 transition-colors duration-150"
                >
                  전담 TM 및 설정
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Site Modal */}
      <Modal
        isOpen={Boolean(editingSite)}
        onClose={() => setEditingSite(null)}
        title="접수 사이트 설정 및 전담 상담원(TM) 지정"
        maxWidth="lg"
      >
        {editingSite && (
          <form onSubmit={handleSaveSite} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="siteNameEdit"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  사이트 이름 *
                </label>
                <input
                  id="siteNameEdit"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label
                  htmlFor="siteDomainEdit"
                  className="block text-xs font-semibold text-zinc-700 mb-1"
                >
                  도메인 URL *
                </label>
                <input
                  id="siteDomainEdit"
                  type="text"
                  required
                  value={editDomainUrl}
                  onChange={(e) => setEditDomainUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono"
                />
              </div>
            </div>

            {/* Custom Mapping Toggle Switch */}
            <div className="p-3.5 rounded-md bg-zinc-50 border border-zinc-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-zinc-900">
                    이 사이트 전용 상담원 배분 순번 사용
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    활성화 시 기본 통합 순번 대신 아래에 지정한 상담원들만 전담 순환 배분됩니다.
                  </p>
                </div>
                <Switch
                  checked={editUseCustomMapping}
                  onChange={(next) => setEditUseCustomMapping(next)}
                  size="sm"
                />
              </div>

              {/* Dedicated TM Selector & Ordering */}
              {editUseCustomMapping && (
                <div className="mt-4 pt-3 border-t border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-semibold text-zinc-900">
                      전담 상담원 배정 순번
                    </span>
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      총 {editSelectedTmIds.length}명
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {editSelectedTmIds.map((tmId, idx) => {
                      const tm = tms.find((t) => t.id === tmId);
                      if (!tm) return null;
                      const isDraggingThis = mappingDraggedIdx === idx;
                      const isDragOverThis = mappingDragOverIdx === idx && mappingDraggedIdx !== idx;

                      return (
                        <div
                          key={tm.id}
                          draggable
                          onDragStart={(e) => handleMappingDragStart(e, idx)}
                          onDragOver={(e) => handleMappingDragOver(e, idx)}
                          onDrop={(e) => handleMappingDrop(e, idx)}
                          onDragEnd={handleMappingDragEnd}
                          className={`flex items-center justify-between p-2.5 rounded-md border text-xs transition-all duration-150 ${
                            isDraggingThis
                              ? 'opacity-30 bg-zinc-200 border-zinc-300'
                              : isDragOverThis
                              ? 'bg-sky-50 border-zinc-900 ring-2 ring-zinc-900'
                              : 'bg-white border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Drag Grip Handle */}
                            <div
                              className="p-1 rounded text-zinc-400 hover:text-zinc-900 cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors select-none"
                              title="순번 이동"
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

                            <span className="w-12 h-6 rounded-xs bg-zinc-900 text-white font-bold flex items-center justify-center text-[11px] tabular-nums">
                              {idx + 1}순번
                            </span>
                            <span className="font-semibold text-zinc-900">
                              {tm.name}
                            </span>
                            <span className="text-xs text-zinc-400 tabular-nums">
                              ({tm.loginId})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveTmInMapping(idx, 'UP')}
                              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] disabled:opacity-30"
                              aria-label="위로 이동"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === editSelectedTmIds.length - 1}
                              onClick={() => moveTmInMapping(idx, 'DOWN')}
                              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] disabled:opacity-30"
                              aria-label="아래로 이동"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleTmSelection(tm.id)}
                              className="px-2 h-6 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[11px] font-semibold"
                              title="전담 목록에서 제외"
                            >
                              제외
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add More TMs to mapping (searchable dropdown scales to large teams) */}
                  {tms.some((t) => !editSelectedTmIds.includes(t.id)) && (
                    <div className="pt-1">
                      <span className="block text-[11px] text-zinc-500 mb-1.5">
                        전담 상담원 추가 ({tms.filter((t) => !editSelectedTmIds.includes(t.id)).length}명 선택 가능)
                      </span>
                      <Select
                        value=""
                        onChange={(tmId) => {
                          if (tmId) toggleTmSelection(tmId);
                        }}
                        className="w-full"
                        placeholder="+ 추가할 상담원 검색 및 선택"
                        searchable
                        searchPlaceholder="상담원 이름, 아이디, 순번 검색..."
                        options={tms
                          .filter((t) => !editSelectedTmIds.includes(t.id))
                          .sort((a, b) => a.globalOrder - b.globalOrder)
                          .map((t) => ({
                            value: t.id,
                            label: `${t.name} (${t.loginId})`,
                            subLabel: `통합 ${t.globalOrder}순번`,
                            keywords: `${t.globalOrder}`,
                          }))}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom SMS Template Editor */}
            <div>
              <label
                htmlFor="smsTemplateEdit"
                className="block text-xs font-semibold text-zinc-700 mb-1"
              >
                사이트 전용 문자 알림 문구 (미입력 시 기본 문구 적용)
              </label>
              <textarea
                id="smsTemplateEdit"
                rows={3}
                value={editCustomSmsTemplate}
                onChange={(e) => setEditCustomSmsTemplate(e.target.value)}
                placeholder="[{siteName}] 신규 상담 배정\n고객: {customerName} ({customerPhone})\n차량: {carModel} ({carYear})\n지역: {region}"
                className="w-full p-2.5 rounded-md border border-zinc-300 text-xs font-mono focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
              <div className="mt-1.5 flex items-center flex-wrap gap-1 text-[11px] text-zinc-500">
                <span>치환 변수 클릭 추가:</span>
                {['{siteName}', '{customerName}', '{customerPhone}', '{carModel}', '{carYear}', '{region}'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setEditCustomSmsTemplate((prev) => prev + tag)}
                      className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 font-mono text-[10px]"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="h-9 px-3.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSavingSite}
                className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSavingSite ? '저장 중...' : '설정 저장 완료'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add New Site Modal */}
      <Modal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        title="신규 접수 사이트 추가"
      >
        <form onSubmit={handleAddSite} className="space-y-4">
          <div>
            <label
              htmlFor="addSiteName"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              사이트 이름 *
            </label>
            <input
              id="addSiteName"
              type="text"
              required
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="예: 법인 리스/렌트 반납 매입 센터"
              className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="addSiteDomain"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              도메인 URL *
            </label>
            <input
              id="addSiteDomain"
              type="text"
              required
              value={addDomainUrl}
              onChange={(e) => setAddDomainUrl(e.target.value)}
              placeholder="https://fleet-buyback.example.com"
              className="w-full h-9 px-3 rounded-md border border-zinc-300 text-xs focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="addSmsTemplate"
              className="block text-xs font-semibold text-zinc-700 mb-1"
            >
              맞춤 문자 알림 문구 (선택)
            </label>
            <textarea
              id="addSmsTemplate"
              rows={2}
              value={addCustomSmsTemplate}
              onChange={(e) => setAddCustomSmsTemplate(e.target.value)}
              placeholder="미입력 시 기본 문자 알림 문구가 적용됩니다."
              className="w-full p-2.5 rounded-md border border-zinc-300 text-xs font-mono focus:outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={() => setIsAddSiteModalOpen(false)}
              className="h-9 px-3.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isAddingSite}
              className="h-9 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isAddingSite ? '등록 중...' : '사이트 추가 완료'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
