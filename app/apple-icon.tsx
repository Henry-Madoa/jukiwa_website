import { ImageResponse } from 'next/og';
import { LOGO } from './brand.tsx';

/*
 * The home-screen icon for iPhones and iPads: the company's own emblem on white, full-bleed,
 * because iOS rounds the corners itself. Built once at build time.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const w = 156;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <img src={LOGO.emblem.url} width={w} height={Math.round((w * LOGO.emblem.height) / LOGO.emblem.width)} alt="" />
      </div>
    ),
    size,
  );
}
