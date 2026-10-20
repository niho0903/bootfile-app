'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { studioBundleMarkdown } from '@/lib/studio/bundle';
import type { StudioBrief, StudioBundle } from '@/lib/studio/types';
import { ArrowIcon, CheckIcon, DocumentIcon, StudioNotice, studioColors as c } from './StudioChrome';

const TABS = [
  { id: 'email', label: 'Customer email', number: '01' },
  { id: 'social', label: 'Social posts', number: '02' },
  { id: 'setup', label: 'Your AI setup', number: '03' },
  { id: 'brief', label: 'Business brief', number: '04' },
  { id: 'checklist', label: 'Review checklist', number: '05' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const BRIEF_LABELS: Record<keyof StudioBrief, string> = { businessName: 'Business name', businessDescription: 'What you do', audience: 'Who this is for', offer: 'The offer', goal: 'The goal', approvedFacts: 'Details provided', callToAction: 'The next step', voiceSample: 'Your voice', constraints: 'Things to avoid' };

export function StudioBundleView({ bundle, isSample = false }: { bundle: StudioBundle; isSample?: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>('email');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(() => new Set());
  const [downloadError, setDownloadError] = useState('');
  const platform = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' }[bundle.reusableWorkflow.platform];
  const completeMarkdown = `${isSample ? '# Illustrative example — fictional business\n\n' : ''}${studioBundleMarkdown(bundle)}`;

  function downloadPack() {
    setDownloadError('');
    try {
      const blob = new Blob([completeMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const businessName = bundle.businessBrief.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/-$/, '') || 'your-business';
      link.href = url;
      link.download = `bootfile-${isSample ? 'sample-' : ''}${businessName}.md`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setDownloadError('The download couldn’t start. You can copy the complete pack instead.'); }
  }

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(TABS[next].id);
    document.getElementById(`studio-tab-${TABS[next].id}`)?.focus();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${c.line}` }}>
        <div><p style={{ color: c.muted, fontSize: 11, marginBottom: 4 }}>MARKETING SETUP {isSample ? '· EXAMPLE' : ''}</p><h2 style={{ fontSize: 17, fontWeight: 550 }}>{bundle.businessBrief.businessName}</h2></div>
        <div className="studio-result-actions"><button type="button" onClick={downloadPack} className="studio-button studio-button-small"><DocumentIcon kind="download" />{isSample ? 'Download example' : 'Download my pack'}</button><CopyButton text={completeMarkdown} label="Copy complete pack" /></div>
      </div>
      {downloadError ? <div style={{ marginBottom: 24 }}><StudioNotice tone="error">{downloadError}</StudioNotice></div> : null}
      <div className="studio-pack-layout">
        <div>
          <div role="tablist" aria-label="Your marketing pack" className="studio-pack-nav">
            {TABS.map((tab, index) => <button key={tab.id} id={`studio-tab-${tab.id}`} type="button" role="tab" className="studio-tab" aria-selected={activeTab === tab.id} aria-controls={`studio-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onKeyDown={event => handleTabKeys(event, index)} onClick={() => setActiveTab(tab.id)}><span>{tab.label}</span><span className="studio-tab-number" style={{ fontSize: 10, opacity: .7 }}>{tab.number}</span></button>)}
          </div>
        </div>
        <div role="tabpanel" id={`studio-panel-${activeTab}`} aria-labelledby={`studio-tab-${activeTab}`} tabIndex={0} style={{ minWidth: 0 }}>
          {activeTab === 'email' ? <>
            <PanelIntro title="Your customer email" description="Read it through, check your facts, and make any last edits in your email tool." />
            <div className="studio-pack-document">
              <CopyBlock label="Subject" text={bundle.email.subject}><h3 className="font-heading" style={{ fontSize: 29, fontWeight: 400, lineHeight: 1.3, marginTop: 10 }}>{bundle.email.subject}</h3></CopyBlock>
              <div style={{ padding: '20px 0', marginTop: 17, borderTop: `1px solid ${c.line}`, borderBottom: `1px solid ${c.line}` }}><CopyBlock label="Preview text" text={bundle.email.previewText}><p style={{ color: c.muted, fontSize: 13, lineHeight: 1.75, marginTop: 8 }}>{bundle.email.previewText}</p></CopyBlock></div>
              <div style={{ marginTop: 22 }}><CopyBlock label="Email body" text={bundle.email.body}><div className="studio-copy-text" style={{ marginTop: 17 }}>{bundle.email.body}</div></CopyBlock></div>
            </div>
            <button type="button" className="studio-text-link" style={{ background: 'none', border: 0, cursor: 'pointer', marginTop: 22, padding: '8px 0' }} onClick={() => setActiveTab('social')}>Next: your social posts <ArrowIcon /></button>
          </> : activeTab === 'social' ? <>
            <PanelIntro title="Three posts. One clear offer." description="Use them in an order and on the channels that make sense for your audience. Add your own image if you want one." />
            <div style={{ display: 'grid', gap: 18 }}>
              {bundle.socialPosts.map((post, index) => <article key={index} className="studio-pack-document"><CopyBlock label={`Post 0${index + 1}`} text={post.body}><h3 className="font-heading" style={{ fontSize: 25, lineHeight: 1.25, fontWeight: 400, margin: '8px 0 18px' }}>{post.label}</h3><div className="studio-copy-text">{post.body}</div></CopyBlock></article>)}
            </div>
            <button type="button" className="studio-text-link" style={{ background: 'none', border: 0, cursor: 'pointer', marginTop: 22, padding: '8px 0' }} onClick={() => setActiveTab('setup')}>Next: keep the setup working for you <ArrowIcon /></button>
          </> : activeTab === 'setup' ? <>
            <PanelIntro title="Ready for your next promotion." description={`Keep this setup and use it in your own ${platform} account when you have another offer to work on.`} />
            <div className="studio-pack-document">
              <h3 className="font-heading" style={{ fontSize: 25, fontWeight: 400, marginBottom: 21 }}>Set it up in {platform}</h3>
              <ol style={{ listStyle: 'none', display: 'grid', gap: 18, marginBottom: 28 }}>{bundle.reusableWorkflow.setupSteps.map((step, index) => <li key={index} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 12, fontSize: 13, lineHeight: 1.8, color: '#514D46' }}><span style={{ color: c.green, fontSize: 11, paddingTop: 2 }}>{String(index + 1).padStart(2, '0')}</span><span>{step}</span></li>)}</ol>
              <div style={{ background: c.wash, border: '1px solid #D6DDCB', borderRadius: 9, padding: 20 }}><CopyBlock label="Your reusable business setup" text={bundle.reusableWorkflow.context} copyLabel="Copy setup"><p style={{ fontSize: 12, color: c.muted, marginTop: 13, lineHeight: 1.8 }}>Copy this into a new {platform} conversation. It includes your business brief, your tone, and rules for handling missing facts.</p><details style={{ marginTop: 13 }}><summary style={{ cursor: 'pointer', color: c.green, fontSize: 12 }}>Read the complete setup</summary><pre className="studio-copy-text" style={{ fontSize: 12, marginTop: 16 }}>{bundle.reusableWorkflow.context}</pre></details></CopyBlock></div>
              <div style={{ marginTop: 25 }}><CopyBlock label="Then start your next task" text={bundle.reusableWorkflow.nextTaskPrompt} copyLabel="Copy prompt"><div className="studio-copy-text" style={{ marginTop: 15, fontSize: 13 }}>{bundle.reusableWorkflow.nextTaskPrompt}</div></CopyBlock></div>
            </div>
            <div style={{ marginTop: 18 }}><StudioNotice>Update your brief when your business or offer changes. Your saved setup is yours to keep; future AI responses depend on the tool you use and the details you give it.</StudioNotice></div>
          </> : activeTab === 'brief' ? <>
            <PanelIntro title="The brief behind your promotion." description="These are the details you supplied. Keep them current before reusing your AI setup." />
            <div className="studio-pack-document"><dl style={{ display: 'grid', gap: 22 }}>{(Object.keys(BRIEF_LABELS) as (keyof StudioBrief)[]).map((key, index) => <div key={key} style={{ paddingBottom: 22, borderBottom: index < Object.keys(BRIEF_LABELS).length - 1 ? `1px solid ${c.line}` : undefined }}><dt style={{ fontSize: 11, color: c.green, fontWeight: 550, marginBottom: 8 }}>{BRIEF_LABELS[key]}</dt><dd className="studio-copy-text">{bundle.businessBrief[key] || 'Not supplied.'}</dd></div>)}</dl></div>
            {bundle.sourceNotes.length ? <details style={{ marginTop: 20, border: `1px solid ${c.line}`, borderRadius: 9, padding: '17px 20px' }}><summary style={{ fontSize: 13, color: c.green, cursor: 'pointer' }}>A few details carried into the drafts</summary><ul style={{ paddingLeft: 18, display: 'grid', gap: 12, marginTop: 17 }}>{bundle.sourceNotes.map((note, index) => <li key={index} style={{ fontSize: 12, lineHeight: 1.8, color: c.muted }}>{note.quote}</li>)}</ul></details> : null}
          </> : <>
            <PanelIntro title="The last pass is yours." description="A quick review helps you catch the details that matter before your customers see the work." />
            <div className="studio-pack-document">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 24 }}><h3 className="font-heading" style={{ fontSize: 25, fontWeight: 400 }}>Before you publish</h3><span style={{ fontSize: 11, color: c.green }}>{checkedItems.size} / {bundle.qualityChecklist.length} reviewed</span></div>
              <div style={{ display: 'grid', gap: 20 }}>{bundle.qualityChecklist.map((item, index) => <label key={index} className="studio-choice" style={{ paddingBottom: 20, borderBottom: index < bundle.qualityChecklist.length - 1 ? `1px solid ${c.line}` : undefined }}><input type="checkbox" checked={checkedItems.has(index)} onChange={() => setCheckedItems(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; })} /><span style={{ color: checkedItems.has(index) ? c.muted : c.ink }}>{item}</span></label>)}</div>
              {checkedItems.size === bundle.qualityChecklist.length ? <div style={{ marginTop: 22, color: c.green, display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }} role="status"><CheckIcon />You’ve reviewed every item.</div> : null}
            </div>
          </>}
        </div>
        {TABS.filter(tab => tab.id !== activeTab).map(tab => <div key={tab.id} role="tabpanel" id={`studio-panel-${tab.id}`} aria-labelledby={`studio-tab-${tab.id}`} hidden />)}
      </div>
    </div>
  );
}

