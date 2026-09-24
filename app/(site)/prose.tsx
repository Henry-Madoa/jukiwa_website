/*
 * Plain text, as the admin types it, rendered as an article.
 *
 * Deliberately not Markdown and not HTML: the people writing are credit officers and marketing
 * staff, not developers, and nothing typed into the admin should be able to inject markup into a
 * public page. The two conventions are the ones the admin's help text describes — a blank line
 * starts a paragraph, and a short line on its own with no closing punctuation is a sub-heading.
 */

const isHeading = (block: string): boolean =>
  !block.includes('\n') && block.length <= 70 && !/[.!?:;,”"')]$/.test(block.trim()) && !/^\d+\./.test(block.trim());

export function Prose({ text, className = 'prose' }: { text: string | null | undefined; className?: string }) {
  const blocks = String(text ?? '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (index > 0 && isHeading(block)) return <h3 key={index}>{block}</h3>;
        // A heading on the first line of a block, then its text — how the vacancy adverts are written.
        const [head, ...rest] = block.split('\n');
        if (rest.length && head && isHeading(head)) {
          return (
            <div key={index}>
              <h3>{head}</h3>
              <p style={{ marginTop: '0.4em' }}>{rest.join(' ')}</p>
            </div>
          );
        }
        return <p key={index}>{block.split('\n').join(' ')}</p>;
      })}
    </div>
  );
}

/** Structured data for search engines. JSON.stringify escapes everything a string could carry. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
