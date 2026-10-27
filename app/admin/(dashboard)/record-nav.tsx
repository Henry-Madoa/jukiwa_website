'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { Neighbours } from '@/lib/types.ts';

/*
 * Previous and Next on a card, as Business Central has them: two large round buttons with a chevron,
 * floating halfway down the screen on the card's left and right edges and staying put while the
 * card scrolls — with BC's keys, Ctrl+Up arrow and Ctrl+Down arrow. At either end the button greys
 * out rather than disappearing. On a phone they move to the bottom corners, clear of the fields.
 *
 * One difference from BC, on purpose: BC saves as you type, these cards save on Save. So any typing
 * in a form marks it unsaved, saving clears the mark, and stepping away while one is unsaved asks
 * first rather than quietly dropping the edit.
 */

const unsavedOk = (): boolean =>
  !document.querySelector('form[data-dirty="true"]') ||
  window.confirm('This card has changes that are not saved. Leave without saving them?');

function Chevron({ back }: { back: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {back ? <path d="M14.5 5.5 8 12l6.5 6.5" /> : <path d="M9.5 5.5 16 12l-6.5 6.5" />}
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

  const step = (neighbour: Neighbours['previous'], back: boolean) => {
    const label = back ? 'Previous' : 'Next';
    const keysHint = back ? 'Ctrl+Up arrow' : 'Ctrl+Down arrow';
    const className = `record-step ${back ? 'record-prev' : 'record-next'}`;
    return neighbour ? (
      <Link
        href={`${base}/${neighbour.id}`}
        className={className}
        rel={back ? 'prev' : 'next'}
        title={`${label} (${keysHint}) — ${neighbour.name}`}
        aria-label={`${label}: ${neighbour.name}`}
        onClick={(event) => { if (!unsavedOk()) event.preventDefault(); }}
      >
        <Chevron back={back} />
      </Link>
    ) : (
      <span className={className} aria-disabled="true" title={`${label} (${keysHint})`}>
        <Chevron back={back} />
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
