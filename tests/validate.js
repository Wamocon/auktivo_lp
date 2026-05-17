#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
let passes = 0;

function pass(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); passes++; }
function fail(msg) { console.error(`  \x1b[31m✗\x1b[0m ${msg}`); failures++; }
function warn(msg) { console.warn(`  \x1b[33m⚠\x1b[0m ${msg}`); }
function check(name, fn) {
  console.log(`\n\x1b[1m▸ ${name}\x1b[0m`);
  try { fn(); } catch (e) { fail(`Unexpected error: ${e.message}`); }
}
function readFile(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`FATAL: ${rel} not found`);
    process.exit(1);
  }
  return fs.readFileSync(abs, 'utf8');
}

const html = readFile('index.html');
const js = readFile('script.js');
const workflow = readFile('.github/workflows/deploy.yml');
const agb = readFile('agb.html');
const datenschutz = readFile('datenschutz.html');
const impressum = readFile('impressum.html');
readFile('style.css');

check('Required files exist', () => {
  [
    'index.html', 'style.css', 'script.js',
    'favicon.png', 'favicon.svg', '.nojekyll',
    'impressum.html', 'datenschutz.html', 'agb.html',
    '.github/workflows/deploy.yml'
  ].forEach((file) => {
    if (fs.existsSync(path.join(ROOT, file))) pass(file);
    else fail(`${file} is missing`);
  });
});

check('Required HTML element IDs', () => {
  [
    'nav', 'hero', 'features', 'how', 'showcase', 'roi', 'pricing', 'faq',
    'contact-modal', 'contact-form', 'lang-de', 'lang-en',
    'mobile-menu-btn', 'mobile-nav', 'employee-slider', 'request-slider',
    'savings-value', 'hours-value', 'cf-name', 'cf-email', 'cf-message',
    'cf-subject', 'cf-error'
  ].forEach((id) => {
    if (html.includes(`id="${id}"`)) pass(`#${id}`);
    else fail(`#${id} is missing`);
  });
});

check('Internal anchor links resolve', () => {
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  [...new Set(anchors)].forEach((anchor) => {
    if (ids.has(anchor)) pass(`#${anchor}`);
    else fail(`#${anchor} referenced but not found`);
  });
});

check('Production CTA links use Auktivo app URL', () => {
  const count = (html.match(/https:\/\/auktivo\.vercel\.app/g) || []).length;
  if (count >= 5) pass(`Auktivo app URL referenced ${count}×`);
  else fail(`Auktivo app URL only referenced ${count}×`);

  const suspiciousHref = [...html.matchAll(/href="#"(?!\s*onclick)/g)];
  if (suspiciousHref.length === 0) pass('No dangling href="#" without onclick');
  else warn(`${suspiciousHref.length} href="#" entries without onclick`);
});

