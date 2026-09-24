import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { saveVacancy } from '@/app/actions/content.ts';
import { ActionFormRedirect, Submit } from '../../ui.tsx';
import { VacancyFields } from '../vacancy-fields.tsx';

export const metadata = { title: 'New vacancy' };

export default async function NewVacancyPage() {
  const user = await requirePage('CAREERS');
  if (!canAction(user, 'CAREERS_CREATE')) return <div className="note note-warn">Your Permission Set does not allow you to advertise vacancies.</div>;
  return (
    <>
      <div className="crumb"><Link href="/admin/careers">Careers</Link><span aria-hidden="true">›</span>New</div>
      <ActionFormRedirect action={saveVacancy} to="/admin/careers/:id">
        <div style={{ display: 'grid', gap: 20 }}>
          <VacancyFields />
          <div><Submit>Save vacancy</Submit></div>
        </div>
      </ActionFormRedirect>
    </>
  );
}
