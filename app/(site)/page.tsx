import Link from 'next/link';
import { getFaqs, getPosts, getProducts, getSettings, getTestimonials, toTerms, getBranches } from '@/lib/site.ts';
import { quote } from '@/lib/loan-math.ts';
import { formatMoney, telHref } from '@/lib/format.ts';
import { cdn } from '@/lib/cloudinary.ts';
import { LoanCalculator } from './calculator.tsx';
import { EnquiryForm } from './forms.tsx';
import { COMPANY_VALUES, CtaBand, FaqList, PostCard, ProductCard, QuoteCard } from './blocks.tsx';
import { Flag, Icon } from './icons.tsx';
import { JsonLd, Prose } from './prose.tsx';
import { BRAND_SLOGAN, BrandMark } from '@/app/brand.tsx';

/*
 * The home page, in the order a careful borrower's questions arrive: who is Jukiwa Credit (the
 * hero, with the company's own logo, and then its story, mission and values), what do you fund and
 * what would it cost me (the dreams, the loans, the calculator), how does it work, what do others
 * say — and then, at every point, one obvious next step.
 */

/* The people Jukiwa Credit lends to, each with the thing they are actually trying to do. */
const DREAMS: [icon: 'home' | 'building' | 'key' | 'pin' | 'plane' | 'trend', who: string, dream: string, href: string][] = [
  ['home', 'Landlords', 'Turn the rent your building earns into money you can use today — repaid from the rent itself.', '/loans'],
  ['building', 'Builders & developers', 'Finish the last stretch of your building, and start earning from it sooner.', '/loans'],
  ['key', 'Home buyers', 'Move from paying rent to owning a home of your own.', '/loans'],
  ['pin', 'Land owners', 'Buy the plot you have been eyeing, or unlock the value of the title you already hold.', '/loans'],
  ['plane', 'Kenyans abroad', 'Build and invest at home from London, Houston or Toronto — we manage it on the ground.', '/diaspora'],
  ['trend', 'Businesses', 'Grow the business that grows your property, with finance secured on what you own.', '/loans'],
];

/** "Unlock the money in your property." → the last two words get the gold underline. */
function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const tail = words.splice(Math.max(1, words.length - 2)).join(' ');
  return (
    <>
      {words.join(' ')}{' '}
      <span className="hl">
        {tail}
        <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
          <path d="M3 14c60-9 140-13 294-6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        </svg>
      </span>
    </>
  );
}

