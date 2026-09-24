import Link from 'next/link';
import type { Metadata } from 'next';
import { getBranches, getProducts, getSettings } from '@/lib/site.ts';
import { telHref, whatsappHref } from '@/lib/format.ts';
import { EnquiryForm } from '../forms.tsx';
import { PageHero } from '../blocks.tsx';
import { Icon } from '../icons.tsx';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Call, WhatsApp, email or visit Jukiwa Credit at our Kilimani headquarters in Nairobi.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const [company, products, branches] = await Promise.all([getSettings(), getProducts(), getBranches()]);
  const ways = [
    company.phone_primary && { icon: 'phone' as const, label: 'Call us', value: company.phone_primary, href: telHref(company.phone_primary) },
    company.whatsapp_number && { icon: 'whatsapp' as const, label: 'WhatsApp', value: company.whatsapp_number, href: whatsappHref(company.whatsapp_number, 'Hello Jukiwa Credit') },
    company.email && { icon: 'mail' as const, label: 'Email', value: company.email, href: `mailto:${company.email}` },
    company.diaspora_phone && { icon: 'globe' as const, label: 'From abroad', value: company.diaspora_phone, href: telHref(company.diaspora_phone) },
  ].filter(Boolean) as { icon: 'phone' | 'whatsapp' | 'mail' | 'globe'; label: string; value: string; href: string }[];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Talk to a person, <span className="hl">not a portal</span>.</>}
        lead="Call, message, email or walk in. During office hours a credit officer usually replies within 30 minutes."
        crumbs={[{ href: '/contact', label: 'Contact' }]}
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="stats contact-ways" style={{ marginTop: -44, position: 'relative' }}>
            {ways.map((w) => (
              <a key={w.label} href={w.href} className="stat" style={{ textDecoration: 'none', color: 'inherit' }} target={w.icon === 'whatsapp' ? '_blank' : undefined} rel="noreferrer">
                <span style={{ color: 'var(--brand)', display: 'inline-flex', marginBottom: 10 }}><Icon name={w.icon} size={26} /></span>
                <span style={{ marginTop: 0, fontWeight: 700, color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{w.label}</span>
                <b style={{ fontSize: '1.25rem', marginTop: 6 }}>{w.value}</b>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="form-card">
            <h2 className="display-3" style={{ marginBottom: 8 }}>Send us a message</h2>
            <p className="muted" style={{ marginBottom: 22 }}>Tell us a little about your property and what you have in mind.</p>
            <EnquiryForm kind="ENQUIRY" sourcePage="/contact" products={products.map((p) => ({ id: p.id, name: p.name }))} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
          </div>
          <div className="stack" style={{ '--stack': '20px' } as React.CSSProperties}>
            <div className="card">
              <h3>Head office</h3>
              <ul className="ticks" style={{ gap: 10 }}>
                {company.physical_address ? <li>{company.physical_address.split('\n').join(', ')}{company.city ? `, ${company.city}` : ''}</li> : null}
                {company.postal_address ? <li>{company.postal_address}{company.city ? `, ${company.city}` : ''}</li> : null}
                {company.office_hours ? <li>{company.office_hours}</li> : null}
              </ul>
            </div>
            {company.map_embed_url ? (
              <div className="branch" style={{ overflow: 'hidden' }}>
                <div className="map" style={{ aspectRatio: '4 / 3' }}><iframe src={company.map_embed_url} title="Map of our head office" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
              </div>
            ) : null}
            {company.paybill_no ? (
              <div className="card" style={{ background: 'var(--brand-deep)', color: '#fff', borderColor: 'transparent' }}>
                <h3 style={{ color: '#fff' }}>Making a repayment</h3>
                <p style={{ color: 'rgb(255 255 255 / 0.78)' }}>
                  M-Pesa Paybill <b style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{company.paybill_no}</b>
                  {company.paybill_note ? ` · ${company.paybill_note}` : ''}
                </p>
              </div>
            ) : null}
            <Link href="/branches" className="link-arrow">All {branches.length} offices <Icon name="arrow" size={18} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
