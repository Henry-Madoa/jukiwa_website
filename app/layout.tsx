import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import { getSettings } from '@/lib/site.ts';
import { siteUrl } from '@/lib/urls.ts';
import './globals.css';

/*
 * The root shell. Deliberately thin: it sets the fonts, the document language and the metadata
 * defaults, and nothing else. The public website and the admin each bring their own chrome,
 * because they are addressed to different people — a prospective borrower, and a member of staff.
 */

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans-stack',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

/* A contemporary grotesque with real character at display sizes — confident, not corporate. */
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display-stack',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
});

export const viewport: Viewport = {
  themeColor: '#0b2a18',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Titles, descriptions and the canonical host come from the company's own record, so a rename in
 * the admin is a rename in Google too.
 */
export async function generateMetadata(): Promise<Metadata> {
  const company = await getSettings();
  const base = siteUrl();
  const short = company.short_name ?? company.name;
  return {
    metadataBase: new URL(base),
    title: { default: `${short} — ${company.tagline ?? 'Where your dreams find funding'}`, template: `%s · ${short}` },
    description:
      company.hero_body ??
      `${company.name}: rent advances, building finance and property loans across Kenya and for Kenyans abroad.`,
    applicationName: company.name,
    keywords: ['rent advance Kenya', 'property loan Kenya', 'building finance', 'diaspora loans', 'land loan', 'Jukiwa', 'microfinance Kenya'],
    openGraph: {
      type: 'website',
      siteName: company.name,
      title: company.hero_headline ?? company.name,
      description: company.about_intro ?? undefined,
      locale: 'en_KE',
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
    alternates: { canonical: '/' },
  };
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
