import * as R from './rule.js';
import { SCREEN as S, GUIDE, BANNED } from './copy.js';
import { route, byId, ALL_QA } from './guide.js';
import { runEvals } from './evals.js';

Object.assign(window, { rule: R, route, ALL_QA, GUIDE, SCREEN: S });

const initial = () => ({
  started: false, shape: null, lastInflow: null, floor: null, share: 0.10, shareAsked: 0.10, s1err: '',
  rule: null, fires: [], runs: 0, capOn: false, landedOpen: false, landed: null, landedErr: '', lastFire: null,
  kyc: [], kycSubmitted: false, kycOpen: null, basicsDone: false, basicsIdx: 0, stocksOpen: false, shareOpen: false,
  guide: { open: false, msgs: [], chips: null, typing: false },
});
let st = initial();
window.state = () => st;

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };

const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
  invest: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></svg>',
  stocks: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
  fno: '<svg viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>',
  you: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
};

/* ---------- derived ---------- */
const L = () => n(st.lastInflow), F = () => n(st.floor);
const invest = () => R.calcInvest(L(), F(), st.share);
const ruleInvest = () => st.rule ? R.calcInvest(L(), st.rule.floor, st.rule.share) : invest();
const sumInvested = () => st.fires.reduce((a, f) => a + f.invested, 0);
const shown = () => (st.rule ? ruleInvest() : invest()) || 1000;
function fill(text) {
  const floor = st.rule ? st.rule.floor : F(), share = st.rule ? st.rule.share : st.share;
  return text.replace('{invest}', R.fmtRs(shown())).replace('{worst}', R.fmtRs(R.worstCase(shown())))
    .replace('{floor}', R.fmtRs(floor)).replace('{share}', R.fmtPct(share)).replace('{lastInflow}', R.fmtRs(L()));
}

