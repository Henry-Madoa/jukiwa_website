import type { Metadata } from 'next';
import { getBranches, getSettings } from '@/lib/site.ts';
import { telHref } from '@/lib/format.ts';
import { BRANCH_KINDS } from '@/lib/types.ts';
import { EnquiryForm } from '../forms.tsx';
import { PageHero } from '../blocks.tsx';
import { Icon } from '../icons.tsx';

export const metadata: Metadata = {
  title: 'Branches & offices',
  description: 'Visit Jukiwa Credit at our Kilimani headquarters, our branches and satellite offices, or our diaspora office in London.',
  alternates: { canonical: '/branches' },
};

export default async function BranchesPage() {
  const [company, branches] = await Promise.all([getSettings(), getBranches()]);

  return (
    <>
      <PageHero
        eyebrow="Branches & offices"
        title={<>Walk in. We share <span className="hl">every Jukiwa office</span>.</>}
        lead={`Jukiwa Credit works from the same offices as ${company.parent_name ?? 'Jukiwa General Agencies'} — headquarters in Kilimani, branches and satellites across Kenya, and a diaspora office in London.`}
        crumbs={[{ href: '/branches', label: 'Branches' }]}
      />

      <section className="section">
        <div className="wrap">
          <div className="branch-grid">
            {branches.map((b) => (
              <article className="branch" key={b.id} data-reveal="">
                {b.map_url ? (
                  <div className="map"><iframe src={b.map_url} title={`Map of ${b.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
                ) : (
                  <div className="map placeholder" aria-hidden="true">{b.kind === 'REGIONAL' ? '✈️' : '📍'}</div>
                )}
                <div className="info">
                  <div>
                    <span className="chip chip-brand">{BRANCH_KINDS.find((k) => k.value === b.kind)?.label}</span>
                    <h3 style={{ marginTop: 10 }}>{b.name}</h3>
                  </div>
                  {b.note ? <p className="small muted">{b.note}</p> : null}
                  <ul>
                    <li><Icon name="pin" size={16} /><span>{b.address ? b.address.split('\n').join(', ') : [b.town, b.county].filter(Boolean).join(', ')}{b.country !== 'Kenya' ? `, ${b.country}` : ''}</span></li>
                    {b.phone ? <li><Icon name="phone" size={16} /><a href={telHref(b.phone)}>{b.phone}</a></li> : null}
                    {b.email ? <li><Icon name="mail" size={16} /><a href={`mailto:${b.email}`}>{b.email}</a></li> : null}
                    {b.hours ? <li><Icon name="clock" size={16} /><span>{b.hours}</span></li> : null}
                    {b.manager ? <li><Icon name="users" size={16} /><span>Branch manager: {b.manager}</span></li> : null}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-dark" id="partner">
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Bring Jukiwa to your county</span>
            <h2 className="display-2" style={{ color: '#fff' }}>No office near you yet? <span className="hl">Open one with us.</span></h2>
            <p className="lead">
              The Jukiwa group is growing across all 47 counties and the diaspora. If you have the integrity and the network to serve
              landlords where you live, we will equip you with the brand, the systems and the finance to back them.
            </p>
            <ul className="ticks">
              <li>Use the Jukiwa name and reputation in your county or region</li>
              <li>Offer your landlords rent advances and building finance from Jukiwa Credit</li>
              <li>Work from our secure online management system, with training and support from head office</li>
              <li>Open to entrepreneurs, agents, real estate professionals — and Kenyans abroad representing their home county</li>
            </ul>
          </div>
          <div className="form-card">
            <h3 className="display-3" style={{ marginBottom: 8 }}>Tell us about yourself</h3>
            <p className="muted" style={{ marginBottom: 20 }}>We will invite you to a one-to-one at our Nairobi headquarters.</p>
            <EnquiryForm kind="PARTNER" sourcePage="/branches#partner" />
          </div>
        </div>
      </section>
    </>
  );
}
