/**
 * Landing Site Client Configuration
 * 도메인별 정적 호스팅 배포 시 SITE_API_KEY와 API_BASE_URL을 지정합니다.
 */
window.LANDING_CONFIG = {
  SITE_NAME: '대한모터스 직수출·내수 매입본부',
  SITE_SUBTITLE: '수출·내수 직거래 매입 시세 조회 및 감가 없는 당일 확정 견적',
  API_BASE_URL: 'http://localhost:3000',
  SITE_API_KEY: 'sk_site_export_01',
  THEME_COLOR: '#0F172A',
  // 데모 편의를 위한 3대 시드 사이트 프리셋
  PRESETS: [
    {
      id: 'export',
      name: '수출 사이트 (기본)',
      key: 'sk_site_export_01',
      title: '대한모터스 해외 직수출 매입본부',
      subtitle: '주행거리 무관 해외 바이어 직수출 최고가 산정 · 당일 말소 및 대금 지급',
      themeColor: '#0F172A',
      badge: 'EXPORT DIRECT DESK',
    },
    {
      id: 'dom1',
      name: '내수매입 1 사이트',
      key: 'sk_site_dom1_02',
      title: '대한모터스 내수 다이렉트 매입센터',
      subtitle: '전국 무료 출장 감정 · 감가 없는 당일 확정 견적 및 즉시 명의이전',
      themeColor: '#18181B',
      badge: 'DOMESTIC DIRECT #01',
    },
    {
      id: 'dom2',
      name: '내수매입 2 사이트 (전용TM)',
      key: 'sk_site_dom2_03',
      title: '프리미엄 세단·수입차 전담 매입데스크',
      subtitle: '제네시스·수입 세단 1:1 수석 평가사 전담 배정 및 고가 매입 보장',
      themeColor: '#0369A1',
      badge: 'PREMIUM DESK #02',
    },
  ],
};
