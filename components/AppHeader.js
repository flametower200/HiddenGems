'use client';

import Link from 'next/link';
import { esci } from '../lib/registration';

export default function AppHeader({ session, theme = 'bacheca' }) {
  return (
    <header className={`app-header app-header--${theme}`}>
      <div className="app-header__inner">
        <div className="app-header__identity">
          <p className="app-header__brand">HiddenGems</p>
          <p className="app-header__email">Connesso come {session?.user?.email}</p>
        </div>

        <nav className="app-header__nav" aria-label="Navigazione principale">
          <Link href="/" className="nav-link">Bacheca</Link>
          <Link href="/feed" className="nav-link">Feed</Link>
          <Link href="/cerca" className="nav-link">Cerca</Link>
          <Link href="/messaggi" className="nav-link">Messaggi</Link>
          <Link href="/profilo" className="nav-link">Profilo</Link>
          <Link href="/impostazioni" className="nav-link">Impostazioni</Link>
          <button
            type="button"
            onClick={() => esci()}
            className="btn btn--sm btn--outline app-header__logout"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
