'use client';

export function BuildTrustLayer() {
  return (
    <div
      style={{
        borderTop: '1px solid #DDD6CC',
        paddingTop: 32,
        marginTop: 8,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
        }}
      >
        <Column
          heading="7-day refund, no questions"
          body={
            <>
              If your BootFile doesn&apos;t meaningfully change how your AI responds,
              email <a href="mailto:support@bootfile.ai" style={{ color: '#5C6650' }}>support@bootfile.ai</a>{' '}
              within 7 days. We refund you and you keep the file.
            </>
          }
        />
        <Column
          heading="Built for people who use AI daily"
          body="BootFile is early. Most of our users are builders, operators, and researchers who spend 2+ hours a day in Claude or ChatGPT and got tired of re-priming every conversation."
        />
        <Column
          heading="Your file, not a template"
          body="Every BootFile is generated from your specific quiz answers. No two are identical. If you retake the quiz and answer differently, you get a different file."
        />
      </div>
    </div>
  );
}

function Column({ heading, body }: { heading: string; body: React.ReactNode }) {
  return (
    <div>
      <h3
        className="font-heading"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#2D2926',
          marginBottom: 8,
        }}
      >
        {heading}
      </h3>
      <p
        style={{
          fontSize: 13.5,
          color: '#7A746B',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}
