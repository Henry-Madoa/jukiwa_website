import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { getSettings } from '@/lib/site.ts';
import { formatDateTime } from '@/lib/format.ts';
import { saveSettings } from '@/app/actions/content.ts';
import { ActionForm, ImageField, Submit } from '../ui.tsx';

export const metadata = { title: 'Company profile & theme' };

/**
 * The company's own record: who it is, how to reach it, what it is licensed as, and the three
 * colours the whole site — public pages and this admin — is painted in.
 *
 * One form, one save. It is a record somebody edits twice a year, and it should read top to
 * bottom like the company's letterhead rather than be spread over tabs.
 */
export default async function SettingsPage() {
  const user = await requirePage('SETTINGS');
  const c = await getSettings();
  const mayEdit = canAction(user, 'SETTINGS_MANAGE');

  const text = (name: keyof typeof c, label: string, opts: { help?: string; placeholder?: string; type?: string; max?: number } = {}) => (
    <div className="field">
      <label htmlFor={String(name)}>{label}</label>
      <input id={String(name)} name={String(name)} type={opts.type ?? 'text'} maxLength={opts.max ?? 300} defaultValue={String(c[name] ?? '')} placeholder={opts.placeholder} />
      {opts.help ? <p className="help">{opts.help}</p> : null}
    </div>
  );
  const prose = (name: keyof typeof c, label: string, opts: { help?: string; tall?: boolean; max?: number } = {}) => (
    <div className="field">
      <label htmlFor={String(name)}>{label}</label>
      <textarea id={String(name)} name={String(name)} className={opts.tall ? 'tall' : undefined} maxLength={opts.max ?? 6000} defaultValue={String(c[name] ?? '')} />
      {opts.help ? <p className="help">{opts.help}</p> : null}
    </div>
  );

  return (
    <ActionForm action={saveSettings} success="Saved. The website has the changes already.">
      <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
        <div className="panel">
          <header>
            <div>
              <h2>Company profile & theme</h2>
              <p>{c.updated_at ? `Last changed ${formatDateTime(c.updated_at)}.` : 'Never changed.'} Everything here appears on the public website.</p>
            </div>
            <span style={{ flex: 1 }} />
            {mayEdit ? <Submit>Save everything</Submit> : null}
          </header>
          <div className="body">
            <div className="grid-3">
              {text('name', 'Legal name', { max: 160 })}
              {text('short_name', 'Short name', { max: 60, help: 'Used in the header and page titles.' })}
              {text('founded_year', 'Founded', { max: 10 })}
            </div>
            {text('tagline', 'Tagline', { max: 200, placeholder: 'Property finance from the people who manage property.' })}
          </div>
        </div>

        <div className="panel">
          <header><div><h2>The home page</h2><p>The first thing every visitor reads. Say what you lend, to whom, and why you.</p></div></header>
          <div className="body">
            {text('hero_kicker', 'The small line above the headline', { max: 120, placeholder: 'Jukiwa Credit Limited' })}
            {text('hero_headline', 'Headline', { max: 160, placeholder: 'Where your dreams find funding.' })}
            {prose('hero_body', 'The sentence under it', { max: 600 })}
            <div className="grid-2">
              {text('stat_years', 'Years in property', { max: 20, placeholder: '24+' })}
              {text('stat_counties', 'Counties served', { max: 20, placeholder: '47' })}
            </div>
            <div className="grid-3">
              {text('stat_turnaround', 'Callback time', { max: 30, placeholder: '30 min' })}
              {text('indemnity_cover', 'Indemnity cover', { max: 60, placeholder: 'KES 500M' })}
              {text('stat_clients', 'Clients served (optional)', { max: 20, help: 'Leave empty until you have a number you can stand behind.' })}
            </div>
          </div>
        </div>

        <div className="panel">
          <header><div><h2>About the company</h2></div></header>
          <div className="body">
            {prose('about_intro', 'Introduction', { max: 600, help: 'One or two sentences — also used by search engines and social previews.' })}
            {prose('about_story', 'Our story', { tall: true, help: 'The About page. Leave a blank line between paragraphs.' })}
            <div className="grid-2">
              {prose('mission', 'Mission', { max: 800 })}
              {prose('vision', 'Vision', { max: 800 })}
            </div>
          </div>
        </div>

        <div className="panel">
          <header><div><h2>Registration & compliance</h2><p>Shown in the footer of every page. Borrowers look for it; be exact.</p></div></header>
          <div className="body">
            <div className="grid-2">
              {text('registration_no', 'Company registration number', { max: 80 })}
              {text('licence_no', 'Licence', { max: 120, placeholder: 'e.g. Licensed by the Central Bank of Kenya as a Non-Deposit Taking Credit Provider, No. …' })}
            </div>
            {text('licence_note', 'Compliance line (optional)', { max: 400, help: 'Anything else the footer must say — a regulator, a data-protection registration.' })}
          </div>
        </div>

        <div className="panel">
          <header><div><h2>Contact & payments</h2></div></header>
          <div className="body">
            <div className="grid-3">
              {text('phone_primary', 'Main phone', { type: 'tel', max: 30 })}
              {text('phone_secondary', 'Second phone', { type: 'tel', max: 30 })}
              {text('whatsapp_number', 'WhatsApp number', { type: 'tel', max: 30, help: 'The floating button on every page.' })}
            </div>
            <div className="grid-3">
              {text('email', 'General email', { type: 'email', max: 160 })}
              {text('loans_email', 'Loans email', { type: 'email', max: 160 })}
              {text('office_hours', 'Office hours', { max: 200 })}
            </div>
            <div className="grid-2">
              {prose('physical_address', 'Head office address', { max: 300 })}
              <div style={{ display: 'grid', gap: 16 }}>
                {text('postal_address', 'Postal address', { max: 120 })}
                <div className="grid-2">
                  {text('city', 'City', { max: 80 })}
                  {text('country', 'Country', { max: 80 })}
                </div>
              </div>
            </div>
            {text('map_embed_url', 'Google Maps embed link', { type: 'url', max: 600, help: 'Share → Embed a map → the address inside src="…".' })}
            <div className="grid-3">
              {text('paybill_no', 'M-Pesa Paybill', { max: 20 })}
              {text('paybill_note', 'Paybill account instruction', { max: 200, placeholder: 'Account number: your loan number' })}
              {text('portal_url', 'Customer portal link (optional)', { type: 'url', max: 600 })}
            </div>
            {prose('bank_details', 'Bank details (optional)', { max: 600 })}
            <div className="grid-2">
              {text('diaspora_phone', 'Diaspora line', { type: 'tel', max: 30 })}
              {text('diaspora_email', 'Diaspora email', { type: 'email', max: 160 })}
            </div>
          </div>
        </div>

        <div className="panel">
          <header><div><h2>Social media</h2><p>Full links. Leave any empty to hide its icon.</p></div></header>
          <div className="body">
            <div className="grid-3">
              {text('facebook_url', 'Facebook', { type: 'url', max: 600 })}
              {text('instagram_url', 'Instagram', { type: 'url', max: 600 })}
              {text('x_url', 'X (Twitter)', { type: 'url', max: 600 })}
            </div>
            <div className="grid-3">
              {text('youtube_url', 'YouTube', { type: 'url', max: 600 })}
              {text('tiktok_url', 'TikTok', { type: 'url', max: 600 })}
              {text('linkedin_url', 'LinkedIn', { type: 'url', max: 600 })}
            </div>
          </div>
        </div>

        <div className="panel">
          <header><div><h2>Brand</h2><p>Three colours paint the whole site and this admin. Keep the main colour dark enough for white text on it.</p></div></header>
          <div className="body">
            <div className="grid-3">
              <div className="field">
                <label htmlFor="brand_primary">Main colour</label>
                <input id="brand_primary" name="brand_primary" type="color" defaultValue={c.brand_primary} />
                <p className="help">Buttons, links, the logo. Jukiwa green is #1e5c35.</p>
              </div>
              <div className="field">
                <label htmlFor="brand_accent">Accent</label>
                <input id="brand_accent" name="brand_accent" type="color" defaultValue={c.brand_accent} />
                <p className="help">Highlights and the roof in the logo.</p>
              </div>
              <div className="field">
                <label htmlFor="brand_deep">Deep colour</label>
                <input id="brand_deep" name="brand_deep" type="color" defaultValue={c.brand_deep} />
                <p className="help">Dark sections, the footer and the admin sidebar.</p>
              </div>
            </div>
            <div className="grid-2">
              <div>
                <ImageField name="logo" label="Logo (optional)" current={c.logo_url} hint="Replaces the Jukiwa Credit logo everywhere. Leave empty to keep it. A PNG with a transparent background works best." />
                {c.logo_url ? (
                  <div className="check-row"><input id="remove_logo" name="remove_logo" type="checkbox" value="1" /><label htmlFor="remove_logo">Remove the uploaded logo and use the drawn mark</label></div>
                ) : null}
              </div>
              <div>
                <ImageField name="hero_image" label="Home page background picture" current={c.hero_image_url} hint="The photograph behind the home page headline, also used when a page is shared on WhatsApp or Facebook. A wide landscape picture, at least 2000px across." />
                {c.hero_image_url ? (
                  <div className="check-row"><input id="remove_hero" name="remove_hero" type="checkbox" value="1" /><label htmlFor="remove_hero">Remove it</label></div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {mayEdit ? <div><Submit>Save everything</Submit></div> : <div className="note note-info">Your Permission Set lets you see the company profile but not change it.</div>}
      </fieldset>
    </ActionForm>
  );
}
