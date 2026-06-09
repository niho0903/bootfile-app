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
          heading="One-time purchase, yours to keep"
          body="No subscription, no renewals, no surprise charges. You pay $4.99 once, paste the file into your AI's custom instructions, and use it as long as you want."
        />
        <Column
          heading="Built for the multi-AI user"
          body="ChatGPT for one thing, Claude for another, Gemini for search. Native memory doesn't cross platforms — your BootFile does. Same cognitive profile, every tool."
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
