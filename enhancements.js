/* Belerhat AgriTech — UX enhancements (load AFTER app.js). Safe to remove; app works without it. */
(function () {
  'use strict';
  var CACHE_KEY = 'belerhat_boot_v1';
  var MAX_AGE = 7 * 24 * 3600 * 1000;

  /* Accessible modals: scroll lock, role/aria, focus in & restore */
  window.openModal = function (id) {
    var bd = document.getElementById(id);
    if (!bd) return;
    bd.classList.add('open');
    var m = bd.querySelector('.modal');
    if (m) { m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); }
    document.body.style.overflow = 'hidden';
    window._lastFocus = document.activeElement;
    setTimeout(function () {
      var f = bd.querySelector('input:not(.hp-field):not([type=hidden]),select,textarea,.modal-close');
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
    }, 60);
  };
  window.closeModal = function (id) {
    var bd = document.getElementById(id);
    if (bd) bd.classList.remove('open');
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.style.overflow = '';
      if (window._lastFocus && window._lastFocus.focus) { try { window._lastFocus.focus({ preventScroll: true }); } catch (e) {} }
    }
  };

  /* Offline-friendly catalogue: show last good data instantly, refresh in background */
  window.saveBootCache = function (d) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        t: Date.now(),
        data: { settings: d.settings, categories: d.categories, equipment: d.equipment, rentalRates: d.rentalRates, spareParts: d.spareParts }
      }));
    } catch (e) { /* quota / private mode: ignore */ }
  };
  function hydrate() {
    try {
      if (APP_STATE.equipment.length) return;
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!c || !c.data || (Date.now() - c.t) > MAX_AGE) return;
      var d = c.data;
      APP_STATE.settings = d.settings || {};
      if (d.categories && d.categories.length) APP_STATE.categories = d.categories;
      APP_STATE.equipment = d.equipment || [];
      APP_STATE.rentalRates = d.rentalRates || [];
      APP_STATE.spareParts = d.spareParts || [];
      applyLanguage(APP_STATE.lang);
      populateDropdowns();
      applyBusinessSettings();
      renderAllDynamicViews();
    } catch (e) { console.warn('Cache hydrate skipped', e); }
  }

  /* Programmatically link labels to controls (screen readers, bigger tap target) */
  function linkLabels() {
    var n = 0;
    document.querySelectorAll('label').forEach(function (l) {
      if (l.classList.contains('consent-label') || l.getAttribute('for')) return;
      var c = l.parentElement && l.parentElement.querySelector('input:not(.hp-field),select,textarea');
      if (!c) return;
      if (!c.id) c.id = 'f_' + (++n);
      l.setAttribute('for', c.id);
      if (c.required) c.setAttribute('aria-required', 'true');
    });
    document.querySelectorAll('input[placeholder]:not([id^="f_"])').forEach(function (i) {
      if (!i.getAttribute('aria-label') && !i.classList.contains('hp-field')) i.setAttribute('aria-label', i.placeholder);
    });
    document.querySelectorAll('.hp-field').forEach(function (i) { i.setAttribute('aria-hidden', 'true'); });
  }

  /* Mobile nav: aria-expanded, icon swap, close on outside click */
  function syncNav() {
    var nav = document.getElementById('mainNav'), btn = document.getElementById('navToggle');
    if (!nav || !btn) return;
    var open = nav.classList.contains('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'mainNav');
    btn.textContent = open ? '✕' : '☰';
  }


  /* Mobile input polish: right keyboards, autofill, clean paste of +91 numbers, safe-area viewport */
  function mobileInputs() {
    var vp = document.querySelector('meta[name=viewport]');
    if (vp && vp.content.indexOf('viewport-fit') === -1) vp.content += ', viewport-fit=cover';
    var map = {
      customerName: { ac: 'name' }, phone: { ac: 'tel-national', im: 'numeric' }, email: { ac: 'email', im: 'email' },
      durationValue: { im: 'numeric' }, quantity: { im: 'numeric' }, landAreaAcres: { im: 'decimal' }
    };
    document.querySelectorAll('input[name]').forEach(function (i) {
      var m = map[i.name]; if (!m) return;
      if (m.ac) i.setAttribute('autocomplete', m.ac);
      if (m.im) i.setAttribute('inputmode', m.im);
    });
    var tr = document.getElementById('trackPhoneInput');
    if (tr) { tr.setAttribute('autocomplete', 'tel-national'); tr.setAttribute('inputmode', 'numeric'); }
    document.addEventListener('paste', function (e) {
      var el = e.target;
      if (!el || el.type !== 'tel' || !e.clipboardData) return;
      var d = (e.clipboardData.getData('text') || '').replace(/\D/g, '');
      if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
      else if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
      e.preventDefault();
      el.value = d.slice(0, 10);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    mobileInputs();
    hydrate();
    linkLabels();
    var nav = document.getElementById('mainNav');
    if (nav && window.MutationObserver) new MutationObserver(syncNav).observe(nav, { attributes: true, attributeFilter: ['class'] });
    syncNav();
  });

  document.addEventListener('click', function (e) {
    var nav = document.getElementById('mainNav');
    if (nav && nav.classList.contains('open') && !e.target.closest('#mainNav') && !e.target.closest('#navToggle')) nav.classList.remove('open');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.open').forEach(function (m) { window.closeModal(m.id); });
    var nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('open');
  });

  /* Broken product image -> neat placeholder instead of a broken icon */
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el && el.tagName === 'IMG' && el.closest && el.closest('.product-img-wrap')) {
      var w = el.parentNode;
      el.remove();
      if (!w.querySelector('.product-img-placeholder')) w.innerHTML = '<div class="product-img-placeholder">🚜</div>';
    }
  }, true);
})();
