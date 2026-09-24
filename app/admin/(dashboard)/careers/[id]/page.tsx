import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminVacancy } from '@/lib/content.ts';
import { saveVacancy, deleteVacancy } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';
import { VacancyFields } from '../vacancy-fields.tsx';

export const metadata = { title: 'Vacancy' };

export default async function VacancyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('CAREERS');
  const vacancy = await adminVacancy(Number(id));
  if (!vacancy) notFound();
  const mayEdit = canAction(user, 'CAREERS_UPDATE');

  return (
    <>
      <div className="crumb">
        <Link href="/admin/careers">Careers</Link><span aria-hidden="true">›</span>{vacancy.title}
        <span style={{ flex: 1 }} />
        {vacancy.is_published ? <Link href={`/careers/${vacancy.slug}`} target="_blank" className="btn btn-ghost btn-xs">View on the site ↗</Link> : null}
      </div>
      <ActionForm action={saveVacancy} success="Saved.">
        <input type="hidden" name="id" value={vacancy.id} />
        <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
          <VacancyFields vacancy={vacancy} />
          {mayEdit ? <div><Submit>Save vacancy</Submit></div> : null}
        </fieldset>
      </ActionForm>
      {canAction(user, 'CAREERS_DELETE') ? (
        <div className="panel">
          <header><h2>Delete this vacancy</h2></header>
          <div className="body">
            <ActionFormRedirect action={deleteVacancy} to="/admin/careers">
              <input type="hidden" name="id" value={vacancy.id} />
              <ConfirmSubmit message={`Delete the ${vacancy.title} vacancy?`} className="btn btn-danger">Delete vacancy</ConfirmSubmit>
            </ActionFormRedirect>
          </div>
        </div>
      ) : null}
    </>
  );
}
