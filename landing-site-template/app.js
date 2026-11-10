/**
 * Landing Site Client Script
 * Zero-server dependency vanilla ES6+ implementation
 */
(function () {
  'use strict';

  // 1. Configuration bootstrap
  const config = window.LANDING_CONFIG || {
    SITE_NAME: '대한모터스 직수출·내수 매입본부',
    SITE_SUBTITLE: '수출·내수 직거래 매입 시세 조회 및 감가 없는 당일 확정 견적',
    API_BASE_URL: 'http://localhost:3000',
    SITE_API_KEY: 'sk_site_export_01',
    THEME_COLOR: '#0F172A',
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
    ],
  };

  let currentApiKey = config.SITE_API_KEY;
  let currentSiteName = config.SITE_NAME;
  const apiBaseUrl = config.API_BASE_URL || window.location.origin;

  // DOM Elements
  const presetButtonsContainer = document.getElementById('presetButtons');
  const activeApiKeyBadge = document.getElementById('activeApiKeyBadge');
  const siteNameHeader = document.getElementById('siteNameHeader');
  const siteSubtitleHeader = document.getElementById('siteSubtitleHeader');
  const channelBadge = document.getElementById('channelBadge');
  const pageTitle = document.getElementById('pageTitle');
  const leadForm = document.getElementById('leadForm');
  const customerNameInput = document.getElementById('customerName');
  const customerPhoneInput = document.getElementById('customerPhone');
  const carModelInput = document.getElementById('carModel');
  const carNumberInput = document.getElementById('carNumber');
  const carYearInput = document.getElementById('carYear');
  const mileageInput = document.getElementById('mileage');
  const regionInput = document.getElementById('region');
  const privacyConsentInput = document.getElementById('privacyConsent');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');

  // Modals & Toast
  const termsModal = document.getElementById('termsModal');
  const openTermsBtn = document.getElementById('openTermsBtn');
  const closeTermsBtn = document.getElementById('closeTermsBtn');
  const confirmTermsBtn = document.getElementById('confirmTermsBtn');
  const successModal = document.getElementById('successModal');
  const closeSuccessBtn = document.getElementById('closeSuccessBtn');
  const closeSuccessHeaderBtn = document.getElementById('closeSuccessHeaderBtn');
  const successLeadId = document.getElementById('successLeadId');
  const successSiteName = document.getElementById('successSiteName');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');
  const toastText = document.getElementById('toastText');

  // Apply theme color CSS variable
  function applyThemeColor(hex) {
    if (!hex) return;
    document.documentElement.style.setProperty('--primary', hex);
    document.documentElement.style.setProperty('--primary-hover', hex);
  }

  // 2. Initialize Preset Switcher
  function initPresets() {
    if (!presetButtonsContainer || !config.PRESETS) return;

    presetButtonsContainer.innerHTML = '';
    config.PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn ${preset.key === currentApiKey ? 'active' : ''}`;
      btn.textContent = preset.name;
      btn.addEventListener('click', () => switchPreset(preset));
      presetButtonsContainer.appendChild(btn);
    });

    const initialPreset = config.PRESETS.find((p) => p.key === currentApiKey) || config.PRESETS[0];
    if (initialPreset && initialPreset.themeColor) {
      applyThemeColor(initialPreset.themeColor);
    }

    updateBadge();
  }

  function switchPreset(preset) {
    currentApiKey = preset.key;
    currentSiteName = preset.title || preset.name;

    if (siteNameHeader) siteNameHeader.textContent = preset.title || preset.name;
    if (siteSubtitleHeader) siteSubtitleHeader.textContent = preset.subtitle || '';
    if (channelBadge && preset.badge) channelBadge.textContent = preset.badge;
    if (pageTitle) pageTitle.textContent = `${preset.title} - 차량 매입 시세 조회`;

    if (preset.themeColor) {
      applyThemeColor(preset.themeColor);
    }

    // Update active class
    const buttons = presetButtonsContainer.querySelectorAll('.preset-btn');
    buttons.forEach((b) => {
      if (b.textContent === preset.name) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    updateBadge();
    showToast(`연동 채널이 [${preset.name}]로 전환되었습니다.`, 'CHANNEL');
  }

  function updateBadge() {
    if (activeApiKeyBadge) {
      activeApiKeyBadge.textContent = `X-Site-Api-Key: ${currentApiKey}`;
    }
  }

  // 3. Auto Phone Formatting (010-XXXX-XXXX)
  function formatPhoneNumber(value) {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }

  if (customerPhoneInput) {
    customerPhoneInput.addEventListener('input', (e) => {
      const formatted = formatPhoneNumber(e.target.value);
      e.target.value = formatted;
    });
  }

  // 4. Toast helper
  let toastTimer = null;
  function showToast(msg, badgeLabel = 'NOTICE') {
    if (!toastMsg) return;
    if (toastTimer) clearTimeout(toastTimer);

    if (toastIcon) toastIcon.textContent = badgeLabel;
    if (toastText) toastText.textContent = msg;
    toastMsg.classList.add('show');

    toastTimer = setTimeout(() => {
      toastMsg.classList.remove('show');
    }, 4000);
  }

  // 5. Terms & Success Modal handlers
  if (openTermsBtn) {
    openTermsBtn.addEventListener('click', () => {
      termsModal.classList.add('active');
    });
  }
  if (closeTermsBtn) {
    closeTermsBtn.addEventListener('click', () => {
      termsModal.classList.remove('active');
    });
  }
  if (confirmTermsBtn) {
    confirmTermsBtn.addEventListener('click', () => {
      if (privacyConsentInput) privacyConsentInput.checked = true;
      termsModal.classList.remove('active');
    });
  }
  if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
      successModal.classList.remove('active');
    });
  }
  if (closeSuccessHeaderBtn) {
    closeSuccessHeaderBtn.addEventListener('click', () => {
      successModal.classList.remove('active');
    });
  }

  // 6. Lead Form Submission Handler
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validation
      const customerName = customerNameInput?.value.trim();
      const rawPhone = customerPhoneInput?.value.trim();
      const carModel = carModelInput?.value.trim();
      const carNumber = carNumberInput?.value.trim() || undefined;
      const carYear = carYearInput?.value.trim() || undefined;
      const mileage = mileageInput?.value.trim() || undefined;
      const region = regionInput?.value.trim() || undefined;
      const isConsentChecked = privacyConsentInput?.checked;

      if (!carModel) {
        showToast('차종 및 세부 모델명을 입력해주세요.', 'REQUIRED');
        carModelInput?.focus();
        return;
      }

      if (!customerName) {
        showToast('신청인 성명을 입력해주세요.', 'REQUIRED');
        customerNameInput?.focus();
        return;
      }

      const phoneDigits = rawPhone.replace(/[^0-9]/g, '');
      if (!phoneDigits || phoneDigits.length < 10) {
        showToast('유효한 휴대전화 번호(10~11자리)를 입력해주세요.', 'REQUIRED');
        customerPhoneInput?.focus();
        return;
      }

      if (!isConsentChecked) {
        showToast('개인정보 수집 및 이용에 동의해주세요.', 'REQUIRED');
        privacyConsentInput?.focus();
        return;
      }

      // Submit Payload
      const payload = {
        customerName,
        customerPhone: rawPhone,
        carModel,
        carNumber,
        carYear,
        mileage,
        region,
      };

      // Set Loading State
      submitBtn.disabled = true;
      submitBtnText.textContent = '시세 조회 접수 중...';

      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Api-Key': currentApiKey,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.status === 201) {
          if (successLeadId) successLeadId.textContent = data.leadId || '접수 완료';
          if (successSiteName) successSiteName.textContent = currentSiteName;
          successModal.classList.add('active');
          leadForm.reset();
        } else if (response.status === 409) {
          showToast(
            '이미 접수된 연락처입니다. 전담 평가사가 곧 안내 전화를 드릴 예정입니다.',
            'DUPLICATE'
          );
        } else {
          showToast(data.error || '시세 조회 신청 중 오류가 발생했습니다.', 'ERROR');
        }
      } catch (err) {
        console.error('Lead Submission Error:', err);
        showToast('네트워크 연결을 확인한 후 다시 시도해주세요.', 'ERROR');
      } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = '매입 시세 조회 및 확정 견적 신청';
      }
    });
  }

  // Run Bootstrap
  initPresets();
})();
