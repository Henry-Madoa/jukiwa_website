import { ImageResponse } from 'next/og';
import { LOGO } from './brand.tsx';

/*
 * The browser-tab icon: the company's own emblem (the JC, the gold arrows and the coins) on a
 * white tile, taken from the same Cloudinary artwork as the logo on the page. Built at build time.
 */

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  const w = 60;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 14 }}>
        <img src={LOGO.emblem.url} width={w} height={Math.round((w * LOGO.emblem.height) / LOGO.emblem.width)} alt="" />
      </div>
    ),
    size,
  );
}
