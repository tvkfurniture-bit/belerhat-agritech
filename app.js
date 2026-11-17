/**
 * ============================================================================
 * BELERHAT AGRITECH — PUBLIC STOREFRONT APPLICATION (app.js)
 * ============================================================================
 * Connects GitHub Pages static frontend to Google Apps Script PublicApi.gs
 * using CORS-safe GET and text/plain POST with redirect: 'follow'.
 * ============================================================================
 */

// IMPORTANT: Paste your deployed Google Apps Script Public API (/exec) URL below:
const PUBLIC_API_URL = 'REPLACE_WITH_YOUR_PUBLIC_API_EXEC_URL';

const APP_STATE = {
  lang: localStorage.getItem('belerhat_lang') || 'bn',
  settings: {},
  categories: [],
  equipment: [],
  rentalRates: [],
  spareParts: [],
  servicePhotoDataUrl: '',
  servicePhotoName: '',
  formOpenedAt: Date.now() - 3000
};

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('yearNow').textContent = String(new Date().getFullYear());
  setMinDates();
  applyLanguage(APP_STATE.lang);
  handleInitialRoute();
  window.addEventListener('hashchange', handleInitialRoute);
  fetchPublicBootstrap();
});

function setMinDates() {
  const today = new Date().toISOString().slice(0, 10);
  const rentDate = document.getElementById('rentDate');
  const serviceDate = document.getElementById('serviceDate');
  if (rentDate) rentDate.min = today;
  if (serviceDate) serviceDate.min = today;
}

/**
 * ============================================================================
 * PUBLIC API BOOTSTRAP (GET)
 * ============================================================================
 */
async function fetchPublicBootstrap() {
  if (!PUBLIC_API_URL || PUBLIC_API_URL.indexOf('REPLACE_WITH_') === 0) {
    renderEmptyAfterInit();
    toast('Configure PUBLIC_API_URL in app.js to load live catalogue.');
    return;
  }

  try {
    const url = PUBLIC_API_URL + (PUBLIC_API_URL.indexOf('?') === -1 ? '?' : '&') + 'action=getPublicBootstrap';
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const json = await res.json();
    if (!json || !json.ok || !json.data) {
      throw new Error((json && json.error) || 'Invalid server response');
    }

    APP_STATE.settings = json.data.settings || {};
    APP_STATE.categories = json.data.categories || [];
    APP_STATE.equipment = json.data.equipment || [];
    APP_STATE.rentalRates = json.data.rentalRates || [];
    APP_STATE.spareParts = json.data.spareParts || [];

    if (!localStorage.getItem('belerhat_lang') && APP_STATE.settings.default_language) {
      APP_STATE.lang = APP_STATE.settings.default_language === 'en' ? 'en' : 'bn';
    }

    applyLanguage(APP_STATE.lang);
    populateDropdowns();
    applyBusinessSettings();
    renderAllDynamicViews();
    checkDeepLinkedEquipment();
  } catch (err) {
    console.error('Bootstrap error:', err);
    renderEmptyAfterInit();
    toast(t('msg_submit_error'));
  }
}

function renderEmptyAfterInit() {
  renderFeatured();
  renderCatalogue();
  renderSpareParts();
}

/**
 * ============================================================================
 * BILINGUAL ENGINE (BENGALI DEFAULT + ENGLISH)
 * ============================================================================
 */
function setLanguage(lang) {
  APP_STATE.lang = lang === 'en' ? 'en' : 'bn';
  localStorage.setItem('belerhat_lang', APP_STATE.lang);
  applyLanguage(APP_STATE.lang);
  applyBusinessSettings();
  populateDropdowns();
  renderAllDynamicViews();
}

function t(key) {
  const dict = (window.BELERHAT_I18N && window.BELERHAT_I18N[APP_STATE.lang]) || {};
  const fallback = (window.BELERHAT_I18N && window.BELERHAT_I18N.en) || {};
  return dict[key] || fallback[key] || key;
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.getElementById('btnLangBn').classList.toggle('active', lang === 'bn');
  document.getElementById('btnLangEn').classList.toggle('active', lang === 'en');

  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  const seoTitle = document.getElementById('seoTitle');
  const seoDesc = document.getElementById('seoDesc');
  if (seoTitle) {
    document.title = t('seo_title');
    seoTitle.textContent = t('seo_title');
  }
  if (seoDesc) seoDesc.setAttribute('content', t('seo_desc'));

  updatePrivacyNotices();
}

