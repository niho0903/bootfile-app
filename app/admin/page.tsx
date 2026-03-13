'use client';

import { useState, useEffect, useCallback } from 'react';

interface Draft {
  id: string;
  channel: 'blog' | 'instagram';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  content: string;
  metadata: Record<string, unknown>;
}

interface GenerateForm {
  channel: 'blog' | 'instagram';
  pillar: string;
  topic: string;
  type: string;
  archetype: string;
  notes: string;
}

interface CustomerBootfile {
  id: string;
  stripe_session_id: string;
  email: string;
  archetype_id: string;
  bootfile_text: string;
  tier: string;
  created_at: string;
}

interface CustomerPurchase {
  id: string;
  email: string;
  domain: string;
  technical_level: number;
  decision_style: string;
  response_length: string;
  primary_platform: string;
  created_at: string;
}

interface CustomerData {
  email: string;
  bootfiles: CustomerBootfile[];
  purchases: CustomerPurchase[];
  quizCompletions: Array<{
    id: string;
    primary_archetype: string;
    secondary_archetype: string;
    tertiary_archetype: string;
    created_at: string;
  }>;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<GenerateForm>({
    channel: 'blog',
    pillar: 'comparison',
    topic: '',
    type: 'frustration',
    archetype: '',
    notes: '',
  });
  const [tab, setTab] = useState<'content' | 'customers'>('content');
  const [lookupEmail, setLookupEmail] = useState('');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedBootfile, setSelectedBootfile] = useState<CustomerBootfile | null>(null);

  const authHeader = useCallback(() => ({
    'Authorization': `Bearer ${password}`,
    'Content-Type': 'application/json',
  }), [password]);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const res = await fetch(`/api/admin/drafts?${statusParam}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, authHeader]);

  const handleLogin = async () => {
    const res = await fetch('/api/admin/drafts?status=pending', {
      headers: {
        'Authorization': `Bearer ${password}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.ok) {
      setAuthed(true);
      const data = await res.json();
      setDrafts(data.drafts);
    } else {
      setMessage('Invalid password');
    }
  };

  useEffect(() => {
    if (authed) fetchDrafts();
  }, [authed, filter, fetchDrafts]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/generate-content', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Draft generated');
        fetchDrafts();
      } else {
        setMessage(data.error || 'Generation failed');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.slug ? `Published: /blog/${data.slug}` : data.message || 'Published');
        fetchDrafts();
        setSelectedDraft(null);
      } else {
        setMessage(data.error || 'Publish failed');
      }
    } catch {
      setMessage('Network error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch('/api/admin/drafts', {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ id, status: 'rejected' }),
      });
      fetchDrafts();
      setSelectedDraft(null);
      setMessage('Draft rejected');
    } catch {
      setMessage('Failed to reject');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    try {
      await fetch('/api/admin/drafts', {
        method: 'PATCH',
        headers: authHeader(),
        body: JSON.stringify({ id: selectedDraft.id, content: editContent }),
      });
      setMessage('Draft updated');
      fetchDrafts();
      setSelectedDraft({ ...selectedDraft, content: editContent });
    } catch {
      setMessage('Failed to save');
    }
  };

  const handleLookup = async () => {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setCustomerData(null);
    setSelectedBootfile(null);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/customer-lookup?email=${encodeURIComponent(lookupEmail.trim())}`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerData(data);
        if (data.bootfiles.length === 0 && data.purchases.length === 0) {
          setMessage('No records found for this email.');
        }
      } else {
        setMessage('Lookup failed.');
      }
    } catch {
      setMessage('Network error.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleResendBootfile = async (bootfileId: string, toEmail: string) => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/resend-bootfile', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ email: toEmail, bootfileId }),
      });
      if (res.ok) {
        setMessage(`Bootfile resent to ${toEmail}`);
      } else {
        const data = await res.json();
        setMessage(data.error || 'Resend failed');
      }
    } catch {
      setMessage('Network error');
    }
  };

  // --- Styles ---
  const s = {
    page: { minHeight: '100vh', backgroundColor: '#1a1a1a', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' } as const,
    container: { maxWidth: 960, margin: '0 auto', padding: '40px 20px' } as const,
    heading: { fontSize: '1.8rem', fontWeight: 300, color: '#fff', marginBottom: 32, letterSpacing: '-0.02em' } as const,
    card: { backgroundColor: '#242424', borderRadius: 8, padding: 24, marginBottom: 16, border: '1px solid #333' } as const,
    button: (variant: 'primary' | 'danger' | 'ghost') => ({
      padding: '8px 16px',
      borderRadius: 6,
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: 500,
      ...(variant === 'primary' ? { backgroundColor: '#7D8B6E', color: '#fff' } : {}),
      ...(variant === 'danger' ? { backgroundColor: '#8B3A3A', color: '#fff' } : {}),
      ...(variant === 'ghost' ? { backgroundColor: 'transparent', color: '#999', border: '1px solid #444' } : {}),
    } as const),
    input: { width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', fontSize: '0.9rem' } as const,
    select: { padding: '10px 12px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', fontSize: '0.9rem' } as const,
    textarea: { width: '100%', padding: '12px', borderRadius: 6, border: '1px solid #444', backgroundColor: '#2a2a2a', color: '#e0e0e0', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.5, resize: 'vertical' as const } as const,
    label: { fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' } as const,
    badge: (status: string) => ({
      fontSize: '0.7rem',
      padding: '2px 8px',
      borderRadius: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      ...(status === 'pending' ? { backgroundColor: '#3D3520', color: '#D4A843' } : {}),
      ...(status === 'approved' ? { backgroundColor: '#1D3520', color: '#6DB86E' } : {}),
      ...(status === 'rejected' ? { backgroundColor: '#351D20', color: '#B86E6E' } : {}),
    } as const),
  };

  // --- Login ---
  if (!authed) {
    return (
      <div style={s.page}>
        <div style={{ ...s.container, maxWidth: 400, paddingTop: 120 }}>
          <h1 style={s.heading}>BootFile Admin</h1>
          <div style={s.card}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{ ...s.input, marginBottom: 16 }}
              placeholder="Enter admin password"
            />
            <button onClick={handleLogin} style={s.button('primary')}>
              Sign In
            </button>
            {message && <p style={{ color: '#B86E6E', fontSize: '0.85rem', marginTop: 12 }}>{message}</p>}
          </div>
        </div>
      </div>
    );
  }

  // --- Draft Detail ---
  if (selectedDraft) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <button onClick={() => setSelectedDraft(null)} style={{ ...s.button('ghost'), marginBottom: 24 }}>
            &larr; Back to Drafts
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 400, color: '#fff' }}>
              {selectedDraft.channel === 'blog' ? 'Blog Draft' : 'Instagram Draft'}
            </h2>
            <span style={s.badge(selectedDraft.status)}>{selectedDraft.status}</span>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: 24 }}>
            Created: {new Date(selectedDraft.createdAt).toLocaleString()}
          </div>

          <div style={s.card}>
            <label style={s.label}>Content</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{ ...s.textarea, minHeight: 500 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleSaveEdit} style={s.button('ghost')}>
                Save Changes
              </button>
              {selectedDraft.status === 'pending' && (
                <>
                  <button onClick={() => handlePublish(selectedDraft.id)} style={s.button('primary')}>
                    Approve & Publish
                  </button>
                  <button onClick={() => handleReject(selectedDraft.id)} style={s.button('danger')}>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {message && (
            <p style={{ color: '#7D8B6E', fontSize: '0.85rem', marginTop: 12 }}>{message}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Main Dashboard ---
  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>BootFile Admin</h1>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setTab('content')}
            style={{ ...s.button(tab === 'content' ? 'primary' : 'ghost') }}
          >
            Content
          </button>
          <button
            onClick={() => setTab('customers')}
            style={{ ...s.button(tab === 'customers' ? 'primary' : 'ghost') }}
          >
            Customer Lookup
          </button>
        </div>

        {message && (
          <div style={{ ...s.card, borderColor: '#7D8B6E', marginBottom: 24 }}>
            <p style={{ color: '#7D8B6E', fontSize: '0.9rem', margin: 0 }}>{message}</p>
          </div>
        )}

        {/* Customer Lookup Tab */}
        {tab === 'customers' && (
          <div>
            <div style={{ ...s.card, marginBottom: 24 }}>
              <label style={s.label}>Customer Email</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  style={{ ...s.input, flex: 1 }}
                  placeholder="customer@example.com"
                />
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  style={{ ...s.button('primary'), opacity: lookupLoading ? 0.6 : 1 }}
                >
                  {lookupLoading ? 'Searching...' : 'Look Up'}
                </button>
              </div>
            </div>

            {selectedBootfile && (
              <div style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button onClick={() => setSelectedBootfile(null)} style={s.button('ghost')}>
                    &larr; Back to Results
                  </button>
                  <button
                    onClick={() => handleResendBootfile(selectedBootfile.id, selectedBootfile.email)}
                    style={s.button('primary')}
                  >
                    Resend to {selectedBootfile.email}
                  </button>
                </div>
                <label style={s.label}>Bootfile Text</label>
                <pre style={{
                  ...s.textarea,
                  minHeight: 400,
                  whiteSpace: 'pre-wrap',
                  overflowY: 'auto',
                  maxHeight: 600,
                }}>
                  {selectedBootfile.bootfile_text}
                </pre>
              </div>
            )}

            {customerData && !selectedBootfile && (
              <div>
                {/* Quiz info */}
                {customerData.quizCompletions.length > 0 && (
                  <div style={{ ...s.card, marginBottom: 16 }}>
                    <label style={s.label}>Quiz Results</label>
                    {customerData.quizCompletions.map((q) => (
                      <div key={q.id} style={{ fontSize: '0.9rem', color: '#ccc', marginTop: 8 }}>
                        <strong style={{ color: '#fff' }}>{q.primary_archetype}</strong>
                        {q.secondary_archetype && <> &middot; {q.secondary_archetype}</>}
                        {q.tertiary_archetype && <> &middot; {q.tertiary_archetype}</>}
                        <span style={{ color: '#666', marginLeft: 12 }}>
                          {new Date(q.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Purchase info */}
                {customerData.purchases.length > 0 && (
                  <div style={{ ...s.card, marginBottom: 16 }}>
                    <label style={s.label}>Purchases</label>
                    {customerData.purchases.map((p) => (
                      <div key={p.id} style={{ fontSize: '0.85rem', color: '#ccc', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>Domain: <strong style={{ color: '#fff' }}>{p.domain || '—'}</strong></span>
                        <span>Platform: <strong style={{ color: '#fff' }}>{p.primary_platform || '—'}</strong></span>
                        <span>Decision: <strong style={{ color: '#fff' }}>{p.decision_style || '—'}</strong></span>
                        <span>Length: <strong style={{ color: '#fff' }}>{p.response_length || '—'}</strong></span>
                        <span style={{ color: '#666' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bootfiles */}
                {customerData.bootfiles.length > 0 && (
                  <div>
                    <label style={{ ...s.label, marginBottom: 12 }}>Bootfiles ({customerData.bootfiles.length})</label>
                    {customerData.bootfiles.map((bf) => (
                      <div
                        key={bf.id}
                        onClick={() => setSelectedBootfile(bf)}
                        style={{ ...s.card, cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: '#1D3520',
                              color: '#6DB86E',
                            }}>
                              {bf.archetype_id}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: '#1D2535',
                              color: '#6E8BB8',
                            }}>
                              {bf.tier}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#555' }}>
                            {new Date(bf.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#999', marginTop: 8 }}>
                          {bf.bootfile_text?.slice(0, 150)}...
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResendBootfile(bf.id, bf.email); }}
                          style={{ ...s.button('ghost'), marginTop: 8, fontSize: '0.8rem' }}
                        >
                          Resend Email
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {customerData.bootfiles.length === 0 && customerData.purchases.length === 0 && (
                  <div style={{ ...s.card, textAlign: 'center', color: '#666' }}>
                    No records found for {customerData.email}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Generate Content */}
        {tab === 'content' && <><div style={{ ...s.card, marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 400, color: '#fff', marginBottom: 20 }}>
            Generate New Content
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={s.label}>Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as 'blog' | 'instagram' })}
                style={{ ...s.select, width: '100%' }}
              >
                <option value="blog">Blog</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            {form.channel === 'blog' ? (
              <div>
                <label style={s.label}>Pillar</label>
                <select
                  value={form.pillar}
                  onChange={(e) => setForm({ ...form, pillar: e.target.value })}
                  style={{ ...s.select, width: '100%' }}
                >
                  <option value="comparison">Comparison</option>
                  <option value="guide">Guide</option>
                  <option value="concept">Concept</option>
                  <option value="review">Review</option>
                </select>
              </div>
            ) : (
              <div>
                <label style={s.label}>Post Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ ...s.select, width: '100%' }}
                >
                  <option value="frustration">Frustration</option>
                  <option value="archetype_card">Archetype Card</option>
                  <option value="concept">Concept</option>
                  <option value="contrast">Contrast</option>
                  <option value="product_moment">Product Moment</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Topic / Brief</label>
            <input
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              style={s.input}
              placeholder={form.channel === 'blog' ? 'e.g., DeepSeek vs ChatGPT comparison' : 'e.g., When AI says "it depends"'}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...s.textarea, minHeight: 60 }}
              placeholder="Additional context or direction for the AI..."
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ ...s.button('primary'), opacity: generating ? 0.6 : 1 }}
          >
            {generating ? 'Generating...' : 'Generate Draft'}
          </button>
        </div>

        {/* Drafts List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 400, color: '#fff' }}>Drafts</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...s.button('ghost'),
                  ...(filter === f ? { borderColor: '#7D8B6E', color: '#7D8B6E' } : {}),
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#666' }}>Loading...</p>
        ) : drafts.length === 0 ? (
          <div style={{ ...s.card, textAlign: 'center', color: '#666' }}>
            No {filter === 'all' ? '' : filter} drafts yet. Generate some content above.
          </div>
        ) : (
          drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => {
                setSelectedDraft(draft);
                setEditContent(draft.content);
                setMessage('');
              }}
              style={{ ...s.card, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: draft.channel === 'blog' ? '#1D2535' : '#2D1D35',
                    color: draft.channel === 'blog' ? '#6E8BB8' : '#B86EB8',
                  }}>
                    {draft.channel}
                  </span>
                  <span style={s.badge(draft.status)}>{draft.status}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#555' }}>
                  {new Date(draft.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: 12, lineHeight: 1.5 }}>
                {draft.content.slice(0, 200)}...
              </p>
            </div>
          ))
        )}
        </>}
      </div>
    </div>
  );
}
