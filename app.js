/**
 * ============================================================================
 * BELERHAT AGRITECH — PUBLIC STOREFRONT APPLICATION v2.2 (app.js)
 * ============================================================================
 * Improvements Included:
 *   - Server-signed bootTs/bootSig + submittedAt (100% clock-skew-proof)
 *   - Privacy Policy (?page=privacy) & Terms & Conditions (?page=terms) routing
 *   - Owner-verified Testimonials rendering (hidden if empty — zero fake data)
 *   - Client-side <canvas> photo auto-compression (handles 5-12 MB phone photos)
 *   - Self-service Enquiry Status Lookup (?action=checkEnquiryStatus)
 *   - Homepage 10-Category Tiles, Crop/Season Finder & Quick Search wiring
 *   - Dynamic Hero & Workshop photo slots from Admin Settings
 * ============================================================================
 */

// IMPORTANT: Replace this placeholder with your deployed PublicApi.gs (/exec) URL:
const PUBLIC_API_URL = 'https://script.google.com/macros/s/AKfycbyXQrxWGrEltWDhu3WT5VcDWgNdWUN2AO89LMkpXKMPr5VHqGWmkjDAR_Srfl5O_Ax0/exec';

const DEFAULT_CATEGORIES_FALLBACK = [
  { id: 'CAT-01', name: 'Land Preparation Equipment', nameBn: 'জমি তৈরির যন্ত্রপাতি' },
  { id: 'CAT-02', name: 'Paddy Cultivation Machinery', nameBn: 'ধান চাষের যন্ত্রপাতি' },
  { id: 'CAT-03', name: 'Harvesting Equipment', nameBn: 'ফসল কাটার যন্ত্রপাতি' },
  { id: 'CAT-04', name: 'Vegetable & Potato Farming Equipment', nameBn: 'সবজি ও আলু চাষের যন্ত্র' },
  { id: 'CAT-05', name: 'Spraying Equipment', nameBn: 'স্প্রে করার যন্ত্র' },
  { id: 'CAT-06', name: 'Irrigation Equipment', nameBn: 'সেচ যন্ত্রপাতি' },
  { id: 'CAT-07', name: 'Post-Harvest Processing Machinery', nameBn: 'ফসল পরবর্তী প্রক্রিয়াকরণ যন্ত্র' },
  { id: 'CAT-08', name: 'Manual Agricultural Tools', nameBn: 'হাতের কৃষি সরঞ্জাম' },
  { id: 'CAT-09', name: 'Precision Farming Equipment', nameBn: 'আধুনিক ও নিখুঁত কৃষি যন্ত্র' },
  { id: 'CAT-10', name: 'Spare Parts & Accessories', nameBn: 'স্পেয়ার পার্টস ও অ্যাক্সেসরিজ' }
];

const CATEGORY_ICONS = {
  'CAT-01': '🚜', 'CAT-02': '🌾', 'CAT-03': '✂️', 'CAT-04': '🥔', 'CAT-05': '🌿',
  'CAT-06': '💧', 'CAT-07': '⚙️', 'CAT-08': '🛠️', 'CAT-09': '📡', 'CAT-10': '🔩'
};

