import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminBranches } from '@/lib/content.ts';
import { BRANCH_KINDS, type Branch } from '@/lib/types.ts';
import { saveBranch, deleteBranch } from '@/app/actions/content.ts';
import { ActionForm, ConfirmSubmit, Submit } from '../ui.tsx';

export const metadata = { title: 'Branches & offices' };

/**
 * Where a customer can walk in — add a new branch or satellite the day it opens.
 *
 * Offices are a handful of fields each, so they are edited in place, one card per office.
 */
function BranchFields({ branch, prefix }: { branch?: Branch; prefix: string }) {
  const f = (name: string) => `${prefix}-${name}`;
  return (
    <>
      <div className="grid-3">
        <div className="field">
          <label htmlFor={f('name')}>Name</label>
          <input id={f('name')} name="name" type="text" required maxLength={120} defaultValue={branch?.name} placeholder="Thika Satellite" />
        </div>
        <div className="field">
          <label htmlFor={f('kind')}>Kind of office</label>
          <select id={f('kind')} name="kind" defaultValue={branch?.kind ?? 'SATELLITE'}>
            {BRANCH_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={f('manager')}>Branch manager</label>
          <input id={f('manager')} name="manager" type="text" maxLength={120} defaultValue={branch?.manager ?? ''} />
        </div>
      </div>
      <div className="grid-3">
        <div className="field">
          <label htmlFor={f('town')}>Town</label>
          <input id={f('town')} name="town" type="text" maxLength={80} defaultValue={branch?.town ?? ''} />
        </div>
        <div className="field">
          <label htmlFor={f('county')}>County</label>
          <input id={f('county')} name="county" type="text" maxLength={80} defaultValue={branch?.county ?? ''} />
        </div>
        <div className="field">
          <label htmlFor={f('country')}>Country</label>
          <input id={f('country')} name="country" type="text" maxLength={80} defaultValue={branch?.country ?? 'Kenya'} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor={f('address')}>Address</label>
          <textarea id={f('address')} name="address" maxLength={400} defaultValue={branch?.address ?? ''} style={{ minHeight: 80 }} placeholder="Building, floor, street — what a taxi driver needs." />
        </div>
        <div className="field">
          <label htmlFor={f('note')}>A line for visitors</label>
          <textarea id={f('note')} name="note" maxLength={400} defaultValue={branch?.note ?? ''} style={{ minHeight: 80 }} placeholder="Opposite the county offices, first floor." />
        </div>
      </div>
      <div className="grid-3">
        <div className="field">
          <label htmlFor={f('phone')}>Phone</label>
          <input id={f('phone')} name="phone" type="tel" maxLength={30} defaultValue={branch?.phone ?? ''} />
        </div>
        <div className="field">
          <label htmlFor={f('email')}>Email</label>
          <input id={f('email')} name="email" type="email" maxLength={160} defaultValue={branch?.email ?? ''} />
        </div>
        <div className="field">
          <label htmlFor={f('hours')}>Opening hours</label>
          <input id={f('hours')} name="hours" type="text" maxLength={200} defaultValue={branch?.hours ?? ''} />
        </div>
      </div>
      <div className="grid-3">
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label htmlFor={f('map_url')}>Google Maps embed link</label>
          <input id={f('map_url')} name="map_url" type="url" maxLength={600} defaultValue={branch?.map_url ?? ''} placeholder="https://www.google.com/maps/embed?pb=…" />
          <p className="help">In Google Maps: Share → Embed a map → copy the address inside src=&quot;…&quot;.</p>
        </div>
        <div style={{ display: 'grid', alignContent: 'end', gap: 8 }}>
          <div className="field">
            <label htmlFor={f('sort')}>Order</label>
            <input id={f('sort')} name="sort" type="number" min={0} max={9999} defaultValue={branch?.sort ?? 0} />
          </div>
          <div className="check-row">
            <input id={f('pub')} name="is_published" type="checkbox" value="1" defaultChecked={branch?.is_published ?? true} />
            <label htmlFor={f('pub')}>Show on the website</label>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function BranchesPage() {
  const user = await requirePage('BRANCHES');
  const branches = await adminBranches();
  const mayEdit = canAction(user, 'BRANCHES_UPDATE');
  const mayDelete = canAction(user, 'BRANCHES_DELETE');

  return (
    <>
      <div className="panel">
        <header>
          <div>
            <h2>Branches & offices</h2>
            <p>{branches.filter((b) => b.is_published).length} shown on the website.</p>
          </div>
        </header>
      </div>

      {branches.map((branch) => (
        <div className="panel" key={branch.id}>
          <header>
            <div>
              <h2>{branch.name}</h2>
              <p>{BRANCH_KINDS.find((k) => k.value === branch.kind)?.label} · {[branch.town, branch.county, branch.country].filter(Boolean).join(', ')}</p>
            </div>
          </header>
          <div className="body">
            <ActionForm action={saveBranch} success="Saved.">
              <input type="hidden" name="id" value={branch.id} />
              <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
                <BranchFields branch={branch} prefix={`b${branch.id}`} />
                {mayEdit ? <div><Submit className="btn btn-ghost">Save office</Submit></div> : null}
              </fieldset>
            </ActionForm>
            {mayDelete ? (
              <ActionForm action={deleteBranch}>
                <input type="hidden" name="id" value={branch.id} />
                <ConfirmSubmit message={`Delete ${branch.name}? Applications that chose it keep their record.`}>Delete office</ConfirmSubmit>
              </ActionForm>
            ) : null}
          </div>
        </div>
      ))}

      {canAction(user, 'BRANCHES_CREATE') ? (
        <ActionForm action={saveBranch} success="Office added.">
          <div className="panel">
            <header>
              <div><h2>Add an office</h2><p>A new branch or satellite we have opened.</p></div>
              <span style={{ flex: 1 }} />
              <Submit>Add office</Submit>
            </header>
            <div className="body"><BranchFields prefix="new" /></div>
          </div>
        </ActionForm>
      ) : null}
    </>
  );
}
