'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { PublicPaidBrandKit } from '@/lib/brand-kit/synthesis';
import { revisionDay } from '@/lib/brand-kit/revision-changes';
import type { StudioRevisionView } from '@/lib/studio/types';
import { BrandDeploy } from '@/components/brand/BrandDeploy';
import { BrandPlacements } from '@/components/brand/BrandPlacements';
import { deployPlanForPaidKit } from '@/lib/brand-kit/deploy';
import { sourceFromPaidKit } from '@/lib/brand-kit/placements';
import { BrandRevision } from './BrandRevision';
import { CopyButton } from './StudioBundleView';
import { DocumentIcon, StudioNotice, studioColors as c } from './StudioChrome';

const POST_LABELS = ['Introduce the offer', 'Explain the fit', 'Invite the next step'];
/** When a step's own card shows the result of a copy, the page's status line still announces it but is not drawn a second time. */
const HIDDEN_STATUS: CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' };

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 34 }}>
      <h3 className="font-heading" style={{ fontSize: 25, fontWeight: 400, lineHeight: 1.3 }}>{title}</h3>
      {description ? <p style={{ color: c.muted, fontSize: 13, lineHeight: 1.75, marginTop: 7, maxWidth: 680 }}>{description}</p> : null}
      <div className="studio-pack-document" style={{ marginTop: 16 }}>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ marginTop: 14 }}><p style={{ color: c.muted, fontSize: 11 }}>{label}</p><div style={{ fontSize: 14, lineHeight: 1.75, marginTop: 4 }}>{children}</div></div>;
}

function CopyRow({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}><p style={{ color: c.muted, fontSize: 11 }}>{label}</p><CopyButton text={text} label={`Copy ${label.toLowerCase()}`} /></div>
      <div className="studio-copy-text" style={{ marginTop: 9 }}>{text}</div>
    </div>
  );
}

/**
 * The paid Brand & AI Kit as its owner sees it. It receives only the public allowlist, so the
 * owner's private work-style notes are never in the page. They are fetched on an explicit click.
 */
