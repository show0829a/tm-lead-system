import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TM Lead Management System',
  description: 'Automated Lead Allocation & Management',
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
