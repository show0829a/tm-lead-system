'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user?.role === 'ADMIN') {
            router.replace('/admin');
            return;
          } else if (data.user?.role === 'TM') {
            router.replace('/tm');
            return;
          }
        }
      } catch (e) {
        // Not logged in or network error, show landing
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-zinc-500">SESSION_VERIFYING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 bg-zinc-950 text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white text-zinc-950 flex items-center justify-center font-mono font-bold text-xs">
              TM
            </div>
            <span className="font-bold text-sm text-white tracking-tight">
              고객 DB 자동 배분 및 통합 관리 시스템
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              v2.4 DISPATCH
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="py-1.5 px-3.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-colors duration-150"
            >
              콘솔 로그인
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col justify-center">
        <div className="bg-white border border-zinc-200 rounded-lg p-8 shadow-2xs">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>ENTERPRISE AUTOMOTIVE LEAD DISPATCH LEDGER</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 max-w-3xl leading-tight">
            수출·내수 중고차 모집 DB 실시간 자동 배분 및 상담 관제 터미널
          </h1>

          <p className="mt-3 text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
            다중 사이트 API 웹훅 수집, PostgreSQL 트랜잭션 행 잠금(Row-Lock) 기반 순번 배정,
            상담원별 DB/SMS 수신 제어, 연락처 AES-256-GCM 암호화 및 열람 감사 로그를 통합 운영합니다.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="py-2.5 px-5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors duration-150"
            >
              운영 콘솔 접속하기 (데모 계정 지원)
            </Link>
            <a
              href="http://localhost:3000/landing-site-template/index.html"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 rounded-md bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 font-semibold text-xs transition-colors duration-150"
            >
              정적 모집 사이트 템플릿 열기
            </a>
          </div>

          {/* Workspace Architecture Ledger */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 border border-zinc-200 rounded-lg bg-zinc-50/50">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 text-white">
                  ROLE: ADMIN
                </span>
                <span className="text-xs font-mono text-zinc-500 tabular-nums">
                  /admin
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-1.5 tracking-tight">
                통합 관리자 콘솔
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                전체 유입 DB 필터링, 특정 순번 수동 배정(포인터 차감 옵션), 통합 대기열 순번 및 다음 차례(NEXT) 강제 지정, 모집 채널별 API Key 및 전용 TM 매핑, 실시간 유입 시뮬레이터를 제어합니다.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-200/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>계정: admin</span>
                <span>비밀번호: admin1234</span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                  ROLE: TM (#01~#04)
                </span>
                <span className="text-xs font-mono text-zinc-500 tabular-nums">
                  /tm
                </span>
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-1.5 tracking-tight">
                상담원 전담 워크스페이스
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                본인에게 배정된 DB만 격리 조회하며, 상단 고정 바에서 DB 배정 수신 [ON/OFF]와 SMS 문자 알림 [ON/OFF]를 독립적으로 제어합니다. 원문 연락처 복호화 열람 및 상담 이력을 기록합니다.
              </p>
              <div className="mt-4 pt-3 border-t border-zinc-200/80 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>계정: tm1 ~ tm4</span>
                <span>비밀번호: tm1234</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-500 font-mono">
        TM LEAD DISPATCH TERMINAL &bull; AES-256-GCM ENCRYPTION &bull; ROW-LOCK CONCURRENCY
      </footer>
    </div>
  );
}
