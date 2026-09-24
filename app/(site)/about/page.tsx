import Link from 'next/link';
import type { Metadata } from 'next';
import { getBranches, getSettings, getTeam, getTestimonials } from '@/lib/site.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { initials } from '@/lib/format.ts';
import { TEAM_CATEGORIES } from '@/lib/types.ts';
import { CtaBand, PageHero, QuoteCard } from '../blocks.tsx';
import { Icon } from '../icons.tsx';
import { Prose } from '../prose.tsx';

export const metadata: Metadata = {
  title: 'About us',
  description: 'Jukiwa Credit Limited is the lending arm of the Jukiwa group — the same directors, offices and people as Jukiwa General Agencies Ltd.',
  alternates: { canonical: '/about' },
};

/*
 * The values are Jukiwa's own, as the group already publishes them — a subsidiary that invented
 * new ones would be telling borrowers it is a different company, which is exactly what it is not.
 */
const VALUES: [icon: 'users' | 'trend' | 'shield' | 'spark' | 'home', title: string, body: string][] = [
  ['users', 'Client-centric', 'We put our clients’ needs first, and work to exceed their expectations — including telling them when a loan is not right for them.'],
  ['trend', 'Expertise', 'Experienced people who value, manage, let and sell property every day, so they can lend against it with confidence.'],
  ['shield', 'Integrity', 'Honesty and transparency in every dealing: every rate, fee and total in writing before anything is signed.'],
  ['spark', 'Innovation', 'Always looking for better ways to serve — like advances repaid from the rent itself, and statements you can see in real time.'],
  ['home', 'Community', 'A commitment to the places we work, from Kilimani to Kitengela to Nakuru — and to Kenyans building at home from abroad.'],
];

export default async function AboutPage() {
  const [company, team, branches, testimonials] = await Promise.all([getSettings(), getTeam(), getBranches(), getTestimonials()]);
  const groups = TEAM_CATEGORIES.filter((c) => team.some((m) => m.category === c.value));

  return (
    <>
      <PageHero
        eyebrow={company.parent_name ? `A ${company.parent_name} company` : 'About us'}
        title={<>Property finance from the people who <span className="hl">manage property</span>.</>}
        lead={company.about_intro}
        crumbs={[{ href: '/about', label: 'About' }]}
      />

      <section className="section">
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Our story</span>
            <h2 className="display-2">A new company, with two decades behind it.</h2>
            <Prose text={company.about_story} />
          </div>
          <div className="stack" style={{ '--stack': '18px' } as React.CSSProperties}>
            {company.mission ? (
              <div className="tile dark" style={{ gridColumn: 'auto' }}>
                <span className="tile-ico"><Icon name="zap" size={24} /></span>
                <h3 style={{ color: '#fff' }}>Our mission</h3>
                <p>{company.mission}</p>
              </div>
            ) : null}
            {company.vision ? (
              <div className="tile gold" style={{ gridColumn: 'auto' }}>
                <span className="tile-ico"><Icon name="globe" size={24} /></span>
                <h3>Our vision</h3>
                <p>{company.vision}</p>
              </div>
            ) : null}
            {company.parent_name ? (
              <div className="tile" style={{ gridColumn: 'auto' }}>
                <span className="tile-ico"><Icon name="building" size={24} /></span>
                <h3>One group, one door</h3>
                <p>
                  Jukiwa Credit and {company.parent_name} share their directors, their {branches.length} offices and their staff in
                  every satellite. Manage your building with one and finance it with the other — without ever changing who you deal with.
                </p>
                {company.parent_url ? <a href={company.parent_url} target="_blank" rel="noreferrer" className="link-arrow">Visit {company.parent_name} <Icon name="arrow" size={18} /></a> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section section-cream">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">What we stand for</span>
            <h2 className="display-2">Five values, shared across the group.</h2>
          </div>
          <div className="bento" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {VALUES.map(([icon, title, body]) => (
              <div className="tile" key={title} style={{ gridColumn: 'auto' }} data-reveal="">
                <span className="tile-ico"><Icon name={icon} size={24} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {team.length ? (
        <section className="section" id="leadership">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Leadership</span>
              <h2 className="display-2">The people you will deal with.</h2>
              <p className="lead">The same faces landlords already know from {company.parent_name ?? 'Jukiwa'} — now behind your finance, too.</p>
            </div>
            {groups.map((group) => (
              <div key={group.value} style={{ marginBottom: 40 }}>
                {groups.length > 1 ? <h3 style={{ fontSize: '1.05rem', marginBottom: 18, color: 'var(--muted)' }}>{group.label}</h3> : null}
                <div className="team-grid">
                  {team.filter((m) => m.category === group.value).map((m) => (
                    <article className="person" key={m.id} data-reveal="">
                      <div className="portrait">
                        {m.photo_url ? <img src={cdn(m.photo_url, { width: 480, height: 480 })} alt={m.name} loading="lazy" /> : <span>{initials(m.name)}</span>}
                      </div>
                      <div className="info">
                        <h3>{m.name}</h3>
                        <p>{m.role_title}</p>
                        {m.linkedin_url ? <a href={m.linkedin_url} target="_blank" rel="noreferrer" className="link-arrow" style={{ marginTop: 10, fontSize: '0.86rem' }}><Icon name="linkedin" size={16} /> LinkedIn</a> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {testimonials.length ? (
        <section className="section section-soft">
          <div className="wrap">
            <div className="section-head"><span className="eyebrow">Clients of the Jukiwa group</span><h2 className="display-2">In their words.</h2></div>
            <div className="quotes">{testimonials.map((t) => <QuoteCard key={t.id} t={t} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="section-tight">
        <div className="wrap" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/branches" className="btn btn-ghost btn-lg"><Icon name="pin" size={18} /> Our offices</Link>
          <Link href="/careers" className="btn btn-ghost btn-lg"><Icon name="users" size={18} /> Work with us</Link>
        </div>
      </section>

      <CtaBand phone={company.phone_primary} />
    </>
  );
}