check('Language toggle completeness', () => {
  const de = (html.match(/data-de="/g) || []).length;
  const en = (html.match(/data-en="/g) || []).length;
  if (de >= 50) pass(`${de} data-de attributes`);
  else fail(`Only ${de} data-de attributes found`);
  if (en >= 50) pass(`${en} data-en attributes`);
  else fail(`Only ${en} data-en attributes found`);
  if (de === en) pass('data-de and data-en counts match');
  else fail(`Mismatch: data-de=${de}, data-en=${en}`);
});

check('Hero and showcase app visuals remain intact', () => {
  if (html.includes('iphone-frame')) pass('iPhone frame present');
  else fail('iPhone frame missing');

  const screens = (html.match(/class="[^"]*app-screen/g) || []).length;
  if (screens >= 3) pass(`${screens} app screens found`);
  else fail(`Only ${screens} app screens found`);
});

check('Pricing matches Auktivo Free/Pro model', () => {
  const pricingSec = html.match(/<section[^>]*id="pricing"[\s\S]*?<\/section>/);
  const pricingHtml = pricingSec ? pricingSec[0] : '';
  if (!pricingHtml) {
    fail('Pricing section not found');
    return;
  }

  [
    'FREE', 'PRO', '9,99 €',
    '5 Suchanfragen / Monat',
    'Basisdaten: Termin, Ort, Verkehrswert',
    'Suche nach PLZ, Umkreis &amp; Objekttyp',
    'KI-Risikoanalyse',
    'KI-Chat-Assistent',
    'Alarm-Funktion (Push/E-Mail)',
    'Merkliste &amp; Favoriten',
    'PDF-Download',
    'OCR für PDF- &amp; TIF-Gutachten'
  ].forEach((token) => {
    if (pricingHtml.includes(token)) pass(`${token}`);
    else fail(`${token} missing from pricing`);
  });

  ['TRACE', 'TeamRadar', 'Innovation Package'].forEach((token) => {
    if (!pricingHtml.includes(token)) pass(`${token} absent from pricing`);
    else fail(`${token} should not appear in pricing`);
  });
});

check('FAQ content exists', () => {
  const faqItems = (html.match(/class="[^"]*faq-item/g) || []).length;
  if (faqItems >= 5) pass(`${faqItems} FAQ items found`);
  else fail(`Only ${faqItems} FAQ items found`);

  if (html.includes('Woher stammen die Versteigerungsdaten?')) pass('Auktivo FAQ content present');
  else fail('Expected Auktivo FAQ question missing');
});

check('Official legal URLs are linked', () => {
  [
    'https://auktivo.app/de/impressum',
    'https://auktivo.app/de/datenschutz',
    'https://auktivo.app/de/agb'
  ].forEach((url) => {
    if (html.includes(url)) pass(`${url} linked from landing page`);
    else fail(`${url} missing from landing page`);
  });

  const legalDocs = [
    ['agb.html', agb, 'https://auktivo.app/de/agb'],
    ['datenschutz.html', datenschutz, 'https://auktivo.app/de/datenschutz'],
    ['impressum.html', impressum, 'https://auktivo.app/de/impressum']
  ];

  legalDocs.forEach(([name, content, url]) => {
    if (content.includes('Offizielle Online-Fassung')) pass(`${name} links to official version`);
    else fail(`${name} is missing official version note`);
    if (content.includes(url)) pass(`${name} references ${url}`);
    else fail(`${name} missing ${url}`);
  });
});

check('Deploy workflow has GitHub Pages safeguards', () => {
  if (workflow.includes("cancel-in-progress: false")) pass('cancel-in-progress disabled');
  else fail('cancel-in-progress should be false');

  if (workflow.includes("if: github.ref == 'refs/heads/main'")) pass('main-branch deploy guard present');
  else fail('main-branch deploy guard missing');

  if (workflow.includes('name: github-pages')) pass('github-pages environment configured');
  else fail('github-pages environment missing');
});

check('Accessibility and security basics', () => {
  if (html.match(/<html[^>]+lang="/)) pass('<html lang="..."> set');
  else fail('<html> missing lang attribute');

  if (html.includes('aria-modal="true"')) pass('aria-modal present on contact dialog');
  else fail('aria-modal missing on contact dialog');

  if (html.includes('<meta name="description"')) pass('meta description present');
  else fail('meta description missing');

  if (!html.includes('javascript:')) pass('No javascript: href found');
  else fail('javascript: href found');

  if (!js.includes('eval(')) pass('No eval() in script.js');
  else fail('eval() found in script.js');

  if (!js.includes('document.write')) pass('No document.write() in script.js');
  else fail('document.write() found in script.js');
});

check('script.js core functions are present', () => {
  [
    'initLangToggle',
    'initIphoneScreenCycle',
    'initShowcaseTabs',
    'initROICalculator',
    'initFAQ',
    'initMobileMenu',
    'initReveal',
    'window.openContactModal',
    'window.closeContactModal',
    'window.submitContactForm'
  ].forEach((fn) => {
    if (js.includes(fn)) pass(`${fn}()`);
    else fail(`${fn}() missing from script.js`);
  });
});

console.log('\n' + '═'.repeat(52));
const status = failures === 0
  ? `\x1b[32m  ALL ${passes} CHECKS PASSED\x1b[0m`
  : `\x1b[31m  ${failures} FAILED\x1b[0m  |  \x1b[32m${passes} passed\x1b[0m`;
console.log(status);
console.log('═'.repeat(52) + '\n');

if (failures > 0) process.exit(1);
