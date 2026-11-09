import type { Metadata, Viewport } from 'next';
import { getSettings } from '@/lib/site.ts';
import { siteUrl } from '@/lib/urls.ts';
import './fonts/fonts.css';
import './globals.css';

/*
 * The root shell. Deliberately thin: it sets the fonts, the document language and the metadata
 * defaults, and nothing else. The public website and the admin each bring their own chrome,
 * because they are addressed to different people — a prospective borrower, and a member of staff.
 */

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
