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

  const brand = (className: string) => (
    <Link href="/" className={className}>
      <Wordmark name={short} sub="Website administration" logoUrl={company.logo_url} size={46} />
    </Link>
  );

  return (
    <div className="admin login-page">
      <aside className="login-aside">
        {brand('login-brand')}

        <div className="login-aside-body">
          <span className="login-kicker">Staff area</span>
          <h2>Welcome back to {short}</h2>
          {company.tagline ? <p className="login-motto">&ldquo;{company.tagline}&rdquo;</p> : null}
          <p>
            Work the applications and callbacks the website brings in, keep every product&rsquo;s terms current, and
            publish what borrowers need to know — from one place.
          </p>
          <ul>
            <li>New applications arrive here the moment a customer presses Submit</li>
            <li>Change a product&rsquo;s rate and every calculator on the site follows</li>
            <li>Permission Sets decide which screens each person may open</li>
            <li>Every change is recorded with the name of the person who made it</li>
          </ul>
        </div>

        <p className="login-aside-foot">
          © {new Date().getFullYear()} {company.name}
          {company.parent_name ? ` · A ${company.parent_name} company` : ''}
        </p>
      </aside>

      <main className="login-main">
        <div className="login-card">
          {brand('login-brand login-brand-mobile')}

          <div className="login-head">
            <h1>Sign in</h1>
            <p>For Jukiwa staff who run the website. Customers do not need an account to apply.</p>
          </div>

          <LoginForm next={destination} />
        </div>

        <Link href="/" className="login-back">← Back to the website</Link>
      </main>
    </div>
  );
}
