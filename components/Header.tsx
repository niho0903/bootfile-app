import Link from 'next/link';
import { Logo } from './Logo';

export function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(247, 244, 239, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid #DDD6CC',
        padding: '16px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{ textDecoration: 'none', lineHeight: 1 }}
        >
          <Logo size="sm" variant="light" />
        </Link>
        <nav>
          <Link
            href="/quiz"
            style={{
              fontSize: '0.88rem',
              fontWeight: 450,
              color: '#7A746B',
              textDecoration: 'none',
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
