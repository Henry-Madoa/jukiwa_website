import { cdn } from '@/lib/cloudinary.ts';

/*
 * Jukiwa Credit's mark: the JC monogram with a gold arrow rising through the open C, and a stack
 * of coins beside it — "where your dreams find funding", drawn the way the company's logo draws it.
 *
 * Drawn inline rather than served as a file so it takes the brand colours from the runtime theme:
 * change the colours in the admin and the logo changes with them. Two CSS variables let a dark
 * surface (the footer, the admin sidebar) re-ink it without a second component:
 *
 *   --mark-ink   the letters            (default: the brand green)
 *   --mark-gap   the halo behind the arrow, which should match whatever the mark sits on (default: white)
 *
 * An uploaded logo, if the company has one, replaces it everywhere.
 */

export const BRAND_SLOGAN = 'Where your dreams find funding';

/** The geometry, shared with the favicon and the generated touch icons so all of them stay one drawing. */
export const MARK = {
  /* J: a top bar, the stem, and a flat foot turning left — stroked, so the weight is exact. */
  j: 'M4 14H15V28A6 6 0 0 1 9 34H3.5',
  /* C: open on the right, wide enough for the arrow to come through. */
  c: 'M37.69 15.17A10 10 0 1 0 37.69 32.83',
  letterWeight: 6.5,
  /* The arrow: up from under the J, through the C, out at the top right. */
  arrow: 'M5 42.5C20 42.5 37 37 45 15',
  arrowHead: 'M47.56 7.95 49.32 16.57 40.68 13.43Z',
  arrowWeight: 3.4,
  /* Three coins, bottom to top. */
  coins: [43, 39.8, 36.6],
  gold: { light: '#f3dc8e', mid: '#d4a94a', dark: '#94692a' },
} as const;

export function BrandMark({
  size = 40,
  logoUrl,
  title,
  coins = true,
}: {
  size?: number;
  logoUrl?: string | null;
  title?: string;
  /** The coin stack widens the mark; leave it off where only a square fits. */
  coins?: boolean;
}) {
  if (logoUrl) {
    return <img src={cdn(logoUrl, { width: size * 2, height: size * 2, crop: 'fit' })} alt={title ?? ''} width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  const width = coins ? 56 : 50;
  return (
    <svg
      width={(size * width) / 48}
      height={size}
      viewBox={`0 0 ${width} 48`}
      className="brand-mark"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id="jc-gold" x1="4" y1="44" x2="46" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={MARK.gold.dark} />
          <stop offset="0.55" stopColor={MARK.gold.mid} />
          <stop offset="1" stopColor={MARK.gold.light} />
        </linearGradient>
        <linearGradient id="jc-ink" x1="0" y1="8" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>

      <g fill="none" strokeLinejoin="miter" strokeWidth={MARK.letterWeight}>
        <path d={MARK.j} stroke="var(--mark-ink, var(--brand))" />
        <path d={MARK.c} stroke="var(--mark-ink, var(--brand))" />
        {/* A faint top-lit sheen, the way the printed letters catch the light. */}
        <path d={MARK.j} stroke="url(#jc-ink)" />
        <path d={MARK.c} stroke="url(#jc-ink)" />
      </g>

      {/* The halo first, so the arrow reads cleanly where it crosses the letters. */}
      <g stroke="var(--mark-gap, #fff)" strokeWidth={MARK.arrowWeight + 2.6} strokeLinecap="round" strokeLinejoin="round">
        <path d={MARK.arrow} fill="none" />
        <path d={MARK.arrowHead} fill="var(--mark-gap, #fff)" />
      </g>
      <path d={MARK.arrow} fill="none" stroke="url(#jc-gold)" strokeWidth={MARK.arrowWeight} strokeLinecap="round" />
      <path d={MARK.arrowHead} fill="url(#jc-gold)" stroke="url(#jc-gold)" strokeWidth="1" strokeLinejoin="round" />

      {coins
        ? MARK.coins.map((y) => (
            <g key={y}>
              <ellipse cx="50" cy={y + 1.5} rx="5" ry="1.9" fill={MARK.gold.dark} />
              <rect x="45" y={y} width="10" height="1.5" fill={MARK.gold.dark} />
              <ellipse cx="50" cy={y} rx="5" ry="1.9" fill={MARK.gold.mid} />
              <ellipse cx="49.3" cy={y - 0.3} rx="2.6" ry="0.75" fill={MARK.gold.light} opacity="0.85" />
            </g>
          ))
        : null}
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