const APP_STATE = {
  lang: localStorage.getItem('belerhat_lang') || 'bn',
  settings: {},
  categories: DEFAULT_CATEGORIES_FALLBACK.slice(),
  equipment: [],
  rentalRates: [],
  spareParts: [],
  bootTs: '',
  bootSig: '',
  servicePhotoDataUrl: '',
  servicePhotoName: '',
  formOpenedAt: Date.now() - 3000
};

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('yearNow').textContent = String(new Date().getFullYear());
  setMinDates();
  applyLanguage(APP_STATE.lang);
  renderHomeCategories();
  handleInitialRoute();
  window.addEventListener('popstate', handleInitialRoute);
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
    return;
  }

  try {
    const sep = PUBLIC_API_URL.indexOf('?') === -1 ? '?' : '&';
    const url = PUBLIC_API_URL + sep + 'action=getPublicBootstrap';
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const json = await res.json();
    if (!json || !json.ok || !json.data) {
      throw new Error((json && json.error) || 'Invalid server response');
    }

    APP_STATE.settings = json.data.settings || {};
    APP_STATE.categories = (json.data.categories && json.data.categories.length)
      ? json.data.categories
      : DEFAULT_CATEGORIES_FALLBACK.slice();
    APP_STATE.equipment = json.data.equipment || [];
    APP_STATE.rentalRates = json.data.rentalRates || [];
    APP_STATE.spareParts = json.data.spareParts || [];
    APP_STATE.bootTs = json.data.bootTs || '';
    APP_STATE.bootSig = json.data.bootSig || '';
    if (window.saveBootCache) window.saveBootCache(json.data);

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
  if (APP_STATE.equipment.length) return;
  populateDropdowns();
  renderAllDynamicViews();
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
 * DYNAMIC BUSINESS CONFIGURATION, TESTIMONIALS & SEO
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
  const waHref = buildWhatsAppUrl(isBn
    ? 'নমস্কার, আমি কৃষি যন্ত্রপাতি সম্পর্কে জানতে চাই।'
    : 'Hello Belerhat AgriTech, I would like to enquire about agricultural equipment.');

  setText('brandName', bName);
  setText('brandTagline', tagline);
  setText('footerBrandName', bName);
  setText('footerTagline', tagline);
  setText('footerCopyName', s.business_name || 'Belerhat AgriTech');
  setText('topLocationText', '📍 ' + address);
  setText('topPhoneText', phone);
  setText('homeServiceAreas', areas || address);
  setText('homeAddressText', address);
  setText('homeHoursText', hours);
  setText('homePhoneText', phone);
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

  ['topPhoneLink', 'ctaCallBtn', 'contactPhoneLink', 'homePhoneLink', 'stickyCall'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.href = telHref;
  });

  ['headerWaBtn', 'heroWaBtn', 'ctaWaBtn', 'contactWaLink', 'contactWaBtn', 'stickyWa'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.href = waHref;
  });

  const emailLink = document.getElementById('contactEmailLink');
  if (emailLink && s.email) emailLink.href = 'mailto:' + s.email;

  ['contactMapBtn', 'homeMapBtn'].forEach(function (id) {
    const mapBtn = document.getElementById(id);
    if (mapBtn) {
      if (s.google_maps_url) {
        mapBtn.href = s.google_maps_url;
        mapBtn.classList.remove('hidden');
      } else {
        mapBtn.classList.add('hidden');
      }
    }
  });

  const heroBox = document.getElementById('heroPhotoBox');
  const heroImg = document.getElementById('heroPhotoImg');
  if (heroBox && heroImg) {
    if (s.hero_image_url) {
      heroImg.src = s.hero_image_url;
      heroBox.classList.remove('hidden');
    } else {
      heroBox.classList.add('hidden');
    }
  }

  const wsWrap = document.getElementById('workshopPhotoWrap');
  const wsImg = document.getElementById('workshopPhotoImg');
  if (wsWrap && wsImg) {
    if (s.workshop_image_url) {
      wsImg.src = s.workshop_image_url;
      wsWrap.classList.remove('hidden');
    } else {
      wsWrap.classList.add('hidden');
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

  renderTestimonials();
  updatePrivacyNotices();
}

function renderTestimonials() {
  const sec = document.getElementById('homeTestimonialsSection');
  const grid = document.getElementById('testimonialsGrid');
  if (!sec || !grid) return;

  let list = [];
  try {
    list = JSON.parse((APP_STATE.settings && APP_STATE.settings.verified_testimonials_json) || '[]');
  } catch (ignore) { list = []; }

  if (!Array.isArray(list) || !list.length) {
    sec.classList.add('hidden');
    grid.innerHTML = '';
    return;
  }

  const isBn = APP_STATE.lang === 'bn';
  sec.classList.remove('hidden');
  grid.innerHTML = list.map(function (item) {
    const quote = isBn ? (item.quoteBn || item.quote) : (item.quote || item.quoteBn);
    return (
      '<article class="testimonial-card">' +
        '<p class="testimonial-quote">“' + esc(quote) + '”</p>' +
        '<div>' +
          '<div class="testimonial-author">' + esc(item.name) + '</div>' +
          (item.village ? '<div class="testimonial-village">📍 ' + esc(item.village) + '</div>' : '') +
        '</div>' +
      '</article>'
    );
  }).join('');
}

/**
 * ============================================================================
 * CRAWL-FRIENDLY ROUTING (?page=... + #hash fallback)
 * ============================================================================
 */
function navigateTo(route, updateUrl) {
  const valid = ['home', 'catalogue', 'rental', 'sales', 'service', 'parts', 'about', 'contact', 'privacy', 'terms'];
  const target = valid.indexOf(route) !== -1 ? route : 'home';

  document.querySelectorAll('.page-section').forEach(function (sec) {
    sec.classList.toggle('active', sec.id === 'page-' + target);
  });
  document.querySelectorAll('.nav-link').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('data-route') === target);
  });

  document.getElementById('mainNav').classList.remove('open');
  APP_STATE.formOpenedAt = Date.now();

  if (updateUrl !== false) {
    const nextUrl = target === 'home' ? window.location.pathname : (window.location.pathname + '?page=' + target);
    if (nextUrl !== window.location.pathname + window.location.search) history.pushState(null, '', nextUrl);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleInitialRoute() {
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page');
  const eqParam = params.get('eq');
  const hashRaw = (window.location.hash || '').replace('#', '');

  if (eqParam || hashRaw.indexOf('equipment=') === 0) {
    navigateTo('catalogue', false);
    return;
  }
  if (pageParam) {
    navigateTo(pageParam, false);
    return;
  }
  if (hashRaw) {
    navigateTo(hashRaw, false);
    return;
  }
  navigateTo('home', false);
}

function checkDeepLinkedEquipment() {
  const params = new URLSearchParams(window.location.search);
  let eqId = params.get('eq');
  if (!eqId) {
    const hashRaw = (window.location.hash || '').replace('#', '');
    if (hashRaw.indexOf('equipment=') === 0) eqId = hashRaw.split('=')[1];
  }
  if (eqId) openEquipmentDetail(eqId);
}

function toggleMobileNav() {
  document.getElementById('mainNav').classList.toggle('open');
}

function runHomeQuickSearch(dest) {
  const q = (document.getElementById('homeQuickSearchInput').value || '').trim();
  if (dest === 'parts') {
    document.getElementById('partsSearch').value = q;
    navigateTo('parts');
    renderSpareParts();
  } else {
    document.getElementById('catSearch').value = q;
    document.getElementById('catCategoryFilter').value = 'ALL';
    document.getElementById('catCropFilter').value = 'ALL';
    navigateTo('catalogue');
    renderCatalogue();
  }
}

function filterCatalogueByCategory(catId) {
  if (catId === 'CAT-10') {
    navigateTo('parts');
    renderSpareParts();
    return;
  }
  document.getElementById('catCategoryFilter').value = catId;
  document.getElementById('catCropFilter').value = 'ALL';
  document.getElementById('catSearch').value = '';
  navigateTo('catalogue');
  renderCatalogue();
}

function filterCatalogueByCrop(cropCode) {
  document.getElementById('catCategoryFilter').value = 'ALL';
  document.getElementById('catSearch').value = '';
  document.getElementById('catCropFilter').value = cropCode;
  navigateTo('catalogue');
  renderCatalogue();
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
 * EQUIPMENT, CATEGORY TILES & SPARE PARTS RENDERING
 * ============================================================================
 */
function renderAllDynamicViews() {
  renderHomeCategories();
  renderFeatured();
  renderCatalogue();
  renderSpareParts();
  renderTestimonials();
}

function renderHomeCategories() {
  const wrap = document.getElementById('homeCategoryGrid');
  if (!wrap) return;
  const isBn = APP_STATE.lang === 'bn';
  wrap.innerHTML = APP_STATE.categories.map(function (c) {
    const icon = CATEGORY_ICONS[c.id] || '🚜';
    const label = isBn ? (c.nameBn || c.name) : c.name;
    return (
      '<button type="button" class="cat-tile" onclick="filterCatalogueByCategory(\'' + escAttr(c.id) + '\')">' +
        '<span class="cat-tile-icon">' + icon + '</span>' +
        '<span class="cat-tile-name">' + esc(label) + '</span>' +
      '</button>'
    );
  }).join('');
}

function getCatName(catId) {
  const c = APP_STATE.categories.find(function (x) { return x.id === catId; });
  if (!c) return '';
  return APP_STATE.lang === 'bn' ? c.nameBn : c.name;
}

function getEqName(eq) {
  return APP_STATE.lang === 'bn' ? (eq.nameBn || eq.name) : eq.name;
}

function getEqDesc(eq) {
  return APP_STATE.lang === 'bn' ? (eq.descriptionBn || eq.description) : eq.description;
}

function getEqSpecs(eq) {
  return APP_STATE.lang === 'bn' ? (eq.specificationsBn || eq.specifications) : eq.specifications;
}

function getEqApps(eq) {
  return APP_STATE.lang === 'bn' ? (eq.suitableApplicationsBn || eq.suitableApplications) : eq.suitableApplications;
}

function getPublicRatesForEq(eqId) {
  return APP_STATE.rentalRates.filter(function (r) { return r.equipmentId === eqId; });
}

function formatAvailability(status) {
  return t('avail_' + status) || status;
}

function buildEquipmentCardHtml(eq) {
  const name = getEqName(eq);
  const catName = getCatName(eq.categoryId);
  const imgUrl = eq.imageUrls && eq.imageUrls.length ? eq.imageUrls[0] : '';
  const rates = getPublicRatesForEq(eq.id).filter(function (r) { return r.rateAmount !== null; });

  const priceBits = [];
  if (eq.forSale) {
    if (eq.salePrice !== null) {
      priceBits.push(t('lbl_sale_price') + ' ₹' + Number(eq.salePrice).toLocaleString('en-IN'));
    } else {
      priceBits.push(t('lbl_for_sale') + ' — ' + t('lbl_price_quote'));
    }
  }
  if (eq.forRent) {
    if (rates.length) {
      const first = rates[0];
      priceBits.push(t('lbl_rent_from') + ' ₹' + Number(first.rateAmount).toLocaleString('en-IN') + ' / ' + t('unit_' + first.rateType));
    } else {
      priceBits.push(t('lbl_for_rent') + ' — ' + t('lbl_price_quote'));
    }
  }

  const waUrl = buildWhatsAppUrl(
    (APP_STATE.lang === 'bn' ? 'নমস্কার, আমি এই যন্ত্রটি সম্পর্কে জানতে চাই: ' : 'Hello, I am interested in: ') + name
  );

  return (
    '<article class="product-card">' +
      '<div class="product-img-wrap">' +
        (imgUrl
          ? '<img src="' + escAttr(imgUrl) + '" alt="' + escAttr(name) + '" loading="lazy" />'
          : '<div class="product-img-placeholder">🚜 ' + esc(name) + '</div>') +
      '</div>' +
      '<div class="product-body">' +
        '<div class="product-cat">' + esc(catName) + '</div>' +
        '<h3 class="product-title">' + esc(name) + '</h3>' +
        '<div class="product-meta">' + esc([eq.brand, eq.model].filter(Boolean).join(' • ')) + '</div>' +
        '<div class="product-badges">' +
          '<span class="avail-pill avail-' + escAttr(eq.availabilityStatus) + '">' + esc(formatAvailability(eq.availabilityStatus)) + '</span>' +
          (eq.forSale ? '<span class="avail-pill pill-sale">' + esc(t('lbl_for_sale')) + '</span>' : '') +
          (eq.forRent ? '<span class="avail-pill pill-rent">' + esc(t('lbl_for_rent')) + '</span>' : '') +
        '</div>' +
        (priceBits.length ? '<div class="product-price-row">' + priceBits.map(esc).join('<br>') + '</div>' : '') +
        '<div class="product-actions">' +
          '<button type="button" class="btn btn-outline btn-sm full-btn" onclick="openEquipmentDetail(\'' + escAttr(eq.id) + '\')">' + esc(t('lbl_view_specs')) + '</button>' +
          (eq.forSale ? '<button type="button" class="btn btn-primary btn-sm" onclick="goToEnquiryWithMachine(\'SALES\', \'' + escAttr(eq.id) + '\')">' + esc(t('lbl_sales_enq')) + '</button>' : '') +
          (eq.forRent ? '<button type="button" class="btn btn-amber btn-sm" onclick="goToEnquiryWithMachine(\'RENTAL\', \'' + escAttr(eq.id) + '\')">' + esc(t('lbl_rent_enq')) + '</button>' : '') +
          '<a href="' + escAttr(waUrl) + '" target="_blank" rel="noopener" class="btn btn-wa btn-sm full-btn">💬 ' + esc(t('btn_whatsapp')) + '</a>' +
        '</div>' +
      '</div>' +
    '</article>'
  );
}

function renderFeatured() {
  const wrap = document.getElementById('featuredGrid');
  let featured = APP_STATE.equipment.filter(function (e) { return e.isFeatured; });
  if (!featured.length) featured = APP_STATE.equipment.slice(0, 6);
  if (!featured.length) {
    wrap.innerHTML =
      '<div class="empty-state">' +
        '<p style="margin:0 0 12px;">' + esc(t('msg_cold_start_cta')) + '</p>' +
        '<div class="btn-row" style="justify-content:center;">' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="navigateTo(\'rental\')">' + esc(t('cta_rent_enquiry')) + '</button>' +
          '<button type="button" class="btn btn-outline btn-sm" onclick="navigateTo(\'sales\')">' + esc(t('lbl_sales_enq')) + '</button>' +
        '</div>' +
      '</div>';
    return;
  }
  wrap.innerHTML = featured.slice(0, 6).map(buildEquipmentCardHtml).join('');
}

function matchesCropFilter(eq, cropCode) {
  if (!cropCode || cropCode === 'ALL') return true;
  const tags = String(eq.cropTags || '').toUpperCase();
  if (tags.indexOf(cropCode) !== -1) return true;

  const hay = [eq.name, eq.description, eq.suitableApplications].join(' ').toUpperCase();
  if (cropCode === 'PADDY') return eq.categoryId === 'CAT-02' || eq.categoryId === 'CAT-01' || hay.indexOf('PADDY') !== -1 || hay.indexOf('RICE') !== -1;
  if (cropCode === 'POTATO') return eq.categoryId === 'CAT-04' || hay.indexOf('POTATO') !== -1 || hay.indexOf('VEGETABLE') !== -1;
  if (cropCode === 'SPRAYING') return eq.categoryId === 'CAT-05' || eq.categoryId === 'CAT-06' || hay.indexOf('SPRAY') !== -1 || hay.indexOf('PUMP') !== -1;
  if (cropCode === 'HARVEST') return eq.categoryId === 'CAT-03' || eq.categoryId === 'CAT-07' || hay.indexOf('HARVEST') !== -1 || hay.indexOf('THRESH') !== -1;
  return false;
}

function renderCatalogue() {
  const wrap = document.getElementById('catalogueGrid');
  const q = (document.getElementById('catSearch').value || '').toLowerCase().trim();
  const cat = document.getElementById('catCategoryFilter').value;
  const crop = document.getElementById('catCropFilter').value;
  const mode = document.getElementById('catModeFilter').value;
  const avail = document.getElementById('catAvailFilter').value;

  const filtered = APP_STATE.equipment.filter(function (e) {
    if (cat !== 'ALL' && e.categoryId !== cat) return false;
    if (!matchesCropFilter(e, crop)) return false;
    if (mode === 'SALE' && !e.forSale) return false;
    if (mode === 'RENT' && !e.forRent) return false;
    if (avail !== 'ALL' && e.availabilityStatus !== avail) return false;
    if (q) {
      const hay = [e.name, e.nameBn, e.brand, e.model, e.description, e.descriptionBn, e.suitableApplications, e.cropTags].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  wrap.innerHTML = filtered.length
    ? filtered.map(buildEquipmentCardHtml).join('')
    : '<div class="empty-state">' + esc(t('msg_no_equipment')) + '</div>';
}

function openEquipmentDetail(eqId) {
  const eq = APP_STATE.equipment.find(function (e) { return e.id === eqId; });
  if (!eq) return;

  const name = getEqName(eq);
  document.getElementById('eqDetailTitle').textContent = name;

  const imgs = eq.imageUrls || [];
  let galleryHtml = '';
  if (imgs.length) {
    galleryHtml =
      '<div style="background:var(--sand-bg);border-radius:10px;overflow:hidden;max-height:300px;display:flex;justify-content:center;">' +
        '<img id="eqDetailMainImg" src="' + escAttr(imgs[0]) + '" alt="' + escAttr(name) + '" style="max-height:300px;object-fit:contain;" />' +
      '</div>' +
      (imgs.length > 1
        ? '<div class="gallery-thumbs">' + imgs.map(function (u, i) {
            return '<img src="' + escAttr(u) + '" class="gallery-thumb' + (i === 0 ? ' active' : '') + '" onclick="switchDetailImage(this, \'' + escAttr(u) + '\')" />';
          }).join('') + '</div>'
        : '');
  }

  const specLines = (getEqSpecs(eq) || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  let specsHtml = '';
  if (specLines.length) {
    specsHtml = '<h4>' + esc(t('lbl_specs')) + '</h4><table class="spec-table">' +
      specLines.map(function (line) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          return '<tr><td>' + esc(line.slice(0, idx).trim()) + '</td><td>' + esc(line.slice(idx + 1).trim()) + '</td></tr>';
        }
        return '<tr><td colspan="2">' + esc(line) + '</td></tr>';
      }).join('') + '</table>';
  }

  const rates = getPublicRatesForEq(eq.id);
  let ratesHtml = '';
  if (eq.forRent && rates.length) {
    ratesHtml = '<h4>' + esc(t('lbl_rental_rates')) + '</h4><table class="spec-table">' +
      rates.map(function (r) {
        const priceTxt = r.rateAmount !== null
          ? '₹' + Number(r.rateAmount).toLocaleString('en-IN')
          : t('lbl_price_quote');
        const extras = [];
        if (r.operatorIncluded) extras.push(t('lbl_operator_incl'));
        if (r.fuelIncluded) extras.push(t('lbl_fuel_incl'));
        if (r.notes) extras.push(r.notes);
        return '<tr><td>' + esc(t('unit_' + r.rateType)) + '</td><td><strong>' + esc(priceTxt) + '</strong>' +
          (extras.length ? '<br><span class="muted">' + esc(extras.join(' • ')) + '</span>' : '') + '</td></tr>';
      }).join('') + '</table>';
  }

  const waUrl = buildWhatsAppUrl(
    (APP_STATE.lang === 'bn' ? 'নমস্কার, আমি এই যন্ত্রটি সম্পর্কে বিস্তারিত জানতে চাই: ' : 'Hello, please share quotation & details for: ') + name
  );

  const appsText = getEqApps(eq);
  document.getElementById('eqDetailBody').innerHTML =
    galleryHtml +
    '<div style="margin-top:12px;">' +
      '<span class="avail-pill avail-' + escAttr(eq.availabilityStatus) + '">' + esc(formatAvailability(eq.availabilityStatus)) + '</span> ' +
      '<span class="muted">' + esc([eq.brand, eq.model].filter(Boolean).join(' • ')) + '</span>' +
    '</div>' +
    (getEqDesc(eq) ? '<p>' + esc(getEqDesc(eq)) + '</p>' : '') +
    (appsText ? '<p><strong>' + esc(t('lbl_suitable_apps')) + ':</strong> ' + esc(appsText) + '</p>' : '') +
    specsHtml +
    ratesHtml +
    '<div class="btn-row" style="margin-top:16px;">' +
      (eq.forSale ? '<button type="button" class="btn btn-primary" onclick="closeModal(\'eqDetailModal\');goToEnquiryWithMachine(\'SALES\', \'' + escAttr(eq.id) + '\')">' + esc(t('lbl_sales_enq')) + '</button>' : '') +
      (eq.forRent ? '<button type="button" class="btn btn-amber" onclick="closeModal(\'eqDetailModal\');goToEnquiryWithMachine(\'RENTAL\', \'' + escAttr(eq.id) + '\')">' + esc(t('lbl_rent_enq')) + '</button>' : '') +
      '<a href="' + escAttr(waUrl) + '" target="_blank" rel="noopener" class="btn btn-wa">💬 ' + esc(t('btn_whatsapp')) + '</a>' +
    '</div>' +
    '<div class="share-row">' +
      '<button type="button" class="btn btn-outline btn-sm" onclick="shareEquipment(\'' + escAttr(eq.id) + '\')">🔗 ' + esc(t('lbl_share')) + ' / ' + esc(t('lbl_copy_link')) + '</button>' +
    '</div>';

  openModal('eqDetailModal');
}

function switchDetailImage(thumbEl, url) {
  document.getElementById('eqDetailMainImg').src = url;
  document.querySelectorAll('.gallery-thumb').forEach(function (img) { img.classList.remove('active'); });
  thumbEl.classList.add('active');
}

function shareEquipment(eqId) {
  const eq = APP_STATE.equipment.find(function (e) { return e.id === eqId; });
  const shareUrl = window.location.origin + window.location.pathname + '?eq=' + encodeURIComponent(eqId);
  const title = eq ? getEqName(eq) : 'Belerhat AgriTech';

  if (navigator.share) {
    navigator.share({ title: title, url: shareUrl }).catch(function () {});
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(function () { toast(t('msg_link_copied')); });
  } else {
    toast(shareUrl);
  }
}

function goToEnquiryWithMachine(mode, eqId) {
  if (mode === 'RENTAL') {
    navigateTo('rental');
    const sel = document.getElementById('rentEqSelect');
    if (sel) {
      sel.value = eqId;
      onRentEquipmentChange();
    }
  } else {
    navigateTo('sales');
    const sel = document.getElementById('salesEqSelect');
    if (sel) sel.value = eqId;
  }
}

function onRentEquipmentChange() {
  const eqId = document.getElementById('rentEqSelect').value;
  const hint = document.getElementById('rentRateHint');
  if (!eqId || eqId === 'GENERAL') {
    hint.textContent = '';
    return;
  }
  const rates = getPublicRatesForEq(eqId).filter(function (r) { return r.rateAmount !== null; });
  if (!rates.length) {
    hint.textContent = t('lbl_price_quote');
    return;
  }
  hint.textContent = rates.map(function (r) {
    return '₹' + Number(r.rateAmount).toLocaleString('en-IN') + ' / ' + t('unit_' + r.rateType);
  }).join(' | ');
}

function renderSpareParts() {
  const wrap = document.getElementById('partsGrid');
  const q = (document.getElementById('partsSearch').value || '').toLowerCase().trim();
  const cat = document.getElementById('partsCatFilter').value;

  const filtered = APP_STATE.spareParts.filter(function (p) {
    if (cat !== 'ALL' && p.categoryId !== cat) return false;
    if (q) {
      const hay = [p.partCode, p.name, p.nameBn, p.compatibleMachine, p.brandModel, p.description].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  if (!filtered.length) {
    wrap.innerHTML = '<div class="empty-state">' + esc(t('msg_no_parts')) + '</div>';
    return;
  }

  wrap.innerHTML = filtered.map(function (p) {
    const pName = APP_STATE.lang === 'bn' ? (p.nameBn || p.name) : p.name;
    const priceText = p.price !== null
      ? '₹' + Number(p.price).toLocaleString('en-IN')
      : t('lbl_price_quote');
    return (
      '<article class="product-card">' +
        '<div class="product-img-wrap">' +
          (p.imageUrl
            ? '<img src="' + escAttr(p.imageUrl) + '" alt="' + escAttr(pName) + '" loading="lazy" />'
            : '<div class="product-img-placeholder">⚙️ ' + esc(pName) + '</div>') +
        '</div>' +
        '<div class="product-body">' +
          '<div class="product-cat">' + esc(getCatName(p.categoryId)) + (p.partCode ? ' • ' + esc(p.partCode) : '') + '</div>' +
          '<h3 class="product-title">' + esc(pName) + '</h3>' +
          '<div class="product-meta">' + esc([p.compatibleMachine, p.brandModel].filter(Boolean).join(' • ')) + '</div>' +
          '<div class="product-badges"><span class="avail-pill avail-' + escAttr(p.availabilityStatus) + '">' + esc(formatAvailability(p.availabilityStatus)) + '</span></div>' +
          '<div class="product-price-row">' + esc(priceText) + '</div>' +
          '<div class="product-actions">' +
            '<button type="button" class="btn btn-primary btn-sm full-btn" onclick="openPartEnquiryModal(\'' + escAttr(p.id) + '\')">' + esc(t('lbl_part_enq')) + '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join('');
}

function openPartEnquiryModal(partId) {
  APP_STATE.formOpenedAt = Date.now();
  const form = document.getElementById('partEnquiryForm');
  form.reset();
  const part = partId ? APP_STATE.spareParts.find(function (x) { return x.id === partId; }) : null;
  document.getElementById('pePartId').value = part ? part.id : 'GENERAL';
  document.getElementById('pePartName').value = part ? (APP_STATE.lang === 'bn' ? (part.nameBn || part.name) : part.name) : '';
  document.getElementById('peMachineBrand').value = part ? [part.compatibleMachine, part.brandModel].filter(Boolean).join(' — ') : '';
  openModal('partEnquiryModal');
}

/**
 * ============================================================================
 * SELF-SERVICE ENQUIRY STATUS TRACKER
 * ============================================================================
 */
function openTrackModal() {
  document.getElementById('trackResultBox').classList.add('hidden');
  document.getElementById('trackResultBox').innerHTML = '';
  openModal('trackStatusModal');
}

async function handleStatusLookup(event) {
  event.preventDefault();
  if (!PUBLIC_API_URL || PUBLIC_API_URL.indexOf('REPLACE_WITH_') === 0) {
    toast('Backend PUBLIC_API_URL is not configured.');
    return;
  }

  const refId = String(document.getElementById('trackRefInput').value || '').trim().toUpperCase();
  const phone = String(document.getElementById('trackPhoneInput').value || '').replace(/\D/g, '');
  const btn = document.getElementById('trackSubmitBtn');
  const box = document.getElementById('trackResultBox');

  if (!/^[6-9]\d{9}$/.test(phone)) {
    toast(t('msg_invalid_phone'));
    return;
  }

  btn.disabled = true;
  const origTxt = btn.textContent;
  btn.textContent = t('msg_checking_status');

  try {
    const sep = PUBLIC_API_URL.indexOf('?') === -1 ? '?' : '&';
    const url = PUBLIC_API_URL + sep + 'action=checkEnquiryStatus&refId=' + encodeURIComponent(refId) + '&phone=' + encodeURIComponent(phone);
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const json = await res.json();

    box.classList.remove('hidden');
    if (!json || !json.ok || !json.data) {
      box.innerHTML = '<span style="color:var(--danger);font-weight:700;">' + esc((json && json.error) || 'Not found') + '</span>';
      return;
    }

    const d = json.data;
    box.innerHTML =
      '<div><strong>' + esc(d.enquiryId) + '</strong></div>' +
      '<div>' + esc(t('lbl_item')) + ': <strong>' + esc(d.itemName) + '</strong></div>' +
      (d.preferredDate ? '<div>' + esc(t('lbl_pref_date')) + ' ' + esc(d.preferredDate) + '</div>' : '') +
      '<div>' + esc(t('lbl_status')) + ': <strong style="color:var(--green-900);">' + esc(d.status) + '</strong></div>' +
      (d.quotedAmount ? '<div>' + esc(t('lbl_quoted_amt')) + ': <strong>₹' + Number(d.quotedAmount).toLocaleString('en-IN') + '</strong></div>' : '') +
      '<div class="muted">' + esc(t('lbl_last_updated')) + ': ' + esc(String(d.updatedAt || '').slice(0, 16).replace('T', ' ')) + '</div>';
  } catch (err) {
    box.classList.remove('hidden');
    box.innerHTML = '<span style="color:var(--danger);">' + esc(t('msg_submit_error')) + '</span>';
  } finally {
    btn.disabled = false;
    btn.textContent = origTxt;
  }
}

/**
 * ============================================================================
 * REPAIR PHOTO AUTO-COMPRESSION (<canvas>) & PREVIEW
 * ============================================================================
 */
function previewServicePhoto(input) {
  const preview = document.getElementById('servicePhotoPreview');
  APP_STATE.servicePhotoDataUrl = '';
  APP_STATE.servicePhotoName = '';
  preview.innerHTML = '';

  const file = input.files && input.files[0];
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.indexOf(file.type) === -1) {
    input.value = '';
    toast(t('msg_img_invalid_type'));
    return;
  }

  preview.innerHTML = '<span class="muted">' + esc(t('msg_img_compressing')) + '</span>';
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      const maxDim = 1280;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
      APP_STATE.servicePhotoDataUrl = compressedDataUrl;
      APP_STATE.servicePhotoName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      preview.innerHTML = '<img src="' + compressedDataUrl + '" alt="Upload preview" />';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * ============================================================================
 * ENQUIRY FORM SUBMISSION (HARDENED POST)
 * ============================================================================
 */
async function handleEnquirySubmit(event, enquiryType) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!PUBLIC_API_URL || PUBLIC_API_URL.indexOf('REPLACE_WITH_') === 0) {
    toast('Backend PUBLIC_API_URL is not configured yet in app.js.');
    return;
  }

  const fd = new FormData(form);
  const phoneDigits = String(fd.get('phone') || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
    toast(t('msg_invalid_phone'));
    return;
  }

  const payload = {
    customerName: String(fd.get('customerName') || '').trim(),
    phone: phoneDigits,
    villageLocation: String(fd.get('villageLocation') || '').trim(),
    customerNotes: String(fd.get('customerNotes') || '').trim(),
    privacyConsent: Boolean(form.querySelector('input[name="privacyConsent"]').checked)
  };

  let itemSummary = '';

  if (enquiryType === 'RENTAL') {
    const eqId = String(fd.get('equipmentId') || 'GENERAL');
    const eq = APP_STATE.equipment.find(function (x) { return x.id === eqId; });
    payload.equipmentId = eqId;
    payload.equipmentName = eq ? eq.name : 'General Rental Machinery';
    payload.preferredDate = String(fd.get('preferredDate') || '');
    payload.durationValue = Number(fd.get('durationValue') || 1);
    payload.durationUnit = String(fd.get('durationUnit') || 'DAY');
    payload.farmingActivity = String(fd.get('farmingActivity') || '').trim();
    payload.landAreaAcres = String(fd.get('landAreaAcres') || '').trim();
    payload.operatorRequired = String(fd.get('operatorRequired') || 'UNSURE');
    payload.transportRequired = String(fd.get('transportRequired') || 'YES');
    itemSummary = payload.equipmentName + ' (' + payload.preferredDate + ', ' + payload.durationValue + ' ' + payload.durationUnit + ')';
  } else if (enquiryType === 'SALES') {
    const eqId = String(fd.get('equipmentId') || 'GENERAL');
    const eq = APP_STATE.equipment.find(function (x) { return x.id === eqId; });
    payload.equipmentId = eqId;
    payload.equipmentName = eq ? eq.name : 'General Equipment Sales';
    payload.quantity = Number(fd.get('quantity') || 1);
    payload.deliveryRequired = String(fd.get('deliveryRequired') || 'YES');
    payload.financingSubsidyInterest = String(fd.get('financingSubsidyInterest') || 'NA');
    payload.email = String(fd.get('email') || '').trim();
    itemSummary = payload.equipmentName + ' x' + payload.quantity;
  } else if (enquiryType === 'SERVICE') {
    payload.serviceCategory = String(fd.get('serviceCategory') || 'REPAIR');
    payload.equipmentType = String(fd.get('equipmentType') || '').trim();
    payload.brandModel = String(fd.get('brandModel') || '').trim();
    payload.preferredDate = String(fd.get('preferredDate') || '');
    payload.problemDescription = String(fd.get('problemDescription') || '').trim();
    if (APP_STATE.servicePhotoDataUrl) {
      payload.imageBase64 = APP_STATE.servicePhotoDataUrl;
      payload.imageName = APP_STATE.servicePhotoName;
    }
    itemSummary = payload.equipmentType + (payload.brandModel ? ' (' + payload.brandModel + ')' : '');
  } else if (enquiryType === 'SPARE_PART') {
    payload.partId = String(fd.get('partId') || 'GENERAL');
    payload.partName = String(fd.get('partName') || '').trim();
    payload.machineBrandModel = String(fd.get('machineBrandModel') || '').trim();
    payload.quantity = Number(fd.get('quantity') || 1);
    itemSummary = payload.partName + ' x' + payload.quantity;
  } else if (enquiryType === 'CONTACT') {
    itemSummary = 'General Contact Message';
  }

  submitBtn.disabled = true;
  const origBtnText = submitBtn.textContent;
  submitBtn.textContent = t('msg_submitting');

  try {
    const res = await fetch(PUBLIC_API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submitEnquiry',
        enquiryType: enquiryType,
        bootTs: APP_STATE.bootTs,
        bootSig: APP_STATE.bootSig,
        formOpenedAt: APP_STATE.formOpenedAt,
        submittedAt: Date.now(),
        hp_website: String(fd.get('hp_website') || ''),
        payload: payload
      })
    });

    const json = await res.json();
    if (!json || !json.ok || !json.data) {
      toast((json && json.error) || t('msg_submit_error'));
      return;
    }

    form.reset();
    APP_STATE.formOpenedAt = Date.now();
    if (enquiryType === 'SERVICE') {
      APP_STATE.servicePhotoDataUrl = '';
      APP_STATE.servicePhotoName = '';
      document.getElementById('servicePhotoPreview').innerHTML = '';
    }
    if (enquiryType === 'SPARE_PART') {
      closeModal('partEnquiryModal');
    }

    showSuccessModal(json.data.enquiryId, enquiryType, payload, itemSummary);
  } catch (err) {
    console.error('Submission error:', err);
    toast(t('msg_submit_error'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origBtnText;
  }
}

function showSuccessModal(refId, enquiryType, payload, itemSummary) {
  document.getElementById('successMsg').textContent = t('msg_success_body');
  document.getElementById('successRefId').textContent = refId;

  const waMsg = [
    'Belerhat AgriTech Enquiry Ref: ' + refId,
    'Type: ' + enquiryType,
    'Item: ' + itemSummary,
    'Name: ' + payload.customerName,
    'Mobile: ' + payload.phone,
    payload.villageLocation ? ('Location: ' + payload.villageLocation) : ''
  ].filter(Boolean).join('\n');

  document.getElementById('successWaLink').href = buildWhatsAppUrl(waMsg);
const refMsg = (APP_STATE.lang === 'bn'
  ? 'নমস্কার! আমি বেলেরহাট অ্যাগ্রিটেক থেকে কৃষি যন্ত্রপাতি সংক্রান্ত কাজ করিয়েছি। আপনিও যদি আধুনিক যন্ত্র ভাড়া নিতে বা কিনতে চান, তবে এই লিঙ্কে যোগাযোগ করুন: ' + window.location.origin + window.location.pathname + '\n\nবুকিং করার সময় আমার মোবাইল নম্বর (' + payload.phone + ') রেফারেন্স হিসেবে দিলে আপনিও বিশেষ ছাড় পাবেন!'
  : 'Hello! I used Belerhat AgriTech for agricultural machinery. If you need farm equipment rental or sales, check out this link: ' + window.location.origin + window.location.pathname + '\n\nQuote my mobile number (' + payload.phone + ') as a reference when booking to claim your special discount!');

document.getElementById('referralShareWaBtn').href = buildWhatsAppUrl(refMsg);
  openModal('successModal');
}

/**
 * ============================================================================
 * HELPERS
 * ============================================================================
 */
function buildWhatsAppUrl(message) {
  const rawNum = String((APP_STATE.settings && APP_STATE.settings.whatsapp_number) || '910000000000').replace(/\D/g, '');
  const fullNum = rawNum.length === 10 ? '91' + rawNum : rawNum;
  return 'https://wa.me/' + fullNum + '?text=' + encodeURIComponent(message || '');
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val || ''; }

function esc(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
function escAttr(v) { return esc(v); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window._publicToastTimer);
  window._publicToastTimer = setTimeout(function () { el.classList.remove('show'); }, 3600);
}
