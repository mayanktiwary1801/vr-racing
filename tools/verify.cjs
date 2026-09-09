// Browser checks for index.html — the page's acceptance tests (PLAN of 9 Sept 2026, § 7). Run over a local server:
//
//   python -m http.server 8765 --bind 127.0.0.1          (from the repo root, in another terminal)
//   NODE_PATH=<a node_modules that holds @playwright/test> node tools/verify.cjs [http://127.0.0.1:8765/] [shots-dir]
//
// Needs Playwright (the workspace's OMS project has it; point NODE_PATH at its node_modules) and a Chromium build
// (`npx playwright install chromium` once). Prints one line per check and exits 1 if any check fails. Screenshots of the
// first screen at 375 and 1366 land in shots-dir (default: the current directory).
//
// What it asserts, per PLAN § 7: no horizontal overflow at five widths (375, 800, 1366, and 20 px either side of the menu
// fold read from the CSS); every section has a menu entry unless marked data-nav="no"; every CTA is at least 44 px tall;
// the phone booking bar shows mid-page and hides on the form / the closing band / with the menu open / with the lightbox
// open (and can never take focus while the lightbox is open); the FAQ bar expands and collapses to itself; the spec sheet
// opens; the lightbox opens a frame at 3840; the form's WhatsApp text matches the estimate for five scenarios; the offer's
// open / stale / closed states each render correctly; with scripts off every hidden item is visible.
// Note: page.$eval / page.$$eval / page.evaluate below are Playwright's page-side function runners (they serialise a
// function into the page); nothing here evaluates strings of code.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const SHOTS = process.argv[3] || '.';
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const NAVBP = parseInt((html.match(/\/\* NAV BREAKPOINT (\d+) \*\//) || [])[1], 10);

let failures = 0;
function check(name, ok, detail) {
  failures += ok ? 0 : 1;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  — ' + detail : ''));
}
function istDate(offsetDays) {
  const d = new Date(Date.now() + 330 * 60000 + offsetDays * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}
// serve a variant of the page with the <body> offer attributes rewritten (the state lives in the markup)
async function offerVariant(context, attrs) {
  await context.route(BASE, async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    // rewrite inside the real <body …> tag only (it carries data-wa); "<body>" also appears as text in a CSS comment
    body = body.replace(/<body\s[^>]*data-wa=[^>]*>/, (tag) => { for (const [k, v] of Object.entries(attrs)) tag = tag.replace(new RegExp(k + '="[^"]*"'), k + '="' + v + '"'); return tag; });
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
  });
}
// innerText reflects CSS text-transform (the band's lines come back upper-cased), so callers match case-insensitively.
async function visibleText(page) {
  return page.evaluate(() => document.body.innerText);
}
// the visible text outside the offer panel (the panel's own "Launch offer" flag label stays when the offer is closed)
async function textOutsideOffer(page) {
  return page.evaluate(() => { const o = document.getElementById('offer'); const t = document.body.innerText; return t.replace(o.innerText, ''); });
}
async function fillForm(page, v) {
  await page.fill('#bookForm [name=name]', 'Test');
  await page.selectOption('#bookForm [name=what]', v.what);
  await page.fill('#bookForm [name=date]', v.date);
  await page.dispatchEvent('#bookForm [name=date]', 'change');
  await page.selectOption('#bookForm [name=hours]', v.hours);
  if (v.people) await page.selectOption('#bookForm [name=people]', v.people);
  await page.dispatchEvent('#bookForm [name=people]', 'change');
  const time = await page.$eval('#bookForm [name=time]', (s) => s.options.length > 1 ? s.options[1].value : '');
  if (time) await page.selectOption('#bookForm [name=time]', time);
  return page.$eval('#estimate', (e) => e.innerText);
}
async function submitCapture(page) {
  await page.evaluate(() => { window.__wa = null; window.open = (u) => { window.__wa = u; return null; }; });
  await page.click('#bookForm button[type=submit]');
  const url = await page.evaluate(() => window.__wa);
  if (!url) return null;
  return new URL(url).searchParams.get('text') || '';   // searchParams already decodes; a second decode would choke on "50%"
}
// the next weekday / weekend on or after a date
function nextDay(from, wantWeekend) {
  const d = new Date(from + 'T00:00:00Z');
  for (let i = 0; i < 8; i++) {
    const day = d.getUTCDay();
    const we = day === 0 || day === 6;
    if (we === wantWeekend) return d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

(async () => {
  // Edge is on every Windows machine, so no browser download is needed; set PW_CHANNEL=chromium to use Playwright's own build.
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
  const errors = [];

  // ---------------------------------------------------------------- layout at five widths
  const widths = [[375, 812], [800, 1280], [1366, 768]];
  check('NAV BREAKPOINT marker present in the CSS', Number.isFinite(NAVBP), String(NAVBP));
  if (Number.isFinite(NAVBP)) widths.push([NAVBP - 20, 900], [NAVBP + 20, 900]);
  for (const [w, h] of widths) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(w + ': ' + e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);   // measure with the web fonts in place, as a settled page renders
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const secs = [...document.querySelectorAll('section[id]')].filter((s) => s.getAttribute('data-nav') !== 'no').map((s) => s.id);
      const links = [...document.querySelectorAll('nav.links a')].map((a) => a.getAttribute('href').slice(1));
      const missing = secs.filter((id) => !links.includes(id) && id !== 'top');
      const dangling = links.filter((id) => !document.getElementById(id));
      const menuShown = getComputedStyle(document.querySelector('.menu')).display !== 'none';
      const nav = document.querySelector('nav.links');
      const navRow = getComputedStyle(nav).display === 'flex' && getComputedStyle(nav).position !== 'absolute';
      const wrap = document.querySelector('header.top .wrap').getBoundingClientRect();
      const navFits = !navRow || nav.getBoundingClientRect().right <= wrap.right + 0.5;
      const short = [...document.querySelectorAll('a.btn, button.btn, nav.links a.book, .more')].filter((b) => { const r = b.getBoundingClientRect(); return r.height > 0 && r.height < 44; }).map((b) => b.textContent.trim().slice(0, 30));
      return { scrollW: d.scrollWidth, vw: innerWidth, scrollH: d.scrollHeight, missing, dangling, menuShown, navRow, navFits, short,
        price: document.getElementById('price').getBoundingClientRect().top + scrollY, book: document.getElementById('book').getBoundingClientRect().top + scrollY,
        ctaBottom: document.querySelector('.hero .cta').getBoundingClientRect().bottom };
    });
    check(`${w}px: no horizontal overflow`, m.scrollW <= m.vw, `scrollWidth ${m.scrollW} / viewport ${m.vw}`);
    check(`${w}px: every section has a menu entry`, m.missing.length === 0, m.missing.join(',') || 'ok');
    check(`${w}px: every menu link has a target`, m.dangling.length === 0, m.dangling.join(',') || 'ok');
    check(`${w}px: every CTA ≥ 44 px`, m.short.length === 0, m.short.join(' | ') || 'ok');
    if (Number.isFinite(NAVBP) && w === NAVBP - 20) check(`${w}px: menu folds (button shown, links hidden)`, m.menuShown && !m.navRow);
    if (Number.isFinite(NAVBP) && w === NAVBP + 20) check(`${w}px: links in a row, fitting`, !m.menuShown && m.navRow && m.navFits, `fits=${m.navFits}`);
    if (w === 375 || w === 1366) {
      console.log(`INFO ${w}px: page ${m.scrollH}px (${(m.scrollH / h).toFixed(1)} screens); #price at ${Math.round(m.price)}; #book at ${Math.round(m.book)}; hero CTAs end at ${Math.round(m.ctaBottom)}`);
      check(`${w}px: hero CTAs inside the first screen`, m.ctaBottom <= h, `${Math.round(m.ctaBottom)} ≤ ${h}`);
      await page.screenshot({ path: path.join(SHOTS, `after-${w}-screen1.png`) });
    }
    await page.close();
  }

  // ---------------------------------------------------------------- phone behaviour
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    page.on('pageerror', (e) => errors.push('375: ' + e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });   // jump, don't glide: the checks read the settled state
    await page.evaluate(() => document.fonts.ready);
    const barOn = () => page.$eval('#sticky', (b) => b.classList.contains('on') && getComputedStyle(b).display !== 'none');
    check('375px: bar off on the hero', !(await barOn()));
    await page.evaluate(() => document.getElementById('vr').scrollIntoView());
    await page.waitForTimeout(400);
    check('375px: bar on mid-page', await barOn());
    await page.evaluate(() => document.getElementById('book').scrollIntoView());
    await page.waitForTimeout(400);
    check('375px: bar off on the form', !(await barOn()));
    await page.evaluate(() => document.getElementById('street').scrollIntoView());
    await page.waitForTimeout(400);
    check('375px: bar off on the closing band', !(await barOn()));
    await page.evaluate(() => document.getElementById('vr').scrollIntoView());
    await page.waitForTimeout(400);
    await page.click('.menu');
    await page.waitForTimeout(100);
    check('375px: bar off with the menu open', !(await barOn()));
    check('375px: menu opens', await page.$eval('header.top', (h) => h.classList.contains('open')));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    check('375px: Escape closes the menu', !(await page.$eval('header.top', (h) => h.classList.contains('open'))));
    await page.waitForTimeout(300);
    check('375px: bar back on after the menu closes', await barOn());
    // lightbox: open the first gallery frame; the bar must be hidden and never focusable
    await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
    await page.click('#gallery-frames .shot:not(.extra)');
    await page.waitForTimeout(200);
    const lb = await page.evaluate(() => ({ open: document.getElementById('lightbox').open, src: document.getElementById('lbImg').getAttribute('src') }));
    check('375px: lightbox opens the frame at 3840', lb.open && /3840/.test(lb.src), lb.src);
    check('375px: bar hidden with the lightbox open', await page.$eval('#sticky', (b) => getComputedStyle(b).display === 'none'));
    let focused = false;
    for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#sticky'))) focused = true; }
    check('375px: bar never takes focus while the lightbox is open', !focused);
    await page.click('#lbClose');
    await page.waitForTimeout(100);
    check('375px: lightbox closes', !(await page.evaluate(() => document.getElementById('lightbox').open)));
    // FAQ bar and the spec sheet
    const closedCount = await page.$$eval('#faq-list details', (ds) => ds.filter((d) => getComputedStyle(d).display !== 'none').length);
    check('375px: FAQ shows 7 before the bar', closedCount === 7, String(closedCount));
    await page.evaluate(() => document.getElementById('more-faq').scrollIntoView());
    await page.click('#more-faq');
    const openCount = await page.$$eval('#faq-list details', (ds) => ds.filter((d) => getComputedStyle(d).display !== 'none').length);
    check('375px: FAQ bar reveals all 19', openCount === 19, String(openCount));
    const barLabel = await page.$eval('#more-faq b', (b) => b.textContent.trim());
    check('375px: FAQ bar reads "Show fewer" when open', barLabel === 'Show fewer', barLabel);
    await page.click('#more-faq');
    await page.waitForTimeout(300);
    const afterCollapse = await page.evaluate(() => { const r = document.getElementById('more-faq').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    check('375px: collapsing the FAQ keeps the bar on screen', afterCollapse);
    await page.click('details.spec summary');
    check('375px: the spec sheet opens', await page.$eval('details.spec', (d) => d.open));
    const photos = await page.$$eval('#room-photos .photo', (ps) => ps.filter((p) => getComputedStyle(p).display !== 'none').length);
    check('375px: room strip shows 4 photos before its bar', photos === 4, String(photos));
    await page.close();
  }

  // ---------------------------------------------------------------- the form: estimate ↔ WhatsApp text, five scenarios (offer open)
  {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    page.on('pageerror', (e) => errors.push('form: ' + e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    const OPEN = await page.evaluate(() => document.querySelector('#bookForm [name=date]').min);
    const wd = nextDay(OPEN, false), we = nextDay('2026-09-26', true), vrEarly = nextDay(OPEN, false);
    const sc = [
      { name: 'weekday rig, 2 people (no discount, note)', v: { what: 'rig', date: wd, hours: '2', people: '2' }, est: /₹3,000/, note: /Groups of three or more get the launch offer/, msg: /Estimate: ₹3,000 \(weekday rate ₹1,500\/hr × 2 hours\); ₹100 token now, ₹2,900 on the day/, noOffer: true },
      { name: 'weekday rig, 3 people (50% off)', v: { what: 'rig', date: wd, hours: '2', people: '3' }, est: /₹3,000.*₹1,500/s, note: /Launch offer, first five groups: 50% off/, msg: /Estimate: ₹1,500 with the launch offer, 50% off ₹3,000 \(weekday rate ₹1,500\/hr × 2 hours\); ₹100 token now, ₹1,400 on the day\nLaunch offer: YES \(group of 3\)/ },
      { name: 'weekend VR, 5 people, 2 h (50% off, weekend rate)', v: { what: 'vr', date: we, hours: '2', people: '5' }, est: /₹4,800.*₹2,400/s, msg: /Estimate: ₹2,400 with the launch offer, 50% off ₹4,800 \(weekend rate ₹2,400\/hr × 2 hours\); ₹100 token now, ₹2,300 on the day\nLaunch offer: YES \(group of 5\)/ },
      { name: 'weekday VR 3 h, 4 people (offer + snacks perk)', v: { what: 'vr', date: nextDay('2026-09-28', false), hours: '3', people: '4' }, est: /₹6,000.*₹3,000/s, note: /Thums Up/, msg: /Estimate: ₹3,000 with the launch offer, 50% off ₹6,000 \(weekday rate ₹2,000\/hr × 3 hours\); ₹100 token now, ₹2,900 on the day \+ snacks and Thums Up on the house\nLaunch offer: YES \(group of 4\)/ },
      { name: 'VR before 25 Sept (warning, no message)', v: { what: 'vr', date: vrEarly, hours: '1', people: '3' }, est: /VR sessions start on 25 September/, msg: null },
    ];
    for (const s of sc) {
      const est = await fillForm(page, s.v);
      check('form: ' + s.name + ' — estimate', s.est.test(est) && (!s.note || s.note.test(est)), est.replace(/\n/g, ' ').slice(0, 140));
      const msg = await submitCapture(page);
      if (s.msg === null) check('form: ' + s.name + ' — no WhatsApp hand-off', msg === null);
      else {
        check('form: ' + s.name + ' — WhatsApp text', msg !== null && s.msg.test(msg), (msg || 'null').replace(/\n/g, ' | ').slice(0, 200));
        if (s.noOffer) check('form: ' + s.name + ' — no offer line in the text', msg !== null && !/Launch offer/.test(msg));
      }
    }
    await page.close();
  }

  // ---------------------------------------------------------------- offer states: closed (attribute), closed (count 0), open with a count, stale
  const states = [
    { name: 'closed by data-offer', attrs: { 'data-offer': 'closed' }, expect: 'closed' },
    { name: 'closed by remaining=0', attrs: { 'data-offer-remaining': '0' }, expect: 'closed' },
    { name: 'open with a count of 3', attrs: { 'data-offer-remaining': '3' }, expect: 'count' },
    { name: 'stale (reviewBy yesterday)', attrs: { 'data-offer-review-by': istDate(-1) }, expect: 'stale' },
    { name: 'open (reviewBy today)', attrs: { 'data-offer-review-by': istDate(0) }, expect: 'open' },
  ];
  for (const st of states) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await offerVariant(context, st.attrs);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(st.name + ': ' + e.message));
    await page.goto(BASE, { waitUntil: 'load' });
    const text = await visibleText(page);
    const state = await page.evaluate(() => document.body.getAttribute('data-offer'));
    const wd = nextDay(await page.evaluate(() => document.querySelector('#bookForm [name=date]').min), false);
    const est = await fillForm(page, { what: 'rig', date: wd, hours: '2', people: '3' });
    const msg = await submitCapture(page);
    if (st.expect === 'closed') {
      const outside = await textOutsideOffer(page);
      check(`offer ${st.name}: state closed`, state === 'closed', state);
      check(`offer ${st.name}: no "50%" anywhere, no "launch offer" outside the panel`, !/50%/i.test(text) && !/launch offer/i.test(outside));
      check(`offer ${st.name}: the panel says the first five are in`, /Our first five groups are in/i.test(text));
      check(`offer ${st.name}: full price, no discount`, /₹3,000/.test(est) && !/50%/.test(est) && msg !== null && !/Launch offer/.test(msg));
    } else if (st.expect === 'count') {
      check(`offer ${st.name}: line shows the number`, /3 of 5 still open/i.test(text));
      check(`offer ${st.name}: discount applies`, /₹1,500/.test(est) && /Launch offer: YES/.test(msg || ''));
    } else if (st.expect === 'stale') {
      check(`offer ${st.name}: state stale`, state === 'stale', state);
      check(`offer ${st.name}: ask-on-WhatsApp wording`, /Ask us on WhatsApp whether the launch offer is still open/i.test(text));
      check(`offer ${st.name}: no number, no discount, "to be confirmed"`, !/of 5 still open/i.test(text) && /₹3,000/.test(est) && /to be confirmed on WhatsApp/.test(est));
      check(`offer ${st.name}: message says please confirm`, msg !== null && /Launch offer: please confirm \(group of 3\)/.test(msg));
    } else {
      check(`offer ${st.name}: state open`, state === 'open', state);
      check(`offer ${st.name}: default line, discount applies`, /Limited to the first five qualifying groups/i.test(text) && /₹1,500/.test(est));
    }
    await context.close();
  }

  // ---------------------------------------------------------------- scripts off: everything hidden by the "more" pattern is visible
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    const m = await page.evaluate(() => {
      const vis = (sel) => [...document.querySelectorAll(sel)].filter((e) => getComputedStyle(e).display !== 'none').length;
      return { details: vis('#faq-list details'), tiles: vis('#game-tiles .tile:not(.more)'), shots: vis('#gallery-frames .shot'), photos: vis('#room-photos .photo'), more: vis('.more'), navRow: getComputedStyle(document.querySelector('nav.links')).display !== 'none', menu: vis('.menu') };
    });
    check('no-JS: all 19 FAQ rows visible', m.details === 19, String(m.details));
    check('no-JS: all 12 game tiles visible', m.tiles === 12, String(m.tiles));
    check('no-JS: all 9 gallery frames visible', m.shots === 9, String(m.shots));
    check('no-JS: all 8 room photos visible', m.photos === 8, String(m.photos));
    check('no-JS: "more" buttons hidden, menu links shown in a row', m.more === 0 && m.navRow && m.menu === 0, JSON.stringify(m));
    await context.close();
  }

  check('no JavaScript errors on any page', errors.length === 0, errors.join(' || ') || 'ok');
  await browser.close();
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
