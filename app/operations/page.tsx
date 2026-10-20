'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import type { OperationsDecision, OperationsMetric, OperationsSnapshot } from '@/lib/operations/types';

const colors = { dark: '#2D2926', cream: '#F7F4EF', sage: '#7D8B6E', light: '#ECEAE4', grey: '#7A746B', border: '#DBD8D0', alert: '#8A4B35' };
const panel: CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: 18, background: '#FFFDF9', padding: 24 };
const button: CSSProperties = { border: 0, borderRadius: 9, padding: '11px 16px', background: colors.dark, color: colors.cream, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const secondaryButton: CSSProperties = { ...button, background: colors.light, color: colors.dark };
const smallLabel: CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: colors.grey };

function dateLabel(value: string | null): string {
  if (!value) return 'Not observed';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function metricLabel(metric: OperationsMetric): string {
  if (metric.value === null) return '—';
  return metric.format === 'currency'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(metric.value / 100)
    : new Intl.NumberFormat().format(metric.value);
}

function statusLabel(status: string): string {
  return ({ ready: 'Verified', attention: 'Needs attention', unavailable: 'Unavailable', unverified: 'Not verified', completed: 'Completed', partial: 'Partly completed', running: 'Started', failed: 'Failed', paused: 'Paused' } as Record<string, string>)[status] || status;
}

function Badge({ status }: { status: string }) {
  const caution = ['attention', 'unavailable', 'failed', 'partial', 'critical'].includes(status);
  return <span style={{ display: 'inline-block', fontSize: 11, lineHeight: 1.5, fontWeight: 700, padding: '4px 9px', borderRadius: 99, background: caution ? '#F4E7DC' : colors.light, color: caution ? colors.alert : colors.grey, whiteSpace: 'nowrap' }}>{statusLabel(status)}</span>;
}

export default function OperationsPage() {
  const [password, setPassword] = useState('');
  const [snapshot, setSnapshot] = useState<OperationsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/operations/status', { headers: { Authorization: `Bearer ${password}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'The operations password was not accepted.' : data.error || 'Status could not be loaded.');
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Status could not be loaded.');
    } finally { setBusy(false); }
  }, [password]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    await refresh();
  }

  async function runNow() {
    setRunning(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/operations/run', { method: 'POST', headers: { Authorization: `Bearer ${password}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reason || data.error || 'The operating run could not complete.');
      setMessage(data.status === 'skipped'
        ? data.reason === 'run_already_active'
          ? 'Another run still holds the operating lease. No duplicate work was started.'
          : 'A run has already been recorded in this five-minute window. The next window can process more work.'
        : `Run ${statusLabel(data.status).toLowerCase()}. Its result is recorded below.`);
      await refresh();
    } catch (cause) {
      await refresh();
      setError(cause instanceof Error ? cause.message : 'The operating run failed.');
    } finally { setRunning(false); }
  }

  async function updateDecision(decision: OperationsDecision, status: 'acknowledged' | 'resolved') {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/operations/decisions', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${password}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: decision.id, status, note: notes[decision.id] ?? decision.owner_note ?? '' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The decision could not be saved.');
      setMessage(status === 'resolved' ? 'Review recorded. An unresolved underlying health issue will reopen on the next operating run.' : 'Acknowledgment saved. No external action was taken.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The decision could not be saved.');
      setBusy(false);
    }
  }

  if (!snapshot) {
    return <main style={{ minHeight: '100vh', background: colors.cream, color: colors.dark, padding: '80px 24px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Link href="/" style={{ ...smallLabel, textDecoration: 'none' }}>Bootfile</Link>
        <h1 className="font-heading" style={{ fontSize: 42, fontWeight: 400, margin: '24px 0 12px' }}>Business operations</h1>
        <p style={{ color: colors.grey, lineHeight: 1.7, marginBottom: 28 }}>Review paid work, recovery, and the decisions that need an owner. Sign in with the existing admin password.</p>
        <form onSubmit={signIn} style={panel}>
          <label htmlFor="operations-password" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 9 }}>Admin password</label>
          <input id="operations-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.cream, boxSizing: 'border-box', color: colors.dark }} />
          {error && <p role="alert" style={{ color: colors.alert, fontSize: 13, lineHeight: 1.6 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ ...button, width: '100%', marginTop: 18, opacity: busy ? 0.6 : 1 }}>{busy ? 'Checking access…' : 'Open operations'}</button>
        </form>
        <p style={{ fontSize: 12, color: colors.grey, lineHeight: 1.6 }}>The password stays in this tab&apos;s memory. Reload or sign out to clear it.</p>
      </div>
    </main>;
  }

  const attention = snapshot.health.filter(check => check.status === 'attention' || check.status === 'unavailable');
  const measurable = snapshot.metrics.filter(metric => metric.period !== 'not measured');
  const unmeasured = snapshot.metrics.filter(metric => metric.period === 'not measured');

  return <main style={{ minHeight: '100vh', background: colors.cream, color: colors.dark, padding: '36px 24px 80px' }}>
    <div style={{ maxWidth: 1180, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
        <div><Link href="/" style={{ ...smallLabel, textDecoration: 'none' }}>Bootfile</Link><span style={{ fontSize: 12, color: colors.grey, marginLeft: 12 }}>Owner operations</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/admin" style={{ fontSize: 13, color: colors.dark }}>Legacy content review</Link>
          <button onClick={() => { setSnapshot(null); setPassword(''); setMessage(''); setError(''); }} style={secondaryButton}>Sign out</button>
        </div>
      </header>

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 24, marginBottom: 28 }}>
        <div style={{ maxWidth: 740 }}>
          <p style={smallLabel}>Marketing Setup · $49 once</p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 400, lineHeight: 1.1, margin: '12px 0 16px' }}>A small decision surface.<br />A visible operating record.</h1>
          <p style={{ color: colors.grey, lineHeight: 1.7, fontSize: 15, margin: 0 }}>Paid orders, recovery and exceptions come from the live ledger. Unconnected measurements stay unmeasured. Paid acquisition remains at $0.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button disabled={busy || running} onClick={() => void refresh()} style={{ ...secondaryButton, opacity: busy ? 0.6 : 1 }}>{busy ? 'Refreshing…' : 'Refresh status'}</button>
          <button disabled={busy || running || snapshot.policy.paused} onClick={() => void runNow()} style={{ ...button, opacity: running || snapshot.policy.paused ? 0.6 : 1 }}>{running ? 'Processing bounded run…' : 'Run eligible work'}</button>
        </div>
      </section>

      <p style={{ fontSize: 12, color: colors.grey, marginBottom: 24 }}>Observed {dateLabel(snapshot.generatedAt)} · {snapshot.runtime.environment} · {snapshot.runtime.commit ? `commit ${snapshot.runtime.commit.slice(0, 8)}` : 'deployment commit unavailable'} · at most {snapshot.policy.orderBatchLimit} orders per run</p>
      {message && <p role="status" style={{ ...panel, padding: 16, color: colors.sage }}>{message}</p>}
      {error && <p role="alert" style={{ ...panel, padding: 16, color: colors.alert }}>{error}</p>}
      {attention.length > 0 && <div style={{ border: '1px solid #E4CFBD', borderRadius: 14, background: '#F4EBE1', padding: '17px 20px', marginBottom: 24 }}>
        <strong style={{ fontSize: 14 }}>{attention.length} operating {attention.length === 1 ? 'check needs' : 'checks need'} attention</strong>
        <p style={{ fontSize: 13, lineHeight: 1.65, margin: '6px 0 0', color: colors.alert }}>{attention.map(check => check.label).join(' · ')}. Review the evidence below before treating the business as unattended.</p>
      </div>}

      <section aria-labelledby="metrics-heading" style={{ marginBottom: 38 }}>
        <h2 id="metrics-heading" style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Orders and delivery</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {measurable.map(metric => <article key={metric.id} style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{metric.label}</span><span style={{ ...smallLabel, fontSize: 9, whiteSpace: 'nowrap' }}>{metric.period}</span></div>
            <div className="font-heading" style={{ fontSize: 38, lineHeight: 1.2, marginTop: 16, marginBottom: 12 }}>{metricLabel(metric)}</div>
            <p style={{ fontSize: 12, lineHeight: 1.65, color: colors.grey, margin: 0 }}>{metric.value === null ? 'Measurement unavailable. ' : ''}{metric.detail}</p>
          </article>)}
        </div>
        <div style={{ ...panel, marginTop: 14, padding: 20 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 12px' }}>Still missing from the outcome measurement</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>{unmeasured.map(metric => <div key={metric.id}><span style={{ fontSize: 13, fontWeight: 600 }}>{metric.label} — not measured</span><p style={{ fontSize: 12, color: colors.grey, lineHeight: 1.65, margin: '6px 0 0' }}>{metric.detail}</p></div>)}</div>
        </div>
      </section>

      <section aria-labelledby="decisions-heading" style={{ ...panel, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}><h2 id="decisions-heading" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Exceptions and owner decisions</h2><span style={smallLabel}>{snapshot.decisions.available ? `${snapshot.decisions.items.length} active` : 'Unavailable'}</span></div>
        <p style={{ color: colors.grey, fontSize: 13, lineHeight: 1.7, margin: '0 0 18px' }}>Routine recovery stays automatic. Record a decision here when a policy exception or a prepared product or budget change needs your judgment. Acknowledging a record does not spend money or publish anything.</p>
        {!snapshot.decisions.available ? <p role="alert" style={{ color: colors.alert, fontSize: 13 }}>{snapshot.decisions.error}</p> : snapshot.decisions.items.length === 0 ? <p style={{ fontSize: 14, color: colors.grey }}>No active records in the decision queue. Health issues are synchronized by the operating runner; the checks below may still need attention.</p> : <div style={{ display: 'grid', gap: 18 }}>{snapshot.decisions.items.map(decision => <article key={decision.id} style={{ paddingTop: 18, borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}><div><p style={{ ...smallLabel, margin: '0 0 6px' }}>{decision.category} · {decision.status}</p><h3 style={{ fontSize: 17, margin: 0 }}>{decision.title}</h3></div><Badge status={decision.severity} /></div>
          <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 10 }}>{decision.detail}</p>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: colors.grey }}><strong style={{ color: colors.dark }}>Next action:</strong> {decision.recommended_action}</p>
          <p style={{ fontSize: 11, color: colors.grey }}>First observed {dateLabel(decision.created_at)} · last observed {dateLabel(decision.last_seen_at)}</p>
          <label htmlFor={`note-${decision.id}`} style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>Decision note</label>
          <textarea id={`note-${decision.id}`} maxLength={2000} rows={2} value={notes[decision.id] ?? decision.owner_note ?? ''} onChange={event => setNotes(previous => ({ ...previous, [decision.id]: event.target.value }))} style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 11, background: colors.cream, color: colors.dark, fontSize: 13 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 10 }}><button disabled={busy} onClick={() => void updateDecision(decision, 'acknowledged')} style={secondaryButton}>Acknowledge</button><button disabled={busy} onClick={() => void updateDecision(decision, 'resolved')} style={secondaryButton}>Record resolution</button></div>
        </article>)}</div>}
      </section>

      <section aria-labelledby="health-heading" style={{ marginBottom: 32 }}>
        <h2 id="health-heading" style={{ fontSize: 18, marginBottom: 16 }}>Connections and execution evidence</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>{snapshot.health.map(check => <article key={check.id} style={panel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><h3 style={{ fontSize: 14, margin: 0 }}>{check.label}</h3><Badge status={check.status} /></div>
          <p style={{ fontSize: 13, color: colors.grey, lineHeight: 1.7, marginBottom: 0 }}>{check.detail}</p>
          {check.variables && <div style={{ marginTop: 14, display: 'grid', gap: 5 }}>{check.variables.map(variable => <div key={variable.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10, color: colors.grey, overflowWrap: 'anywhere' }}><code>{variable.name}</code><span>{variable.present ? 'Present' : 'Missing'}</span></div>)}</div>}
        </article>)}</div>
      </section>

      <section aria-labelledby="runs-heading" style={{ ...panel, marginBottom: 28 }}>
        <h2 id="runs-heading" style={{ fontSize: 18, margin: '0 0 8px' }}>Recent operating runs</h2>
        <p style={{ fontSize: 12, color: colors.grey, lineHeight: 1.7, margin: '0 0 18px' }}>{snapshot.runtime.scheduleEvidence}</p>
        {!snapshot.runs.available ? <p style={{ fontSize: 13, color: colors.alert }}>{snapshot.runs.error}</p> : snapshot.runs.items.length === 0 ? <p style={{ fontSize: 13, color: colors.grey }}>No runs have been recorded.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead><tr>{['Started', 'Source', 'Result', 'Finished', 'Evidence'].map(label => <th key={label} style={{ ...smallLabel, fontSize: 10, padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>{label}</th>)}</tr></thead>
          <tbody>{snapshot.runs.items.map(run => <tr key={run.id}>
            <td style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.light}`, whiteSpace: 'nowrap' }}>{dateLabel(run.started_at)}</td>
            <td style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.light}` }}>{run.source === 'cron' ? 'Cron secret' : 'Owner'}</td>
            <td style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.light}` }}><Badge status={run.status} /></td>
            <td style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.light}`, whiteSpace: 'nowrap' }}>{dateLabel(run.finished_at)}</td>
            <td style={{ padding: '14px 12px', borderBottom: `1px solid ${colors.light}` }}><details><summary style={{ cursor: 'pointer', color: colors.grey }}>{run.error_code || 'Run details'}</summary><pre style={{ maxWidth: 420, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.5 }}>{JSON.stringify(run.summary, null, 2)}</pre></details></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      <section aria-labelledby="authority-heading" style={panel}>
        <h2 id="authority-heading" style={{ fontSize: 18, margin: '0 0 8px' }}>Operating authority</h2>
        <p style={{ color: colors.grey, fontSize: 13, lineHeight: 1.7, margin: '0 0 20px' }}>These are the boundaries of the implemented operating loop. A permission is not evidence that an external service is deployed or running.</p>
        <div style={{ display: 'grid', gap: 18 }}>{snapshot.permissions.map(permission => <div key={permission.task} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 15, borderTop: `1px solid ${colors.light}`, paddingTop: 16 }}>
          <strong style={{ fontSize: 13, lineHeight: 1.6 }}>{permission.task}</strong><span style={{ fontSize: 11, color: colors.sage, lineHeight: 1.7 }}>{permission.authority}</span><p style={{ fontSize: 12, color: colors.grey, lineHeight: 1.7, margin: 0 }}>{permission.boundary}</p>
        </div>)}</div>
      </section>
    </div>
  </main>;
}
