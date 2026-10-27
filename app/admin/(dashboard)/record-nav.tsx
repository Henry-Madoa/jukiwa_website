'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { Neighbours } from '@/lib/types.ts';

/*
 * Previous and Next on a card, as Business Central has them: two small arrow buttons at the top
 * right of the card, pointing up and down because they move through the list the card was opened
 * from — up to the record above, down to the one below — and the same keys BC uses, Ctrl+Up arrow
 * and Ctrl+Down arrow. At either end the button greys out rather than disappearing.
 *
 * One difference from BC, on purpose: BC saves as you type, these cards save on Save. So any typing
 * in a form marks it unsaved, saving clears the mark, and stepping away while one is unsaved asks
 * first rather than quietly dropping the edit.
 */

const unsavedOk = (): boolean =>
  !document.querySelector('form[data-dirty="true"]') ||
  window.confirm('This card has changes that are not saved. Leave without saving them?');

function Arrow({ up }: { up: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {up ? <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /> : <path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" />}
    </svg>
  );
}

/** `base` is the list's address — /admin/products — and each card lives at base/id. */
export function RecordNav({ base, around }: { base: string; around: Neighbours }) {
  const router = useRouter();
  const previous = around.previous ? `${base}/${around.previous.id}` : null;
  const next = around.next ? `${base}/${around.next.id}` : null;

  useEffect(() => {
    const mark = (event: Event) => {
      const form = (event.target as HTMLElement).closest?.('form');
      if (form) form.dataset.dirty = 'true';
    };
    const clear = (event: Event) => { (event.target as HTMLFormElement).dataset.dirty = 'false'; };
    const keys = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      // In a long text box Ctrl+arrow moves between paragraphs; leave that alone.
      if ((event.target as HTMLElement).closest?.('textarea, [contenteditable="true"]')) return;
      const to = event.key === 'ArrowUp' ? previous : next;
      event.preventDefault();
      if (to && unsavedOk()) router.push(to);
    };
    document.addEventListener('input', mark);
    document.addEventListener('submit', clear, true);
    document.addEventListener('keydown', keys);
    return () => {
      document.removeEventListener('input', mark);
      document.removeEventListener('submit', clear, true);
      document.removeEventListener('keydown', keys);
    };
  }, [router, previous, next]);

  const step = (neighbour: Neighbours['previous'], up: boolean) => {
    const label = up ? 'Previous' : 'Next';
    const keysHint = up ? 'Ctrl+Up arrow' : 'Ctrl+Down arrow';
    return neighbour ? (
      <Link
        href={`${base}/${neighbour.id}`}
        className="record-step"
        rel={up ? 'prev' : 'next'}
        title={`${label} (${keysHint}) — ${neighbour.name}`}
        aria-label={`${label}: ${neighbour.name}`}
        onClick={(event) => { if (!unsavedOk()) event.preventDefault(); }}
      >
        <Arrow up={up} />
      </Link>
    ) : (
      <span className="record-step" aria-disabled="true" title={`${label} (${keysHint})`}>
        <Arrow up={up} />
      </span>
    );
  };

  return (
    <nav className="record-nav" aria-label={`Record ${around.position} of ${around.total}`}>
      {step(around.previous, true)}
      {step(around.next, false)}
    </nav>
  );
}
