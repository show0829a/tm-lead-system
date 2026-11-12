'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDebugMode, DebugModeToggleBar } from '@/components/ui/DebugMode';

interface DemoAccount {
  label: string;
  role: 'ADMIN' | 'TM';
  queueTag: string;
  loginId: string;
  pass: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: '최고 관리자',
    role: 'ADMIN',
    queueTag: '관리자',
    loginId: 'admin',
    pass: 'admin1234',
    desc: '상담원 순번 관리 · 접수 사이트 설정 · 전체 상담 관리',
  },
  {
    label: '상담원 1 (팀장)',
    role: 'TM',
    queueTag: '1순번',
    loginId: 'tm1',
    pass: 'tm1234',
    desc: '1순번 담당 · 수출/내수 통합 상담',
  },
  {
    label: '상담원 2',
    role: 'TM',
    queueTag: '2순번',
    loginId: 'tm2',
    pass: 'tm1234',
    desc: '2순번 담당 · 수출/내수 통합 상담',
  },
  {
    label: '상담원 3',
    role: 'TM',
    queueTag: '3순번',
    loginId: 'tm3',
    pass: 'tm1234',
    desc: '3순번 담당 · 내수2 사이트 전담 포함',
  },
  {
    label: '상담원 4',
    role: 'TM',
    queueTag: '4순번',
    loginId: 'tm4',
    pass: 'tm1234',
    desc: '4순번 담당 · 내수2 사이트 전담 포함',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isDebugMode] = useDebugMode();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performLogin = async (idToUse: string, passToUse: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: idToUse, password: passToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
      }

      const userRole = data.user?.role;
      if (userRole === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/tm');
      }
    } catch (err: any) {
      setErrorMsg(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }
    performLogin(loginId, password);
  };

  const handleQuickLogin = (account: DemoAccount) => {
    setLoginId(account.loginId);
    setPassword(account.pass);
    performLogin(account.loginId, account.pass);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-between">
      {/* Top System Bar */}
      <header className="h-12 bg-zinc-950 text-white border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-xs bg-white text-zinc-950 font-mono font-bold text-xs">
            TM
          </span>
          <span className="text-xs font-bold tracking-tight text-zinc-100">
            고객 상담 자동 배정 및 통합 관리 시스템
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          {isDebugMode ? '통합 로그인 (디버그 모드)' : '통합 로그인'}
        </span>
      </header>

      {/* Center Login Card (Single Centered Box in Production Mode / Split Grid in Debug Mode) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div
          className={`w-full bg-white border border-zinc-200 rounded-lg shadow-2xs overflow-hidden transition-all duration-150 ${
            isDebugMode
              ? 'max-w-4xl grid grid-cols-1 lg:grid-cols-12'
              : 'max-w-md'
          }`}
        >
          {/* Credential Login Form */}
          <div
            className={`p-6 sm:p-8 flex flex-col justify-between ${
              isDebugMode
                ? 'lg:col-span-5 border-b lg:border-b-0 lg:border-r border-zinc-200'
                : ''
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                  계정 인증
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                시스템 로그인
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                부여받은 관리자 또는 상담원(TM) 계정으로 접속하세요.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
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
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="loginId"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    아이디
                  </label>
                  <input
                    id="loginId"
                    name="loginId"
                    type="text"
                    autoComplete="username"
                    required
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-zinc-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors duration-150"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-zinc-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-colors duration-150"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 px-4 rounded-md text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>인증 처리 중...</span>
                      </>
                    ) : (
                      <span>로그인</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 pt-4 border-t border-zinc-200 text-[11px] text-zinc-400 flex items-center justify-between">
              <span>보안 세션 인증</span>
              <span>고객 연락처 암호화 보호</span>
            </div>
          </div>

          {/* Right 7 Cols: Debug-Only Quick Account Switcher */}
          {isDebugMode && (
            <div className="lg:col-span-7 p-6 sm:p-8 bg-amber-50/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    디버그 전용 기능
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    클릭 시 해당 역할로 즉시 로그인
                  </span>
                </div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  빠른 테스트 계정 전환 (원클릭 접속)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5 mb-4">
                  디버그 모드가 켜져 있을 때만 노출됩니다. 우측 하단 버튼으로 운영 화면을 확인하실 수 있습니다.
                </p>

                <div className="border border-zinc-200 rounded-md bg-white divide-y divide-zinc-200 overflow-hidden">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.loginId}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      disabled={isLoading}
                      className="w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors duration-150 flex items-center justify-between gap-3 group disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 w-20 text-center py-1 rounded text-[10px] font-mono font-bold border tabular-nums ${
                            acc.role === 'ADMIN'
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                          }`}
                        >
                          {acc.queueTag}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 group-hover:text-sky-700 transition-colors">
                              {acc.label}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              ({acc.loginId} / {acc.pass})
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {acc.desc}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-[11px] font-mono font-semibold text-zinc-600 group-hover:text-zinc-950 px-2.5 py-1 rounded border border-zinc-200 group-hover:border-zinc-400 bg-zinc-50 group-hover:bg-white transition-colors whitespace-nowrap">
                        접속 →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-3 rounded-md bg-white border border-zinc-200 text-xs text-zinc-500 flex items-center justify-between">
                <span>외부 고객 모집 사이트(랜딩페이지) 확인:</span>
                <a
                  href="http://localhost:4000"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-zinc-900 hover:underline whitespace-nowrap"
                >
                  모집 사이트 열기 (localhost:4000) ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 border-t border-zinc-200 bg-white text-center text-xs text-zinc-400">
        고객 상담 자동 배정 및 통합 관리 시스템
      </footer>

      {/* Floating Debug Mode Toggle */}
      <DebugModeToggleBar />
    </div>
  );
}
