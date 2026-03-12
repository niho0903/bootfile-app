'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2
            className="font-heading"
            style={{
              fontSize: '1.4rem',
              color: '#2D2926',
              fontWeight: 400,
              marginTop: 40,
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            className="font-heading"
            style={{
              fontSize: '1.15rem',
              color: '#2D2926',
              fontWeight: 400,
              marginTop: 32,
              marginBottom: 12,
              lineHeight: 1.3,
            }}
          >
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.75,
              color: '#4A453E',
              marginBottom: 24,
            }}
          >
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.75,
              color: '#4A453E',
              marginBottom: 24,
              paddingLeft: 24,
            }}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.75,
              color: '#4A453E',
              marginBottom: 24,
              paddingLeft: 24,
            }}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 8 }}>{children}</li>
        ),
        strong: ({ children }) => (
          <strong style={{ color: '#2D2926', fontWeight: 600 }}>{children}</strong>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            style={{ color: '#7D8B6E', textDecoration: 'underline' }}
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote
            style={{
              borderLeft: '3px solid #7D8B6E',
              paddingLeft: 20,
              margin: '24px 0',
              color: '#5C5650',
              fontStyle: 'italic',
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.95rem',
              }}
            >
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderBottom: '2px solid #E5E0D8',
              color: '#2D2926',
              fontWeight: 600,
            }}
          >
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #E5E0D8',
              color: '#4A453E',
            }}
          >
            {children}
          </td>
        ),
      }}
    />
  );
}
