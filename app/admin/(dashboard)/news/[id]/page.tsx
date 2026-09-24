import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePage } from '@/lib/auth.ts';
import { canAction } from '@/lib/permissions.ts';
import { adminPost } from '@/lib/content.ts';
import { savePost, deletePost } from '@/app/actions/content.ts';
import { ActionForm, ActionFormRedirect, ConfirmSubmit, Submit } from '../../ui.tsx';
import { PostFields } from '../post-fields.tsx';

export const metadata = { title: 'Article' };

export default async function PostCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePage('NEWS');
  const post = await adminPost(Number(id));
  if (!post) notFound();
  const mayEdit = canAction(user, 'NEWS_UPDATE');

  return (
    <>
      <div className="crumb">
        <Link href="/admin/news">Insights & news</Link><span aria-hidden="true">›</span>{post.title}
        <span style={{ flex: 1 }} />
        {post.is_published ? <Link href={`/insights/${post.slug}`} target="_blank" className="btn btn-ghost btn-xs">View on the site ↗</Link> : null}
      </div>
      <ActionForm action={savePost} success="Saved.">
        <input type="hidden" name="id" value={post.id} />
        <fieldset disabled={!mayEdit} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 20 }}>
          <PostFields post={post} />
          {mayEdit ? <div><Submit>Save article</Submit></div> : null}
        </fieldset>
      </ActionForm>
      {canAction(user, 'NEWS_DELETE') ? (
        <div className="panel">
          <header><h2>Delete this article</h2></header>
          <div className="body">
            <ActionFormRedirect action={deletePost} to="/admin/news">
              <input type="hidden" name="id" value={post.id} />
              <ConfirmSubmit message={`Delete "${post.title}"?`} className="btn btn-danger">Delete article</ConfirmSubmit>
            </ActionFormRedirect>
          </div>
        </div>
      ) : null}
    </>
  );
}
