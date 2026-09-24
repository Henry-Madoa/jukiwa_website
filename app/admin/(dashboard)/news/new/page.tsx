import Link from 'next/link';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { savePost } from '@/app/actions/content.ts';
import { ActionFormRedirect, Submit } from '../../ui.tsx';
import { PostFields } from '../post-fields.tsx';

export const metadata = { title: 'New article' };

export default async function NewPostPage() {
  const user = await requirePage('NEWS');
  if (!canAction(user, 'NEWS_CREATE')) return <div className="note note-warn">Your Permission Set does not allow you to write articles.</div>;
  return (
    <>
      <div className="crumb"><Link href="/admin/news">Insights & news</Link><span aria-hidden="true">›</span>New</div>
      <ActionFormRedirect action={savePost} to="/admin/news/:id">
        <div style={{ display: 'grid', gap: 20 }}>
          <PostFields />
          <div><Submit>Save article</Submit></div>
        </div>
      </ActionFormRedirect>
    </>
  );
}
