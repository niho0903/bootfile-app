'use client';

import { useSearchParams } from 'next/navigation';
import { ARCHETYPES } from '@/lib/archetypes';
import { BRIDGE_LINES, EXCERPT_FALLBACKS } from '@/lib/archetype-copy';
import { ArchetypeId } from '@/lib/questions';

const VALID_IDS: ArchetypeId[] = [
  'surgeon',
  'architect',
  'sparring',
  'translator',
  'copilot',
  'librarian',
  'closer',
  'maker',
];

function isArchetypeId(value: string | null): value is ArchetypeId {
  return !!value && (VALID_IDS as string[]).includes(value);
}

export function ReportView() {
  const params = useSearchParams();
  const raw = params.get('archetype');
  const archetypeId: ArchetypeId = isArchetypeId(raw) ? raw : 'architect';
  const arch = ARCHETYPES[archetypeId];
  const bridgeLine = BRIDGE_LINES[archetypeId];
  const rules = EXCERPT_FALLBACKS[archetypeId];

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <>
      <style>{`
        @page { size: letter; margin: 0.6in; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .report-page { page-break-after: always; box-shadow: none !important; border: none !important; }
          .report-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div
        style={{
          backgroundColor: '#ECEAE4',
          minHeight: '100vh',
          padding: '32px 16px 64px',
        }}
      >
        {/* Print controls */}
        <div
          className="no-print"
          style={{
            maxWidth: 720,
            margin: '0 auto 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#7A746B',
                margin: 0,
              }}
            >
              Companion Report
            </p>
            <p style={{ fontSize: 14, color: '#5A544C', margin: '4px 0 0' }}>
              Print this page or save as PDF from your browser&rsquo;s print dialog.
            </p>
          </div>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#7D8B6E',
              color: '#fff',
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 8,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Print / Save as PDF
          </button>
        </div>

        {/* Page 1 — Cover */}
        <ReportPage>
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div
              style={{
                width: 64,
                height: 4,
                backgroundColor: '#7D8B6E',
                borderRadius: 9999,
                margin: '0 auto 32px',
              }}
            />
            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7A746B',
                marginBottom: 16,
              }}
            >
              Companion Report
            </p>
            <h1
              className="font-heading"
              style={{
                fontSize: '2.4rem',
                color: '#2D2926',
                fontWeight: 400,
                marginBottom: 8,
                lineHeight: 1.15,
              }}
            >
              {arch.name}
            </h1>
            <p
              className="font-heading"
              style={{
                fontSize: '1.1rem',
                color: '#7A746B',
                fontStyle: 'italic',
                marginBottom: 40,
              }}
            >
              &ldquo;{arch.tagline}&rdquo;
            </p>
            <p
              style={{
                fontSize: 15,
                color: '#5A544C',
                lineHeight: 1.7,
                maxWidth: 480,
                margin: '0 auto 48px',
                textAlign: 'left',
              }}
            >
              {arch.description}
            </p>
            <p
              style={{
                fontSize: 13,
                color: '#7A746B',
                marginBottom: 4,
              }}
            >
              Generated for you by
            </p>
            <p
              className="font-heading"
              style={{
                fontSize: '1.05rem',
                color: '#2D2926',
                fontWeight: 500,
              }}
            >
              bootfile.ai
            </p>
          </div>
        </ReportPage>

        {/* Page 2 — Strengths & Blind Spots */}
        <ReportPage>
          <PageHeader title="Strengths and blind spots" archetype={arch.name} />
          <Section title="What this archetype does well">
            <ul style={listStyle}>
              {arch.strengths.map((s, i) => (
                <li key={i} style={listItemStyle}>{s}</li>
              ))}
            </ul>
          </Section>
          <Section title="Where it gets in your way">
            <ul style={listStyle}>
              {arch.blindSpots.map((s, i) => (
                <li key={i} style={listItemStyle}>{s}</li>
              ))}
            </ul>
          </Section>
        </ReportPage>

        {/* Page 3 — Failure modes + collaboration */}
        <ReportPage>
          <PageHeader title="Failure modes" archetype={arch.name} />
          <Section title="Under pressure">
            <p style={paragraphStyle}>{arch.underPressure}</p>
          </Section>
          <Section title="The trap">
            <p style={paragraphStyle}>{arch.trap}</p>
          </Section>
          <Section title="Who you work well with">
            <p style={paragraphStyle}>{arch.worksWellWith}</p>
          </Section>
        </ReportPage>

        {/* Page 4 — How to use this with your AI */}
        <ReportPage>
          <PageHeader title="How to use this with your AI" archetype={arch.name} />
          <Section title="One rule to start with">
            <blockquote
              style={{
                margin: 0,
                padding: '14px 18px',
                borderLeft: '3px solid #7D8B6E',
                backgroundColor: '#F7F4EF',
                borderRadius: 4,
                fontStyle: 'italic',
                fontSize: 15,
                color: '#2D2926',
                lineHeight: 1.6,
              }}
            >
              &ldquo;{bridgeLine}&rdquo;
            </blockquote>
          </Section>
          <Section title="Three communication patterns that work for you">
            <ol style={{ ...listStyle, paddingLeft: 20 }}>
              {rules.map((r, i) => (
                <li key={i} style={{ ...listItemStyle, fontStyle: 'italic' }}>{r}</li>
              ))}
            </ol>
          </Section>
          <Section title="What to do with this">
            <p style={paragraphStyle}>
              Your BootFile is already encoded with these patterns. Paste it into the
              custom instructions or project memory feature of every AI you use, and the
              model will read these rules before every response. This report is a reference
              for you — the AI reads the BootFile, not this PDF.
            </p>
          </Section>

          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px solid #DDD6CC',
              textAlign: 'center',
              fontSize: 11,
              color: '#7A746B',
            }}
          >
            bootfile.ai &middot; Companion Report &middot; {arch.name}
          </div>
        </ReportPage>
      </div>
    </>
  );
}

function ReportPage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="report-page"
      style={{
        maxWidth: 720,
        margin: '0 auto 24px',
        backgroundColor: '#fff',
        border: '1px solid #DDD6CC',
        borderRadius: 12,
        padding: '56px 64px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        minHeight: 900,
      }}
    >
      {children}
    </div>
  );
}

function PageHeader({ title, archetype }: { title: string; archetype: string }) {
  return (
    <div
      style={{
        marginBottom: 28,
        paddingBottom: 14,
        borderBottom: '1px solid #DDD6CC',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <h2
        className="font-heading"
        style={{
          fontSize: '1.5rem',
          color: '#2D2926',
          fontWeight: 400,
          margin: 0,
        }}
      >
        {title}
      </h2>
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7A746B',
        }}
      >
        {archetype}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3
        style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#7A746B',
          marginBottom: 10,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  color: '#2D2926',
};

const listItemStyle: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.7,
  marginBottom: 10,
};

const paragraphStyle: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.7,
  color: '#2D2926',
  margin: 0,
};
