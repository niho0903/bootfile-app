import Link from 'next/link';

export function Header() {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(247, 246, 242, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #edeae5',
        padding: '10px 0',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          className="font-heading"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: '#1a1a1a',
            fontSize: 20,
          }}
        >
          <BootFileLogoIcon />
          BootFile
        </Link>
        <nav>
          <Link
            href="/quiz"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#666',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              transition: 'color 0.2s',
            }}
          >
            Take the Quiz
          </Link>
        </nav>
      </div>
    </header>
  );
}

function BootFileLogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0e6e6e"/>
      <path d="M8 10h8M8 14h12M8 18h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
