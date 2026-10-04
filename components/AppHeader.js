'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

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
  { href: '/', label: 'Bacheca', icon: <IconHome />, title: 'Bacheca', theme: 'bacheca' },
  { href: '/feed', label: 'Feed', icon: <IconFeed />, title: 'Feed', theme: 'feed' },
  { href: '/cerca', label: 'Cerca', icon: <IconSearch />, title: 'Cerca', theme: 'cerca' },
  { href: '/messaggi', label: 'Messaggi', icon: <IconMessages />, title: 'Messaggi', theme: 'messaggi' },
  { href: '/profilo', label: 'Profilo', icon: <IconProfile />, title: 'Profilo', theme: 'profilo' },
  { href: '/impostazioni', label: 'Impostazioni', icon: <IconSettings />, title: 'Impostazioni', theme: 'impostazioni' },
];

export default function AppHeader({ session, theme = 'bacheca' }) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStart = useRef(null);
  const lastNavigation = useRef(0);
  const dragFrame = useRef(null);
  const pendingDrag = useRef(null);
  const navigationTimer = useRef(null);
  const [previewSection, setPreviewSection] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('section-dragging', 'section-drag-settling', 'section-committing');
    root.style.removeProperty('--section-drag-x');

    const direction = root.dataset.sectionDirection;
    if (!direction) return undefined;

    const transitionClass = `section-swipe--${direction}`;
    root.classList.add(transitionClass);
    const timeout = window.setTimeout(() => {
      root.classList.remove(transitionClass);
      delete root.dataset.sectionDirection;
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    const currentIndex = getSectionIndex(pathname);
    [SECTION_PATHS[currentIndex - 1], SECTION_PATHS[currentIndex + 1]]
      .filter(Boolean)
      .forEach((path) => router.prefetch(path));
  }, [pathname, router]);

  useEffect(() => {
    const moveSection = (direction) => {
      const now = Date.now();
      const root = document.documentElement;
      const isDragging = root.classList.contains('section-dragging');
      if ((root.dataset.sectionDirection && !isDragging) || now - lastNavigation.current < 600) return;

      const currentIndex = getSectionIndex(pathname);
      const target = SECTION_PATHS[currentIndex + direction];
      if (!target) return;

      lastNavigation.current = now;
      const visualDirection = direction > 0 ? 'next' : 'previous';
      root.dataset.sectionDirection = visualDirection;
      if (isDragging) {
        root.classList.remove('section-dragging', 'section-drag-settling');
        root.classList.add('section-committing');
        root.style.setProperty('--section-drag-x', `${direction > 0 ? -window.innerWidth : window.innerWidth}px`);
        const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150;
        navigationTimer.current = window.setTimeout(() => {
          root.classList.remove('section-committing');
          root.style.removeProperty('--section-drag-x');
          setPreviewSection(null);
          router.push(target);
        }, delay);
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
      touchStart.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        startedAt: Date.now(),
        direction: 0,
      };
    };

    const applyPendingDrag = () => {
      if (dragFrame.current !== null) {
        window.cancelAnimationFrame(dragFrame.current);
        dragFrame.current = null;
      }
      const pending = pendingDrag.current;
      pendingDrag.current = null;
      if (!pending) return;

      const root = document.documentElement;
      root.style.setProperty('--section-drag-x', `${pending.deltaX}px`);
      if (touchStart.current && touchStart.current.preview !== pending.nextItem) {
        touchStart.current.preview = pending.nextItem;
        setPreviewSection({ ...pending.nextItem, pathname });
        router.prefetch(pending.nextItem.href);
      }
    };

    const settleTouch = (commit) => {
      const gesture = touchStart.current;
      applyPendingDrag();
      touchStart.current = null;
      if (!gesture?.direction) return;

      const root = document.documentElement;
      if (commit) {
        moveSection(gesture.direction);
        return;
      }

      root.classList.remove('section-dragging');
      root.classList.add('section-drag-settling');
      root.style.setProperty('--section-drag-x', '0px');
      window.setTimeout(() => {
        root.classList.remove('section-drag-settling');
        root.style.removeProperty('--section-drag-x');
        delete root.dataset.sectionDirection;
        setPreviewSection(null);
      }, 240);
    };

    const handleTouchMove = (event) => {
      if (!touchStart.current || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      if (!touchStart.current.direction && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;
      if (!touchStart.current.direction && Math.abs(deltaX) < Math.abs(deltaY) * 1.1) {
        touchStart.current = null;
        return;
      }

      const direction = deltaX < 0 ? 1 : -1;
      const nextItem = NAV_ITEMS[getSectionIndex(pathname) + direction];
      if (!nextItem) {
        settleTouch(false);
        return;
      }

      touchStart.current.direction = direction;
      const root = document.documentElement;
      root.classList.add('section-dragging');
      root.classList.remove('section-drag-settling');
      root.dataset.sectionDirection = direction > 0 ? 'next' : 'previous';
      pendingDrag.current = { deltaX, nextItem };
      if (dragFrame.current === null) {
        dragFrame.current = window.requestAnimationFrame(applyPendingDrag);
      }
      event.preventDefault();
    };

    const handleTouchEnd = (event) => {
      if (!touchStart.current || event.changedTouches.length !== 1) return;

      const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
      const elapsed = Date.now() - touchStart.current.startedAt;
      const commitDistance = Math.max(56, window.innerWidth * 0.18);
      const shouldCommit = Math.abs(deltaX) >= commitDistance || (Math.abs(deltaX) >= 32 && elapsed < 220);
      settleTouch(shouldCommit);
    };

    const handleTouchCancel = () => settleTouch(false);

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true, capture: true });

    return () => {
      if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart, true);
      window.removeEventListener('touchmove', handleTouchMove, true);
      window.removeEventListener('touchend', handleTouchEnd, true);
      window.removeEventListener('touchcancel', handleTouchCancel, true);
    };
  }, [pathname, router]);

  return (
    <header className={`app-header app-header--${theme}`}>
      <div className="app-header__inner">
        <div className="app-header__identity">
          <p className="app-header__brand">HiddenGems</p>
        </div>

        <nav className="app-header__nav" aria-label="Navigazione principale">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
            <Link
              key={item.href}
              href={item.href}
                className={`nav-link${active ? ' is-active' : ''}`}
              aria-label={item.label}
              title={item.title}
                aria-current={active ? 'page' : undefined}
            >
              <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
            </Link>
              );
            })}
        </nav>
      </div>
      {previewSection?.pathname === pathname && typeof document !== 'undefined' && createPortal(
        <div className={`section-drag-preview app-header--${previewSection.theme}`} aria-hidden="true">
          <div className="section-drag-preview__brand">HiddenGems</div>
          <div className="section-drag-preview__content">
            <span className="section-drag-preview__icon">{previewSection.icon}</span>
            <strong>{previewSection.label}</strong>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
