import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

SCREENSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../screenshots'))
OUTPUT_PPTX = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../TM_LEAD_SYSTEM_PROPOSAL.pptx'))

# Colors
C_DARK_BG = RGBColor(9, 9, 11)        # Zinc-950
C_CARD_BG = RGBColor(24, 24, 27)      # Zinc-900
C_WHITE = RGBColor(255, 255, 255)
C_LIGHT_BG = RGBColor(248, 250, 252)  # Slate-50
C_TEXT_MAIN = RGBColor(15, 23, 42)    # Slate-900
C_TEXT_MUTED = RGBColor(100, 116, 139) # Slate-500
C_PRIMARY = RGBColor(14, 165, 233)    # Sky-500
C_EMERALD = RGBColor(16, 185, 129)    # Emerald-500
C_BORDER = RGBColor(226, 232, 240)    # Slate-200

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    def add_header(slide, step_num, title, subtitle):
        # Step Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(1.3), Inches(0.32))
        badge.fill.solid()
        badge.fill.fore_color.rgb = C_PRIMARY
        badge.line.color.rgb = C_PRIMARY
        tf = badge.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = step_num
        p.alignment = PP_ALIGN.CENTER
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = C_WHITE

        # Title
        tb = slide.shapes.add_textbox(Inches(2.25), Inches(0.42), Inches(10.2), Inches(0.5))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(20)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_MAIN

        # Subtitle
        tb_sub = slide.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(11.7), Inches(0.4))
        tf_sub = tb_sub.text_frame
        p_sub = tf_sub.paragraphs[0]
        p_sub.text = subtitle
        p_sub.font.size = Pt(11.5)
        p_sub.font.color.rgb = C_TEXT_MUTED

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = C_DARK_BG
    bg1.line.color.rgb = C_DARK_BG

    # Pill badge
    pill = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.8), Inches(3.2), Inches(0.4))
    pill.fill.solid()
    pill.fill.fore_color.rgb = C_CARD_BG
    pill.line.color.rgb = RGBColor(63, 63, 70)
    p = pill.text_frame.paragraphs[0]
    p.text = "⚡ ALL-IN-ONE TM LEAD CRM ENGINE"
    p.alignment = PP_ALIGN.CENTER
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY

    # Title
    tb = s1.shapes.add_textbox(Inches(1.2), Inches(2.4), Inches(11.0), Inches(2.0))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "올인원 실시간 DB 수집 &\n공정 배정 TM CRM 솔루션"
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    p2 = tf.add_paragraph()
    p2.text = "광고 채널별 고객 유입부터 순번 자동 배정, TM 모바일 상담, 군사등급 개인정보 보안까지"
    p2.font.size = Pt(16)
    p2.font.color.rgb = RGBColor(161, 161, 170)
    p2.space_before = Pt(20)

    # 3 Stat Cards on Cover
    stats = [
        ("24시간 무인 자동화", "신규 접수 1초 내 TM 배정 및 알림"),
        ("배정 갈등 0%", "수학적 라운드로빈 공정 배분"),
        ("개인정보 안심", "AES-256 암호화 및 열람 감사로그"),
    ]
    for i, (title, desc) in enumerate(stats):
        card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2 + i * 3.7), Inches(5.2), Inches(3.4), Inches(1.3))
        card.fill.solid()
        card.fill.fore_color.rgb = C_CARD_BG
        card.line.color.rgb = RGBColor(39, 39, 42)
        tf = card.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_WHITE
        p_sub = tf.add_paragraph()
        p_sub.text = desc
        p_sub.font.size = Pt(10)
        p_sub.font.color.rgb = RGBColor(161, 161, 170)
        p_sub.space_before = Pt(4)

    # ==========================================
    # SLIDE 2: BEFORE vs AFTER
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "EXECUTIVE", "도입 전 vs 도입 후 비교 (도입 효과)", "수동 엑셀 및 카카오톡 운영 대비 업무 생산성과 보안성을 극대화합니다.")

    # Left Card: Before
    c_before = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    c_before.fill.solid()
    c_before.fill.fore_color.rgb = RGBColor(254, 242, 242)
    c_before.line.color.rgb = RGBColor(254, 202, 202)
    tf = c_before.text_frame
    p = tf.paragraphs[0]
    p.text = "❌ 기존 수동 운영 방식 (엑셀 / 카톡방)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = RGBColor(185, 28, 28)

    before_items = [
        ("접수 누락 빈번", "광고 채널마다 엑셀을 따로 열어 취합하다 DB 분실"),
        ("상담원 순번 시비", "관리자가 좋은 DB를 특정 TM에게 몰아준다는 불만"),
        ("느린 최초 연락", "접수 후 수십 분~수 시간 뒤에야 고객에게 전화 연결"),
        ("개인정보 유출 위험", "상담원 컴퓨터에 고객 전화번호가 평문 엑셀로 노출"),
        ("확장 불가능", "새 광고 랜딩페이지를 만들 때마다 외주 개발 비용 발생"),
    ]
    for title, desc in before_items:
        p = tf.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.size = Pt(10.5)
        p.font.color.rgb = RGBColor(127, 29, 29)
        p.space_before = Pt(10)

    # Right Card: After
    c_after = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2))
    c_after.fill.solid()
    c_after.fill.fore_color.rgb = RGBColor(240, 253, 244)
    c_after.line.color.rgb = RGBColor(187, 247, 208)
    tf = c_after.text_frame
    p = tf.paragraphs[0]
    p.text = "✅ 본 솔루션 도입 후 (올인원 자동화 엔진)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = RGBColor(21, 128, 61)

    after_items = [
        ("실시간 무중단 수집 (누락률 0%)", "24시간 웹훅 API로 유입 즉시 DB에 안전 적재"),
        ("수학적 라운드로빈 공정 배정", "1번 ➔ 2번 ➔ 3번 ➔ 4번 알고리즘으로 시비 원천 차단"),
        ("1초 이내 TM 스마트폰 알림", "접수되는 즉시 담당 TM 폰으로 고객 스펙 알림 전송"),
        ("군사등급 AES-256 암호화", "마스킹 처리 및 열람 시 IP/시간 감사로그 영구 보존"),
        ("무제한 채널 5분 세팅", "키 발급만으로 수십 개 랜딩페이지 즉시 연동 및 추적"),
    ]
    for title, desc in after_items:
        p = tf.add_paragraph()
        p.text = f"• {title}: {desc}"
        p.font.size = Pt(10.5)
        p.font.color.rgb = RGBColor(20, 83, 45)
        p.space_before = Pt(10)

    # Helper function for screen slide
    def add_screen_slide(step_code, title, subtitle, img_name, features):
        slide = prs.slides.add_slide(blank_layout)
        add_header(slide, step_code, title, subtitle)

        # Image Container
        img_path = os.path.join(SCREENSHOTS_DIR, img_name)
        if os.path.exists(img_path):
            slide.shapes.add_picture(img_path, Inches(0.8), Inches(1.5), Inches(7.4), Inches(5.4))
            # Border frame
            frame = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(7.4), Inches(5.4))
            frame.fill.background()
            frame.line.color.rgb = C_BORDER
            frame.line.width = Pt(1)

        # Right Features Panel
        panel = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.4), Inches(1.5), Inches(4.1), Inches(5.4))
        panel.fill.solid()
        panel.fill.fore_color.rgb = RGBColor(255, 255, 255)
        panel.line.color.rgb = C_BORDER
        tf = panel.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = "주요 기능 및 특장점"
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_MAIN

        for item_title, item_desc in features:
            p_t = tf.add_paragraph()
            p_t.text = f"✔ {item_title}"
            p_t.font.size = Pt(11)
            p_t.font.bold = True
            p_t.font.color.rgb = C_PRIMARY
            p_t.space_before = Pt(12)

            p_d = tf.add_paragraph()
            p_d.text = item_desc
            p_d.font.size = Pt(10)
            p_d.font.color.rgb = C_TEXT_MUTED
            p_d.space_before = Pt(2)

    # ==========================================
    # SLIDE 3: LANDING PAGE
    # ==========================================
    add_screen_slide(
        "STEP 01",
        "외부 고객 접수 채널 (모바일/PC 반응형 랜딩)",
        "고객이 스마트폰이나 PC에서 10초 만에 차량 정보와 연락처를 남기는 고전환율 신청 페이지입니다.",
        "01_landing_site.png",
        [
            ("실시간 자동 하이픈 변환", "010, 02 등 휴대폰 및 지역번호를 입력하는 즉시 010-XXXX-XXXX 표준 규격으로 자동 정돈"),
            ("10분 이내 중복 접수 자동 방어", "고객의 실수나 악의적인 반복 신청을 감지하여 10분 내 동일 번호 재접수 시 중복 경고 차단"),
            ("개인정보 수집 동의 법적 준수", "개인정보보호법에 부합하는 수집·이용 동의 절차 내장"),
            ("무제한 복제 & 채널 분리", "API Key 하나로 페이스북, 네이버, 인스타, 당근 등 유입 채널별 성과를 완벽히 독립 추적"),
        ]
    )

    # ==========================================
    # SLIDE 4: LOGIN & AUTH
    # ==========================================
    add_screen_slide(
        "STEP 02",
        "통합 시스템 로그인 및 세션 보안",
        "관리자와 TM 상담원의 권한을 철저히 분리하여 인가되지 않은 데이터 접근을 100% 차단합니다.",
        "02_login_page.png",
        [
            ("관리자 / TM 역할 분리 (RBAC)", "최고 관리자(전체 통제)와 TM 상담원(본인 상담 전용)의 화면 및 API 권한 완벽 분리"),
            ("보안 세션 (HttpOnly Cookie)", "클라이언트 자바스크립트 탈취가 불가능한 보안 HttpOnly 쿠키 기반 인증"),
            ("실제 운영 모드 / 디버그 온오프", "운영 시에는 깔끔한 정규 로그인 화면만 제공하며, 테스트 시 계정 원클릭 체험 지원"),
            ("비정상 접근 즉각 차단", "권한 없는 페이지 진입 시 403 Forbidden 및 로그인 페이지 리다이렉트"),
        ]
    )

    # ==========================================
    # SLIDE 5: ADMIN LEADS (DASHBOARD)
    # ==========================================
    add_screen_slide(
        "STEP 03",
        "관리자 대시보드 & 전체 상담 관리 (CRM)",
        "실시간 4대 핵심 지표 카드와 전체 모집 사이트에서 접수된 고객 상담을 통합 관제합니다.",
        "03_admin_leads.png",
        [
            ("4대 실시간 KPI 모니터링", "전체 누적 상담, 오늘 신규 접수, 미배정 대기 건수, 다음 배정 상담원 차례를 한눈에 파악"),
            ("스마트 다기능 통합 검색", "고객명, 차종(그랜저, K5 등), 차량 번호판, 전화번호 뒤 4자리, 지역명까지 한 번에 검색"),
            ("원클릭 수동 배정 및 순번 동기화", "특정 상담원에게 즉시 직접 배정 가능하며, 다음 순번 함께 이동 여부 선택 지원"),
            ("고객 상담 메모 히스토리", "통화 메모, 고객 희망 견적가, 특이사항을 건별로 무제한 기록 및 보존"),
        ]
    )

    # ==========================================
    # SLIDE 6: ALLOCATION QUEUE
    # ==========================================
    add_screen_slide(
        "STEP 04",
        "상담원 배정 순번 및 실시간 수신 제어",
        "특허급 무인 라운드로빈 자동 순번 배정과 상담원 출퇴근 수신 스위치 제어 화면입니다.",
        "04_admin_allocation.png",
        [
            ("무인 라운드로빈 공정 배분", "신규 상담 발생 시 1번 ➔ 2번 ➔ 3번 ➔ 4번 순서대로 공정하게 돌아가며 무인 자동 배정"),
            ("직관적인 순번 재배치", "마우스 드래그 또는 순번 버튼으로 상담원의 배정 우선순위를 1초 만에 즉시 변경"),
            ("상담 배정(DB) 제외 토글", "휴가, 외근, 점심시간 등 자리비움 시 스위치를 끄면 시스템이 알아서 다음 순번으로 자동 패스"),
            ("상단 일괄 제어 툴바", "전체 상담원 출근 시 '전체 켜기', 업무 마감 시 '전체 끄기' 원클릭 제어"),
        ]
    )

    # ==========================================
    # SLIDE 7: SITES & MAPPING
    # ==========================================
    add_screen_slide(
        "STEP 05",
        "접수 사이트 설정 및 전담 상담원 매핑",
        "모집 사이트별로 전담 상담원을 다르게 묶어 배정하고 맞춤 알림 문구를 설정합니다.",
        "05_admin_sites.png",
        [
            ("무제한 접수 사이트 등록", "새 랜딩페이지를 몇십 개라도 등록 가능하며 고유 API 연동 키를 즉시 자동 발급"),
            ("전담 상담원 전용 큐(Queue) 지원", "일반 승용차 사이트와 화물/특장차 전용 사이트의 배정 그룹을 완벽하게 분리"),
            ("사이트별 맞춤형 문자 문구", "접수 사이트 성격에 맞춰 상담원에게 전송되는 알림 템플릿(차종, 견적, 연락처) 개별 설정"),
            ("도메인 및 연동 상태 관리", "사이트별 활성/비활성 여부 및 누적 접수 현황 실시간 모니터링"),
        ]
    )

    # ==========================================
    # SLIDE 8: TM WORKSPACE (DESKTOP & MOBILE)
    # ==========================================
    slide8 = prs.slides.add_slide(blank_layout)
    add_header(slide8, "STEP 06", "TM 상담원 전용 모바일 & 데스크톱 업무 화면", "상담원은 잡다한 관리자 메뉴 없이 오직 '내게 배정된 상담'에만 집중하는 직관적 UI입니다.")

    img_desktop = os.path.join(SCREENSHOTS_DIR, "07_tm_workspace_desktop.png")
    img_mobile = os.path.join(SCREENSHOTS_DIR, "08_tm_workspace_mobile.png")
    if os.path.exists(img_desktop):
        slide8.shapes.add_picture(img_desktop, Inches(0.8), Inches(1.5), Inches(5.2), Inches(5.4))
        frame = slide8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(5.2), Inches(5.4))
        frame.fill.background()
        frame.line.color.rgb = C_BORDER

    if os.path.exists(img_mobile):
        slide8.shapes.add_picture(img_mobile, Inches(6.2), Inches(1.5), Inches(2.6), Inches(5.4))
        frame = slide8.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.2), Inches(1.5), Inches(2.6), Inches(5.4))
        frame.fill.background()
        frame.line.color.rgb = C_BORDER

    # Right Info Panel
    p8 = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(9.0), Inches(1.5), Inches(3.5), Inches(5.4))
    p8.fill.solid()
    p8.fill.fore_color.rgb = C_WHITE
    p8.line.color.rgb = C_BORDER
    tf = p8.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "TM 화면 핵심 편의 기능"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_MAIN

    tm_features = [
        ("타 상담원 DB 완벽 차단", "본인에게 배정된 고객 정보만 노출되어 상담원 간 DB 가로채기 원천 방지"),
        ("스마트폰 원터치 전화 걸기", "휴대폰 번호 터치 즉시 다이얼러로 연결되어 1초 만에 고객 통화 개시"),
        ("인라인 실시간 견적/상태 수정", "통화하면서 고객이 부른 희망가와 진행 상태(통화중/계약/보류) 즉시 수정"),
        ("본인 배정 ON/OFF 스위치", "외근이나 식사 시 본인이 직접 배정 일시 정지 가능"),
    ]
    for t, d in tm_features:
        p_t = tf.add_paragraph()
        p_t.text = f"✔ {t}"
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = C_PRIMARY
        p_t.space_before = Pt(12)
        p_d = tf.add_paragraph()
        p_d.text = d
        p_d.font.size = Pt(9.5)
        p_d.font.color.rgb = C_TEXT_MUTED
        p_d.space_before = Pt(2)

    # ==========================================
    # SLIDE 9: ENTERPRISE SECURITY
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "SECURITY", "개인정보보호법 완벽 준수 엔터프라이즈 보안 체계", "고객 연락처 암호화와 열람 감사로그로 개인정보 유출 과태료 리스크를 원천 차단합니다.")

    sec_cards = [
        ("군사등급 AES-256-GCM 암호화", "데이터베이스에 고객 휴대폰 번호가 평문이 아닌 양방향 암호문으로만 저장되어, DB가 유출되거나 해킹당해도 원본 번호 확인 불가"),
        ("번호 마스킹 & 열람 감사로그", "평소 화면에는 010-****-1234로 표시되며, [번호보기] 클릭 시 열람한 상담원 ID, 접속 IP, 정확한 시각이 영구 감사로그(AuditLog)로 자동 기록"),
        ("안전한 세션 & CSRF/XSS 방어", "브라우저 자바스크립트에서 토큰 탈취가 불가능한 HttpOnly 쿠키 인증 및 외부 웹훅 전용 API Key 교차 검증"),
    ]
    for i, (title, desc) in enumerate(sec_cards):
        c = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i * 4.0), Inches(1.6), Inches(3.7), Inches(5.2))
        c.fill.solid()
        c.fill.fore_color.rgb = C_WHITE
        c.line.color.rgb = C_BORDER
        tf = c.text_frame
        p = tf.paragraphs[0]
        p.text = f"🛡️ 0{i+1}"
        p.font.size = Pt(22)
        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(14)
        p_t.font.bold = True
        p_t.font.color.rgb = C_TEXT_MAIN
        p_t.space_before = Pt(10)
        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_MUTED
        p_d.space_before = Pt(8)

    # ==========================================
    # SLIDE 10: PRICING & ROI
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "PROPOSAL", "시스템 도입 견적 및 월 유지보수 패키지", "단발성 구축에 그치지 않고, 마케팅 효율 극대화를 위한 월간 랜딩페이지 공급을 결합합니다.")

    # Left: Initial Setup
    p_left = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.2))
    p_left.fill.solid()
    p_left.fill.fore_color.rgb = C_WHITE
    p_left.line.color.rgb = C_PRIMARY
    p_left.line.width = Pt(2)
    tf = p_left.text_frame
    p = tf.paragraphs[0]
    p.text = "PACKAGE 01"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_PRIMARY
    p_t = tf.add_paragraph()
    p_t.text = "초기 시스템 셋업 & 구축"
    p_t.font.size = Pt(18)
    p_t.font.bold = True
    p_t.font.color.rgb = C_TEXT_MAIN
    p_t.space_before = Pt(4)

    items1 = [
        "TM 순번 자동 배정 백엔드 엔진 구축",
        "관리자 CRM 대시보드 (지표, 검색, 수동배정)",
        "TM 상담원 전용 모바일/PC 반응형 워크스페이스",
        "고전환율 반응형 메인 랜딩페이지 1식 제작",
        "AES-256 군사등급 암호화 & 열람 감사로그 구축",
        "납품 기간: 계약 체결 후 1~2주 이내 즉시 오픈",
    ]
    for it in items1:
        p_it = tf.add_paragraph()
        p_it.text = f"✔ {it}"
        p_it.font.size = Pt(10.5)
        p_it.font.color.rgb = C_TEXT_MAIN
        p_it.space_before = Pt(8)

    # Right: Monthly Retainer
    p_right = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2))
    p_right.fill.solid()
    p_right.fill.fore_color.rgb = RGBColor(240, 253, 250)
    p_right.line.color.rgb = C_EMERALD
    p_right.line.width = Pt(2)
    tf = p_right.text_frame
    p = tf.paragraphs[0]
    p.text = "PACKAGE 02 (RECOMMENDED)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_EMERALD
    p_t = tf.add_paragraph()
    p_t.text = "월 유지보수 & 랜딩 정기 공급"
    p_t.font.size = Pt(18)
    p_t.font.bold = True
    p_t.font.color.rgb = C_TEXT_MAIN
    p_t.space_before = Pt(4)

    items2 = [
        "클라우드 서버 24시간 무중단 관제 및 DB 정기 백업",
        "★ 매월 신규 광고용 랜딩페이지 1식 무료 제작 (또는 기존 리뉴얼)",
        "광고 집행 시 새로운 차종/테마별 맞춤 랜딩 즉각 대응",
        "문자(SMS/알림톡) 발송 모니터링 및 잔액 알림 기술 지원",
        "추가 랜딩 요청 시 회원 할인가 (건당 20~30만 원) 적용",
        "효과: 별도 웹 디자이너 고용 없이 마케팅 팀 확보 효과",
    ]
    for it in items2:
        p_it = tf.add_paragraph()
        p_it.text = f"✔ {it}"
        p_it.font.size = Pt(10.5)
        p_it.font.color.rgb = RGBColor(6, 78, 59)
        p_it.space_before = Pt(8)

    # ==========================================
    # SLIDE 11: CLOSING
    # ==========================================
    s11 = prs.slides.add_slide(blank_layout)
    bg11 = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg11.fill.solid()
    bg11.fill.fore_color.rgb = C_DARK_BG
    bg11.line.color.rgb = C_DARK_BG

    tb = s11.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11.0), Inches(2.5))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = "감사합니다."
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    p2 = tf.add_paragraph()
    p2.text = "귀사의 성공적인 마케팅 전환율과 공정한 TM 운영을 위해 최고의 기술로 함께하겠습니다."
    p2.font.size = Pt(15)
    p2.font.color.rgb = RGBColor(161, 161, 170)
    p2.space_before = Pt(16)

    # Contact Box
    c_box = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(4.3), Inches(7.5), Inches(1.5))
    c_box.fill.solid()
    c_box.fill.fore_color.rgb = C_CARD_BG
    c_box.line.color.rgb = RGBColor(39, 39, 42)
    tf = c_box.text_frame
    p = tf.paragraphs[0]
    p.text = "도입 및 시스템 커스터마이징 문의"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p_info = tf.add_paragraph()
    p_info.text = "담당자 연락처 및 회사 정보 기입란"
    p_info.font.size = Pt(11)
    p_info.font.color.rgb = C_PRIMARY
    p_info.space_before = Pt(6)

    prs.save(OUTPUT_PPTX)
    print(f"🎉 Real PowerPoint presentation created successfully at: {OUTPUT_PPTX}")

if __name__ == '__main__':
    create_deck()
