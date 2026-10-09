'use client';

import { useEffect, useRef } from 'react';

/*
 * The picture behind a page banner, chosen at random from the hero background library.
 *
 * The pages are prerendered, so a choice made on the server would be frozen into the HTML until
 * the next change in the admin. The choice is made here instead, in the visitor's browser, on
 * every visit. Until it loads the banner shows its green backdrop, and the picture fades in over
 * it — the server and the browser render the same empty <img>, so there is nothing to mismatch.
 */
export function HeroPhoto({ urls }: { urls: string[] }) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || !urls.length) return;
    img.addEventListener('load', () => { img.dataset.loaded = 'true'; }, { once: true });
    img.src = urls[Math.floor(Math.random() * urls.length)]!;
  }, [urls]);

  if (!urls.length) return null;
  return <img ref={ref} className="hero-photo" alt="" decoding="async" />;
}
