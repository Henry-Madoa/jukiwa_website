import { AUDIENCES, CALC_MODES, type Product } from '@/lib/types.ts';
import { ImageField } from '../ui.tsx';

/*
 * The fields of a loan product, shared by the "new" form and the product's own card.
 *
 * Amounts are typed in shillings and rates as percentages, because that is how a Credit Manager
 * thinks about them; lib/content.ts turns them into cents and basis points on the way in.
 */

const shillings = (cents: number | undefined): string => (cents ? String(cents / 100) : '');
const percent = (bp: number | undefined): string => (bp !== undefined ? String(bp / 100) : '');

export function ProductFields({ product }: { product?: Product }) {
  return (
    <>
      <div className="panel">
        <header><div><h2>What it is</h2><p>How the product appears on the website.</p></div></header>
        <div className="body">
          <div className="grid-3">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required maxLength={120} defaultValue={product?.name} placeholder="Rent Advance" />
            </div>
            <div className="field">
              <label htmlFor="icon">Icon</label>
              <input id="icon" name="icon" type="text" maxLength={8} defaultValue={product?.icon ?? ''} placeholder="🏢" />
              <p className="help">One emoji, shown on the product card.</p>
            </div>
            <div className="field">
              <label htmlFor="audience">Who it is for</label>
              <select id="audience" name="audience" defaultValue={product?.audience ?? 'LANDLORD'}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="tagline">Headline</label>
            <input id="tagline" name="tagline" type="text" maxLength={160} defaultValue={product?.tagline ?? ''} placeholder="Up to 10× your monthly rent, paid to you now." />
          </div>
          <div className="field">
            <label htmlFor="summary">Summary</label>
            <textarea id="summary" name="summary" maxLength={600} defaultValue={product?.summary ?? ''} style={{ minHeight: 80 }} />
            <p className="help">Two sentences for the product card: who it is for and what it does.</p>
          </div>
          <div className="field">
            <label htmlFor="body">Full description</label>
            <textarea id="body" name="body" className="tall" maxLength={12000} defaultValue={product?.body ?? ''} />
            <p className="help">Shown on the product&rsquo;s own page. Leave a blank line between paragraphs. A worked example sells better than an adjective.</p>
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="features">Features — one per line</label>
              <textarea id="features" name="features" maxLength={3000} defaultValue={product?.features ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="requirements">What to bring — one per line</label>
              <textarea id="requirements" name="requirements" maxLength={3000} defaultValue={product?.requirements ?? ''} />
            </div>
          </div>
          <ImageField name="image" label="Picture (optional)" current={product?.image_url} />
        </div>
      </div>

      <div className="panel">
        <header>
          <div>
            <h2>Indicative terms</h2>
            <p>These drive every calculator on the site the moment you save. The customer&rsquo;s actual rate is set in their offer letter.</p>
          </div>
        </header>
        <div className="body">
          <div className="grid-3">
            <div className="field">
              <label htmlFor="calc_mode">How repayments are worked out</label>
              <select id="calc_mode" name="calc_mode" defaultValue={product?.calc_mode ?? 'REDUCING'}>
                {CALC_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <p className="help">{CALC_MODES.map((m) => `${m.label}: ${m.hint.toLowerCase()}.`).join(' ')}</p>
            </div>
            <div className="field">
              <label htmlFor="rate_pm">Monthly rate (%)</label>
              <input id="rate_pm" name="rate_pm" type="number" step="0.01" min={0} max={20} required defaultValue={percent(product?.rate_pm_bp) || '1.5'} />
              <p className="help">1.5 means 1.5% a month.</p>
            </div>
            <div className="field">
              <label htmlFor="fee">One-off fee (% of amount)</label>
              <input id="fee" name="fee" type="number" step="0.01" min={0} max={20} required defaultValue={percent(product?.fee_bp) || '2'} />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="min_amount">Smallest amount (KES)</label>
              <input id="min_amount" name="min_amount" type="number" min={0} step={1000} required defaultValue={shillings(product?.min_amount_cents) || '100000'} />
            </div>
            <div className="field">
              <label htmlFor="max_amount">Largest amount (KES)</label>
              <input id="max_amount" name="max_amount" type="number" min={1000} step={1000} required defaultValue={shillings(product?.max_amount_cents) || '10000000'} />
            </div>
            <div className="field">
              <label htmlFor="rent_multiple">Rent multiple (rent advances only)</label>
              <input id="rent_multiple" name="rent_multiple" type="number" min={0} max={50} defaultValue={product?.rent_multiple_max ?? 0} />
              <p className="help">10 means up to ten months&rsquo; rent may be advanced.</p>
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label htmlFor="min_term">Shortest term (months)</label>
              <input id="min_term" name="min_term" type="number" min={1} max={360} required defaultValue={product?.min_term_months ?? 6} />
            </div>
            <div className="field">
              <label htmlFor="max_term">Longest term (months)</label>
              <input id="max_term" name="max_term" type="number" min={1} max={360} required defaultValue={product?.max_term_months ?? 24} />
            </div>
            <div className="field">
              <label htmlFor="sort">Order on the site</label>
              <input id="sort" name="sort" type="number" min={0} max={9999} defaultValue={product?.sort ?? 0} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div className="check-row">
              <input id="is_published" name="is_published" type="checkbox" value="1" defaultChecked={product?.is_published ?? true} />
              <label htmlFor="is_published">Published — offered on the website<span className="help">Unpublish to withdraw it without losing its applications.</span></label>
            </div>
            <div className="check-row">
              <input id="is_featured" name="is_featured" type="checkbox" value="1" defaultChecked={product?.is_featured ?? false} />
              <label htmlFor="is_featured">Featured on the home page</label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
