import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSettings, getVacancy } from '@/lib/site.ts';
import { formatDate } from '@/lib/format.ts';
import { PageHero } from '../../blocks.tsx';
import { Icon } from '../../icons.tsx';
import { JsonLd, Prose } from '../../prose.tsx';

export async function generateMetadata({ params }: PageProps<'/careers/[slug]'>): Promise<Metadata> {
  const vacancy = await getVacancy((await params).slug);
  return vacancy ? { title: `${vacancy.title} — Careers`, description: vacancy.summary ?? undefined } : { title: 'Vacancy not found' };
}

export default async function VacancyPage({ params }: PageProps<'/careers/[slug]'>) {
  const { slug } = await params;
  const [vacancy, company] = await Promise.all([getVacancy(slug), getSettings()]);
  if (!vacancy) notFound();
  const closed = !!vacancy.closes_on && vacancy.closes_on < new Date().toISOString().slice(0, 10);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: vacancy.title,
          description: vacancy.body,
          datePosted: vacancy.created_at,
          validThrough: vacancy.closes_on ?? undefined,
          employmentType: 'FULL_TIME',
          hiringOrganization: { '@type': 'Organization', name: company.name },
          jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' } },
        }}
      />
      <PageHero
        eyebrow={vacancy.department ?? 'Careers'}
        title={vacancy.title}
        lead={vacancy.summary}
        crumbs={[{ href: '/careers', label: 'Careers' }, { href: `/careers/${vacancy.slug}`, label: vacancy.title }]}
      >
        <div className="product-meta" style={{ marginTop: 24 }}>
          {vacancy.location ? <span className="flag">{vacancy.location}</span> : null}
          {vacancy.employment_type ? <span className="flag">{vacancy.employment_type}</span> : null}
          <span className="flag">{vacancy.closes_on ? `Closes ${formatDate(vacancy.closes_on)}` : 'Open until filled'}</span>
        </div>
      </PageHero>
      <section className="section">
        <div className="wrap wrap-narrow">
          {closed ? <div className="alert alert-info" style={{ marginBottom: 28 }}>This vacancy has closed. Thank you to everyone who applied.</div> : null}
          <Prose text={vacancy.body} />
          <div className="btn-row" style={{ marginTop: 40 }}>
            {!closed ? (
              <a href={`mailto:careers@jukiwa.co.ke?subject=${encodeURIComponent(vacancy.title)}`} className="btn btn-primary btn-lg"><Icon name="mail" size={18} /> Apply by email</a>
            ) : null}
            <Link href="/careers" className="btn btn-ghost btn-lg">All vacancies</Link>
          </div>
        </div>
      </section>
    </>
  );
}
