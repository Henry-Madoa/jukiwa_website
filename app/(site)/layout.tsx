import type { ReactNode } from 'react';
import Link from 'next/link';
import { getBranches, getProducts, getSettings } from '@/lib/site.ts';
import { telHref, whatsappHref } from '@/lib/format.ts';
import { Wordmark } from '@/app/brand.tsx';
import { SiteHeader, StaffLink, type MenuGroup } from './site-nav.tsx';
import { NewsletterForm } from './forms.tsx';
import { Icon } from './icons.tsx';
import { JsonLd } from './prose.tsx';
import { siteUrl } from '@/lib/urls.ts';
import './site.css';

/*
 * The public website's shell — top bar, header, footer, and the WhatsApp button.
 *
 * Deliberately nothing like the admin: no sidebar, no session. A visitor here is somebody deciding
 * whether to trust a lender, and every page is addressed to them.
 *
 * The one thing the two halves share is the brand. Both read the same settings row, so the
 * company's name, contacts and colours can never disagree between them — and a change of colour in
 * the admin is a change here by the next request, with no deploy.
 */

const external = (href: string | null | undefined): href is string => !!href && /^https?:\/\//i.test(href);

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [company, products, branches] = await Promise.all([getSettings(), getProducts(), getBranches()]);
  const year = new Date().getFullYear();
  const short = company.short_name ?? company.name;
  const phone = company.phone_primary;
  const hq = branches.find((b) => b.kind === 'HQ');

  const groups: MenuGroup[] = [
    {
      label: 'Loans',
      href: '/loans',
      wide: true,
      items: products.map((p) => ({ href: `/loans/${p.slug}`, label: p.name, hint: p.tagline, icon: p.icon })),
      foot: { text: 'Not sure which fits? Work it out in a minute.', href: '/calculator', label: 'Loan calculator' },
    },
    {
      label: 'Company',
      href: '/about',
      items: [
        { href: '/about', label: 'About Jukiwa Credit', hint: 'Who we are and what we stand for', icon: '🏠' },
        { href: '/about#leadership', label: 'Leadership', hint: 'The people you will deal with', icon: '👥' },
        { href: '/branches', label: 'Branches & offices', hint: 'Walk in — we share every Jukiwa office', icon: '📍' },
        { href: '/careers', label: 'Careers', hint: 'Join the founding team', icon: '💼' },
      ],
    },
  ];
  const links = [
    { href: '/calculator', label: 'Calculator' },
    { href: '/diaspora', label: 'Diaspora' },
    { href: '/insights', label: 'Insights' },
    { href: '/faqs', label: 'FAQs' },
    { href: '/contact', label: 'Contact' },
  ];

  /*
   * The company's three colours, applied to the tokens the whole stylesheet is built from. A
   * <style> element rather than an inline style on the wrapper, because the gradients and the
   * focus rings reference these too.
   */
  const theme = `
    .site {
      --brand: ${company.brand_primary};
      --brand-hover: color-mix(in srgb, ${company.brand_primary} 84%, #000);
      --brand-deep: ${company.brand_deep};
      --accent: ${company.brand_accent};
      --accent-hover: color-mix(in srgb, ${company.brand_accent} 86%, #000);
    }`;

  const socials = [
    ['facebook', company.facebook_url, 'Facebook'],
    ['instagram', company.instagram_url, 'Instagram'],
    ['x', company.x_url, 'X'],
    ['youtube', company.youtube_url, 'YouTube'],
    ['linkedin', company.linkedin_url, 'LinkedIn'],
    ['tiktok', company.tiktok_url, 'TikTok'],
  ] as const;

  return (
    <div className="site">
      <style dangerouslySetInnerHTML={{ __html: theme }} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FinancialService',
          name: company.name,
          alternateName: short,
          description: company.about_intro,
          url: siteUrl(),
          telephone: phone,
          email: company.email,
          address: {
            '@type': 'PostalAddress',
            streetAddress: company.physical_address?.replace(/\n/g, ', '),
            addressLocality: company.city,
            addressCountry: 'KE',
          },
          areaServed: ['Kenya', 'United Kingdom', 'United States', 'Canada'],
          sameAs: socials.map(([, url]) => url).filter(external),
        }}
      />
      <a href="#main" className="skip-link">Skip to the content</a>

      <div className="topbar">
        <div className="wrap">
          {phone ? <a href={telHref(phone)}><Icon name="phone" size={14} /> {phone}</a> : null}
          {company.email ? <a href={`mailto:${company.email}`} className="hide-sm"><Icon name="mail" size={14} /> {company.email}</a> : null}
          {company.diaspora_phone ? <a href={telHref(company.diaspora_phone)} className="hide-sm"><Icon name="globe" size={14} /> Diaspora {company.diaspora_phone}</a> : null}
          <span className="spacer" />
          {company.office_hours ? <span className="hours hide-sm"><Icon name="clock" size={14} /> {company.office_hours}</span> : null}
          <StaffLink />
        </div>
      </div>

      <SiteHeader
        brand={<Wordmark name={short} logoUrl={company.logo_url} size={40} />}
        groups={groups}
        links={links}
        phone={phone}
        phoneHref={phone ? telHref(phone) : null}
      />

      <main id="main">{children}</main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
                <Wordmark name={short} logoUrl={company.logo_url} size={44} />
              </Link>
              <p className="footer-about">{company.about_intro}</p>
              <div className="socials">
                {socials.filter(([, url]) => external(url)).map(([icon, url, label]) => (
                  <a key={icon} href={url!} target="_blank" rel="noreferrer" aria-label={label}><Icon name={icon} size={18} /></a>
                ))}
              </div>
            </div>

            <div>
              <h4>Loans</h4>
              <ul>
                {products.map((p) => <li key={p.id}><Link href={`/loans/${p.slug}`}>{p.name}</Link></li>)}
                <li><Link href="/calculator">Loan calculator</Link></li>
              </ul>
            </div>

            <div>
              <h4>Company</h4>
              <ul>
                <li><Link href="/about">About us</Link></li>
                <li><Link href="/branches">Branches & offices</Link></li>
                <li><Link href="/diaspora">Kenyans abroad</Link></li>
                <li><Link href="/insights">Insights</Link></li>
                <li><Link href="/careers">Careers</Link></li>
                <li><Link href="/faqs">FAQs</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4>Talk to us</h4>
              <ul className="contact-lines">
                {company.physical_address ? (
                  <li><Icon name="pin" size={16} /><span>{company.physical_address.split('\n').join(', ')}{company.city ? `, ${company.city}` : ''}</span></li>
                ) : null}
                {phone ? <li><Icon name="phone" size={16} /><a href={telHref(phone)}>{phone}</a></li> : null}
                {company.phone_secondary ? <li><Icon name="phone" size={16} /><a href={telHref(company.phone_secondary)}>{company.phone_secondary}</a></li> : null}
                {company.email ? <li><Icon name="mail" size={16} /><a href={`mailto:${company.email}`}>{company.email}</a></li> : null}
                {company.office_hours ? <li><Icon name="clock" size={16} /><span>{company.office_hours}</span></li> : null}
              </ul>
              {company.paybill_no ? (
                <div className="paybill">
                  <span>M-Pesa Paybill</span>
                  <b>{company.paybill_no}</b>
                  {company.paybill_note ? <small>{company.paybill_note}</small> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="newsletter">
            <div>
              <h4>Property money, explained monthly</h4>
              <p style={{ fontSize: '0.9rem' }}>Guides, market insight and new products. One email a month, never shared.</p>
            </div>
            <NewsletterForm sourcePage="footer" />
          </div>

          <div className="footer-bottom">
            <p className="legal">
              © {year} {company.name}.{company.registration_no ? ` Registration No. ${company.registration_no}.` : ''}{' '}
              {company.licence_no ? `${company.licence_no}. ` : ''}
              {company.licence_note ? `${company.licence_note} ` : ''}
              {hq ? `Head office in ${hq.town ?? hq.name}, ${hq.county ?? 'Nairobi'}. ` : ''}
              All rates shown are indicative; your rate is confirmed in writing before you sign.
            </p>
            <nav aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/admin/login">Staff portal</Link>
            </nav>
          </div>
        </div>
      </footer>

      {company.whatsapp_number ? (
        <a
          className="wa-float"
          href={whatsappHref(company.whatsapp_number, `Hello ${short}, I would like to know more about your loans.`)}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat with us on WhatsApp"
        >
          <Icon name="whatsapp" size={24} /><span>Chat with us</span>
        </a>
      ) : null}
    </div>
  );
}
