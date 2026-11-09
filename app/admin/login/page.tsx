import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSettings } from '@/lib/site.ts';
import { currentUser } from '@/lib/auth.ts';
import { Wordmark } from '@/app/brand.tsx';
import { LoginForm } from './login-form.tsx';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [company, user, { next }] = await Promise.all([getSettings(), currentUser(), searchParams]);

  // Somebody already signed in has no business on the sign-in page.
  if (user) redirect('/admin');

  // Only a path within this site, so the parameter cannot be used to bounce anyone elsewhere.
  const destination = next && /^\/admin(\/|$)/.test(next) && !next.startsWith('//') ? next : '/admin';
  const short = company.short_name ?? company.name;

  return (
    <main className="admin login-page">
      <div className="login-card">
        <Link href="/" className="login-brand">
          <Wordmark name={short} sub="Website administration" logoUrl={company.logo_url} size={46} />
        </Link>

        <div className="login-head">
          <h1>Staff sign in</h1>
          <p>Use your staff account to access the website dashboard.</p>
        </div>

        <LoginForm next={destination} />
        <Link href="/" className="login-back">← Back to the website</Link>
      </div>
    </main>
  );
}
