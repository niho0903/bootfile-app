/** Explicit customer reports only. Downloads and page views never update this state. */
export type StudioFeedbackEvent = 'useful' | 'not_useful' | 'used' | 'reused';

export interface StudioFeedbackView {
  usefulness: 'useful' | 'not_useful' | null;
  usedAt: string | null;
  reusedAt: string | null;
  updatedAt: string | null;
}

export function isStudioFeedbackView(value: unknown): value is StudioFeedbackView {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (item.usefulness === null || item.usefulness === 'useful' || item.usefulness === 'not_useful')
    && ['usedAt', 'reusedAt', 'updatedAt'].every(key => item[key] === null || (typeof item[key] === 'string' && Number.isFinite(Date.parse(item[key]))))
    && (item.reusedAt === null || item.usedAt !== null);
}
