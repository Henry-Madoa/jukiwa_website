'use client';

import Link from 'next/link';
import { useEffect, type MouseEvent } from 'react';
import type { Neighbours } from '@/lib/types.ts';

/*
 * Back and Next on a card, the way Business Central steps through records: move to the neighbouring
 * record without going back to the list. The order is the list's order, and "3 of 7" says where
 * you are. At either end the button stays in place, dimmed, so the bar never shifts under the mouse.
 *
 * A card is a form, so stepping away could quietly throw away an edit. Any typing in a form on the
 * page marks it unsaved, saving clears the mark, and Back or Next asks first while one is unsaved.
 */

/** `base` is the list's address — /admin/products — and each card lives at base/id. */
export function RecordNav({ base, around }: { base: string; around: Neighbours }) {
  useEffect(() => {
    const mark = (event: Event) => {
      const form = (event.target as HTMLElement).closest?.('form');
      if (form) form.dataset.dirty = 'true';
    };
    const clear = (event: Event) => { (event.target as HTMLFormElement).dataset.dirty = 'false'; };
    document.addEventListener('input', mark);
    document.addEventListener('submit', clear, true);
    return () => {
      document.removeEventListener('input', mark);
      document.removeEventListener('submit', clear, true);
    };
  }, []);

  const guard = (event: MouseEvent) => {
    if (document.querySelector('form[data-dirty="true"]') && !window.confirm('This card has changes that are not saved. Leave without saving them?')) {
      event.preventDefault();
    }
  };

  const step = (neighbour: Neighbours['previous'], text: string, rel: 'prev' | 'next') =>
    neighbour ? (
      <Link href={`${base}/${neighbour.id}`} className="btn btn-ghost btn-xs" rel={rel} title={neighbour.name} aria-label={`${text}: ${neighbour.name}`} onClick={guard}>
        {rel === 'prev' ? `← ${text}` : `${text} →`}
      </Link>
    ) : (
      <span className="btn btn-ghost btn-xs" aria-disabled="true">{rel === 'prev' ? `← ${text}` : `${text} →`}</span>
    );

  return (
    <nav className="record-nav" aria-label="Step through the records">
      {step(around.previous, 'Back', 'prev')}
      <span className="record-pos">{around.position} of {around.total}</span>
      {step(around.next, 'Next', 'next')}
    </nav>
  );
}
