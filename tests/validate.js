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
const unitTestsWf = readFile('.github/workflows/unit-tests.yml');
const validationWf = readFile('.github/workflows/validation-checks.yml');
const agb = readFile('agb.html');
const datenschutz = readFile('datenschutz.html');
const impressum = readFile('impressum.html');
readFile('style.css');

check('Required files exist', () => {
  [
    'index.html', 'style.css', 'script.js',
    'favicon.png', 'favicon.svg', '.nojekyll',
    'impressum.html', 'datenschutz.html', 'agb.html',
    '.github/workflows/deploy.yml',
    '.github/workflows/unit-tests.yml',
    '.github/workflows/validation-checks.yml'
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

check('Showcase uses real app navigation (Dashboard/Suche/Favoriten/Alarme)', () => {
  ['Dashboard', 'Suche', 'Favoriten', 'Alarme'].forEach((item) => {
    if (html.includes(`data-de="${item}"`)) pass(`Sidebar nav item "${item}" found`);
    else fail(`Sidebar nav item "${item}" missing`);
  });

  if (!html.includes('data-de="Merkliste"') || html.split('data-de="Merkliste"').length <= 2) {
    pass('Legacy "Merkliste" label removed from showcase nav');
  } else {
    fail('Legacy "Merkliste" appears too many times in showcase nav – should use "Favoriten"');
  }
});

check('iPhone screen 3 shows Favoriten (not calendar/Risikoanalyse)', () => {
  if (html.includes('screen-favoriten')) pass('screen-favoriten class present');
  else fail('screen-favoriten missing – calendar screen should have been replaced');

  if (!html.includes('screen-calendar')) pass('screen-calendar (replaced) absent');
  else fail('screen-calendar still in HTML – should be replaced by screen-favoriten');

  if (!html.includes('cal-grid') && !html.includes('cal-legend')) {
    pass('Calendar grid/legend removed (Risikoanalyse screen gone)');
  } else {
    fail('Calendar grid or legend still present – Risikoanalyse screen not fully removed');
  }
});

check('Footer has no WAMOCON product family / "Pläne" column', () => {
  const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
  const footerHtml = footerMatch ? footerMatch[0] : '';
  if (!footerHtml.includes('data-de="Pl\u00e4ne"') && !footerHtml.includes('>Pl\u00e4ne<')) {
    pass('Footer "Pläne" column removed');
  } else {
    fail('Footer still contains "Pläne" (WAMOCON product family) column');
  }
  if (!footerHtml.includes('md:grid-cols-4')) pass('Footer grid updated (not 4-column)');
  else fail('Footer grid is still md:grid-cols-4 – should be 3 after removing Pläne column');
});

check('Contact form has complete translations', () => {
  ['cf-name', 'cf-email', 'cf-message'].forEach((id) => {
    const labelMatch = html.match(new RegExp(`for="${id}"[^>]*data-de=`));
    if (labelMatch) pass(`Label for #${id} has translation`);
    else fail(`Label for #${id} missing data-de translation`);
  });

  if (html.includes('data-ph-de=') && html.includes('data-ph-en=')) {
    pass('Placeholder translations (data-ph-de/data-ph-en) present in contact form');
  } else {
    fail('Contact form input placeholders missing data-ph-de / data-ph-en');
  }

  if (html.match(/id="cf-error"[^>]*data-de=/)) pass('#cf-error has translation');
  else fail('#cf-error missing data-de translation');
});

check('Legal pages have language toggle and English translations', () => {
  [
    ['agb.html', agb, 'Terms'],
    ['datenschutz.html', datenschutz, 'Privacy Policy'],
    ['impressum.html', impressum, 'Legal Notice']
  ].forEach(([name, content, enTitle]) => {
    if (content.includes('lang-toggle')) pass(`${name} has language toggle`);
    else fail(`${name} missing language toggle`);

    if (content.includes('data-en=')) pass(`${name} has data-en translations`);
    else fail(`${name} missing data-en translations`);

    if (content.includes(enTitle)) pass(`${name} contains EN title "${enTitle}"`);
    else fail(`${name} missing EN title "${enTitle}"`);

    if (content.includes('script.js')) pass(`${name} links script.js`);
    else fail(`${name} missing <script src="script.js">`);

    if (content.includes('style.css')) pass(`${name} links style.css`);
    else fail(`${name} missing <link rel="stylesheet" href="style.css">`);
  });
});

check('Workflow files have correct triggers and concurrency', () => {
  // unit-tests.yml
  if (unitTestsWf.includes('pull_request:')) pass('unit-tests.yml has pull_request trigger');
  else fail('unit-tests.yml missing pull_request trigger');
  if (unitTestsWf.includes('cancel-in-progress: true')) pass('unit-tests.yml cancel-in-progress: true');
  else fail('unit-tests.yml should have cancel-in-progress: true');
  if (unitTestsWf.includes('node tests/validate.js')) pass('unit-tests.yml runs validate.js');
  else fail('unit-tests.yml missing validate.js step');

  // validation-checks.yml
  if (validationWf.includes('pull_request:')) pass('validation-checks.yml has pull_request trigger');
  else fail('validation-checks.yml missing pull_request trigger');
  if (validationWf.includes('cancel-in-progress: true')) pass('validation-checks.yml cancel-in-progress: true');
  else fail('validation-checks.yml should have cancel-in-progress: true');
  if (validationWf.includes('test:lint')) pass('validation-checks.yml runs htmlhint');
  else fail('validation-checks.yml missing htmlhint step');

  // deploy.yml PR deduplication
  if (workflow.includes('cancel-in-progress: false')) pass('deploy.yml cancel-in-progress: false (deploys not interrupted)');
  else fail('deploy.yml should have cancel-in-progress: false');
});

console.log('\n' + '═'.repeat(52));
const status = failures === 0
  ? `\x1b[32m  ALL ${passes} CHECKS PASSED\x1b[0m`
  : `\x1b[31m  ${failures} FAILED\x1b[0m  |  \x1b[32m${passes} passed\x1b[0m`;
console.log(status);
console.log('═'.repeat(52) + '\n');

if (failures > 0) process.exit(1);
