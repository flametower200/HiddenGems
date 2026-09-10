'use client';

import Link from 'next/link';
import { esci } from '../lib/registration';

export default function AppHeader({ session }) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div>
          <p className="app-header__brand">HiddenGems</p>
          <p className="app-header__email">Connesso come {session?.user?.email}</p>
        </div>
        <nav className="app-header__nav">
          <Link href="/" className="nav-link">Bacheca</Link>
          <Link href="/cerca" className="nav-link">Cerca</Link>
          <Link href="/messaggi" className="nav-link">Messaggi</Link>
          <Link href="/profilo" className="nav-link">Il mio profilo</Link>
          <Link href="/impostazioni" className="nav-link">Impostazioni</Link>
          <button onClick={() => esci()} className="btn btn--sm btn--outline" style={{ borderColor: '#3A5548', color: '#fff' }}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
