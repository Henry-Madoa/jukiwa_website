import Link from 'next/link';
import { lendingInsights, RANGES, type Range, type Slice } from '@/lib/insights.ts';
import { formatMoneyCompact } from '@/lib/format.ts';

/*
 * What the website has brought in, and what became of it. Server-rendered, CSS-drawn charts:
 * nothing to load, nothing to hydrate, and every chart has its numbers in a table underneath for
 * anyone who would rather read than look.
 *
 * Colour carries one meaning per chart. Volume is the brand colour; the funnel is a single ramp
 * from received to disbursed, with the two exits in grey — so "where does the money stop" is read
 * from position, not from a legend.
 */

const pct = (n: number, of: number): number => (of > 0 ? Math.round((n / of) * 100) : 0);

function Delta({ now, before, money }: { now: number; before: number; money?: boolean }) {
  if (!before && !now) return null;
  if (!before) return <span className="delta up">new this period</span>;
  const change = Math.round(((now - before) / before) * 100);
  const text = money
    ? `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% on ${formatMoneyCompact(before)}`
    : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% on ${before}`;
  return <span className={`delta ${change > 0 ? 'up' : change < 0 ? 'down' : ''}`}>{text} the period before</span>;
}

function Bars({ slices, total, tone }: { slices: Slice[]; total: number; tone: (slice: Slice, index: number) => string }) {
  const max = Math.max(1, ...slices.map((s) => s.cents));
  if (!slices.length || !total) return <div className="viz-empty">Nothing in this period yet.</div>;
  return (
    <div className="viz-bars">
      {slices.map((slice, index) => (
        <div className="viz-bar-row" key={slice.key}>
          <span className="viz-bar-label">{slice.label}</span>
          <span className="viz-bar-track">
            <span className="viz-bar-fill" style={{ width: `${Math.max(2, (slice.cents / max) * 100)}%` }}>
              <span className="viz-seg" style={{ width: '100%', background: tone(slice, index), borderRadius: '0 4px 4px 0' }} />
            </span>
            <span className="viz-bar-value">
              {formatMoneyCompact(slice.cents)}
              <small>{slice.n} app{slice.n === 1 ? '' : 's'}</small>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export async function Insights({ range }: { range: Range }) {
  const data = await lendingInsights(range);
  const { totals, buckets } = data;
  // A top to the axis that halves into a whole number — at least 4, even up to 20, then tens — so
  // the gridlines land on numbers people count in.
  const peak = Math.max(1, ...buckets.map((b) => b.applications));
  const maxBucket = peak <= 4 ? 4 : Math.ceil(peak / (peak <= 20 ? 2 : 10)) * (peak <= 20 ? 2 : 10);
  const ticks = [maxBucket, maxBucket / 2, 0];
  const decided = totals.disbursed + totals.declined;

  const RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', 'var(--brand)', 'var(--brand-deep)', '#b8c2bd', '#d5dcd8'];

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div className="insights-head">
        <div>
          <h2>What the website brought in</h2>
          <p>Applications, amounts asked for and what became of them. Figures are what customers requested, not what was lent.</p>
        </div>
        <span style={{ flex: 1 }} />
        <nav className="range-filter" aria-label="Period">
          {RANGES.map((r) => (
            <Link key={r.value} href={`/admin?range=${r.value}`} aria-current={r.value === range ? 'true' : undefined} scroll={false}>
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="insight-grid">
        <div className="panel wide">
          <div className="body">
            <div className="hero-stat">
              <div>
                <div className="figure">{totals.applications}</div>
                <div className="caption">applications · <Delta now={totals.applications} before={data.previous.applications} /></div>
              </div>
              <div className="side">
                <b>{formatMoneyCompact(totals.cents)}</b>
                <span className="caption">requested · <Delta now={totals.cents} before={data.previous.cents} money /></span>
              </div>
              <div className="side">
                <b>{formatMoneyCompact(totals.disbursedCents)}</b>
                <span className="caption">{totals.disbursed} disbursed{decided ? ` · ${pct(totals.disbursed, decided)}% of decided` : ''}</span>
              </div>
              <div className="side">
                <b>{data.responseHours === null ? '—' : data.responseHours < 1 ? `${Math.max(1, Math.round(data.responseHours * 60))} min` : `${data.responseHours.toFixed(1)} h`}</b>
                <span className="caption">median time to first response</span>
              </div>
              <div className="side">
                <b>{totals.enquiries}</b>
                <span className="caption">questions & callbacks</span>
              </div>
            </div>

            <ul className="viz-legend" aria-hidden="true">
              <li><span className="key key-rect" style={{ background: 'var(--brand)' }} /> Applications per {RANGES.find((r) => r.value === range)!.bucket}</li>
            </ul>
            <div className="viz-cols" role="img" aria-label={`Applications per period: ${buckets.map((b) => `${b.label} ${b.applications}`).join(', ')}`}>
              <div className="viz-cols-grid" aria-hidden="true">
                {ticks.map((tick, i) => <span key={i}><em>{tick}</em></span>)}
              </div>
              <div className="viz-cols-plot" style={{ height: 200 }}>
                {buckets.map((bucket) => (
                  <div className="viz-col" key={bucket.start} title={`${bucket.label}: ${bucket.applications} applications, ${formatMoneyCompact(bucket.cents)}`}>
                    <div className="viz-col-bar-zone">
                      <div className="viz-col-bar" style={{ height: `${(bucket.applications / maxBucket) * 100}%`, background: 'var(--brand)', minHeight: bucket.applications ? 3 : 0 }}>
                        {bucket.applications ? <span className="viz-col-value">{bucket.applications}</span> : null}
                      </div>
                    </div>
                    <div className="viz-col-label">
                      <span className="full">{bucket.label}</span>
                      {/* On a phone there is only room for the date of the month (or the month), and only every other one. */}
                      <span className="short">{RANGES.find((r) => r.value === range)!.bucket === 'week' ? new Date(bucket.start).getUTCDate() : bucket.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <details className="viz-table">
              <summary>Show as a table</summary>
              <div className="table-wrap">
                <table className="list">
                  <thead><tr><th>Period from</th><th className="num">Applications</th><th className="num">Requested</th><th className="num">Enquiries</th></tr></thead>
                  <tbody>
                    {buckets.map((b) => (
                      <tr key={b.start}><td>{b.label}</td><td className="num">{b.applications}</td><td className="num">{formatMoneyCompact(b.cents)}</td><td className="num">{b.enquiries}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>

        <div className="panel">
          <header><div><h2>Where applications stand</h2><p>By amount requested, in order from arrival to disbursement.</p></div></header>
          <div className="body">
            <Bars slices={data.funnel.filter((s) => s.n > 0)} total={totals.applications} tone={(slice) => RAMP[data.funnel.findIndex((f) => f.key === slice.key)] ?? 'var(--brand)'} />
          </div>
        </div>

        <div className="panel">
          <header><div><h2>By product</h2><p>Which finance people are asking for.</p></div></header>
          <div className="body">
            <Bars slices={data.products} total={totals.applications} tone={() => 'var(--brand)'} />
          </div>
        </div>

        <div className="panel wide">
          <header><div><h2>Where applicants are</h2><p>County in Kenya, or country for Kenyans abroad — useful for deciding the next satellite.</p></div></header>
          <div className="body">
            <Bars slices={data.counties} total={totals.applications} tone={() => '#2a78d6'} />
          </div>
        </div>
      </div>
    </section>
  );
}