function updatePrivacyNotices() {
  const s = APP_STATE.settings || {};
  const fallbackBn = 'আপনার অনুসন্ধানের উত্তর দেওয়ার জন্য শুধুমাত্র প্রয়োজনীয় যোগাযোগ ও কাজের তথ্য সংগ্রহ করা হয়। আপনার তথ্য কখনোই বিক্রি করা হয় না এবং মেরামতির ছবি সম্পূর্ণ গোপন রাখা হয়।';
  const fallbackEn = 'We collect only the contact and service details needed to respond to your enquiry. Your details are never sold and repair photos remain strictly private.';
  const noticeText = APP_STATE.lang === 'bn'
    ? (s.privacy_notice_bn || fallbackBn)
    : (s.privacy_notice_en || fallbackEn);

  document.querySelectorAll('[data-privacy-notice]').forEach(function (el) {
    el.textContent = noticeText;
  });
}

/**
 * ============================================================================
 * DYNAMIC BUSINESS CONFIGURATION & SEO METADATA
 * ============================================================================
 */
function applyBusinessSettings() {
  const s = APP_STATE.settings || {};
  const isBn = APP_STATE.lang === 'bn';

  const bName = isBn ? (s.business_name_bn || s.business_name || 'বেলেরহাট অ্যাগ্রিটেক') : (s.business_name || 'Belerhat AgriTech');
  const tagline = isBn ? (s.tagline_bn || s.tagline || '') : (s.tagline || '');
  const address = isBn ? (s.address_bn || s.address || 'বেলেরহাট, পূর্ব বর্ধমান, পশ্চিমবঙ্গ') : (s.address || 'Belerhat, Purba Bardhaman, West Bengal');
  const hours = isBn ? (s.business_hours_bn || s.business_hours || '') : (s.business_hours || '');
  const areas = isBn ? (s.service_areas_bn || s.service_areas || '') : (s.service_areas || '');
  const rentalPolicy = isBn ? (s.rental_policy_bn || s.rental_policy || '') : (s.rental_policy || '');
  const deliveryPolicy = isBn ? (s.delivery_policy_bn || s.delivery_policy || '') : (s.delivery_policy || '');

  const phone = s.phone_number || '+91-0000000000';
  const telHref = 'tel:' + phone.replace(/[^+\d]/g, '');
  const waHref = buildWhatsAppUrl(isBn ? 'নমস্কার, আমি কৃষি যন্ত্রপাতি সম্পর্কে জানতে চাই।' : 'Hello Belerhat AgriTech, I would like to enquire about agricultural equipment.');

  setText('brandName', bName);
  setText('brandTagline', tagline);
  setText('footerBrandName', bName);
  setText('footerTagline', tagline);
  setText('footerCopyName', s.business_name || 'Belerhat AgriTech');
  setText('topLocationText', '📍 ' + address);
  setText('topPhoneText', phone);
  setText('homeServiceAreas', areas || address);
  setText('contactAddress', address);
  setText('footerAddress', address);
  setText('contactPhone', phone);
  setText('footerPhone', phone);
  setText('contactEmail', s.email || '');
  setText('contactHours', hours);
  setText('contactAreas', areas);
  setText('contactWaText', t('wa_chat_text'));
  setText('rentalPolicyBox', rentalPolicy);
  setText('deliveryPolicyBox', deliveryPolicy);

  ['topPhoneLink', 'ctaCallBtn', 'contactPhoneLink', 'stickyCall'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.href = telHref;
  });

  ['headerWaBtn', 'heroWaBtn', 'ctaWaBtn', 'contactWaLink', 'contactWaBtn', 'stickyWa'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.href = waHref;
  });

  const emailLink = document.getElementById('contactEmailLink');
  if (emailLink && s.email) emailLink.href = 'mailto:' + s.email;

  const mapBtn = document.getElementById('contactMapBtn');
  if (mapBtn) {
    if (s.google_maps_url) {
      mapBtn.href = s.google_maps_url;
      mapBtn.classList.remove('hidden');
    } else {
      mapBtn.classList.add('hidden');
    }
  }

  if (s.logo_url) {
    const logoWrap = document.getElementById('brandLogoWrap');
    logoWrap.innerHTML = '<img src="' + escAttr(s.logo_url) + '" alt="' + escAttr(bName) + '" />';
  }

  const socialHtml = [];
  if (s.facebook_url) socialHtml.push('<a href="' + escAttr(s.facebook_url) + '" target="_blank" rel="noopener">Facebook</a>');
  if (s.youtube_url) socialHtml.push('<a href="' + escAttr(s.youtube_url) + '" target="_blank" rel="noopener">YouTube</a>');
  if (s.instagram_url) socialHtml.push('<a href="' + escAttr(s.instagram_url) + '" target="_blank" rel="noopener">Instagram</a>');
  document.getElementById('socialLinksWrap').innerHTML = socialHtml.join('');

  // Enrich LocalBusiness JSON-LD accurately
  const ldEl = document.getElementById('ldJsonLocalBusiness');
  if (ldEl) {
    const ldObj = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: s.business_name || 'Belerhat AgriTech',
      description: s.tagline || 'Agricultural equipment sales, rental, repair and spare parts.',
      telephone: phone,
      email: s.email || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: s.address || 'Belerhat',
        addressLocality: 'Belerhat',
        addressRegion: 'Purba Bardhaman, West Bengal',
        addressCountry: 'IN'
      },
      areaServed: s.service_areas || 'Purba Bardhaman, West Bengal'
    };
    ldEl.textContent = JSON.stringify(ldObj);
  }

  updatePrivacyNotices();
}

