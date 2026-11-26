'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_STORAGE_KEY = 'hiddengems-cookie-consent-v1';

const DEFAULT_PREFERENCES = {
  analytics: false,
  marketing: false,
};

const LEGAL_LINKS = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Termini di servizio' },
  { href: '/legal/cookies', label: 'Cookie' },
  { href: '/legal/refunds', label: 'Rimborsi e cancellazioni' },
  { href: '/legal/notice', label: 'Note legali / Chi siamo' },
];

function isValidPreferences(value) {
  return value
    && value.necessary === true
    && typeof value.analytics === 'boolean'
    && typeof value.marketing === 'boolean';
}

export default function SiteFooter() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isBannerOpen, setIsBannerOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let savedPreferences;
      try {
        savedPreferences = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      } catch {
        setStorageError('Non è stato possibile leggere le preferenze salvate. Scegli nuovamente le tue impostazioni.');
        setIsBannerOpen(true);
        return;
      }

      if (!savedPreferences) {
        setIsBannerOpen(true);
        return;
      }

      try {
        const parsedPreferences = JSON.parse(savedPreferences);
        if (!isValidPreferences(parsedPreferences)) {
          setStorageError('Le preferenze salvate non sono valide. Scegli nuovamente le tue impostazioni.');
          setIsBannerOpen(true);
          return;
        }

        setPreferences({
          analytics: parsedPreferences.analytics,
          marketing: parsedPreferences.marketing,
        });
      } catch {
        setStorageError('Le preferenze salvate non sono leggibili. Scegli nuovamente le tue impostazioni.');
        setIsBannerOpen(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const savePreferences = (nextPreferences) => {
    const savedPreferences = {
      necessary: true,
      ...nextPreferences,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(savedPreferences));
    } catch {
      setStorageError('Impossibile salvare le preferenze in questo browser. Riprova o abilita l’archiviazione locale.');
      return;
    }

    setPreferences(nextPreferences);
    setStorageError('');
    setIsBannerOpen(false);
    setIsCustomizing(false);
  };

  const openPreferences = () => {
    setIsCustomizing(true);
    setIsBannerOpen(true);
  };

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <strong>HiddenGems</strong>
            <span>Una rete più aperta per il calcio.</span>
          </div>
          <nav className="site-footer__links" aria-label="Informazioni legali">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>{link.label}</Link>
            ))}
            <button type="button" onClick={openPreferences}>Preferenze cookie</button>
          </nav>
        </div>
      </footer>

      {isBannerOpen && (
        <section className="cookie-consent" role="region" aria-labelledby="cookie-consent-title">
          <div className="cookie-consent__content">
            <div>
              <h2 id="cookie-consent-title">Preferenze cookie</h2>
              <p>
                L’app usa archiviazione tecnica necessaria per l’accesso e per ricordare questa scelta.
                Al momento non risultano strumenti di analytics o pubblicità installati.
                Consulta la <Link href="/legal/cookies">pagina cookie</Link>.
              </p>
            </div>

            {isCustomizing && (
              <div className="cookie-consent__options">
                <p><strong>Necessari</strong><span>Sempre attivi</span></p>
                <label>
                  <span><strong>Analytics</strong><small>Misurazione facoltativa, se attivata in futuro.</small></span>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(event) => setPreferences((current) => ({ ...current, analytics: event.target.checked }))}
                  />
                </label>
                <label>
                  <span><strong>Marketing</strong><small>Comunicazioni e strumenti promozionali facoltativi.</small></span>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(event) => setPreferences((current) => ({ ...current, marketing: event.target.checked }))}
                  />
                </label>
              </div>
            )}

            {storageError && <p className="cookie-consent__error" role="alert">{storageError}</p>}

            <div className="cookie-consent__actions">
              {!isCustomizing ? (
                <>
                  <button type="button" className="cookie-consent__secondary" onClick={() => savePreferences(DEFAULT_PREFERENCES)}>
                    Rifiuta non essenziali
                  </button>
                  <button type="button" className="cookie-consent__secondary" onClick={() => setIsCustomizing(true)}>
                    Personalizza
                  </button>
                  <button
                    type="button"
                    className="cookie-consent__primary"
                    onClick={() => savePreferences({ analytics: true, marketing: true })}
                  >
                    Accetta tutti
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="cookie-consent__secondary" onClick={() => savePreferences(DEFAULT_PREFERENCES)}>
                    Rifiuta non essenziali
                  </button>
                  <button type="button" className="cookie-consent__primary" onClick={() => savePreferences(preferences)}>
                    Salva preferenze
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
