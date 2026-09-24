import Link from 'next/link';
import { BrandMark } from './brand.tsx';
import './globals.css';

/**
 * The 404. It sits above the (site) route group, so it renders without the site's header and
 * footer — a missing page should not depend on a database query succeeding.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'radial-gradient(700px 400px at 50% 0%, color-mix(in srgb, var(--brand) 18%, transparent), transparent 70%), var(--cream)',
      }}
    >
      <div style={{ maxWidth: 560 }}>
        <div style={{ display: 'inline-block' }}><BrandMark size={64} /></div>
        <p style={{ fontFamily: 'var(--font-display-stack)', fontWeight: 800, fontSize: '5rem', lineHeight: 1, margin: '18px 0 0', color: 'var(--brand-deep)', letterSpacing: '-0.05em' }}>404</p>
        <h1 style={{ fontFamily: 'var(--font-display-stack)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', margin: '8px 0 10px', letterSpacing: '-0.02em' }}>
          That page is not here
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: 26 }}>
          The link may be old, or the page may have moved. These are the ones people usually want.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            ['/', 'Home'],
            ['/loans', 'Our loans'],
            ['/calculator', 'Calculator'],
            ['/apply', 'Apply online'],
            ['/contact', 'Contact'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href!}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1.5px solid var(--line-strong)',
                background: href === '/apply' ? 'var(--brand)' : 'var(--surface)',
                color: href === '/apply' ? '#fff' : 'var(--ink)',
                textDecoration: 'none',
                fontWeight: 650,
                fontSize: '0.92rem',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
