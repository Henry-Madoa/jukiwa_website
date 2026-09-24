'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons.tsx';

/*
 * The header's moving parts: the shadow that appears once the page scrolls, the mega-menus, and
 * the full-screen drawer on a phone.
 *
 * Everything the menus contain is decided on the server and passed in — this component knows
 * nothing about products or branches, only about opening and closing. Menus open on click as well
 * as hover, so they work with a keyboard and on a tablet, and Escape closes whatever is open.
 */

export interface MenuLink { href: string; label: string; hint?: string | null; icon?: string | null }
export interface MenuGroup { label: string; href: string; items: MenuLink[]; wide?: boolean; foot?: { text: string; href: string; label: string } }

export function SiteHeader({
  brand,
  groups,
  links,
  phone,
  phoneHref,
}: {
  brand: ReactNode;
  groups: MenuGroup[];
  links: MenuLink[];
  phone: string | null;
  phoneHref: string | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  /* Navigating closes everything — adjusted during render, React's recipe for resetting on a prop. */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setDrawer(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setDrawer(false); } };
    const onClick = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.nav-item')) setOpen(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick); };
  }, []);

  /* A drawer over the page should not let the page scroll beneath it. */
  useEffect(() => {
    document.documentElement.style.overflow = drawer ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [drawer]);

  const enter = (label: string) => { window.clearTimeout(closeTimer.current); setOpen(label); };
  const leave = () => { closeTimer.current = window.setTimeout(() => setOpen(null), 160); };
  const active = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`)) || pathname === href;

  return (
    <>
      <header className="header" data-scrolled={scrolled}>
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Home">{brand}</Link>

          <nav className="nav" aria-label="Main">
            {groups.map((group) => (
              <div
                key={group.label}
                className="nav-item"
                data-open={open === group.label}
                data-active={group.items.some((item) => active(item.href)) || active(group.href)}
                onMouseEnter={() => enter(group.label)}
                onMouseLeave={leave}
              >
                <button type="button" aria-expanded={open === group.label} onClick={() => setOpen(open === group.label ? null : group.label)}>
                  {group.label} <Icon name="chevron" size={16} />
                </button>
                <div className={`mega ${group.wide ? '' : 'mega-narrow'}`} role="menu">
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href} role="menuitem">
                      {item.icon ? <span className="ico" aria-hidden="true">{item.icon}</span> : null}
                      <span><b>{item.label}</b>{item.hint ? <small>{item.hint}</small> : null}</span>
                    </Link>
                  ))}
                  {group.foot ? (
                    <div className="mega-foot">
                      <span>{group.foot.text}</span>
                      <Link href={group.foot.href}>{group.foot.label} <Icon name="arrow" size={16} /></Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={active(link.href) ? 'page' : undefined}>{link.label}</Link>
            ))}
          </nav>

          <div className="header-cta">
            {phone && phoneHref ? (
              <a href={phoneHref} className="header-phone">
                <span className="dot"><Icon name="phone" size={16} /></span>{phone}
              </a>
            ) : null}
            <Link href="/apply" className="btn btn-primary btn-sm">Apply <span className="hide-sm">now</span> <Icon name="arrow" size={16} data-arrow="" /></Link>
            <button type="button" className="burger" aria-label="Open the menu" aria-expanded={drawer} onClick={() => setDrawer(true)}>
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>
      </header>

      <div className="drawer" data-open={drawer} aria-hidden={!drawer} inert={!drawer}>
        <div className="drawer-head">
          <Link href="/" className="brand">{brand}</Link>
          <button type="button" aria-label="Close the menu" onClick={() => setDrawer(false)}><Icon name="close" size={22} /></button>
        </div>
        {groups.map((group) => (
          <nav key={group.label} aria-label={group.label}>
            <h6>{group.label}</h6>
            {group.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <span>{item.icon ? `${item.icon}  ` : ''}{item.label}</span>
                <Icon name="arrow" size={18} />
              </Link>
            ))}
          </nav>
        ))}
        <nav aria-label="More">
          <h6>More</h6>
          {links.map((link) => (
            <Link key={link.href} href={link.href}><span>{link.label}</span><Icon name="arrow" size={18} /></Link>
          ))}
        </nav>
        <div className="btn-row" style={{ marginTop: 'auto' }}>
          <Link href="/apply" className="btn btn-accent btn-lg btn-block">Apply in 5 minutes <Icon name="arrow" size={18} /></Link>
          {phoneHref ? <a href={phoneHref} className="btn btn-light btn-lg btn-block"><Icon name="phone" size={18} /> Call {phone}</a> : null}
        </div>
      </div>
    </>
  );
}

/**
 * The way in for staff. The public pages are cached and never read the session cookie, so this
 * asks /admin/session after the page loads: a signed-in member of staff sees "Admin dashboard",
 * everybody else "Staff portal". Either way it is only a link — the admin guards itself.
 */
export function StaffLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/admin/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { signedIn?: boolean } | null) => { if (live) setSignedIn(!!data?.signedIn); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <Link href={signedIn ? '/admin' : '/admin/login'} className="staff-link" prefetch={false}>
      <Icon name="lock" size={13} /> {signedIn ? 'Admin dashboard' : 'Staff portal'}
    </Link>
  );
}
