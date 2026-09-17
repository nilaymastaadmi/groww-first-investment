import * as R from './rule.js';
import { SCREEN as S, GUIDE } from './copy.js';
import { byId, ALL_QA } from './guide.js';
import { runEvals } from './evals.js';

Object.assign(window, { rule: R, ALL_QA, GUIDE, SCREEN: S });

const initial = () => ({
  started: false, kyc: [], kycSubmitted: false, kycOpen: null,
  basicsIdx: 0, basicsDone: false,
  shape: null, lastInflow: null, floor: null, share: 0.10, shareAsked: 0.10, s1err: '',
  holdings: [], onceAmt: 500, afterKyc: null,
  rule: null, paused: false, fires: [], runs: 0, landedOpen: false, landed: null, landedErr: '', lastFire: null, toast: '',
  gates: { stocks: false, fno: false }, askOpen: null,
  guide: { open: false, msgs: [], chips: null },
});
let st = initial();
window.state = () => st;

const $ = (s) => document.querySelector(s);
const n = (x) => { const v = Number(x); return Number.isFinite(v) ? v : 0; };

const ICON = {
  stocks: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
  fno: '<svg viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>',
  mf: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M12 3a9 9 0 0 1 9 9h-9z"/></svg>',
  pay: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><path d="M12 18h.01"/></svg>',
};

/* ---------- derived ---------- */
const L = () => n(st.lastInflow), F = () => n(st.floor);
const invest = () => R.calcInvest(L(), F(), st.share);
const shown = () => (st.rule ? R.calcInvest(L(), st.rule.floor, st.rule.share) : invest()) || 1000;
function fill(text) {
  const floor = st.rule ? st.rule.floor : F(), share = st.rule ? st.rule.share : st.share;
  return text.replace('{invest}', R.fmtRs(shown())).replace('{worst}', R.fmtRs(R.worstCase(shown())))
    .replace('{floor}', R.fmtRs(floor)).replace('{share}', R.fmtPct(share)).replace('{lastInflow}', R.fmtRs(L()));
}

