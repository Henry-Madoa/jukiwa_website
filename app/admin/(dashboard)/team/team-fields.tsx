import { TEAM_CATEGORIES, type Branch, type TeamMember } from '@/lib/types.ts';
import { ImageField } from '../ui.tsx';

export function TeamFields({ member, branches }: { member?: TeamMember; branches: Branch[] }) {
  return (
    <div className="panel">
      <header><div><h2>{member ? member.name : 'New profile'}</h2><p>Shown on the About page. A face and a name are what make a lender trustworthy.</p></div></header>
      <div className="body">
        <div className="grid-3">
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" required maxLength={120} defaultValue={member?.name} />
          </div>
          <div className="field">
            <label htmlFor="role_title">Job title</label>
            <input id="role_title" name="role_title" type="text" required maxLength={120} defaultValue={member?.role_title} placeholder="Credit Manager" />
          </div>
          <div className="field">
            <label htmlFor="category">Group</label>
            <select id="category" name="category" defaultValue={member?.category ?? 'MANAGEMENT'}>
              {TEAM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="bio">A short biography</label>
          <textarea id="bio" name="bio" maxLength={3000} defaultValue={member?.bio ?? ''} placeholder="Two or three sentences: what they do here, and what they did before." />
        </div>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="email">Email (optional)</label>
            <input id="email" name="email" type="email" maxLength={160} defaultValue={member?.email ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="linkedin_url">LinkedIn (optional)</label>
            <input id="linkedin_url" name="linkedin_url" type="url" maxLength={600} defaultValue={member?.linkedin_url ?? ''} placeholder="https://www.linkedin.com/in/…" />
          </div>
          <div className="field">
            <label htmlFor="branch_id">Branch</label>
            <select id="branch_id" name="branch_id" defaultValue={String(member?.branch_id ?? '')}>
              <option value="">Group-wide</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-2">
          <ImageField name="photo" label="Portrait" current={member?.photo_url} hint={member?.photo_url ? 'Leave empty to keep the current portrait. Square works best.' : 'A square portrait on a plain background works best.'} />
          <div style={{ display: 'grid', alignContent: 'start', gap: 12 }}>
            <div className="field">
              <label htmlFor="sort">Order</label>
              <input id="sort" name="sort" type="number" min={0} max={9999} defaultValue={member?.sort ?? 0} />
            </div>
            <div className="check-row">
              <input id="is_published" name="is_published" type="checkbox" value="1" defaultChecked={member?.is_published ?? true} />
              <label htmlFor="is_published">Show on the website</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
