import { cdn } from '@/lib/cloudinary.ts';

/*
 * Jukiwa Credit's mark: a roof over three rising bars.
 * Property, and money growing under it — the whole business in one glyph.
 *
 * Drawn inline rather than served as a file so it takes the brand colours from the runtime theme:
 * change the colours in the admin and the logo changes with them. An uploaded logo, if the company
 * has one, replaces it everywhere.
 */

export function BrandMark({ size = 40, logoUrl, title }: { size?: number; logoUrl?: string | null; title?: string }) {
  if (logoUrl) {
    return <img src={cdn(logoUrl, { width: size * 2, height: size * 2, crop: 'fit' })} alt={title ?? ''} width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect width="48" height="48" rx="13" fill="var(--brand)" />
      <rect width="48" height="48" rx="13" fill="url(#jc-sheen)" />
      <path d="M9.5 22.5 24 11l14.5 11.5" fill="none" stroke="var(--accent)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="15.2" y="28" width="5.2" height="9" rx="1.6" fill="#fff" opacity="0.7" />
      <rect x="21.4" y="24" width="5.2" height="13" rx="1.6" fill="#fff" opacity="0.85" />
      <rect x="27.6" y="20.5" width="5.2" height="16.5" rx="1.6" fill="#fff" />
      <defs>
        <linearGradient id="jc-sheen" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The mark and the name together, as the header and the footer show it. */
export function Wordmark({ name, sub, logoUrl, size = 40 }: { name: string; sub?: string | null; logoUrl?: string | null; size?: number }) {
  const [first, ...rest] = name.replace(/\s+Limited$|\s+Ltd\.?$/i, '').split(' ');
  return (
    <span className="wordmark">
      <BrandMark size={size} logoUrl={logoUrl} />
      <span className="wordmark-text">
        <strong>{first}<em>{rest.length ? ` ${rest.join(' ')}` : ''}</em></strong>
        {sub ? <small>{sub}</small> : null}
      </span>
    </span>
  );
}