/* ---------- routing ---------- */
const path = () => { const h = location.hash.replace(/^#/, ''); return h && h.startsWith('/') ? h : '/mf'; };
const go = (p) => { location.hash = '#' + p; };
window.addEventListener('hashchange', () => { st.guide.open = false; if (path() !== '/mf') st.toast = ''; render(); });

/* ---------- pieces ---------- */
const btn = (label, action, cls = 'primary', extra = '') => `<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const amountInput = (id, value) => `<div class="amt"><span>₹</span><input id="${id}" type="text" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="0" value="${value == null ? '' : value}" data-amount="${id}"></div>`;
const logo = '<span class="logo"><i></i></span>';
function appbar() {
  return `<header class="appbar">${logo}<b class="brand">Groww</b><a href="#/you" class="avatar">N</a></header>`;
}
function tabbar(active) {
  return `<nav class="tabs">${S.tabs.map(([href, name, icon]) => `<a href="#${href}" class="${icon === active ? 'on' : ''}">${ICON[icon]}<span>${name}</span></a>`).join('')}</nav>`;
}
function flowbar(title, progress, backAction = 'back') {
  return `<header class="flowbar"><button class="icon" data-action="${backAction}" aria-label="Back">${ICON.back}</button><b>${title}</b><button class="asklink" data-action="guide-open">${ICON.help}<span>Ask</span></button></header>${progress == null ? '' : `<div class="progress"><i style="width:${Math.round(progress * 100)}%"></i></div>`}`;
}
const fab = () => `<button class="fab" data-action="guide-open">${ICON.help}<span>Ask</span></button>`;
const fundRow = () => `<div class="fundrow"><span class="flogo">${S.fund.badge}</span><div><b>${S.fund.name}</b><small>${S.fund.meta}</small></div></div>`;
const tabScreen = (active, body, showFab = true) => `<div class="view tabbed">${appbar()}<main class="body">${body}</main>${tabbar(active)}${showFab ? fab() : ''}</div>`;
const flowScreen = (bar, body, footer) => `<div class="view">${bar}<main class="body">${body}</main>${footer ? `<footer class="cta">${footer}</footer>` : ''}</div>`;

/* ---------- onboarding ---------- */
function welcome() {
  const w = S.welcome;
  return flowScreen('', `<section class="pad hero"><div class="bigmark">${logo}</div><span class="chip green">${w.chip}</span><h1>${w.title}</h1><p class="lead">${w.body}</p><ul class="calm">${w.points.map((p) => `<li>${ICON.check}<span>${p}</span></li>`).join('')}</ul></section>`, btn(w.cta, 'start'));
}

function kyc() {
  const k = S.kyc, ticked = st.kyc.length;
  const rows = k.rows.map((r) => {
    const on = st.kyc.includes(r.id), open = st.kycOpen === r.id;
    return `<div class="krow ${open ? 'open' : ''}"><label class="kmain"><input type="checkbox" data-kyc="${r.id}" ${on ? 'checked' : ''}><span class="box">${ICON.check}</span><span class="kname">${r.name}</span></label><button class="icon chev" data-action="kyc-toggle" data-id="${r.id}" aria-label="Why">${ICON.chev}</button>${open ? `<div class="kdetail"><div><em>Why</em>${r.why}</div><div><em>Where</em>${r.where}</div></div>` : ''}</div>`;
  }).join('');
  const f = k.fno, fopen = st.kycOpen === 'fno';
  const frow = `<div class="krow fno ${fopen ? 'open' : ''}"><div class="kmain"><span class="box off"></span><span class="kname">${f.name}<small>${f.sub}</small></span></div><button class="icon chev" data-action="kyc-toggle" data-id="fno" aria-label="Why">${ICON.chev}</button>${fopen ? `<div class="kdetail"><div><em>Why</em>${f.why}</div><div><em>Where</em>${f.where}</div></div>` : ''}</div>`;
  return flowScreen(flowbar(k.title, ticked / 6, 'home'),
    `<section class="pad"><p class="hint">${k.sub}</p><div class="ready"><b>${k.ready.replace('{n}', ticked)}</b>${ticked < 6 ? btn(k.demo, 'kyc-demo', 'text') : ''}</div>${rows}${frow}</section>`,
    btn(k.cta, 'kyc-submit', 'primary', ticked === 6 ? '' : 'disabled'));
}

/* ---------- Mutual Funds: first investment ---------- */
function mfTabs(active) {
  return `<div class="subtabs">${S.mfTabs.map(([href, name]) => `<a href="#${href}" class="${href === active ? 'on' : ''}">${name}</a>`).join('')}</div>`;
}

function ruleCard() {
  const r = st.rule, h = S.home.rule, fire = st.lastFire;
  let result = '';
  if (fire) {
    const kept = R.clampFloor(r.floor, fire.amount);
    result = `<div class="split"><div><small>${h.received}</small><b>${R.fmtRs(fire.amount)}</b></div><div><small>${h.kept}</small><b>${R.fmtRs(kept)}</b></div><div><small>${h.invested}</small><b class="green">${R.fmtRs(fire.invested)}</b></div></div>${fire.invested === 0 ? `<p class="muted">${R.zeroReason(fire.amount, r.floor, r.share)}</p>` : ''}`;
  }
  let action;
  if (st.paused) action = `<p class="muted">${h.pausedNote}</p>`;
  else if (st.landedOpen) action = `<label>${h.landedLabel}</label>${amountInput('landed', st.landed)}<div class="note err">${st.landedErr}</div>${btn(h.run, 'run')}`;
  else action = `${fire ? '' : `<p class="muted">${h.next}</p>`}${btn(h.landed, 'landed-open')}`;
  return `<div class="card rulecard"><div class="rchead"><b>${h.title}</b><span class="chip ${st.paused ? 'amber' : 'green'}">${st.paused ? h.paused : h.active}</span></div>
    <p class="rsentence">${R.ruleSentence(r.floor, r.share)}</p>${result}${action}
    <div class="ractions"><button class="lnk" data-action="pause">${st.paused ? h.resume : h.pause}</button><button class="lnk" data-action="change">${h.change}</button><button class="lnk red" data-action="stop-rule">${h.stop}</button></div></div>`;
}

const qa = (t, body, id = '') => `<div class="qa"><b>${t}</b><p ${id ? `id="${id}"` : ''}>${body}</p></div>`;

function mfHome() {
  const h = S.home, a = st.kycSubmitted;
  const total = st.holdings.reduce((x, y) => x + y, 0);
  const qs = h.askIds.map((id) => {
    const q = byId(id), open = st.askOpen === id;
    return `<div class="qrow ${open ? 'open' : ''}"><button data-action="ask-toggle" data-id="${id}"><span>${q.q}</span>${ICON.chev}</button>${open ? `<p>${fill(q.a)}</p>` : ''}</div>`;
  }).join('');
  const ask = `<div class="card askhero"><div class="askhead">${ICON.help}<div><h1>${h.title}</h1><p class="muted">${h.sub}</p></div></div>${qs}<button class="btn text" data-action="guide-open">${h.all}</button></div>`;
  const toast = st.toast ? `<div class="toast">${st.toast}</div>` : '';
  const holding = total ? `<div class="card"><div class="rchead"><b>${R.fmtRs(total)}</b><span class="chip green">${h.invested}</span></div>${fundRow()}<p class="muted">${h.holdingSub}</p><div class="ractions"><button class="lnk" data-action="take-out">${h.out}</button></div></div>` : '';
  const money = total || st.rule ? `<h3 class="sect">${h.moneyTitle}</h3>${holding}${st.rule ? ruleCard() : ''}` : '';
  const ruleOpt = st.rule ? '' : `<div class="card option"><div class="rchead"><b>${h.ruleOpt.title}</b><span class="chip">${h.ruleOpt.tag}</span></div><p>${h.ruleOpt.body}</p>${btn(h.ruleOpt.cta, 'plan', 'secondary small')}</div>`;
  const ready = `<h3 class="sect">${h.readyTitle}</h3><div class="card option"><b>${h.once.title}</b><p>${h.once.body}</p>${btn(total ? h.once.again : h.once.cta, 'once', 'primary small')}</div>${ruleOpt}`;
  const help = `<h3 class="sect">${h.help.title}</h3><div class="card list"><a class="hrowlink" href="#/kyc"><span><b>${h.help.docs}</b><small>${a ? h.help.docsAfter : h.help.docsBefore.replace('{n}', st.kyc.length)}</small></span>${ICON.chev}</a><button class="hrowlink" data-action="basics"><span><b>${h.help.basics}</b><small>${st.basicsDone ? h.help.basicsDone : h.help.basicsBody}</small></span>${ICON.chev}</button></div>`;
  return tabScreen('mf', `${mfTabs('/mf')}<section class="pad">${toast}${ask}${money}${ready}${help}</section>`, false);
}

function once() {
  const o = S.once, amt = st.onceAmt, ok = n(amt) >= 100;
  const chips = o.chips.map((v) => `<button class="shape amtchip ${amt === v ? 'on' : ''}" data-action="once-amt" data-v="${v}"><b>${R.fmtRs(v)}</b></button>`).join('');
  const cta = st.kycSubmitted ? btn(o.cta.replace('{amt}', R.fmtRs(amt)), 'once-confirm', 'primary', ok ? '' : 'disabled') : btn(o.ctaDocs, 'once-docs');
  return flowScreen(flowbar(o.title, null, 'home'), `<section class="pad"><h2>${o.label}</h2><div class="amtchips">${chips}</div>${amountInput('once', amt)}<div class="note" id="onceNote">${ok ? '' : o.min}</div>${fundRow()}<div class="card">${qa(S.rule4.fallT, R.worstLine(ok ? amt : 100), 'onceFall')}${qa(o.outT, o.out)}</div>${st.kycSubmitted ? '' : `<p class="muted">${o.docsNote}</p>`}</section>`, cta);
}

function mfExplore() {
  const e = S.explore;
  return tabScreen('mf', `${mfTabs('/mf/explore')}<section class="pad"><div class="card hero"><b>${e.one.title}</b><p>${e.one.body}</p>${fundRow()}<p class="note">${R.worstLine(shown())}</p>${btn(st.rule ? e.one.ctaRule : e.one.cta, 'home', 'primary small')}</div><div class="card"><b>${e.later.title}</b>${e.later.rows.map(([nm, d]) => `<div class="lrow"><span>${nm}</span><small>${d}</small></div>`).join('')}</div></section>`);
}

/* ---------- basics and rule ---------- */
function basics() {
  const i = st.basicsIdx, c = S.basics.cards[i], last = i === 2;
  return flowScreen(flowbar(S.basics.title, (i + 1) / 3, i === 0 ? 'home' : 'basics-prev'),
    `<section class="pad"><div class="basic-card"><div class="art a${i}"></div><small class="muted">${i + 1} of 3</small><h2>${c.title}</h2><p>${c.body}</p></div></section>`,
    btn(last ? S.basics.done : S.basics.next, last ? 'basics-done' : 'basics-next'));
}

const ruleBar = (i) => flowbar(S.flow, i / 4);
function rule1() {
  const r = S.rule1;
  return flowScreen(ruleBar(1), `<section class="pad"><small class="muted">Step 1 of 4</small><h2>${r.title}</h2><div class="shapes">${r.shapes.map(([id, name, sub]) => `<button class="shape ${st.shape === id ? 'on' : ''}" data-action="shape" data-id="${id}"><b>${name}</b><span>${sub}</span></button>`).join('')}</div><label>${r.label}</label>${amountInput('inflow', st.lastInflow)}<div class="note err" id="s1err">${st.s1err}</div></section>`, btn(r.cta, 'r1-next'));
}
function floorNote() {
  const f = F(), l = L();
  return st.floor == null ? '' : f <= 0 ? S.rule2.zero : f >= l ? S.rule2.over.replace('{L}', R.fmtRs(l)) : '';
}
function rule2() {
  const r = S.rule2;
  return flowScreen(ruleBar(2), `<section class="pad"><small class="muted">Step 2 of 4</small><h2>${r.title}</h2><p class="hint">${r.hint}</p>${amountInput('floor', st.floor)}<div class="note" id="floorNote">${floorNote()}</div></section>`, btn(r.cta, 'r2-next'));
}
function rule3Line() {
  const v = invest(), l = L(), f = R.clampFloor(F(), l);
  if (v === 0) return R.zeroReason(l, F(), st.share);
  if (st.shape === 'onetime') return R.stageSentence(R.stagePlan(v));
  return S.rule3.line.replace('{share}', R.fmtPct(st.share)).replace('{left}', R.fmtRs(l - f));
}
function rule3() {
  const r = S.rule3;
  return flowScreen(ruleBar(3), `<section class="pad"><small class="muted">Step 3 of 4</small><h2>${r.title}</h2><div class="pct" id="pct">${R.fmtPct(st.share)}</div><input id="share" type="range" min="1" max="50" step="1" value="${Math.round(st.share * 100)}"><div class="ends"><span>1%</span><span>50%</span></div><div class="card figcard"><small class="muted">${r.youInvest}</small><div class="figure" id="fig">${R.fmtRs(invest())}</div><p class="muted" id="line">${rule3Line()}</p><p class="muted" id="half">${st.shareAsked >= R.SHARE_MAX ? r.half : ''}</p></div></section>`, btn(r.cta, 'r3-next'));
}
function rule4() {
  const r = S.rule4, v = invest(), l = L();
  const staged = st.shape === 'onetime' && v > 0 ? `<p class="muted">${R.stageSentence(R.stagePlan(v))}</p>` : '';
  return flowScreen(ruleBar(4), `<section class="pad"><small class="muted">Step 4 of 4</small><h2>${r.title}</h2>
    <div class="card summary"><div class="srow"><span>${r.came}</span><b>${R.fmtRs(l)}</b></div><div class="srow"><span>${r.stays}</span><b>${R.fmtRs(R.clampFloor(F(), l))}</b></div><div class="srow"><span>${r.shareL}</span><b>${R.fmtPct(st.share)}</b></div><div class="srow total"><span>${r.goes}</span><b>${R.fmtRs(v)}</b></div>${staged}${fundRow()}</div>
    <div class="card">${qa(r.fallT, R.worstLine(v))}${qa(r.crashT, r.crash)}${qa(r.stopT, r.stop)}</div></section>`, btn(r.cta, 'set-rule'));
}

/* ---------- other tabs ---------- */
function stocks() {
  const s = S.stocks;
  if (!st.gates.stocks) return tabScreen('stocks', `<section class="pad"><div class="card gate">${ICON.alert}<b>${s.gate.title}</b><p>${s.gate.body}</p>${btn(s.gate.back, 'home', 'primary small')}${btn(s.gate.open, 'open-stocks', 'secondary small')}</div></section>`);
  const idx = s.index.map(([nm, v, ch]) => `<div class="tick"><small>${nm}</small><b>${v}</b><em class="${ch.startsWith('-') ? 'red' : 'green'}">${ch}</em></div>`).join('');
  return tabScreen('stocks', `<section class="pad"><div class="ticker">${idx}</div><div class="card list"><b>${s.watch}</b>${s.rows.map(([nm, p, ch]) => `<div class="lrow"><span>${nm}</span><div class="px"><b>${p}</b><em class="${ch.startsWith('-') ? 'red' : 'green'}">${ch}</em></div></div>`).join('')}<small class="muted">${s.note}</small></div></section>`);
}
function fno() {
  const f = S.fno;
  if (!st.gates.fno) return tabScreen('fno', `<section class="pad"><div class="card gate warn">${ICON.alert}<b>${f.gate.title}</b><p>${f.gate.body}</p>${btn(f.gate.ask, 'guide-fno', 'text')}${btn(f.gate.open, 'open-fno', 'secondary small')}</div></section>`);
  return tabScreen('fno', `<section class="pad">${btn(f.activate, 'none', 'secondary small', 'disabled')}<div class="card list"><b>${f.section}</b>${f.rows.map(([nm, p]) => `<div class="lrow"><span>${nm}</span><div class="px"><b>${p}</b></div></div>`).join('')}<small class="muted">${f.note}</small></div></section>`);
}
function pay() {
  return tabScreen('pay', `<section class="pad"><h1>${S.pay.title}</h1><div class="card"><p>${S.pay.body}</p>${btn(S.explore.one.cta, 'home', 'primary small')}</div></section>`);
}
function you() {
  const y = S.you;
  return flowScreen(flowbar(y.title, null, 'home'), `<section class="pad"><div class="card profile"><div class="avatar big">N</div><b>${y.name}</b><small class="muted">${y.line}</small></div><div class="card"><div class="lrow"><span>${y.mode}</span><span class="switch on static"><span class="track"></span></span></div><small class="muted">${y.modeNote}</small></div><div class="card"><div class="lrow"><span>${y.account}</span><small>${st.kycSubmitted ? y.accountAfter : y.accountBefore}</small></div></div>${btn(y.reset, 'reset', 'secondary')}</section>`);
}

/* ---------- guide ---------- */
function guideSheet() {
  const g = st.guide; if (!g.open) return '';
  const chips = g.chips || (GUIDE.chips[path()] || GUIDE.chips['/mf']).map((id) => ({ id, label: byId(id).q }));
  const msgs = g.msgs.map((m) => `<div class="msg ${m.who}">${m.text}</div>`).join('');
  const showMore = !(g.chips && g.chips[0] && g.chips[0].topic);
  return `<div class="modal" data-action="guide-close"><div class="sheet" data-stop="1"><div class="sheethead"><i class="dot-on"></i><b>${GUIDE.name}</b><button class="icon" data-action="guide-close" aria-label="Close">${ICON.close}</button></div><div class="msgs" id="msgs">${msgs}</div><div class="chips">${chips.map((c) => `<button class="chipbtn" data-action="chip" data-id="${c.id}">${c.label}</button>`).join('')}${showMore ? `<button class="chipbtn more" data-action="topics">${GUIDE.more}</button>` : ''}</div></div></div>`;
}
function guideOpen(topic) {
  st.guide = { open: true, msgs: [{ who: 'g', text: GUIDE.opening[path()] || GUIDE.opening['/mf'] }], chips: null };
  if (topic) showTopic(topic);
  render();
}
function showTopic(id) {
  const t = GUIDE.topics.find((x) => x.id === id);
  st.guide.chips = t.qa.map((qa) => ({ id: qa.id, label: qa.q }));
}

function evalsScreen() {
  const rows = runEvals(); const fails = rows.filter((r) => r[3] === 'FAIL').length;
  return `<section class="pad evals"><h2>Evals</h2><p class="note">${rows.length - fails} pass, ${fails} FAIL. Automated set; manual checks run on the live link.</p><table><tr><th>id</th><th>expected</th><th>actual</th><th></th></tr>${rows.map((r) => `<tr class="${r[3]}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table></section>`;
}

/* ---------- render ---------- */
function render() {
  const p = path();
  if (!st.started && p !== '/evals' && p !== '/welcome') { location.replace('#/welcome'); return; }
  const view = { '/welcome': welcome, '/kyc': kyc, '/mf': mfHome, '/mf/explore': mfExplore, '/basics': basics, '/rule/1': rule1, '/rule/2': rule2, '/rule/3': rule3, '/rule/4': rule4, '/once': once, '/stocks': stocks, '/fno': fno, '/pay': pay, '/you': you, '/evals': evalsScreen }[p];
  if (!view) { location.replace('#/mf'); return; }
  const prev = $('.body') ? $('.body').scrollTop : 0;
  $('#app').innerHTML = view() + guideSheet();
  const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
  const b = $('.body'); if (b) b.scrollTop = st.keepScroll ? prev : 0;
  st.keepScroll = false;
}

/* ---------- events ---------- */
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.amount) {
    const pr = R.parseAmount(el.value);
    if (pr.error) el.value = el.value.replace(/\D/g, '');
    const val = el.value === '' ? null : parseInt(el.value, 10);
    const key = el.dataset.amount;
    if (key === 'inflow') { st.lastInflow = val; st.s1err = pr.error; $('#s1err').textContent = pr.error; }
    if (key === 'floor') { st.floor = val; $('#floorNote').textContent = floorNote(); }
    if (key === 'once') {
      st.onceAmt = n(val); const ok = st.onceAmt >= 100;
      $('#onceNote').textContent = ok ? '' : S.once.min;
      $('#onceFall').textContent = R.worstLine(ok ? st.onceAmt : 100);
      const b = $('[data-action=once-confirm]'); if (b) { b.textContent = S.once.cta.replace('{amt}', R.fmtRs(st.onceAmt)); b.disabled = !ok; }
    }
    if (key === 'landed') { st.landed = val; st.landedErr = pr.error; $('.note.err').textContent = pr.error; }
  }
  if (el.id === 'share') {
    st.shareAsked = n(el.value) / 100; st.share = R.clampShare(st.shareAsked);
    $('#pct').textContent = R.fmtPct(st.share); $('#fig').textContent = R.fmtRs(invest()); $('#line').textContent = rule3Line();
    $('#half').textContent = st.shareAsked >= R.SHARE_MAX ? S.rule3.half : '';
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.kyc) { const id = el.dataset.kyc; st.kyc = el.checked ? [...new Set([...st.kyc, id])] : st.kyc.filter((x) => x !== id); st.keepScroll = true; render(); }
});
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (el.classList.contains('modal') && e.target !== el) return;
  const stay = (fn) => () => { fn(); st.keepScroll = true; render(); };
  const A = {
    start: () => { st.started = true; go('/mf'); },
    home: () => go('/mf'),
    back: () => { const i = n(path().split('/')[2]); go(i > 1 ? '/rule/' + (i - 1) : '/mf'); },
    kyc: () => go('/kyc'),
    'kyc-toggle': stay(() => { st.kycOpen = st.kycOpen === el.dataset.id ? null : el.dataset.id; }),
    'kyc-demo': stay(() => { st.kyc = S.kyc.rows.map((r) => r.id); }),
    'kyc-submit': () => { if (st.kyc.length !== 6) return; st.kycSubmitted = true; const to = st.afterKyc || '/mf'; st.afterKyc = null; go(to); },
    basics: () => { st.basicsIdx = 0; go('/basics'); },
    'basics-next': () => { st.basicsIdx = Math.min(2, st.basicsIdx + 1); render(); },
    'basics-prev': () => { st.basicsIdx = Math.max(0, st.basicsIdx - 1); render(); },
    'basics-done': () => { st.basicsDone = true; go('/mf'); },
    plan: () => { st.toast = ''; go('/rule/1'); },
    once: () => { st.toast = ''; go('/once'); },
    'once-amt': stay(() => { st.onceAmt = n(el.dataset.v); }),
    'once-docs': () => { st.afterKyc = '/once'; go('/kyc'); },
    'once-confirm': () => { if (path() !== '/once' || n(st.onceAmt) < 100 || !st.kycSubmitted) return; st.holdings.push(n(st.onceAmt)); st.toast = S.home.onceDone.replace('{amt}', R.fmtRs(st.onceAmt)); go('/mf'); },
    'take-out': () => { st.holdings = []; st.toast = S.home.outDone; render(); },
    change: () => { st.toast = ''; go('/rule/1'); },
    shape: stay(() => { st.shape = el.dataset.id; st.s1err = ''; }),
    'r1-next': () => { if (!st.shape || L() <= 0) { st.s1err = S.rule1.err; st.keepScroll = true; render(); return; } st.s1err = ''; go('/rule/2'); },
    'r2-next': () => { if (st.floor == null) st.floor = 0; go('/rule/3'); },
    'r3-next': () => go('/rule/4'),
    'set-rule': () => {
      if (path() !== '/rule/4') return;
      st.rule = { floor: R.clampFloor(F(), L()), share: st.share, shape: st.shape };
      st.paused = false; st.landedOpen = false; st.lastFire = null; st.toast = S.home.ruleDone; go('/mf');
    },
    'landed-open': stay(() => { st.landedOpen = true; }),
    run: () => {
      if (!st.rule || st.paused) return;
      const amt = n(st.landed);
      if (amt <= 0) { st.landedErr = 'Enter the amount that landed, more than ₹0.'; st.keepScroll = true; render(); return; }
      const invested = R.calcInvest(amt, st.rule.floor, st.rule.share);
      st.fires.push({ amount: amt, invested }); st.runs += 1;
      st.lastFire = { amount: amt, invested };
      st.landedOpen = false; st.landed = null; st.landedErr = ''; st.keepScroll = true; render();
    },
    pause: stay(() => { st.paused = !st.paused; st.landedOpen = false; }),
    'stop-rule': () => { st.rule = null; st.paused = false; st.fires = []; st.runs = 0; st.lastFire = null; st.landedOpen = false; st.toast = S.home.rule.stopped; render(); },
    'ask-toggle': stay(() => { st.askOpen = st.askOpen === el.dataset.id ? null : el.dataset.id; }),
    'open-stocks': () => { st.gates.stocks = true; render(); },
    'open-fno': () => { st.gates.fno = true; render(); },
    reset: () => { st = initial(); go('/welcome'); render(); },
    'guide-open': () => guideOpen(null),
    'guide-fno': () => guideOpen('fno'),
    'guide-close': () => { st.guide.open = false; st.keepScroll = true; render(); },
    topics: () => { st.guide.chips = GUIDE.topics.map((t) => ({ id: 'topic:' + t.id, label: t.name, topic: true })); st.keepScroll = true; render(); },
    chip: () => {
      const id = el.dataset.id;
      if (id.startsWith('topic:')) showTopic(id.slice(6));
      else { const qa = byId(id); st.guide.msgs.push({ who: 'u', text: qa.q }, { who: 'g', text: fill(qa.a) }); }
      st.keepScroll = true; render();
    },
    none: () => {},
  };
  if (A[a]) A[a]();
});
render();
