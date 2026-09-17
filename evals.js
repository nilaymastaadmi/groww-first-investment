import * as R from './rule.js';
import { SCREEN as S, GUIDE, BANNED } from './copy.js';
import { route, ALL_QA } from './guide.js';

function screenBodies() {
  const h = S.home;
  return {
    welcome: [S.welcome.body],
    home1: [h.steps[0].before.body, h.steps[0].after.body], home2: [h.steps[1].before.body, h.steps[1].after.body], home3: [h.steps[2].before.body], homeHow: h.how.lines,
    basics0: [S.basics.cards[0].body], basics1: [S.basics.cards[1].body], basics2: [S.basics.cards[2].body],
    rule1: [S.rule1.label, S.rule1.err], rule2: [S.rule2.hint, S.rule2.zero, S.rule2.over], rule3: [S.rule3.line, S.rule3.half],
    rule4: [S.rule4.sub, R.worstLine(1500), S.rule4.crash, S.rule4.stop, S.rule4.capNote],
    invest: [S.invest.one.body, ...S.invest.later.rows.map((r) => r[1])], stocks: [S.stocks.card.body, S.stocks.note], fno: [S.fno.card.body, S.fno.note], you: [S.you.line, S.you.modeNote],
  };
}
const words = (arr) => arr.join(' ').split(/\s+/).filter(Boolean).length;
function allCopyStrings(o, out = []) { if (typeof o === 'string') out.push(o); else if (Array.isArray(o) || (o && typeof o === 'object')) Object.values(o).forEach((v) => allCopyStrings(v, out)); return out; }
export function runEvals() {
  const rows = [];
  const t = (id, exp, act, ok) => rows.push([id, String(exp), String(act), ok ? 'pass' : 'FAIL']);
  const one = (s) => typeof s === 'string' && s.length > 0 && !s.includes('\n');
  let v, p;
  t('A1', 400, v = R.calcInvest(12000, 8000, 0.10), v === 400);
  const rs = R.ruleSentence(20000, 0.10);
  t('A2', '1500; sentence has ₹20,000, 10%, automatically', (v = R.calcInvest(35000, 20000, 0.10)) + '; ' + rs, v === 1500 && rs.includes('₹20,000') && rs.includes('10%') && rs.includes('automatically'));
  t('A3', '0 + one-line reason', (v = R.calcInvest(6000, 8000, 0.10)) + '; ' + R.zeroReason(6000, 8000, 0.10), v === 0 && one(R.zeroReason(6000, 8000, 0.10)));
  p = R.stagePlan(v = R.calcInvest(100000, 20000, 0.10));
  t('A4', '8000; now 2000; 6x1000', `${v}; now ${p.now}; ${p.steps.join(',')}`, v === 8000 && p.now === 2000 && p.steps.join() === '1000,1000,1000,1000,1000,1000');
  t('A5', 2000, v = R.calcInvest(20000, 0, 0.10), v === 2000);
  t('A6', '0 + one-line reason', (v = R.calcInvest(15000, 15000, 0.10)) + '; ' + R.zeroReason(15000, 15000, 0.10), v === 0 && one(R.zeroReason(15000, 15000, 0.10)));
  t('A7', 15000, v = R.calcInvest(50000, 20000, 0.50), v === 15000);
  t('A8', '15000 at 50%', (v = R.calcInvest(50000, 20000, 1.0)) + ' at ' + R.fmtPct(1.0), v === 15000 && R.fmtPct(1.0) === '50%');
  let ok9 = true; try { v = R.calcInvest(0, 5000, 0.10); } catch (e) { ok9 = false; }
  t('A9', '0, no exception', v, ok9 && v === 0);
  p = R.stagePlan(v = R.calcInvest(5000, 0, 0.10));
  t('A10', '500; now 125; 65,62,62,62,62,62', `${v}; now ${p.now}; ${p.steps.join(',')}`, v === 500 && p.now === 125 && p.steps.join() === '65,62,62,62,62,62');
  t('A11', '0; no NaN', (v = R.calcInvest('abc', 8000, 0.10)) + '; ' + R.fmtRs('abc'), v === 0 && !R.fmtRs('abc').includes('NaN'));
  p = R.parseAmount('-500');
  t('D1', 'rejected, one line', `value=${p.value}; ${p.error}`, p.value === null && one(p.error));
  t('D2', '0; reason names floor', (v = R.calcInvest(12000, 15000, 0.10)) + '; ' + R.zeroReason(12000, 15000, 0.10), v === 0 && /floor/.test(R.zeroReason(12000, 15000, 0.10)));
  const big = R.stageSentence(R.stagePlan(R.calcInvest(10000000, 0, 0.10)));
  t('D3', '₹1,00,00,000; one sentence', R.fmtRs(10000000) + '; ' + big, R.fmtRs(10000000) === '₹1,00,00,000' && one(big) && (big.match(/\./g) || []).length === 1);
  const all = [...allCopyStrings(S), ...allCopyStrings(GUIDE)].join('\n').toLowerCase();
  const hits = BANNED.filter((w) => new RegExp('\\b' + w.toLowerCase().replace(/[-]/g, '\\-') + '\\b').test(all));
  t('B1', 'no banned word', hits.length ? hits.join(', ') : 'none', hits.length === 0);
  const wc = screenBodies(); const over = Object.entries(wc).map(([k, a]) => [k, words(a)]).filter(([, c]) => c >= 60);
  t('B7', 'every screen under 60 words', over.length ? over.map(([k, c]) => `${k}=${c}`).join(', ') : Object.entries(wc).map(([k, a]) => `${k}=${words(a)}`).join(' '), over.length === 0);
  const e1 = route('what if the app crashes while paying', '/rule/4');
  t('E1', 'crash answer', e1.qa && e1.qa.id, e1.qa && e1.qa.id === 'money5');
  const e2 = route('how do I get money back', '/');
  t('E2', 'money-back answer', e2.qa && e2.qa.id, e2.qa && e2.qa.id === 'money4');
  const e3 = route('WHAT IF THE APP CRASHES?!', '/rule/4');
  t('E3', 'same as E1', e3.qa && e3.qa.id, e3.qa && e1.qa && e3.qa.id === e1.qa.id);
  const e4 = route('zzqx', '/rule/2');
  t('E4', 'fallback', e4.fallback ? 'fallback' : e4.qa.id, e4.fallback === true);
  let cs = R.companySplit(1000);
  t('E5', 'six rows sum 1000, first 130', cs.map((r) => r.amount).join(','), cs.length === 6 && cs.reduce((a, r) => a + r.amount, 0) === 1000 && cs[0].amount === 130);
  t('E6', 'empty', R.companySplit(0).length, R.companySplit(0).length === 0);
  cs = R.companySplit(10000000);
  t('E7', 'sum 10000000', cs.reduce((a, r) => a + r.amount, 0), cs.reduce((a, r) => a + r.amount, 0) === 10000000);
  t('E8', '100 then 1000', R.runInvest(30000, 20000, 0.10, true, 0) + ', ' + R.runInvest(30000, 20000, 0.10, true, 1), R.runInvest(30000, 20000, 0.10, true, 0) === 100 && R.runInvest(30000, 20000, 0.10, true, 1) === 1000);
  const minChips = Math.min(...Object.values(GUIDE.chips).map((a) => a.length));
  t('E11', '28+ pairs; 3+ chips per route', `${ALL_QA.length} pairs; min chips ${minChips}`, ALL_QA.length >= 28 && minChips >= 3);
  return rows;
}
