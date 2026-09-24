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
  description: 'Jukiwa Credit Limited offers rent advances, building finance and property loans across Kenya and for Kenyans abroad.',
  alternates: { canonical: '/about' },
};

/* What Jukiwa Credit works by — each one written as something a borrower can hold us to. */
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
        eyebrow="About us"
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
            <div className="tile" style={{ gridColumn: 'auto' }}>
              <span className="tile-ico"><Icon name="building" size={24} /></span>
              <h3>{branches.length} offices, one team</h3>
              <p>
                From Kilimani to our branches, satellites and London office, you deal with the same people from your first call to
                your last repayment.
              </p>
              <Link href="/branches" className="link-arrow">Find an office <Icon name="arrow" size={18} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cream">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">What we stand for</span>
            <h2 className="display-2">Five values we work by.</h2>
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
              <p className="lead">Experienced people who know property — and who answer when you call.</p>
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
            <div className="section-head"><span className="eyebrow">Our clients</span><h2 className="display-2">In their words.</h2></div>
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
