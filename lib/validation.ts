// Centralized validation helpers — no external dependencies

const VALID_ARCHETYPES = new Set([
  'surgeon', 'architect', 'sparring', 'translator',
  'copilot', 'librarian', 'closer', 'maker',
]);

const VALID_DECISION_STYLES = new Set(['convergent', 'analytical', 'adversarial', 'generative']);
const VALID_RESPONSE_LENGTHS = new Set(['short', 'medium', 'long']);
const VALID_PLATFORMS = new Set(['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'copilot']);

export function isValidArchetype(value: unknown): boolean {
  return typeof value === 'string' && VALID_ARCHETYPES.has(value);
}

export function isValidDecisionStyle(value: unknown): boolean {
  return typeof value === 'string' && VALID_DECISION_STYLES.has(value);
}

export function isValidResponseLength(value: unknown): boolean {
  return typeof value === 'string' && VALID_RESPONSE_LENGTHS.has(value);
}

export function isValidPlatform(value: unknown): boolean {
  return typeof value === 'string' && VALID_PLATFORMS.has(value);
}

export function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, maxLength).trim();
}

export function sanitizeStringArray(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.slice(0, maxItemLength).trim())
    .filter(item => item.length > 0);
}

export function sanitizeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

import type { ArchetypeId } from './questions';

export interface ValidatedGenerateInputs {
  primaryArchetype: ArchetypeId;
  secondaryArchetype: ArchetypeId | null;
  tertiaryArchetype: ArchetypeId | null;
  lowestArchetypes: ArchetypeId[];
  allScores: Record<ArchetypeId, number>;
  domain: string;
  domainOther: string;
  technicalLevel: number;
  primaryUses: string[];
  decisionStyle: string;
  responseLength: string;
  petPeeves: string[];
  customAvoidances: string;
  openDescription: string;
}

export function validateGenerateInputs(body: unknown): ValidatedGenerateInputs | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isValidArchetype(b.primaryArchetype)) return null;

  // Validate scores object
  const allScores: Record<string, number> = {} as Record<ArchetypeId, number>;
  if (b.allScores && typeof b.allScores === 'object') {
    for (const [key, val] of Object.entries(b.allScores as Record<string, unknown>)) {
      if (isValidArchetype(key) && typeof val === 'number') {
        allScores[key] = Math.max(0, Math.min(100, Math.round(val)));
      }
    }
  }

  return {
    primaryArchetype: b.primaryArchetype as ArchetypeId,
    secondaryArchetype: isValidArchetype(b.secondaryArchetype) ? b.secondaryArchetype as ArchetypeId : null,
    tertiaryArchetype: isValidArchetype(b.tertiaryArchetype) ? b.tertiaryArchetype as ArchetypeId : null,
    lowestArchetypes: sanitizeStringArray(b.lowestArchetypes, 4, 20).filter(a => VALID_ARCHETYPES.has(a)) as ArchetypeId[],
    allScores: allScores as Record<ArchetypeId, number>,
    domain: sanitizeString(b.domain, 50),
    domainOther: sanitizeString(b.domainOther, 100),
    technicalLevel: sanitizeNumber(b.technicalLevel, 1, 10, 5),
    primaryUses: sanitizeStringArray(b.primaryUses ?? (b.primaryUse ? [b.primaryUse] : []), 11, 50),
    decisionStyle: isValidDecisionStyle(b.decisionStyle) ? b.decisionStyle as string : 'analytical',
    responseLength: isValidResponseLength(b.responseLength) ? b.responseLength as string : 'medium',
    petPeeves: sanitizeStringArray(b.petPeeves, 4, 100),
    customAvoidances: sanitizeString(b.customAvoidances, 300),
    openDescription: sanitizeString(b.openDescription, 500),
  };
}