export function BrandKitOrderView({ kit, guide, orderId, token, revision, onRefresh }: { kit: PublicPaidBrandKit; guide?: { assistantInstructions: string; reviewChecklist: string[] }; orderId: string; token: string; revision?: StudioRevisionView; onRefresh?: () => void }) {
  const [downloading, setDownloading] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [copied, setCopied] = useState('');
  const [deployNote, setDeployNote] = useState('');
  async function copyWords(text: string, label: string, fromSteps = false) {
    let outcome = `${label} copied.`;
    try { await navigator.clipboard.writeText(text); }
    catch { outcome = 'Copying is unavailable in this browser. Use Download my kit instead.'; }
    setCopied(outcome);
    setDeployNote(fromSteps ? outcome : '');
  }
  const { business, voice, visuals, campaign, synthesis } = kit;

  async function download(scope: 'public' | 'private', format: 'md' | 'json', first = false) {
    const key = `${first ? 'first' : scope}-${format}`;
    setDownloadError('');
    setDownloading(key);
    try {
      const response = await fetch(`/api/studio/orders/${encodeURIComponent(orderId)}/download?scope=${scope}&format=${format}${first ? '&version=first' : ''}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error('download_failed');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `bootfile-brand-ai-kit${first ? '-first-version' : ''}${scope === 'private' ? '-private' : ''}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setDownloadError('The download couldn’t start. Please try again, or use Refresh status and retry.'); }
    finally { setDownloading(''); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${c.line}` }}>
        <div><p style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>BRAND &amp; AI KIT</p><h2 style={{ fontSize: 17, fontWeight: 550 }}>{business.name}</h2></div>
        <div className="studio-result-actions">
          <button type="button" className="studio-button studio-button-small" disabled={!!downloading} onClick={() => download('public', 'md')}><DocumentIcon kind="download" />{downloading === 'public-md' ? 'Preparing…' : 'Download my kit'}</button>
          <button type="button" className="studio-button studio-button-small studio-button-secondary" disabled={!!downloading} onClick={() => download('public', 'json')}>{downloading === 'public-json' ? 'Preparing…' : 'Download as JSON'}</button>
        </div>
      </div>
      {downloadError ? <div style={{ marginBottom: 20 }}><StudioNotice tone="error">{downloadError}</StudioNotice></div> : null}
      <StudioNotice>This is a model-assisted draft built from the facts you supplied. It has not been independently verified. Check every claim before you publish anything. Nothing has been sent or published for you.</StudioNotice>
      {revision && (revision.status === 'queued' || revision.status === 'generating') ? <div style={{ marginTop: 14 }}><StudioNotice tone="success">
        <strong>Your revised kit is being built.</strong> This page updates on its own, and the link in your delivery email always brings you back here. Until it is ready, this is your first kit.
        {onRefresh ? <span style={{ display: 'block', marginTop: 10 }}><button type="button" className="studio-button studio-button-small studio-button-secondary" onClick={onRefresh}>Check again</button></span> : null}
      </StudioNotice></div> : null}
      {revision?.status === 'ready' ? <div style={{ marginTop: 14 }}><StudioNotice tone="success">
        <strong>This is your revised kit.</strong> It was built from the answers you changed{revisionDay(revision.requestedAt) ? ` on ${revisionDay(revision.requestedAt)}` : ''}. It is a new draft, so check its claims as you did before. Your first kit is still yours.
        <span style={{ display: 'block', marginTop: 10 }}><button type="button" className="studio-button studio-button-small studio-button-secondary" disabled={!!downloading} onClick={() => download('public', 'md', true)}>{downloading === 'first-md' ? 'Preparing…' : 'Download the first version'}</button></span>
      </StudioNotice></div> : null}
      {revision?.status === 'needs_attention' ? <div style={{ marginTop: 14 }}><StudioNotice>
        <strong>We could not finish your revised kit.</strong> Your first kit below is unchanged. Email support@bootfile.ai with your order number and we will put it right.
      </StudioNotice></div> : null}

      <div style={{ marginTop: 30 }}><BrandPlacements source={sourceFromPaidKit(kit)} onCopy={copyWords} /><p role="status" aria-live="polite" style={deployNote ? HIDDEN_STATUS : { fontSize: 12, minHeight: 18 }}>{copied}</p>{guide ? <BrandDeploy plan={deployPlanForPaidKit(kit, guide.assistantInstructions)} onCopy={(text, label) => copyWords(text, label, true)} status={deployNote} /> : null}
        <h2 className="font-heading" style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.2, marginTop: 6 }}>Read the full kit</h2></div>

      <Section title="Your brand" description="Who you serve, what you offer, and what sets you apart, in your own supplied facts.">
        <CopyRow label="Positioning" text={synthesis.positioning} />
        <Field label="What you do">{business.description}</Field>
        <Field label="Who it is for">{business.audience}</Field>
        <Field label="What sets you apart, as you told us">{business.difference}</Field>
        <Field label="Evidence you supplied">{business.supportingEvidence}</Field>
      </Section>

      <Section title="Voice guide" description={`Selected direction: ${voice.name}.`}>
        <Field label="Do"><ul style={{ paddingLeft: 18 }}>{synthesis.voiceDo.map(rule => <li key={rule}>{rule}</li>)}</ul></Field>
        <Field label="Avoid"><ul style={{ paddingLeft: 18 }}>{synthesis.voiceAvoid.map(rule => <li key={rule}>{rule}</li>)}</ul></Field>
        <CopyRow label="Voice summary for Canva" text={voice.canvaSummary} />
      </Section>

      <Section title="Visual starter kit" description="A color and type pairing to start from. A passing contrast check on this pairing does not make every later design accessible, and font availability and licensing vary by tool.">
        <Field label={visuals.name}>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 9 }}>
            {[['Background', visuals.background], ['Text', visuals.ink], ['Accent', visuals.accent], ['Text on accent', visuals.buttonInk]].map(([label, hex]) => (
              <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 11 }}><span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${c.line}`, background: hex }} /><span>{label}: {hex}</span></li>
            ))}
          </ul>
        </Field>
        <Field label="Heading font">{visuals.headingFont}</Field>
        <Field label="Body font">{visuals.bodyFont}</Field>
        <Field label="Text on background contrast">{visuals.textContrast.toFixed(2)}:1</Field>
      </Section>

      <Section title="First campaign" description="Reconfirm the offer, facts and next step before you use any of this.">
        <Field label="Offer">{campaign.offer}</Field>
        <Field label="Exact next step">{campaign.callToAction}</Field>
        <CopyRow label="Email subject" text={synthesis.email.subject} />
        <CopyRow label="Email preview text" text={synthesis.email.preview} />
        <CopyRow label="Email body" text={synthesis.email.body} />
        {synthesis.posts.map((post, index) => <CopyRow key={POST_LABELS[index]} label={`Social post ${index + 1}: ${POST_LABELS[index]}`} text={post.body} />)}
      </Section>

      {guide ? <Section title="AI working instructions" description="Paste these into a new conversation with your AI assistant, or save them where your account supports saved instructions. They do not train the underlying model, install anything, or guarantee the assistant will remember them.">
        <CopyRow label="Instructions for your AI assistant" text={guide.assistantInstructions} />
      </Section> : null}

      <Section title="Where each claim came from" description="These quotations trace the draft to the text you supplied. They do not verify it.">
        <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>{synthesis.sourceNotes.map((note, index) => <li key={`${note.field}-${index}`}>{note.field}: {note.quote}</li>)}</ul>
      </Section>

      {guide?.reviewChecklist.length ? <Section title="Before you publish" description="Work through this list yourself. Bootfile has not checked these for you.">
        <ul style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.85 }}>{guide.reviewChecklist.map(item => <li key={item}>{item}</li>)}</ul>
      </Section> : null}

      {revision?.canRequest ? <BrandRevision orderId={orderId} token={token} revision={revision} onSent={() => onRefresh?.()} /> : null}

      <Section title="Your private work-style notes" description="How you like to work with an AI assistant stays out of your brand guide. Download the private copy only for yourself, and do not share it as your brand kit.">
        <div className="studio-result-actions" style={{ marginTop: 6 }}>
          <button type="button" className="studio-button studio-button-small studio-button-secondary" disabled={!!downloading} onClick={() => download('private', 'md')}>{downloading === 'private-md' ? 'Preparing…' : 'Download my private copy'}</button>
        </div>
      </Section>
    </div>
  );
}
