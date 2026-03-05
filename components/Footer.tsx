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
      </p>
    </footer>
  );
}