function PanelIntro({ title, description }: { title: string; description: string }) {
  return <div style={{ marginBottom: 24 }}><h2 className="font-heading" style={{ fontSize: 'clamp(27px, 3vw, 33px)', fontWeight: 400, lineHeight: 1.25, letterSpacing: '-.015em', marginBottom: 11 }}>{title}</h2><p style={{ fontSize: 13, lineHeight: 1.8, color: c.muted, maxWidth: 630 }}>{description}</p></div>;
}

function CopyBlock({ label, text, copyLabel, children }: { label: string; text: string; copyLabel?: string; children: ReactNode }) {
  return <div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}><p style={{ fontSize: 11, fontWeight: 500, color: c.muted }}>{label}</p><CopyButton text={text} label={copyLabel || 'Copy'} accessibleLabel={copyLabel || `Copy ${label.toLowerCase()}`} /></div>{children}</div>;
}

export function CopyButton({ text, label = 'Copy', accessibleLabel }: { text: string; label?: string; accessibleLabel?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      timer.current = setTimeout(() => setState('idle'), 2500);
    } catch { setState('failed'); }
  }
  return <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}><button type="button" className="studio-copy-button" aria-label={accessibleLabel || label} onClick={copy}>{state === 'copied' ? <CheckIcon size={14} /> : <DocumentIcon kind="copy" />}<span aria-live="polite">{state === 'copied' ? 'Copied' : label}</span></button>{state === 'failed' ? <span role="status" style={{ color: '#813E2E', fontSize: 10, maxWidth: 180, lineHeight: 1.5 }}>Select and copy the text directly; clipboard access is unavailable.</span> : null}</div>;
}
