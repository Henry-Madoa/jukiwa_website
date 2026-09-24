import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminBranches, adminTeamMember } from '@/lib/content.ts';
import { saveTeamMember, deleteTeamMember } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';
import { TeamFields } from '../team-fields.tsx';

export const metadata = { title: 'Profile' };

export default async function TeamCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('TEAM');
  const [member, branches] = await Promise.all([adminTeamMember(Number(id)), adminBranches()]);
  if (!member) notFound();
  const mayEdit = canAction(user, 'TEAM_UPDATE');

  return (
    <>
      <div className="crumb"><Link href="/admin/team">Leadership & team</Link><span aria-hidden="true">›</span>{member.name}</div>
      <ActionForm action={saveTeamMember} success="Saved.">
        <input type="hidden" name="id" value={member.id} />
        <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
          <TeamFields member={member} branches={branches} />
          {mayEdit ? <div><Submit>Save profile</Submit></div> : null}
        </fieldset>
      </ActionForm>
      {canAction(user, 'TEAM_DELETE') ? (
        <div className="panel">
          <header><h2>Remove this profile</h2></header>
          <div className="body">
            <p className="help" style={{ margin: 0 }}>Hiding it keeps it for later; deleting removes it for good.</p>
            <ActionFormRedirect action={deleteTeamMember} to="/admin/team">
              <input type="hidden" name="id" value={member.id} />
              <ConfirmSubmit message={`Delete the profile for ${member.name}?`} className="btn btn-danger">Delete profile</ConfirmSubmit>
            </ActionFormRedirect>
          </div>
        </div>
      ) : null}
    </>
  );
}
