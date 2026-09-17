export const SHARE_MIN = 0.01;
export const SHARE_MAX = 0.5;
export const FALL = 0.25;
export const WORTH = 1.013;
export const FIRST_RUN_CAP = 100;

const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };

export const clampShare = (s) => Math.min(SHARE_MAX, Math.max(SHARE_MIN, num(s)));
export const clampFloor = (f, L) => Math.min(Math.max(0, num(f)), Math.max(0, num(L)));

export function calcInvest(lastInflow, floor, share) {
  const L = Math.max(0, num(lastInflow));
  return Math.max(0, Math.round((L - clampFloor(floor, L)) * clampShare(share)));
}

export function runInvest(amount, floor, share, capOn, runs) {
  const v = calcInvest(amount, floor, share);
  return capOn && runs === 0 ? Math.min(FIRST_RUN_CAP, v) : v;
}

export function stagePlan(invest) {
  const total = Math.max(0, Math.round(num(invest)));
  const now = Math.round(total * 0.25);
  const rest = total - now;
  const step = Math.floor(rest / 6);
  const steps = [step, step, step, step, step, step];
  steps[0] += rest - step * 6;
  return { now, steps, total };
}

export const COMPANIES = [
  ['HDFC Bank', 0.13], ['Reliance', 0.09], ['ICICI Bank', 0.08], ['Infosys', 0.06], ['Bharti Airtel', 0.05],
];

export function companySplit(invest) {
  const total = Math.max(0, Math.round(num(invest)));
  if (total === 0) return [];
  const rows = COMPANIES.map(([name, w]) => ({ name, amount: Math.floor(total * w) }));
  const used = rows.reduce((a, r) => a + r.amount, 0);
  rows.push({ name: 'and 45 others', short: '+45', amount: total - used });
  return rows;
}

export function fmtNum(n) {
  const s = String(Math.round(Math.abs(num(n))));
  if (s.length <= 3) return s;
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
}
export const fmtRs = (n) => '₹' + fmtNum(n);
export const fmtPct = (share) => Math.round(clampShare(share) * 100) + '%';

export function parseAmount(raw) {
  const t = String(raw == null ? '' : raw).trim();
  if (t === '') return { value: null, error: '' };
  if (t.includes('-')) return { value: null, error: 'No minus sign here. ₹0 or more.' };
  if (!/^\d+$/.test(t)) return { value: null, error: 'Digits only, please. No letters or symbols.' };
  return { value: parseInt(t, 10), error: '' };
}

export function zeroReason(L, floor, share) {
  const l = num(L), f = num(floor);
  if (l <= 0) return 'Nothing came in last time, so there is nothing to invest yet.';
  if (f > l) return `Your floor of ${fmtRs(f)} is more than the ${fmtRs(l)} that came in, so nothing is left.`;
  if (f === l) return `Your floor of ${fmtRs(f)} is all of the ${fmtRs(l)} that came in, so nothing is left.`;
  return `Only ${fmtRs(l - f)} is left after your floor, so ${fmtPct(share)} of it rounds to nothing.`;
}

export const ruleSentence = (floor, share) =>
  `When money lands, ${fmtRs(floor)} stays untouched and ${fmtPct(share)} of the rest goes in automatically.`;

export function stageSentence(plan) {
  const s = plan.steps;
  if (s.every((x) => x === s[0])) return `${fmtRs(plan.now)} goes in now, then ${fmtRs(s[0])} a month for six months.`;
  return `${fmtRs(plan.now)} goes in now, then ${fmtRs(s[0])} next month and ${fmtRs(s[1])} a month for the five after.`;
}

export const worstCase = (v) => Math.round(Math.max(0, num(v)) * (1 - FALL));
export const worstLine = (v) => `A bad year, a ${Math.round(FALL * 100)}% fall: ${fmtRs(v)} becomes about ${fmtRs(worstCase(v))}. 2008 was worse, about half.`;

export function firedLine(amount, floor, share, invested) {
  const kept = clampFloor(floor, amount);
  if (invested === 0) return `${fmtRs(amount)} landed. ₹0 goes in: ${zeroReason(amount, floor, share)}`;
  return `${fmtRs(amount)} landed. ${fmtRs(kept)} stays. ${fmtRs(invested)} goes in automatically.`;
}
