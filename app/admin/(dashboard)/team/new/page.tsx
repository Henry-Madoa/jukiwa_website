import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminBranches } from '@/lib/content.ts';
import { saveTeamMember } from '@/app/actions/content.ts';
import { ActionFormRedirect, Submit } from '../../ui.tsx';
import { TeamFields } from '../team-fields.tsx';

export const metadata = { title: 'New profile' };

export default async function NewTeamMemberPage() {
  const user = await requirePage('TEAM');
  if (!canAction(user, 'TEAM_CREATE')) return <div className="note note-warn">Your Permission Set does not allow you to add profiles.</div>;
  const branches = await adminBranches();
  return (
    <>
      <div className="crumb"><Link href="/admin/team">Leadership & team</Link><span aria-hidden="true">›</span>New</div>
      <ActionFormRedirect action={saveTeamMember} to="/admin/team/:id">
        <div style={{ display: 'grid', gap: 20 }}>
          <TeamFields branches={branches} />
          <div><Submit>Save profile</Submit></div>
        </div>
      </ActionFormRedirect>
    </>
  );
}
