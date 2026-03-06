import Link from 'next/link';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #DDD6CC',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '0.85rem', color: '#7A746B', letterSpacing: '0.01em' }}>
        &copy; {new Date().getFullYear()} BootFile
        <span style={{ margin: '0 8px', color: '#DDD6CC' }}>&middot;</span>
        <Link href="/guides" style={{ color: '#7A746B', textDecoration: 'none' }}>
          Guides
        </Link>
        <span style={{ margin: '0 8px', color: '#DDD6CC' }}>&middot;</span>
        <Link href="/blog" style={{ color: '#7A746B', textDecoration: 'none' }}>
          Blog
        </Link>
        <span style={{ margin: '0 8px', color: '#DDD6CC' }}>&middot;</span>
        <Link href="/terms" style={{ color: '#7A746B', textDecoration: 'none' }}>
          Terms
        </Link>
        <span style={{ margin: '0 8px', color: '#DDD6CC' }}>&middot;</span>
        <Link href="/privacy" style={{ color: '#7A746B', textDecoration: 'none' }}>
          Privacy
        </Link>
      </p>
    </footer>
  );
}
