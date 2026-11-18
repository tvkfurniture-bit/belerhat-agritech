#!/usr/bin/env python3
"""Run in your project folder (index.html, app.js, i18n.js, styles.css, enhancements.js side by side).
Creates *.bak backups, applies exact-match edits, and reports anything it could not find."""
import os, shutil, sys

def patch(fname, edits):
    if not os.path.exists(fname):
        print('MISSING FILE', fname); return
    shutil.copy(fname, fname + '.bak')
    s = open(fname, encoding='utf-8').read().replace('\r\n', '\n')
    for old, new in edits:
        if new in s:
            continue  # already applied
        if s.count(old) != 1:
            print('  !! %s: expected 1 match, found %d for: %s' % (fname, s.count(old), old[:60].replace('\n', ' ')))
            continue
        s = s.replace(old, new)
    open(fname, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', fname)

FAV = ("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%2314452F'/%3E"
       "%3Cpath d='M10 27C14 19 20 14 29 12C27 21 22 27 13 29' stroke='%2386EFAC' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='14' cy='28' r='3' fill='%23FBBF24'/%3E%3C/svg%3E\" />")

patch('index.html', [
    ('<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
     '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />'),
    ('<link rel="stylesheet" href="styles.css" />',
     '<meta name="theme-color" content="#14452F" />\n  ' + FAV + '\n  <link rel="stylesheet" href="styles.css?v=3" />'),
    ('<body>', '<body>\n  <a class="skip-link" href="#appMain" data-i18n="skip_to_content">মূল বিষয়বস্তুতে যান</a>'),
    ('<main id="appMain">', '<main id="appMain" tabindex="-1">'),
    ('aria-label="Menu" onclick="toggleMobileNav()"', 'aria-label="Menu" aria-expanded="false" aria-controls="mainNav" onclick="toggleMobileNav()"'),
    ('<label data-i18n="lbl_select_machine">পছন্দের যন্ত্র *</label>', '<label data-i18n="lbl_pref_machine">পছন্দের যন্ত্র *</label>'),
    ('<label data-i18n="lbl_brand_model">মেশিন / ব্র্যান্ড / মডেল</label>', '<label data-i18n="lbl_machine_brand">মেশিন / ব্র্যান্ড / মডেল</label>'),
    ('<script src="i18n.js"></script>\n  <script src="app.js"></script>',
     '<script src="i18n.js?v=3"></script>\n  <script src="app.js?v=3"></script>\n  <script src="enhancements.js?v=3"></script>'),
])

patch('i18n.js', [
    ("    lbl_part_name: 'পার্টসের নাম *',",
     "    lbl_part_name: 'পার্টসের নাম *',\n    lbl_pref_machine: 'পছন্দের যন্ত্র *',\n    lbl_machine_brand: 'মেশিন / ব্র্যান্ড / মডেল',\n    skip_to_content: 'মূল বিষয়বস্তুতে যান',"),
    ("    lbl_part_name: 'Part Name *',",
     "    lbl_part_name: 'Part Name *',\n    lbl_pref_machine: 'Preferred Equipment *',\n    lbl_machine_brand: 'Machine / Brand / Model',\n    skip_to_content: 'Skip to content',"),
])

patch('app.js', [
    ("history.replaceState(null, '', nextUrl);",
     "if (nextUrl !== window.location.pathname + window.location.search) history.pushState(null, '', nextUrl);"),
    ("function renderEmptyAfterInit() {", "function renderEmptyAfterInit() {\n  if (APP_STATE.equipment.length) return;"),
    ("APP_STATE.bootSig = json.data.bootSig || '';",
     "APP_STATE.bootSig = json.data.bootSig || '';\n    if (window.saveBootCache) window.saveBootCache(json.data);"),
    ("""'<span class="avail-pill" style="background:#EEF2FF;color:#3730A3;">'""", """'<span class="avail-pill pill-sale">'"""),
    ("""'<span class="avail-pill" style="background:#ECFDF5;color:#065F46;">'""", """'<span class="avail-pill pill-rent">'"""),
])
print('Done. Hard-refresh the browser (Ctrl+Shift+R). Backups: *.bak')