/**
 * ============================================================================
 * ROUTING & DROPDOWNS
 * ============================================================================
 */
function navigateTo(route) {
  const valid = ['home', 'catalogue', 'rental', 'sales', 'service', 'parts', 'about', 'contact'];
  const target = valid.indexOf(route) !== -1 ? route : 'home';

  document.querySelectorAll('.page-section').forEach(function (sec) {
    sec.classList.toggle('active', sec.id === 'page-' + target);
  });
  document.querySelectorAll('.nav-link').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-route') === target);
  });

  document.getElementById('mainNav').classList.remove('open');
  APP_STATE.formOpenedAt = Date.now();
  if (window.location.hash !== '#' + target) {
    history.replaceState(null, '', '#' + target);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleInitialRoute() {
  const raw = (window.location.hash || '#home').replace('#', '');
  if (raw.indexOf('equipment=') === 0) {
    navigateTo('catalogue');
    return;
  }
  navigateTo(raw);
}

function checkDeepLinkedEquipment() {
  const raw = (window.location.hash || '').replace('#', '');
  if (raw.indexOf('equipment=') === 0) {
    const eqId = raw.split('=')[1];
    if (eqId) openEquipmentDetail(eqId);
  }
}

function toggleMobileNav() {
  document.getElementById('mainNav').classList.toggle('open');
}

function populateDropdowns() {
  const isBn = APP_STATE.lang === 'bn';
  const catOptions = ['<option value="ALL">' + esc(t('opt_all_categories')) + '</option>'].concat(
    APP_STATE.categories.map(function (c) {
      return '<option value="' + escAttr(c.id) + '">' + esc(isBn ? c.nameBn : c.name) + '</option>';
    })
  ).join('');

  const catFilter = document.getElementById('catCategoryFilter');
  const partsFilter = document.getElementById('partsCatFilter');
  const prevCat = catFilter.value;
  const prevParts = partsFilter.value;
  catFilter.innerHTML = catOptions;
  partsFilter.innerHTML = catOptions;
  if (prevCat) catFilter.value = prevCat;
  if (prevParts) partsFilter.value = prevParts;

  // Rental dropdown (only For_Rent equipment)
  const rentSelect = document.getElementById('rentEqSelect');
  const prevRent = rentSelect.value;
  const rentOpts = ['<option value="GENERAL">' + esc(t('opt_general_machine')) + '</option>'].concat(
    APP_STATE.equipment.filter(function (e) { return e.forRent; }).map(function (e) {
      const label = (isBn ? e.nameBn : e.name) + (e.brand ? ' (' + e.brand + ')' : '');
      return '<option value="' + escAttr(e.id) + '">' + esc(label) + '</option>';
    })
  ).join('');
  rentSelect.innerHTML = rentOpts;
  if (prevRent) rentSelect.value = prevRent;
  onRentEquipmentChange();

  // Sales dropdown (only For_Sale equipment)
  const salesSelect = document.getElementById('salesEqSelect');
  const prevSales = salesSelect.value;
  const salesOpts = ['<option value="GENERAL">' + esc(t('opt_general_sales')) + '</option>'].concat(
    APP_STATE.equipment.filter(function (e) { return e.forSale; }).map(function (e) {
      const label = (isBn ? e.nameBn : e.name) + (e.brand ? ' (' + e.brand + ')' : '');
      return '<option value="' + escAttr(e.id) + '">' + esc(label) + '</option>';
    })
  ).join('');
  salesSelect.innerHTML = salesOpts;
  if (prevSales) salesSelect.value = prevSales;
}

/**
 * ============================================================================
 * EQUIPMENT & SPARE PARTS RENDERING
 * ============================================================================
 */
function renderAllDynamicViews() {
  renderFeatured();
  renderCatalogue();
  renderSpareParts();
}

function getCatName(catId) {
  const c = APP_STATE.categories.find(function (x) { return x.id === catId; });
  if (!c) return '';
  return APP_STATE.lang === 'bn' ? c.nameBn : c.name;
}

function getEqName(eq) {
  return APP_STATE.lang === 'bn' ? (eq.nameBn || eq.name) : eq.name;
}

function getMinPublicRentalRate(eqId) {
  const rates = APP_STATE
