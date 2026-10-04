'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const SECTION_PATHS = ['/', '/feed', '/cerca', '/messaggi', '/profilo', '/impostazioni'];

function getSectionIndex(pathname) {
  if (pathname === '/') return 0;
  if (pathname.startsWith('/feed')) return 1;
  if (pathname.startsWith('/cerca')) return 2;
  if (pathname.startsWith('/messaggi')) return 3;
  if (pathname.startsWith('/profilo')) return 4;
  if (pathname.startsWith('/impostazioni')) return 5;
  return -1;
}

function startsInProtectedControl(target) {
  return target instanceof Element && Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [data-horizontal-scroll]'),
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 30L32 12L54 30V50C54 52.2 52.2 54 50 54H14C11.8 54 10 52.2 10 50V30Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M24 54V36H40V54" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function IconFeed() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M28 22L44 32L28 42V22Z" fill="currentColor" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="28" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M40 40L54 54" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M16 20C16 16.7 18.7 14 22 14H42C45.3 14 48 16.7 48 20V34C48 37.3 45.3 40 42 40H31L23 48V40H22C18.7 40 16 37.3 16 34V20Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="23" cy="27" r="2.5" fill="currentColor" />
      <circle cx="32" cy="27" r="2.5" fill="currentColor" />
      <circle cx="41" cy="27" r="2.5" fill="currentColor" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="14" y="14" width="36" height="36" rx="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="32" cy="26" r="8" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M20 46C23 39 27 36 32 36C37 36 41 39 44 46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M32 10V16M32 48V54M54 32H48M16 32H10M47 17L42 22M22 42L17 47M47 47L42 42M22 22L17 17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const NAV_ITEMS = [
  { href: '/', label: 'Bacheca', icon: <IconHome />, title: 'Bacheca' },
  { href: '/feed', label: 'Feed', icon: <IconFeed />, title: 'Feed' },
  { href: '/cerca', label: 'Cerca', icon: <IconSearch />, title: 'Cerca' },
  { href: '/messaggi', label: 'Messaggi', icon: <IconMessages />, title: 'Messaggi' },
  { href: '/profilo', label: 'Profilo', icon: <IconProfile />, title: 'Profilo' },
  { href: '/impostazioni', label: 'Impostazioni', icon: <IconSettings />, title: 'Impostazioni' },
];

export default function AppHeader({ session, theme = 'bacheca' }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef(null);
  const lastNavigation = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    window.dispatchEvent(new CustomEvent('hiddengems:route-ready', { detail: { pathname } }));

    const direction = root.dataset.sectionDirection;
    if (!direction || typeof document.startViewTransition === 'function') return undefined;

    const transitionClass = `section-swipe--${direction}`;
    root.classList.add(transitionClass);
    const timeout = window.setTimeout(() => {
      root.classList.remove(transitionClass);
      delete root.dataset.sectionDirection;
    }, 560);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const moveSection = (direction) => {
      const now = Date.now();
      const root = document.documentElement;
      if (root.dataset.sectionDirection || now - lastNavigation.current < 600) return;

      const currentIndex = getSectionIndex(pathname);
      const target = SECTION_PATHS[currentIndex + direction];
      if (!target) return;

      lastNavigation.current = now;
      const visualDirection = direction > 0 ? 'next' : 'previous';
      root.dataset.sectionDirection = visualDirection;

      if (typeof document.startViewTransition === 'function') {
        const routeChanged = new Promise((resolve) => {
          const onRouteReady = (event) => {
            if (event.detail?.pathname !== target) return;
            window.removeEventListener('hiddengems:route-ready', onRouteReady);
            resolve();
          };
          window.addEventListener('hiddengems:route-ready', onRouteReady);
          window.setTimeout(() => {
            window.removeEventListener('hiddengems:route-ready', onRouteReady);
            resolve();
          }, 1800);
        });
        try {
          const transition = document.startViewTransition(async () => {
            router.push(target);
            await routeChanged;
          });
          const clearDirection = () => { delete root.dataset.sectionDirection; };
          transition.ready.catch(() => {});
          transition.updateCallbackDone.catch(() => {});
          transition.finished.then(clearDirection, clearDirection);
        } catch {
          delete root.dataset.sectionDirection;
          router.push(target);
        }
      } else {
        router.push(target);
      }
    };

    const handleWheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) < 42 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.25) return;
      if (startsInProtectedControl(event.target)) return;

      event.preventDefault();
      moveSection(event.deltaX > 0 ? 1 : -1);
    };

    const handleTouchStart = (event) => {
      if (event.touches.length !== 1 || startsInProtectedControl(event.target)) {
        touchStart.current = null;
        return;
      }
      touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };

    const handleTouchEnd = (event) => {
      if (!touchStart.current || event.changedTouches.length !== 1) return;

      const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
      const deltaY = event.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY) * 1.35) return;
      moveSection(deltaX < 0 ? 1 : -1);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pathname, router]);

  return (
    <header className={`app-header app-header--${theme}`}>
      <div className="app-header__inner">
        <div className="app-header__identity">
          <p className="app-header__brand">HiddenGems</p>
        </div>

        <nav className="app-header__nav" aria-label="Navigazione principale">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-label={item.label}
              title={item.title}
            >
              <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