export default async function HomePage() {
  const [company, products, testimonials, faqs, posts, branches] = await Promise.all([
    getSettings(), getProducts(), getTestimonials(), getFaqs(), getPosts({ limit: 3 }), getBranches(),
  ]);
  const featured = products.filter((p) => p.is_featured);
  const shown = (featured.length >= 3 ? featured : products).slice(0, 6);
  const rentProduct = products.find((p) => p.calc_mode === 'RENT_ADVANCE');
  const example = rentProduct
    ? quote(toTerms(rentProduct), { amountCents: 400_000_00 * rentProduct.rent_multiple_max, termMonths: 24, monthlyRentCents: 400_000_00 })
    : null;
  const phone = company.phone_primary;

  const hq = branches.find((b) => b.kind === 'HQ');

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: { '@type': 'LoanOrCredit', name: p.name, description: p.summary, currency: 'KES', provider: { '@type': 'FinancialService', name: company.name } },
          })),
        }}
      />

      {/* ------------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          {company.hero_image_url ? <img className="hero-photo" src={cdn(company.hero_image_url, { width: 2400 })} alt="" fetchPriority="high" /> : null}
          <span className="hero-shade" />
          <span className="orb orb-1" /><span className="orb orb-2" /><span className="grid" />
        </div>
        <div className="wrap hero-grid hero-grid-brand">
          {/* The company itself, large: the logo as it is printed, on its own white plate. */}
          <div className="brand-stage">
            <div className="brand-plate">
              <BrandMark size={240} logoUrl={company.logo_url} title={company.name} />
              <p className="plate-name">{company.name.replace(/\s+Limited$/i, ' Ltd')}</p>
              <span className="plate-rule" aria-hidden="true" />
              <p className="plate-slogan">{BRAND_SLOGAN}</p>
            </div>
            <div className="float-chip c1">
              <span className="chip-ico" aria-hidden="true"><Icon name="home" size={20} /></span>
              <span>{company.stat_years ?? '24+'} years in property<small>Valuing, letting and managing it</small></span>
            </div>
            <div className="float-chip c2">
              <span className="chip-ico" aria-hidden="true"><Icon name="plane" size={20} /></span>
              <span>Kenya &amp; the diaspora<small className="mini-flags"><Flag country="gb" /><Flag country="us" /><Flag country="ca" /> London office</small></span>
            </div>
          </div>

          <div className="hero-copy">
            {company.hero_kicker ? <span className="eyebrow">{company.hero_kicker}</span> : null}
            <h1 className="display-1"><Headline text={company.hero_headline ?? `${BRAND_SLOGAN}.`} /></h1>
            <p className="lead">{company.hero_body ?? company.about_intro}</p>
            <div className="btn-row">
              <Link href="/apply" className="btn btn-accent btn-lg">Apply in 5 minutes <Icon name="arrow" size={18} data-arrow="" /></Link>
              <a href="#about" className="btn btn-light btn-lg">Meet Jukiwa Credit</a>
            </div>
            <ul className="hero-proof">
              <li><Icon name="clock" size={18} /> Callback in {company.stat_turnaround ?? '30 min'}</li>
              <li><Icon name="shield" size={18} /> {company.indemnity_cover ?? 'KES 500M'} indemnity cover</li>
              <li><Icon name="lock" size={18} /> No ID uploads online</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- stats */}
      <div className="stats-band">
        <div className="wrap">
          <div className="stats">
            <div className="stat"><b>{company.stat_years ?? '24+'}</b><span>years of experience in Kenyan property</span></div>
            <div className="stat"><b>10<em>×</em></b><span>your monthly rent, as a single advance</span></div>
            <div className="stat"><b>{company.stat_counties ?? '47'}</b><span>counties where we find, value and finance property</span></div>
            <div className="stat"><b>{company.indemnity_cover ?? 'KES 500M'}</b><span>professional indemnity cover on purchases</span></div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- about */}
      <section className="section" id="about">
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Who we are</span>
            <h2 className="display-2">Meet <span className="hl-under">Jukiwa Credit</span>.</h2>
            {company.about_intro ? <p className="lead">{company.about_intro}</p> : null}
            <Prose text={company.about_story} />
            <Link href="/about" className="link-arrow">Our full story and leadership <Icon name="arrow" size={18} /></Link>
          </div>
          <div className="stack" style={{ '--stack': '16px' } as React.CSSProperties}>
            {company.mission ? (
              <div className="tile dark" data-reveal="">
                <span className="tile-ico"><Icon name="zap" size={24} /></span>
                <h3 style={{ color: '#fff' }}>Our mission</h3>
                <p>{company.mission}</p>
              </div>
            ) : null}
            {company.vision ? (
              <div className="tile gold" data-reveal="">
                <span className="tile-ico"><Icon name="globe" size={24} /></span>
                <h3>Our vision</h3>
                <p>{company.vision}</p>
              </div>
            ) : null}
            <ul className="about-facts" data-reveal="">
              <li><Icon name="building" size={20} /><span><b>Our own credit team</b>Jukiwa Credit Limited decides every loan itself — quickly, and on what your property is really worth.</span></li>
              <li><Icon name="pin" size={20} /><span><b>{hq ? `Head office in ${hq.town ?? hq.name}` : 'Offices across Kenya'}</b>{branches.map((b) => b.town ?? b.name).join(' · ')}</span></li>
              <li><Icon name="users" size={20} /><span><b>One team, start to finish</b>The person who takes your call is the person who sees your loan through.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- values */}
      <section className="section section-cream">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">What we stand for</span>
            <h2 className="display-2">Five promises behind every loan.</h2>
            <p className="lead">They are written as things you can hold us to — and you should.</p>
          </div>
          <div className="values-grid">
            {COMPANY_VALUES.map(([icon, title, body], index) => (
              <div className="value-card" key={title} data-reveal="">
                <span className="value-n">0{index + 1}</span>
                <span className="tile-ico"><Icon name={icon} size={24} /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- dreams */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Whose dreams we fund</span>
            <h2 className="display-2">Whatever you are building, <span className="hl-under">we fund it</span>.</h2>
            <p className="lead">Most of our clients came to us with a plan and a property. We look at both, and find the finance that fits.</p>
          </div>
          <div className="dream-grid">
            {DREAMS.map(([icon, who, dream, href]) => (
              <Link key={who} href={href} className="dream-card" data-reveal="">
                <span className="tile-ico"><Icon name={icon} size={24} /></span>
                <h3>{who}</h3>
                <p>{dream}</p>
                <span className="link-arrow">See how <Icon name="arrow" size={16} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- products */}
      <section className="section">
        <div className="wrap">
          <div className="section-head-row">
            <div className="section-head">
              <span className="eyebrow">What we lend</span>
              <h2 className="display-2">Finance built around <span className="hl-under">property</span>.</h2>
              <p className="lead">Every product starts from something Jukiwa already understands better than a bank: the rent a building earns, and what a property is really worth.</p>
            </div>
            <Link href="/loans" className="btn btn-ghost">All {products.length} loans <Icon name="arrow" size={18} data-arrow="" /></Link>
          </div>
          <div className="product-grid">
            {shown.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ calculator */}
      <section className="section section-dark" id="calculator">
        <div className="wrap split">
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Your numbers</span>
            <h2 className="display-2" style={{ color: '#fff' }}>What could Jukiwa Credit <span className="hl">fund for you?</span></h2>
            <p className="lead">
              Pick a loan, move the sliders, and see the monthly figure straight away. Nothing is saved and nobody calls
              you unless you ask us to.
            </p>
            <ul className="ticks">
              <li>Indicative rates and fees, shown before you apply</li>
              <li>Rent advances of up to 10× the monthly rent</li>
              <li>Your exact figures confirmed in writing before you sign</li>
            </ul>
            <div className="btn-row">
              <Link href="/apply" className="btn btn-accent">Apply with these figures <Icon name="arrow" size={18} data-arrow="" /></Link>
              <Link href="/calculator" className="btn btn-light">Full calculator</Link>
            </div>
          </div>
          <div data-reveal="">
            <LoanCalculator products={products.map(toTerms)} variant="hero" title="What could you get?" />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- how it works */}
      <section className="section section-cream">
        <div className="wrap">
          <div className="section-head center">
            <span className="eyebrow">How it works</span>
            <h2 className="display-2">From application to money, in four steps.</h2>
            <p className="lead">No queue at a banking hall, no documents uploaded to a website. A person you can call, from the first minute.</p>
          </div>
          <div className="steps">
            {[
              ['Apply online', 'Tell us what you need and what backs it. About five minutes, on a phone.', 'Today'],
              ['We call you back', 'A credit officer talks it through and tells you exactly what to bring.', `Within ${company.stat_turnaround ?? '30 min'}`],
              ['Documents & valuation', 'Bring your ID, KRA PIN and title or rent roll to a branch. We value or inspect the property.', 'A few days'],
              ['Money in your account', 'You sign your offer letter, with every rate and fee in writing, and we disburse.', 'On approval'],
            ].map(([title, body, when], index) => (
              <div className="step" key={title} data-reveal="">
                <div className="step-n">{index + 1}</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="when">{when}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- rent spotlight */}
      {rentProduct && example ? (
        <section className="section">
          <div className="wrap split">
            <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
              <span className="eyebrow">The rent advance</span>
              <h2 className="display-2">Your next two years of rent — <span className="hl-under">today</span>.</h2>
              <p className="lead">
                If Jukiwa manages your building, you can receive up to {rentProduct.rent_multiple_max} times its monthly rent as a single
                advance. You never make a repayment: we recover it quietly from the rent we already collect, and pay you the rest.
              </p>
              <ul className="ticks">
                <li>No monthly transfer to remember — repayment comes out of the rent</li>
                <li>Every figure visible in real time on the Jukiwa property system</li>
                <li>Typically 12 or 24 months, for landlords in Kenya and abroad</li>
              </ul>
              <div className="btn-row">
                <Link href={`/loans/${rentProduct.slug}`} className="btn btn-primary">How the rent advance works <Icon name="arrow" size={18} data-arrow="" /></Link>
                <Link href="/calculator?product=rent-advance" className="link-arrow">Try it with your rent <Icon name="arrow" size={18} /></Link>
              </div>
            </div>

            <div data-reveal="">
              <div className="statement">
                <div className="statement-head">
                  <b>Monthly statement</b>
                  <span>Example · 12-unit block, Ruiru</span>
                </div>
                <div className="statement-advance">
                  <span>Advance paid to you on day one</span>
                  <b>{formatMoney(example.principalCents)}</b>
                </div>
                <div className="statement-body">
                  <div className="statement-row"><span>Rent collected this month</span><b>{formatMoney(400_000_00)}</b></div>
                  <div className="statement-row minus"><span>Advance instalment recovered</span><b>− {formatMoney(example.monthlyCents)}</b></div>
                  <div className="statement-row total"><span>Paid into your account</span><b>{formatMoney(Math.max(0, 400_000_00 - example.monthlyCents))}</b></div>
                  <p className="tiny muted">Illustration over 24 months at the indicative rate, before Jukiwa&rsquo;s management fee. Your figures depend on your building and package.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- why us */}
      <section className="section section-soft">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Why Jukiwa Credit</span>
            <h2 className="display-2">A lender that already knows your building.</h2>
          </div>
          <div className="bento">
            <div className="tile span-4 dark" data-reveal="">
              <span className="tile-ico"><Icon name="home" size={24} /></span>
              <h3 style={{ fontSize: '1.6rem', color: '#fff' }}>We manage property every day — so we can lend against it with confidence.</h3>
              <p>
                We value, let, manage and sell property across Kenya. That is why we can decide quickly, lend
                on the rent a building actually earns, and structure repayments around it — where a bank would only see a payslip.
              </p>
              <svg className="deco" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 24 24 9l18 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="tile span-2 gold" data-reveal="">
              <div className="big-num">{company.stat_years ?? '24+'}</div>
              <h3>years in Kenyan property</h3>
              <p>Valuing, letting, managing and selling property across all 47 counties.</p>
            </div>
            <div className="tile" data-reveal="">
              <span className="tile-ico"><Icon name="shield" size={24} /></span>
              <h3>{company.indemnity_cover ?? 'KES 500M'} indemnity</h3>
              <p>Property bought through Jukiwa is protected by professional indemnity insurance.</p>
            </div>
            <div className="tile" data-reveal="">
              <span className="tile-ico"><Icon name="lock" size={24} /></span>
              <h3>Nothing sensitive online</h3>
              <p>We never ask for your ID number, PIN or statements on a website. Those come to the branch, in person.</p>
            </div>
            <div className="tile" data-reveal="">
              <span className="tile-ico"><Icon name="phone-device" size={24} /></span>
              <h3>Statements in real time</h3>
              <p>See every shilling collected, recovered and paid to you from your phone, wherever you are.</p>
            </div>
            <div className="tile span-3" data-reveal="">
              <span className="tile-ico"><Icon name="pin" size={24} /></span>
              <h3>{branches.length} offices you can walk into</h3>
              <p>{branches.map((b) => b.town ?? b.name).join(' · ')} — walk into any of them.</p>
              <Link href="/branches" className="link-arrow">Find an office <Icon name="arrow" size={18} /></Link>
            </div>
            <div className="tile span-3" data-reveal="">
              <span className="tile-ico"><Icon name="file" size={24} /></span>
              <h3>Every cost in writing, first</h3>
              <p>Your offer letter sets out the rate, the fees and the total you will repay before you sign anything. Early settlement is always allowed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- diaspora */}
      <section className="section section-dark">
        <div className="wrap split">
          <div className="stack" style={{ '--stack': '22px' } as React.CSSProperties}>
            <span className="eyebrow">Kenyans abroad</span>
            <h2 className="display-2" style={{ color: '#fff' }}>Building at home from <span className="hl">London, Houston or Toronto?</span></h2>
            <p className="lead">
              We manage your Kenyan property, advance you 5–10 times its rent, and deposit the balance wherever you are.
              Our diaspora regional office in London serves the UK, the USA and Canada.
            </p>
            <div className="flags">
              <span className="flag"><Flag country="gb" /> United Kingdom</span>
              <span className="flag"><Flag country="us" /> United States</span>
              <span className="flag"><Flag country="ca" /> Canada</span>
            </div>
            <div className="btn-row">
              <Link href="/diaspora" className="btn btn-accent">Diaspora finance <Icon name="arrow" size={18} data-arrow="" /></Link>
            </div>
          </div>
          <div className="diaspora-card" data-reveal="">
            <dl>
              {company.diaspora_phone ? <div><dt>Diaspora line</dt><dd><a href={telHref(company.diaspora_phone)}>{company.diaspora_phone}</a></dd></div> : null}
              {company.diaspora_email ? <div><dt>Email</dt><dd><a href={`mailto:${company.diaspora_email}`}>{company.diaspora_email}</a></dd></div> : null}
              {branches.filter((b) => b.kind === 'REGIONAL').map((b) => (
                <div key={b.id}><dt>{b.name}</dt><dd>{b.address?.split('\n').join(', ')}</dd></div>
              ))}
              <div><dt>Example</dt><dd>KES 400,000 monthly rent → KES 4,000,000 advance, recovered over 12 or 24 months</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- testimonials */}
      {testimonials.length ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Our clients</span>
              <h2 className="display-2">In their words.</h2>
            </div>
            <div className="quotes">
              {testimonials.map((t) => <QuoteCard key={t.id} t={t} />)}
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- insights */}
      {posts.length ? (
        <section className="section section-cream">
          <div className="wrap">
            <div className="section-head-row">
              <div className="section-head">
                <span className="eyebrow">Insights</span>
                <h2 className="display-2">Property money, explained.</h2>
              </div>
              <Link href="/insights" className="btn btn-ghost">All insights <Icon name="arrow" size={18} data-arrow="" /></Link>
            </div>
            <div className="post-grid">
              {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------ FAQ and callback */}
      <section className="section">
        <div className="wrap split" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ '--stack': '24px' } as React.CSSProperties}>
            <span className="eyebrow">Questions</span>
            <h2 className="display-2">What people ask us first.</h2>
            <FaqList faqs={faqs.slice(0, 6)} open={1} />
            <Link href="/faqs" className="link-arrow">Every question and answer <Icon name="arrow" size={18} /></Link>
          </div>
          <div className="form-card" id="callback" data-reveal="">
            <h3 className="display-3" style={{ marginBottom: 8 }}>Rather talk it through?</h3>
            <p className="muted" style={{ marginBottom: 22 }}>Leave your number and a credit officer will call you — usually within 30 minutes during office hours.</p>
            <EnquiryForm kind="CALLBACK" sourcePage="/#callback" products={products.map((p) => ({ id: p.id, name: p.name }))} />
            {phone ? <p className="small muted" style={{ marginTop: 18 }}>Or call us now on <a href={telHref(phone)} style={{ color: 'var(--brand)', fontWeight: 700 }}>{phone}</a>.</p> : null}
          </div>
        </div>
      </section>

      <CtaBand
        title={<>Your dream, <span className="hl">funded</span>.</>}
        body="Tell us what you are building. Apply online in about five minutes, and a Jukiwa Credit officer calls you back — usually within 30 minutes during office hours."
        phone={phone}
      />
    </>
  );
}
