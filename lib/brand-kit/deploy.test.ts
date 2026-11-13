import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BrandDeploy } from '@/components/brand/BrandDeploy';
import { BrandWelcome } from '@/components/brand/BrandWelcome';
import { KIT_OUTPUTS, brandColorLines, deployPlan } from './deploy';
import { FICTIONAL_BRAND_INPUT, buildBrandKit } from './kit';

const kit = buildBrandKit(FICTIONAL_BRAND_INPUT);
const INTERNAL_WORDS = /foundation|backbrief|chapter|working preferences|synthesis|prototype/i;

describe('where each part of the kit goes', () => {
  const plan = deployPlan(kit);
  const everything = [...plan.assistants, ...plan.others];

  it('offers the assistants owners use, then three other places, each in three steps with something to copy', () => {
    expect(plan.assistants.map(item => item.name)).toEqual(['ChatGPT', 'Claude', 'Gemini', 'Grok', 'DeepSeek', 'Kimi', 'Another AI assistant']);
    expect(plan.others.map(item => item.id)).toEqual(['canva', 'email', 'social']);
    for (const destination of everything) {
      expect(destination.steps).toHaveLength(3);
      expect(destination.steps[0]).toMatch(/^Copy /);
      expect(destination.copyText.length).toBeGreaterThan(20);
      expect(destination.purpose).toMatch(/^So /);
      expect(destination.fallback.length).toBeGreaterThan(20);
      expect(JSON.stringify([destination.purpose, destination.steps, destination.fallback])).not.toMatch(INTERNAL_WORDS);
    }
    expect(JSON.stringify(plan)).not.toMatch(/enrich|helena/i);
  });

  it('writes a menu path only where one was confirmed, and the paste-first method everywhere else', () => {
    const steps = Object.fromEntries(plan.assistants.map(item => [item.id, item.steps[1]]));
    expect(steps.chatgpt).toContain('Settings, then Personalization, then Custom instructions');
    expect(steps.claude).toContain('Set project instructions');
    expect(steps.gemini).toContain('New Gem');
    expect(steps.grok).toContain('Settings, then Customize, then Custom Instructions');
    for (const id of ['deepseek', 'kimi', 'other']) expect(steps[id]).toMatch(/^Open a new chat in .+ and paste them as your first message\.$/);
    expect(steps.kimi).toContain('Kimi');
    expect(steps.other).toContain('your assistant');
    for (const id of ['chatgpt', 'claude', 'gemini', 'grok']) expect(plan.assistants.find(item => item.id === id)?.fallback).toContain('first message of a new chat');
  });

  it('hands over the owner’s own material and keeps private notes out unless asked', () => {
    const [canva, email, social] = plan.others;
    for (const assistant of plan.assistants) { expect(assistant.copyText).toContain(kit.business.name); expect(assistant.copyText).not.toContain('HOW TO WORK WITH ME'); }
    expect(deployPlan(kit, true).assistants[0].copyText).toContain('HOW TO WORK WITH ME');
    expect(canva.copyText).toBe(brandColorLines(kit));
    expect(canva.copyText.match(/#[0-9a-f]{6}/gi)).toHaveLength(3);
    expect(canva.steps[2]).toContain(kit.visuals.headingFont);
    expect(canva.fallback).toContain('three brand colors');
    expect(email.copyText).toContain(kit.firstCampaign.email.subject);
    expect(email.fallback).toBe('Bootfile does not send anything for you.');
    expect(social.copyText.split('---')).toHaveLength(3);
    expect(social.fallback).toBe('Bootfile does not post anything for you.');
  });
});

describe('the opening screen and the last screen', () => {
  it('shows what you get and where it goes before asking for anything, with one way forward', () => {
    const html = renderToStaticMarkup(createElement(BrandWelcome, { restored: false, onStart: () => {}, onExample: () => {}, fine: 'No account needed for this preview. No checkout is enabled.' }));
    expect(KIT_OUTPUTS).toHaveLength(4);
    for (const output of KIT_OUTPUTS) { expect(html).toContain(output.name); expect(html).toContain(output.goes); }
    expect(html.match(/class="brandButton"/g)).toHaveLength(1);
    expect(html).toContain('Build my kit');
    expect(html).toContain('fictional business');
    expect(html).toContain('YOUR PHOTO HERE');
    expect(html).toContain('A DRAFT IN YOUR VOICE');
    expect(html).toContain(kit.firstCampaign.email.subject);
    expect(html).toContain('No checkout is enabled.');
    expect(html.replace(/class="[^"]*"/g, '')).not.toMatch(INTERNAL_WORDS);
    expect(html).not.toMatch(/\d+\s*(minutes|min)\b/i);
    expect(renderToStaticMarkup(createElement(BrandWelcome, { restored: true, onStart: () => {}, onExample: () => {}, fine: '' }))).toContain('Continue my brand kit');
  });

  it('leads the finished kit with one assistant chosen from seven and three other places', () => {
    const html = renderToStaticMarkup(createElement(BrandDeploy, { plan: deployPlan(kit), onCopy: () => {} }));
    expect(html).toContain('Put it to work.');
    expect(html).toContain('0 of 4 done');
    expect(html.match(/type="radio"/g)).toHaveLength(7);
    expect(html.match(/type="checkbox"/g)).toHaveLength(4);
    expect(html.match(/Copy AI instructions/g)).toHaveLength(1);
    for (const expected of ['Which AI assistant do you use?', 'Grok', 'DeepSeek', 'Kimi', 'Copy brand colors', 'Copy email draft', 'Copy three post drafts', 'Settings, then Personalization, then Custom instructions', 'Brand Kit']) expect(html).toContain(expected);
    expect(html).not.toContain('Set project instructions');
  });
});
