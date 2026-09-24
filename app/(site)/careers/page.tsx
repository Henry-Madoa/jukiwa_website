import Link from 'next/link';
import type { Metadata } from 'next';
import { getSettings, getVacancies } from '@/lib/site.ts';
import { formatDate } from '@/lib/format.ts';
import { PageHero } from '../blocks.tsx';
import { Icon } from '../icons.tsx';

export const metadata: Metadata = {
  title: 'Careers',
  description: 'Join the founding team of Jukiwa Credit Limited, a Kenyan property finance company.',
  alternates: { canonical: '/careers' },
};

export default async function CareersPage() {
  const [vacancies, company] = await Promise.all([getVacancies(), getSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Careers"
        title={<>Build a lender <span className="hl">from day one</span>.</>}
        lead={`Jukiwa Credit is building its founding team. Join a new company with ${company.stat_years ?? 'over 24'} years of property experience behind it.`}
        crumbs={[{ href: '/careers', label: 'Careers' }]}
      />
      <section className="section">
        <div className="wrap">
          {vacancies.length ? (
            <div className="faq" style={{ gap: 14 }}>
              {vacancies.map((v) => (
                <Link key={v.id} href={`/careers/${v.slug}`} className="product-card" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 20 }} data-reveal="">
                  <span className="product-ico" aria-hidden="true" style={{ width: 52, height: 52, fontSize: '1.4rem' }}>💼</span>
                  <div style={{ flex: '1 1 300px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>{v.title}</h3>
                    <div className="product-meta" style={{ marginTop: 10 }}>
                      {v.department ? <span className="chip chip-brand">{v.department}</span> : null}
                      {v.location ? <span className="chip">{v.location}</span> : null}
                      {v.employment_type ? <span className="chip">{v.employment_type}</span> : null}
                      <span className="chip chip-accent">{v.closes_on ? `Closes ${formatDate(v.closes_on)}` : 'Open until filled'}</span>
                    </div>
                  </div>
                  <span className="link-arrow">Read the advert <Icon name="arrow" size={18} /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <h2 className="display-3">No open roles right now</h2>
              <p className="muted" style={{ marginTop: 10 }}>We are always glad to hear from good people. Send your CV to careers@jukiwa.co.ke.</p>
            </div>
          )}
          <div className="card" style={{ marginTop: 36, background: 'var(--cream)' }}>
            <h3>Internships and attachments</h3>
            <p className="muted">
              We take students in business management, sales, IT and law. Send your CV and a copy of your student ID
              or recent transcript to <a href="mailto:careers@jukiwa.co.ke" style={{ color: 'var(--brand)', fontWeight: 700 }}>careers@jukiwa.co.ke</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