/* ---------- routing ---------- */
const path = () => { const h = location.hash.replace(/^#/, ''); return h && h.startsWith('/') ? h : '/'; };
const go = (p) => { location.hash = '#' + p; };
const TAB_ROUTES = { '/': 'home', '/invest': 'invest', '/stocks': 'stocks', '/fno': 'fno', '/you': 'you' };
window.addEventListener('hashchange', render);

/* ---------- pieces ---------- */
const btn = (label, action, cls = 'primary', extra = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const amountInput = (id, value, placeholder = '0') => `<div class="amt"><span>₹</span><input id="${id}" type="text" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="${placeholder}" value="${value == null ? '' : value}" data-amount="${id}"></div>`;
const figure = (v, key) => `<div class="figure" data-count="${v}" data-key="${key}">${R.fmtRs(v)}</div>`;
const topbar = (title) => `<header class="top"><div class="logo"></div><h1>${title}</h1><div class="avatar">N</div></header>`;
const stepbar = (i) => `<header class="top step"><button class="icon" data-action="back">${ICON.back}</button><div class="dots">${[1, 2, 3, 4].map((k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div><span></span></header>`;
function tabbar(active) {
  return `<nav class="tabs">${S.tabs.map(([id, name]) => `<a href="#${id === 'home' ? '/' : '/' + id}" class="${id === active ? 'on' : ''}">${ICON[id]}<span>${name}</span></a>`).join('')}</nav>`;
}
const guideBtn = () => `<button class="fab" data-action="guide-open">${ICON.chat}<span>Ask</span></button>`;

/* ---------- screens ---------- */
function welcome() {
  return `<section class="screen hero-screen"><div class="badge">Groww</div><h1 class="big">${S.welcome.title}</h1><p class="lead">${S.welcome.body}</p>${btn(S.welcome.cta, 'start')}</section>`;
}

function home() {
  const [s1, s2, s3] = S.home.steps;
  const a = st.kycSubmitted, b = st.basicsDone, c = !!st.rule;
  const card1 = `<div class="stepcard ${a ? 'done' : ''}"><div class="stephead"><span class="num">1</span><b>${s1.name}</b><span class="chip ${a ? 'amber' : ''}">${a ? s1.after.chip : s1.before.chip}</span></div><p>${a ? s1.after.body : s1.before.body}</p>${a ? '' : `<a href="#/kyc" class="link">${s1.before.link} ${ICON.chev}</a>`}</div>`;
  const card2 = `<div class="stepcard ${b ? 'done' : ''}"><div class="stephead"><span class="num">2</span><b>${s2.name}</b><span class="chip ${b ? 'green' : ''}">${b ? s2.after.chip : s2.before.chip}</span></div><p>${b ? s2.after.body : s2.before.body}</p>${b ? '' : btn(s2.before.cta, 'basics', c ? 'secondary' : 'primary')}</div>`;
  let card3;
  if (!c) {
    card3 = `<div class="stepcard"><div class="stephead"><span class="num">3</span><b>${s3.name}</b><span class="chip">${s3.before.chip}</span></div><p>${s3.before.body}</p>${btn(s3.before.cta, 'plan', b ? 'primary' : 'secondary')}</div>`;
  } else {
    const r = st.rule;
    const fire = st.lastFire;
    const holds = fire && fire.invested > 0 ? `<div class="holds"><b>${S.home.holds.replace('{invested}', R.fmtRs(fire.invested))}</b>${R.companySplit(fire.invested).map((row, i) => `<div class="hrow"><span class="dot c${i}">${row.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span><span>${row.name}</span><em>${R.fmtRs(row.amount)}</em></div>`).join('')}<small>${S.home.holdsNote}</small>${btn(S.home.share, 'share-open', 'text')}</div>` : '';
    card3 = `<div class="stepcard live"><div class="stephead"><span class="num">3</span><b>${s3.name}</b><span class="chip green">${s3.after.chip}</span></div>
      <p class="rule">${R.ruleSentence(r.floor, r.share)}</p>
      <div class="meter">${S.home.runs}: <b>${st.runs}</b></div>
      ${st.landedOpen ? `<label>${S.home.landedLabel}</label>${amountInput('landed', st.landed)}<div class="note err">${esc(st.landedErr)}</div>${btn(S.home.run, 'run')}` : btn(S.home.landed, 'landed-open')}
      ${fire ? `<p class="fired">${R.firedLine(fire.amount, r.floor, r.share, fire.invested)}</p>` : `<small>${S.home.next}</small>`}
      ${holds}
      <a href="#/rule/3" class="link">${S.home.change}</a></div>`;
  }
  const how = `<div class="card how"><b>${S.home.how.title}</b><ol>${S.home.how.lines.map((l) => `<li>${l}</li>`).join('')}</ol></div>`;
  return `${topbar(S.home.title)}<section class="screen">${card1}${card2}${card3}${how}</section>${tabbar('home')}${guideBtn()}${shareModal()}`;
}

function shareModal() {
  if (!st.shareOpen || !st.rule) return '';
  return `<div class="modal" data-action="share-close"><div class="sharecard" data-stop="1"><div class="logo"></div><small>${S.home.shareTitle}</small><p>${R.ruleSentence(st.rule.floor, st.rule.share)}</p><b>${S.home.shareWorking.replace('{sum}', R.fmtRs(sumInvested()))}</b>${btn(S.home.done, 'share-close', 'secondary')}</div></div>`;
}

function kyc() {
  const ticked = st.kyc.length;
  const rows = S.kyc.rows.map((r) => {
    const on = st.kyc.includes(r.id), open = st.kycOpen === r.id;
    return `<div class="krow ${open ? 'open' : ''}"><label class="kmain"><input type="checkbox" data-kyc="${r.id}" ${on ? 'checked' : ''}><span class="box">${ICON.check}</span><span class="kname">${r.name}</span></label><button class="icon chev" data-action="kyc-toggle" data-id="${r.id}">${ICON.chev}</button>${open ? `<div class="kdetail"><div><em>Why</em>${r.why}</div><div><em>Where</em>${r.where}</div></div>` : ''}</div>`;
  }).join('');
  const f = S.kyc.fno, fopen = st.kycOpen === 'fno';
  const frow = `<div class="krow fno ${fopen ? 'open' : ''}"><div class="kmain"><span class="box off"></span><span class="kname">${f.name}<small>${f.sub}</small></span></div><button class="icon chev" data-action="kyc-toggle" data-id="fno">${ICON.chev}</button>${fopen ? `<div class="kdetail"><div><em>Why</em>${f.why}</div><div><em>Where</em>${f.where}</div></div>` : ''}</div>`;
  return `<header class="top step"><button class="icon" data-action="home">${ICON.back}</button><h1>${S.kyc.title}</h1><span></span></header><section class="screen"><div class="ready"><b>${S.kyc.ready.replace('{n}', ticked)}</b><div class="bar"><i style="width:${ticked / 6 * 100}%"></i></div></div>${rows}${frow}${btn(S.kyc.cta, 'kyc-submit', 'primary', ticked === 6 ? '' : 'disabled')}</section>${guideBtn()}`;
}

function basics() {
  const i = st.basicsIdx, c = S.basics.cards[i], last = i === 2;
  return `<header class="top step"><button class="icon" data-action="${i === 0 ? 'home' : 'basics-prev'}">${ICON.back}</button><div class="dots">${[0, 1, 2].map((k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div><span></span></header><section class="screen"><div class="basic-card b${i}"><div class="art a${i}"></div><h2>${c.title}</h2><p>${c.body}</p></div>${btn(last ? S.basics.done : S.basics.next, last ? 'basics-done' : 'basics-next')}</section>${guideBtn()}`;
}

function rule1() {
  return `${stepbar(1)}<section class="screen"><h2>${S.rule1.title}</h2><div class="shapes">${S.rule1.shapes.map(([id, name, sub]) => `<button class="shape ${st.shape === id ? 'on' : ''}" data-action="shape" data-id="${id}"><b>${name}</b><span>${sub}</span></button>`).join('')}</div><label>${S.rule1.label}</label>${amountInput('inflow', st.lastInflow)}<div class="echo">${st.lastInflow == null ? '' : R.fmtRs(st.lastInflow)}</div><div class="note err">${esc(st.s1err)}</div>${btn(S.rule1.cta, 'r1-next')}</section>${guideBtn()}`;
}
function rule2() {
  const f = F(), l = L();
  const note = st.floor == null ? '' : f <= 0 ? S.rule2.zero : f >= l ? S.rule2.over.replace('{L}', R.fmtRs(l)) : '';
  return `${stepbar(2)}<section class="screen"><h2>${S.rule2.title}</h2><p class="hint">${S.rule2.hint}</p>${amountInput('floor', st.floor)}<div class="echo">${st.floor == null ? '' : R.fmtRs(st.floor)}</div><div class="note">${note}</div>${btn(S.rule2.cta, 'r2-next')}</section>${guideBtn()}`;
}
function rule3() {
  const v = invest(), l = L(), f = R.clampFloor(F(), l);
  let line;
  if (v === 0) line = R.zeroReason(l, F(), st.share);
  else if (st.shape === 'onetime') line = R.stageSentence(R.stagePlan(v));
  else line = S.rule3.line.replace('{share}', R.fmtPct(st.share)).replace('{left}', R.fmtRs(l - f));
  return `${stepbar(3)}<section class="screen"><h2>${S.rule3.title}</h2><div class="pct">${R.fmtPct(st.share)}</div><input id="share" type="range" min="1" max="50" step="1" value="${Math.round(st.share * 100)}"><div class="ends"><span>1%</span><span>50%</span></div>${figure(v, 'r3')}<p class="note">${line}</p><p class="note">${st.shareAsked >= R.SHARE_MAX ? S.rule3.half : ''}</p>${btn(S.rule3.cta, 'r3-next')}</section>${guideBtn()}`;
}
function rule4() {
  const v = invest();
  return `${stepbar(4)}<section class="screen"><h2>${S.rule4.title}</h2><p class="hint">${S.rule4.sub}</p><p class="ans">${R.worstLine(v)}</p><p class="ans">${S.rule4.crash}</p><p class="ans">${S.rule4.stop}</p><label class="switch"><input type="checkbox" data-action="cap" ${st.capOn ? 'checked' : ''}><span class="track"></span><span class="swlabel">${S.rule4.cap}<small>${S.rule4.capNote}</small></span></label>${btn(S.rule4.cta, 'set-rule')}</section>${guideBtn()}`;
}

function investScreen() {
  const v = shown();
  return `${topbar(S.invest.title)}<section class="screen"><div class="card hero"><b>${S.invest.one.title}</b><p>${S.invest.one.body}</p><p class="note">${R.worstLine(v)}</p>${btn(S.invest.one.cta, st.rule ? 'home' : 'plan')}</div><div class="card"><b>${S.invest.later.title}</b>${S.invest.later.rows.map(([nm, d]) => `<div class="lrow"><span>${nm}</span><small>${d}</small></div>`).join('')}</div></section>${tabbar('invest')}${guideBtn()}`;
}
function stocks() {
  return `${topbar(S.stocks.title)}<section class="screen"><div class="card"><b>${S.stocks.card.title}</b><p>${S.stocks.card.body}</p></div><div class="card list">${S.stocks.rows.map((r) => `<div class="lrow"><span>${r}</span><small>—</small></div>`).join('')}<small class="grey">${S.stocks.note}</small></div></section>${tabbar('stocks')}${guideBtn()}`;
}
function fno() {
  return `${topbar(S.fno.title)}<section class="screen"><div class="card warn"><b>${S.fno.card.title}</b><p>${S.fno.card.body}</p>${btn(S.fno.ask, 'guide-fno', 'text')}</div>${btn(S.fno.activate, 'none', 'secondary', 'disabled')}<div class="card list">${S.fno.rows.map((r) => `<div class="lrow"><span>${r}</span><small>—</small></div>`).join('')}<small class="grey">${S.fno.note}</small></div></section>${tabbar('fno')}${guideBtn()}`;
}
function you() {
  return `${topbar(S.you.title)}<section class="screen"><div class="card profile"><div class="avatar big">N</div><b>${S.you.name}</b><small>${S.you.line}</small></div><div class="card"><div class="lrow"><span>${S.you.mode}</span><span class="switch on static"><span class="track"></span></span></div><small class="grey">${S.you.modeNote}</small></div><div class="card"><div class="lrow"><span>${S.you.account}</span><small>${st.kycSubmitted ? S.you.accountAfter : S.you.accountBefore}</small></div></div>${btn(S.you.reset, 'reset', 'secondary')}</section>${tabbar('you')}${guideBtn()}`;
}

/* ---------- guide ---------- */
function guideSheet() {
  const g = st.guide; if (!g.open) return '';
  const p = path();
  const chips = g.chips || (GUIDE.chips[p] || []).map((id) => ({ id, label: byId(id).q }));
  const msgs = g.msgs.map((m) => `<div class="msg ${m.who}">${m.who === 'u' ? esc(m.text) : m.text}</div>`).join('');
  return `<div class="modal sheetwrap" data-action="guide-close"><div class="sheet" data-stop="1"><div class="sheethead"><i class="dot-on"></i><b>${GUIDE.name}</b><button class="icon" data-action="guide-close">${ICON.close}</button></div><div class="msgs" id="msgs">${msgs}${g.typing ? '<div class="msg g typing"><i></i><i></i><i></i></div>' : ''}</div><div class="chips">${chips.map((c) => `<button class="chipbtn" data-action="chip" data-id="${c.id}">${c.label}</button>`).join('')}${g.chips && g.chips[0] && g.chips[0].topic ? '' : `<button class="chipbtn more" data-action="topics">${GUIDE.more}</button>`}</div><form class="ask" data-form="ask"><input id="askText" type="text" placeholder="${GUIDE.placeholder}" autocomplete="off"><button class="icon send" type="submit">${ICON.send}</button></form></div></div>`;
}
function guideOpen(topic) {
  const p = path();
  st.guide = { open: true, msgs: [{ who: 'g', text: GUIDE.opening[p] || GUIDE.opening['/'] }], chips: null, typing: false };
  if (topic) showTopic(topic);
  render();
}
function showTopic(id) {
  const t = GUIDE.topics.find((x) => x.id === id);
  st.guide.chips = t.qa.map((qa) => ({ id: qa.id, label: qa.q }));
}
function answer(qa, userText) {
  st.guide.msgs.push({ who: 'u', text: userText });
  st.guide.typing = true; render();
  setTimeout(() => { st.guide.typing = false; st.guide.msgs.push({ who: 'g', text: qa ? fill(qa.a) : GUIDE.fallback }); if (!qa) st.guide.chips = null; render(); }, 400);
}

function evalsScreen() {
  const rows = runEvals(); const fails = rows.filter((r) => r[3] === 'FAIL').length;
  return `<section class="screen evals"><h2>Evals</h2><p class="note">${rows.length - fails} pass, ${fails} FAIL. Automated set; manual checks (A12, B2 to B6, B8, B10 to B12, D4, D5, E12 to E16) run on the live link.</p><table><tr><th>id</th><th>expected</th><th>actual</th><th></th></tr>${rows.map((r) => `<tr class="${r[3]}"><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${r[3]}</td></tr>`).join('')}</table><p class="note">A10 expectation amended after the first build; the original (63, 62x5) lost ₹2 to rounding.</p></section>`;
}

/* ---------- render ---------- */
const counted = new Set();
function render() {
  let p = path();
  if (!st.started && p !== '/evals' && p !== '/welcome') { location.hash = '#/welcome'; return; }
  const view = { '/welcome': welcome, '/': home, '/kyc': kyc, '/basics': basics, '/rule/1': rule1, '/rule/2': rule2, '/rule/3': rule3, '/rule/4': rule4, '/invest': investScreen, '/stocks': stocks, '/fno': fno, '/you': you, '/evals': evalsScreen }[p];
  if (!view) { location.hash = '#/'; return; }
  const app = $('#app');
  app.innerHTML = view() + guideSheet();
  app.className = TAB_ROUTES[p] ? 'tabbed' : '';
  const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
  document.querySelectorAll('.figure[data-count]').forEach((el) => {
    const key = el.dataset.key + ':' + el.dataset.count; if (counted.has(key)) return; counted.add(key);
    const target = n(el.dataset.count), t0 = performance.now();
    const tick = (now) => { const k = Math.min(1, (now - t0) / 600); el.textContent = R.fmtRs(Math.round(target * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  window.scrollTo(0, 0);
}

/* ---------- events ---------- */
function setAmount(key, raw, el) {
  const pr = R.parseAmount(raw);
  if (pr.error) { el.value = raw.replace(/\D/g, ''); }
  const val = el.value === '' ? null : parseInt(el.value, 10);
  if (key === 'inflow') { st.lastInflow = val; st.s1err = pr.error; $('.echo').textContent = val == null ? '' : R.fmtRs(val); $('.note.err').textContent = pr.error; }
  if (key === 'floor') { st.floor = val; render(); const i = $('#floor'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  if (key === 'landed') { st.landed = val; st.landedErr = pr.error; $('.note.err').textContent = pr.error; }
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.amount) setAmount(el.dataset.amount, el.value, el);
  if (el.id === 'share') { st.shareAsked = n(el.value) / 100; st.share = R.clampShare(st.shareAsked); render(); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.kyc) { const id = el.dataset.kyc; st.kyc = el.checked ? [...new Set([...st.kyc, id])] : st.kyc.filter((x) => x !== id); render(); }
  if (el.dataset.action === 'cap') { st.capOn = el.checked; }
});
document.addEventListener('submit', (e) => {
  if (e.target.dataset.form !== 'ask') return;
  e.preventDefault();
  const text = $('#askText').value.trim(); if (!text) return;
  const r = route(text, path());
  answer(r.qa || null, text);
});
document.addEventListener('click', (e) => {
  const stop = e.target.closest('[data-stop]');
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (stop && stop.contains(el) === false && el.classList.contains('modal')) return;
  if (el.classList.contains('modal') && stop && stop.contains(e.target)) return;
  const a = el.dataset.action;
  const A = {
    start: () => { st.started = true; go('/'); },
    home: () => go('/'),
    back: () => { const p = path(); const i = n(p.split('/')[2]); go(i > 1 ? '/rule/' + (i - 1) : '/'); },
    basics: () => { st.basicsIdx = 0; go('/basics'); },
    'basics-next': () => { st.basicsIdx = Math.min(2, st.basicsIdx + 1); render(); },
    'basics-prev': () => { st.basicsIdx = Math.max(0, st.basicsIdx - 1); render(); },
    'basics-done': () => { st.basicsDone = true; go('/'); },
    plan: () => go('/rule/1'),
    shape: () => { st.shape = el.dataset.id; st.s1err = ''; render(); },
    'r1-next': () => { if (!st.shape || L() <= 0) { st.s1err = S.rule1.err; render(); return; } st.s1err = ''; go('/rule/2'); },
    'r2-next': () => { if (st.floor == null) st.floor = 0; go('/rule/3'); },
    'r3-next': () => go('/rule/4'),
    'set-rule': () => { if (st.rule || path() !== '/rule/4') return; st.rule = { floor: R.clampFloor(F(), L()), share: st.share, shape: st.shape }; st.landedOpen = false; st.lastFire = null; go('/'); },
    'landed-open': () => { st.landedOpen = true; render(); const i = $('#landed'); if (i) i.focus(); },
    run: () => {
      if (!st.rule) return; const amt = n(st.landed); if (amt <= 0) { st.landedErr = 'Enter the amount that landed, more than ₹0.'; render(); return; }
      const invested = R.runInvest(amt, st.rule.floor, st.rule.share, st.capOn, st.runs);
      st.fires.push({ amount: amt, invested }); st.runs += 1; st.lastFire = { amount: amt, invested }; st.landedErr = ''; render();
    },
    'kyc-toggle': () => { st.kycOpen = st.kycOpen === el.dataset.id ? null : el.dataset.id; render(); },
    'kyc-submit': () => { if (st.kyc.length !== 6) return; st.kycSubmitted = true; go('/'); },
    reset: () => { st = initial(); counted.clear(); go('/welcome'); render(); },
    'share-open': () => { st.shareOpen = true; render(); },
    'share-close': () => { st.shareOpen = false; render(); },
    'guide-open': () => guideOpen(null),
    'guide-fno': () => guideOpen('fno'),
    'guide-close': () => { st.guide.open = false; render(); },
    topics: () => { st.guide.chips = GUIDE.topics.map((t) => ({ id: 'topic:' + t.id, label: t.name, topic: true })); render(); },
    chip: () => { const id = el.dataset.id; if (id.startsWith('topic:')) { showTopic(id.slice(6)); render(); return; } const qa = byId(id); answer(qa, qa.q); },
    none: () => {},
  };
  if (a === 'share-close' || a === 'guide-close') { if (el.classList.contains('modal') && e.target !== el) return; }
  if (A[a]) A[a]();
});
render();
