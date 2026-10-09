import { ImageResponse } from 'next/og';
import { MARK } from './brand.tsx';

/*
 * The home-screen icon for iPhones and iPads. Drawn from the same geometry as the inline mark and
 * app/icon.svg, full-bleed, because iOS rounds the corners itself. Built once at build time.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const halo = '#1b5530';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg, #25703f, #123d24)' }}>
        <svg width="180" height="180" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="gold" x1="4" y1="44" x2="46" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#b5832f" />
              <stop offset="0.55" stopColor="#e0b552" />
              <stop offset="1" stopColor="#f7e29a" />
            </linearGradient>
          </defs>
          <g transform="translate(6.2 5.3) scale(0.72)">
            <path d={MARK.j} fill="none" stroke="#fff" strokeWidth={MARK.letterWeight} />
            <path d={MARK.c} fill="none" stroke="#fff" strokeWidth={MARK.letterWeight} />
            <path d={MARK.arrow} fill="none" stroke={halo} strokeWidth={MARK.arrowWeight + 2.6} strokeLinecap="round" />
            <path d={MARK.arrowHead} fill={halo} stroke={halo} strokeWidth={2.6} strokeLinejoin="round" />
            <path d={MARK.arrow} fill="none" stroke="url(#gold)" strokeWidth={MARK.arrowWeight} strokeLinecap="round" />
            <path d={MARK.arrowHead} fill="url(#gold)" stroke="url(#gold)" strokeWidth={1} strokeLinejoin="round" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
