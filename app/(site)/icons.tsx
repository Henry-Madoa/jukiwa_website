import type { SVGProps } from 'react';

/*
 * The site's icons: stroked, 24-unit, drawn inline. A dozen paths do not justify an icon library,
 * and inline SVG takes `currentColor`, so an icon is always the colour of the text beside it.
 */

type IconName =
  | 'arrow' | 'check' | 'phone' | 'mail' | 'pin' | 'clock' | 'shield' | 'globe' | 'lock' | 'home' | 'chevron'
  | 'menu' | 'close' | 'trend' | 'zap' | 'users' | 'file' | 'calculator' | 'phone-device' | 'star' | 'whatsapp'
  | 'facebook' | 'instagram' | 'x' | 'youtube' | 'linkedin' | 'tiktok' | 'building' | 'key' | 'plane' | 'spark';

const PATHS: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 22V12h6v10" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  trend: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
  calculator: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" /></>,
  'phone-device': <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></>,
  star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />,
  whatsapp: <><path d="M3 21l1.65-4.94A9 9 0 1 1 7.94 19.35Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.3-2.3l.8-1-1-2L9 9.5Z" /></>,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />,
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37ZM17.5 6.5h.01" /></>,
  x: <><path d="m4 4 11.73 16H20L8.27 4Z" /><path d="m4 20 6.77-6.77M13.23 10.77 20 4" /></>,
  youtube: <><path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3Z" /></>,
  linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></>,
  tiktok: <path d="M9 12a4 4 0 1 0 4 4V3c.5 2.5 2.5 4.5 5 5" />,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></>,
  key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" /></>,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />,
  spark: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />,
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const filled = name === 'star';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/*
 * Flags, drawn rather than typed: Windows has no flag emoji, and "🇬🇧" arrives there as the letters
 * "GB". Simplified, but unmistakable at the size they are used.
 */
export function Flag({ country }: { country: 'gb' | 'us' | 'ca' | 'ke' }) {
  const common = { viewBox: '0 0 30 20', 'aria-hidden': true as const, focusable: 'false' as const };
  if (country === 'gb') {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#012169" />
        <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" />
        <path d="M0 0 30 20M30 0 0 20" stroke="#C8102E" strokeWidth="1.6" />
        <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
        <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
      </svg>
    );
  }
  if (country === 'us') {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />)}
        <rect width="13" height={(20 / 13) * 7} fill="#3C3B6E" />
      </svg>
    );
  }
  if (country === 'ca') {
    return (
      <svg {...common}>
        <rect width="30" height="20" fill="#fff" />
        <rect width="7.5" height="20" fill="#D52B1E" />
        <rect x="22.5" width="7.5" height="20" fill="#D52B1E" />
        <path d="M15 4.2l1.1 2.2 1.6-.6-.5 3.1 1.8-1.6.4 1.2 1.8-.3-.9 2.1.8.4-3.2 2.5.4 1.3-2.8-.4.1 2.7h-1.2l.1-2.7-2.8.4.4-1.3-3.2-2.5.8-.4-.9-2.1 1.8.3.4-1.2 1.8 1.6-.5-3.1 1.6.6Z" fill="#D52B1E" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect width="30" height="20" fill="#006600" />
      <rect width="30" height="6.2" fill="#000" />
      <rect y="6.2" width="30" height="7.6" fill="#fff" />
      <rect y="7.2" width="30" height="5.6" fill="#BB0000" />
      <ellipse cx="15" cy="10" rx="2.6" ry="5" fill="#BB0000" stroke="#000" strokeWidth="0.6" />
      <path d="M15 5.4v9.2" stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}
