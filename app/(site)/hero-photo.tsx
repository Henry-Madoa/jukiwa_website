'use client';

import { useEffect, useState } from 'react';

export function HeroPhoto({ urls }: { urls: string[] }) {
  const [slide, setSlide] = useState({ current: urls[0], previous: undefined as string | undefined });

  useEffect(() => {
    if (urls.length < 2) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let pending = false;
    let stopped = false;

    const timer = window.setInterval(async () => {
      if (motion.matches || document.hidden || pending) return;

      index = (index + 1) % urls.length;
      const next = urls[index]!;
      const image = new Image();
      pending = true;
      image.src = next;
      try {
        await image.decode();
        if (!stopped && !motion.matches && !document.hidden) {
          setSlide(({ current }) => current === next ? { current, previous: undefined } : { current: next, previous: current });
        }
      } catch {
        // Keep the current photo if the next one fails to load.
      } finally {
        pending = false;
      }
    }, 6500);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [urls]);

  return (
    <>
      {slide.previous && <img key={slide.previous} className="hero-photo" src={slide.previous} alt="" />}
      {slide.current && <img key={slide.current} className="hero-photo hero-photo-current" src={slide.current} alt="" />}
    </>
  );
}
