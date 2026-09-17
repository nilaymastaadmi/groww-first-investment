import * as R from './rule.js';
import { SCREEN as S, GUIDE, BANNED } from './copy.js';
import { byId, ALL_QA } from './guide.js';

function screenBodies() {
  const h = S.home;
  return {
    welcome: [S.welcome.body, ...S.welcome.steps.flat()],
    kyc: [S.kyc.sub],
    mfHome: [h.sub, ...h.steps.map((s) => s.before)],
    basics0: [S.basics.cards[0].body], basics1: [S.basics.cards[1].body], basics2: [S.basics.cards[2].body],
    rule1: [S.rule1.label, S.rule1.err], rule2: [S.rule2.hint, S.rule2.zero, S.rule2.over], rule3: [S.rule3.line, S.rule3.half],
    rule4: [R.worstLine(1500), S.rule4.crash, S.rule4.stop],
    explore: [S.explore.one.body, ...S.explore.later.rows.map((r) => r[1])],
    stocksGate: [S.stocks.gate.body], fnoGate: [S.fno.gate.body], you: [S.you.line, S.you.modeNote],
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
  const chipIds = Object.values(GUIDE.chips).flat(); const dead = chipIds.filter((id) => !byId(id));
  t('E9', 'every Ask question resolves to an answer', dead.length ? 'missing: ' + dead.join(', ') : `${chipIds.length} links, 0 missing`, dead.length === 0);
  const flat = ALL_QA.filter((qa) => /^no\b/i.test(qa.a) && !['money6', 'basics4', 'plan9'].includes(qa.id));
  t('E10', 'no money or safety answer opens with "No"', flat.length ? flat.map((q) => q.id).join(', ') : 'none', flat.length === 0);
  const minChips = Math.min(...Object.values(GUIDE.chips).map((a) => a.length));
  t('E11', '28+ answers; 3+ questions per screen', `${ALL_QA.length} answers; min per screen ${minChips}`, ALL_QA.length >= 28 && minChips >= 3);
  return rows;
}
