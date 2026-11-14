import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandRevision } from '@/components/studio/BrandRevision';
import { BrandKitOrderView } from '@/components/studio/BrandKitOrderView';
import { QUESTIONS } from '@/lib/questions';
import type { StudioRevisionView } from '@/lib/studio/types';
import { BRAND_FIELD_COPY, BRAND_STEP_FIELDS, BRAND_STEP_NAMES } from './fields';
import { FICTIONAL_BRAND_INPUT, TEXT_LIMITS, assistantInstructions, type BrandInput } from './kit';
import { answerChanges, revisionDay } from './revision-changes';
import { publicPaidBrandKit } from './synthesis';
import { paidBrandKitFixture } from './test-fixtures';

const base = (): BrandInput => structuredClone(FICTIONAL_BRAND_INPUT);
const edit = (changes: Partial<BrandInput>): BrandInput => ({ ...base(), ...changes });
const INTERNAL_WORDS = /foundation|backbrief|chapter|working preferences|synthesis|prototype/i;

describe('the shared wording of the questions', () => {
  it('covers every written answer once, in the five plain steps', () => {
    expect(Object.keys(BRAND_FIELD_COPY).sort()).toEqual(Object.keys(TEXT_LIMITS).sort());
    const placed = Object.values(BRAND_STEP_FIELDS).flat();
    expect([...placed].sort()).toEqual(Object.keys(TEXT_LIMITS).sort());
    expect(new Set(placed).size).toBe(placed.length);
    expect(BRAND_STEP_NAMES).toEqual(['About you', 'Your business', 'Your voice', 'Your look', 'Your first campaign']);
    for (const copy of Object.values(BRAND_FIELD_COPY)) { expect(copy.label.length).toBeGreaterThan(5); expect(copy.rows).toBeGreaterThanOrEqual(1); }
    expect(JSON.stringify([BRAND_FIELD_COPY, BRAND_STEP_NAMES])).not.toMatch(INTERNAL_WORDS);
  });
});

describe('what a customer changed', () => {
  it('finds nothing in the same answers, and nothing in a change of spacing alone', () => {
    expect(answerChanges(base(), base())).toEqual([]);
    expect(answerChanges(base(), edit({ offer: `  ${base().offer} `, facts: `${base().facts}\n` }))).toEqual([]);
  });

  it('names each change in the words of its question, in step order', () => {
    const answers = { ...base().answers, [QUESTIONS[0].id]: 'A', [QUESTIONS[1].id]: 'A' };
    const changes = answerChanges(base(), edit({ answers, businessName: 'Juniper Pantry Organizing', voice: 'clear', avoid: '', offer: 'A practical pantry reset' }));
    expect(changes.map(change => change.step)).toEqual(['About you', 'Your business', 'Your voice', 'Your voice', 'Your first campaign']);
    expect(changes[0]).toMatchObject({ label: 'How you like to work' });
    expect(changes[0].value).toMatch(/^2 of 8 answers changed\. Your style is now The /);
    expect(changes[1]).toEqual({ step: 'Your business', label: 'What is your business called?', value: 'Juniper Pantry Organizing' });
    expect(changes[2]).toEqual({ step: 'Your voice', label: 'Your public voice', value: 'Clear & considered' });
    expect(changes[3]).toEqual({ step: 'Your voice', label: 'What should your communications avoid?', value: 'Left empty' });
    expect(changes[4]).toEqual({ step: 'Your first campaign', label: 'What is the one offer?', value: 'A practical pantry reset' });
    expect(JSON.stringify(changes)).not.toMatch(INTERNAL_WORDS);
  });

  it('counts colors and named fonts only while the customer keeps their own', () => {
    expect(answerChanges(base(), edit({ accent: '#112233', headingFont: 'Futura' }))).toEqual([]);
    expect(answerChanges(base(), edit({ palette: 'clay' }))).toEqual([{ step: 'Your look', label: 'Your colors', value: 'Human warmth: #FBF1E8, #4E302B, #AC5843' }]);
    const own = answerChanges(base(), edit({ palette: 'existing', background: '#FFFFFF', ink: '#111111', accent: '#3355AA', headingFont: 'Futura' }));
    expect(own.map(change => change.label)).toEqual(['Your colors', 'Existing heading font']);
    expect(own[0].value).toContain('#FFFFFF, #111111, #3355AA');
    const before = edit({ palette: 'existing', background: '#FFFFFF', ink: '#111111', accent: '#3355AA' });
    expect(answerChanges(before, { ...before, accent: '#3355ab' }).map(change => change.label)).toEqual(['Your colors']);
    expect(answerChanges(before, { ...before, accent: '#3355aa' })).toEqual([]);
  });

  it('writes the last day plainly and shows nothing for a missing date', () => {
    expect(revisionDay('2026-11-20T15:02:00.000Z')).toBe('November 20');
    expect(revisionDay(null)).toBe('');
    expect(revisionDay('not a date')).toBe('');
  });
});

