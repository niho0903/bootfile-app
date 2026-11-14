'use client';

import { useState } from 'react';
import type { DeployDestination, DeployPlan } from '@/lib/brand-kit/deploy';
import './deploy.css';

/**
 * The last screen's first job: tell the owner where each piece goes and hand it over one copy at a time.
 * The owner picks the assistant they already use and sees only its steps. Nothing here connects to
 * another product. Every step is something the owner does themselves.
 *
 * `status` is optional: a page whose own message line may be off screen passes the result of the last
 * copy from this section, and it is shown beside the button that was pressed. The page's live region
 * still makes the announcement, so the repeat is hidden from assistive technology.
 */
export function BrandDeploy({ plan, onCopy, status }: { plan: DeployPlan; onCopy: (text: string, label: string) => void; status?: string }) {
  const [assistantId, setAssistantId] = useState(plan.assistants[0].id);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [lastCopied, setLastCopied] = useState('');
  const assistant = plan.assistants.find(item => item.id === assistantId) ?? plan.assistants[0];
  const cards: { key: string; destination: DeployDestination }[] = [{ key: 'assistant', destination: assistant }, ...plan.others.map(destination => ({ key: destination.id as string, destination }))];
  const finished = cards.filter(card => done[card.key]).length;
  return (
    <section className="brandDeploy" aria-labelledby="brand-deploy-title">
      <div className="brandDeployIntro"><p className="brandDeployEyebrow">START HERE</p><h2 id="brand-deploy-title">Put it to work.</h2><p>Four places, three steps each. Start with the one you use most. <span className="brandDeployCount">{finished} of {cards.length} done</span></p></div>
      <fieldset className="brandAssistantPicker"><legend>Which AI assistant do you use?</legend>{plan.assistants.map(item => <label key={item.id} className={item.id === assistant.id ? 'selected' : ''}><input type="radio" name="brand-assistant" value={item.id} checked={item.id === assistant.id} onChange={() => setAssistantId(item.id)} /><span>{item.name}</span></label>)}</fieldset>
      <ol className="brandDeployGrid">
        {cards.map(({ key, destination }) => <li key={key} className={done[key] ? 'done' : ''}>
          <h3>{destination.name}</h3>
          <p className="brandDeployPurpose">{destination.purpose}</p>
          <ol>{destination.steps.map(step => <li key={step}>{step}</li>)}</ol>
          <p className="brandDeployNote">{destination.fallback}</p>
          <div className="brandDeployFoot">
            {status && lastCopied === key ? <p className="brandDeployCopied" aria-hidden="true">{status}</p> : null}
            <div className="brandDeployActions">
              <button type="button" className="brandDeployButton" onClick={() => { setLastCopied(key); onCopy(destination.copyText, destination.copyLabel); }}>Copy {destination.copyLabel === 'AI instructions' ? destination.copyLabel : destination.copyLabel.toLowerCase()}</button>
              <label><input type="checkbox" checked={!!done[key]} onChange={event => setDone(current => ({ ...current, [key]: event.target.checked }))} /> <span>Done</span></label>
            </div>
          </div>
        </li>)}
      </ol>
    </section>
  );
}
