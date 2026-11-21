'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { cambiaPassword, eliminaAccount } from '../../lib/accountSettings';
import { esci } from '../../lib/registration';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useToast } from '../../components/ToastProvider';

function IconEye({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.5 4.7 9 7-.2 1-1 2.1-2.1 3.1M6.2 6.2C3.9 7.6 2.4 9.9 2 12c.5 2.3 3.8 7 10 7 1.1 0 2.1-.2 3-.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.3-7 10-7 10 7 10 7-3.3 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Impostazioni() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [confermaNuovaPassword, setConfermaNuovaPassword] = useState('');
  const [mostraNuovaPassword, setMostraNuovaPassword] = useState(false);
  const [mostraConfermaNuovaPassword, setMostraConfermaNuovaPassword] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const notify = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  const handleCambiaPassword = async (e) => {
    e.preventDefault();
    setSalvataggio(true);
    try {
      await cambiaPassword(nuovaPassword, confermaNuovaPassword);
      notify({ type: 'success', message: 'Password aggiornata con successo.' });
      setNuovaPassword('');
      setConfermaNuovaPassword('');
    } catch (err) {
      notify({ type: 'error', message: 'Impossibile aggiornare la password. ' + err.message });
    } finally {
      setSalvataggio(false);
    }
  };

  const handleElimina = async () => {
    if (!confirm('Sei sicuro? L\'account e tutti i tuoi dati verranno eliminati definitivamente. Questa azione non è reversibile.')) return;
    setEliminando(true);
    try {
      await eliminaAccount();
      notify({ type: 'success', message: 'Account eliminato.' });
      router.replace('/');
    } catch (err) {
      notify({
        type: 'error',
        message: `Impossibile eliminare l’account. ${err.message} Se la funzione delete-account non è stata distribuita su Supabase, l’operazione non è disponibile.`,
      });
    } finally {
      setEliminando(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="page" />;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="impostazioni" />
      <div className="container settings-screen">
        <div className="page-heading">
          <div>
            <p className="page-eyebrow">HIDDENGEMS / ACCOUNT</p>
            <h1>Impostazioni</h1>
            <p>Gestisci la sicurezza e la sessione del tuo account.</p>
          </div>
        </div>

        <div className="settings-session">
          <div>
            <h4 style={{ margin: 0 }}>Sessione</h4>
            <p style={{ margin: 4, color: 'var(--color-muted)' }}>Esci dal tuo account</p>
          </div>
          <button type="button" onClick={() => esci()} className="btn btn--outline">
            Logout
          </button>
        </div>

        <form onSubmit={handleCambiaPassword} className="card card--panel settings-password-form">
          <h4 style={{ margin: 0 }}>Cambia password</h4>
          <label className="password-field">
            <span className="visually-hidden">Nuova password</span>
            <input type={mostraNuovaPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Nuova password" value={nuovaPassword} onChange={(e) => setNuovaPassword(e.target.value)} required />
            <button type="button" className="password-field__toggle" onClick={() => setMostraNuovaPassword((visible) => !visible)} aria-label={mostraNuovaPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={mostraNuovaPassword}>
              <IconEye visible={mostraNuovaPassword} />
            </button>
          </label>
          <label className="password-field">
            <span className="visually-hidden">Conferma nuova password</span>
            <input type={mostraConfermaNuovaPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Conferma nuova password" value={confermaNuovaPassword} onChange={(e) => setConfermaNuovaPassword(e.target.value)} required />
            <button type="button" className="password-field__toggle" onClick={() => setMostraConfermaNuovaPassword((visible) => !visible)} aria-label={mostraConfermaNuovaPassword ? 'Nascondi password' : 'Mostra password'} aria-pressed={mostraConfermaNuovaPassword}>
              <IconEye visible={mostraConfermaNuovaPassword} />
            </button>
          </label>
          <button type="submit" disabled={salvataggio} className="btn btn--secondary" aria-busy={salvataggio}>
            {salvataggio ? <><span className="button-spinner" aria-hidden="true" /> Salvataggio…</> : 'Aggiorna password'}
          </button>
        </form>

        <div className="danger-zone">
          <h4>Zona pericolosa</h4>
          <p>Elimina definitivamente il tuo account e tutti i tuoi dati (profilo, chat, messaggi, follow, preferiti).</p>
          <button onClick={handleElimina} disabled={eliminando} className="btn btn--danger" aria-busy={eliminando}>
            {eliminando ? <><span className="button-spinner" aria-hidden="true" /> Eliminazione…</> : 'Elimina account'}
          </button>
        </div>
      </div>
    </main>
  );
}
