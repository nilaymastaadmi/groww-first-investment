import { GUIDE } from './copy.js';

export const ALL_QA = GUIDE.topics.flatMap((t) => t.qa.map((qa) => ({ ...qa, topic: t.id })));
export const byId = (id) => ALL_QA.find((q) => q.id === id);

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9&₹ ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function route(text, screen) {
  const q = norm(text);
  if (!q) return { fallback: true };
  const onScreen = new Set(GUIDE.chips[screen] || []);
  let best = null, bestScore = 0;
  for (const qa of ALL_QA) {
    let score = 0;
    for (const t of qa.t) if (q.includes(norm(t))) score += norm(t).includes(' ') ? 2 : 1;
    if (q === norm(qa.q)) score += 10;
    if (score > 0 && onScreen.has(qa.id)) score += 0.5;
    if (score > bestScore) { best = qa; bestScore = score; }
  }
  return best ? { qa: best } : { fallback: true };
}
