import { POST_CATEGORIES, type Post } from '@/lib/types.ts';
import { ImageField } from '../ui.tsx';

/** A `datetime-local` value from a stored ISO stamp — the admin works in UTC, as the site stores it. */
const local = (iso: string | null | undefined): string => (iso ? iso.slice(0, 16) : new Date().toISOString().slice(0, 16));

export function PostFields({ post }: { post?: Post }) {
  return (
    <div className="panel">
      <header><div><h2>{post ? 'The article' : 'New article'}</h2><p>Guides and insights are what people search for — write them for the landlord reading on a phone.</p></div></header>
      <div className="body">
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" type="text" required maxLength={200} defaultValue={post?.title} placeholder="How a rent advance works — a worked example" />
        </div>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="category">Kind</label>
            <select id="category" name="category" defaultValue={post?.category ?? 'GUIDE'}>
              {POST_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="published_at">Publication date (UTC)</label>
            <input id="published_at" name="published_at" type="datetime-local" defaultValue={local(post?.published_at)} />
            <p className="help">A date in the future schedules it.</p>
          </div>
          <div style={{ display: 'grid', alignContent: 'end' }}>
            <div className="check-row">
              <input id="is_published" name="is_published" type="checkbox" value="1" defaultChecked={post?.is_published ?? false} />
              <label htmlFor="is_published">Published</label>
            </div>
            <div className="check-row">
              <input id="is_pinned" name="is_pinned" type="checkbox" value="1" defaultChecked={post?.is_pinned ?? false} />
              <label htmlFor="is_pinned">Pinned to the top</label>
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="excerpt">Summary</label>
          <textarea id="excerpt" name="excerpt" maxLength={400} defaultValue={post?.excerpt ?? ''} style={{ minHeight: 70 }} />
          <p className="help">One or two sentences, shown on cards and in search results.</p>
        </div>
        <div className="field">
          <label htmlFor="body">Article</label>
          <textarea id="body" name="body" className="tall" required maxLength={40000} defaultValue={post?.body ?? ''} />
          <p className="help">Leave a blank line between paragraphs. A line on its own that ends without a full stop becomes a sub-heading.</p>
        </div>
        <ImageField name="image" label="Cover picture" current={post?.image_url} />
      </div>
    </div>
  );
}
