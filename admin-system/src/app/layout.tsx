import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '고객 상담 자동 배정 및 통합 관리 시스템',
  description: '고객 상담 신청 자동 순번 배정 및 통합 관리',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
