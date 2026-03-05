interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

const SIZE_MAP = {
  sm: { dot: 10, text: '1.1rem', gap: 8 },
  md: { dot: 14, text: '1.6rem', gap: 10 },
  lg: { dot: 18, text: '2.2rem', gap: 12 },
};

export function Logo({ size = 'md', variant = 'light' }: LogoProps) {
  const s = SIZE_MAP[size];
  const textColor = variant === 'light' ? '#2D2926' : '#F7F4EF';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
      }}
    >
      <span
        style={{
          width: s.dot,
          height: s.dot,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7D8B6E, #5C6650)',
          flexShrink: 0,
        }}
      />
      <span
        className="font-heading"
        style={{
          fontSize: s.text,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color: textColor,
          lineHeight: 1,
        }}
      >
        bootfile
      </span>
    </span>
  );
}