describe('the revision on the paid order page', () => {
  const kit = paidBrandKitFixture();
  const guide = { assistantInstructions: assistantInstructions(kit.foundation, false), reviewChecklist: kit.foundation.reviewChecklist };
  const view = (revision?: StudioRevisionView) => renderToStaticMarkup(createElement(BrandKitOrderView, {
    kit: publicPaidBrandKit(kit), guide, orderId: '11111111-1111-4111-8111-111111111111', token: 'not-a-real-token', revision, onRefresh: () => {},
  }));
  const state = (status: StudioRevisionView['status'], canRequest = false): StudioRevisionView =>
    ({ status, canRequest, availableUntil: '2026-11-20T15:02:00.000Z', requestedAt: status === 'none' ? null : '2026-11-15T09:00:00.000Z', readyAt: status === 'ready' ? '2026-11-15T09:02:00.000Z' : null });

  it('says nothing about a revision unless the order carries one or may ask for one', () => {
    for (const html of [view(), view(state('none', false))]) {
      expect(html).not.toMatch(/revis/i);
      expect(html).not.toContain('kitRevise');
    }
  });

  it('offers it once, in plain words, with the last day and one way forward', () => {
    const html = view(state('none', true));
    for (const expected of ['ONE REVISION INCLUDED', 'Something off? Change your answers once.', 'one time, until November 20', 'Change my answers', 'Nothing changes until you send.', 'Your first kit stays available to download.']) expect(html).toContain(expected);
    expect(html.match(/Change my answers/g)).toHaveLength(1);
    expect(html).not.toContain('Send my revision');
    expect(html).not.toContain(kit.foundation.ownerPreferences.instruction);
    expect(html.indexOf('Before you publish')).toBeLessThan(html.indexOf('ONE REVISION INCLUDED'));
    expect(html.indexOf('ONE REVISION INCLUDED')).toBeLessThan(html.indexOf('Your private work-style notes'));
    const offer = renderToStaticMarkup(createElement(BrandRevision, { orderId: 'x', token: 'y', revision: state('none', true), onSent: () => {} }));
    expect(offer.replace(/class="[^"]*"/g, '')).not.toMatch(INTERNAL_WORDS);
    expect(renderToStaticMarkup(createElement(BrandRevision, { orderId: 'x', token: 'y', revision: state('queued'), onSent: () => {} }))).toBe('');
    expect(renderToStaticMarkup(createElement(BrandRevision, { orderId: 'x', token: 'y', revision: { ...state('none', true), availableUntil: null }, onSent: () => {} }))).toContain('one time. Editing');
  });

  it('tells the customer where a revision stands, and never offers a second', () => {
    for (const status of ['queued', 'generating'] as const) {
      const html = view(state(status));
      expect(html).toContain('Your revised kit is being built.');
      expect(html).toContain('Until it is ready, this is your first kit.');
      expect(html).toContain('Check again');
      expect(html).not.toContain('Change my answers');
    }
    const ready = view(state('ready'));
    expect(ready).toContain('This is your revised kit.');
    expect(ready).toContain('the answers you changed on November 15');
    expect(ready).toContain('Download the first version');
    expect(ready).not.toContain('Change my answers');
    const stuck = view(state('needs_attention'));
    expect(stuck).toContain('We could not finish your revised kit.');
    expect(stuck).toContain('Your first kit below is unchanged.');
    expect(stuck).toContain('support@bootfile.ai');
    expect(stuck).not.toContain('Change my answers');
    for (const html of [ready, stuck]) expect(html).toContain('not been independently verified');
  });
});
