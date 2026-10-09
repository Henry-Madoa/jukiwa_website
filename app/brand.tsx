import { cdn } from '@/lib/cloudinary.ts';

/*
 * Jukiwa Credit's logo: the company's own artwork, not a redrawing of it. Two cut-outs of the
 * original, both on transparent backgrounds and both kept on Cloudinary:
 *
 *   emblem  the JC with the two gold arrows and the coins — for the header, the footer, the admin
 *   full    the emblem with "JUKIWA CREDIT LTD" and the slogan under it — where the logo is shown large
 *
 * The green letters disappear on a dark surface, so the footer, the admin sidebar and the sign-in
 * panel set the mark on a white tile (see globals.css). An uploaded logo, if the company sets one
 * in the admin, replaces both.
 */

export const BRAND_SLOGAN = 'Where your dreams find funding';

export const LOGO = {
  emblem: { url: 'https://res.cloudinary.com/not5pvxb/image/upload/v1791548849/jukiwa_website/brand/jukiwa-credit-logo-emblem.png', width: 412, height: 225 },
  full: { url: 'https://res.cloudinary.com/not5pvxb/image/upload/v1791548848/jukiwa_website/brand/jukiwa-credit-logo-full.png', width: 429, height: 273 },
} as const;

export function BrandMark({
  size = 40,
  logoUrl,
  title,
  full = false,
}: {
  /** The height in pixels; the width follows the artwork. */
  size?: number;
  logoUrl?: string | null;
  title?: string;
  /** The whole logo, lettering and slogan included, rather than the emblem alone. */
  full?: boolean;
}) {
  if (logoUrl) {
    return <img className="brand-mark" src={cdn(logoUrl, { height: size * 2, crop: 'fit' })} alt={title ?? ''} height={size} style={{ width: 'auto' }} />;
  }
  const art = full ? LOGO.full : LOGO.emblem;
  const width = Math.round((size * art.width) / art.height);
  return (
    <img
      className="brand-mark"
      src={cdn(art.url, { width: Math.min(width * 2, art.width) })}
      alt={title ?? ''}
      width={width}
      height={size}
    />
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
