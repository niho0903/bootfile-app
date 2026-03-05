export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #dcd9d5',
        padding: '32px 0',
        marginTop: 64,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: '#999' }}>
          &copy; {new Date().getFullYear()} BootFile. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
