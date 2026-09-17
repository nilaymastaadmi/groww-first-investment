import { GUIDE } from './copy.js';

export const ALL_QA = GUIDE.topics.flatMap((t) => t.qa.map((qa) => ({ ...qa, topic: t.id })));
export const byId = (id) => ALL_QA.find((q) => q.id === id);
