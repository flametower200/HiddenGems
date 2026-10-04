'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { cambiaPassword, eliminaAccount } from '../../lib/accountSettings';
import { esci } from '../../lib/registration';

export default function Impostazioni() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [confermaNuovaPassword, setConfermaNuovaPassword] = useState('');
  const [salvataggio, setSalvataggio] = useState(false);
  const [eliminando, setEliminando] = useState(false);

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
      alert('Password aggiornata!');
      setNuovaPassword('');
      setConfermaNuovaPassword('');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    setSalvataggio(false);
  };

  const handleElimina = async () => {
    if (!confirm('Sei sicuro? L\'account e tutti i tuoi dati verranno eliminati definitivamente. Questa azione non è reversibile.')) return;
    setEliminando(true);
    try {
      await eliminaAccount();
      alert('Account eliminato.');
    } catch (err) {
      alert('Errore: ' + err.message + '\n\nSe non hai ancora deployato la Edge Function "delete-account" su Supabase, questa funzione non è ancora disponibile.');
    }
    setEliminando(false);
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="impostazioni" />
      <div className="container">
        <h3>Impostazioni account</h3>

        <div className="card card--panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div>
            <h4 style={{ margin: 0 }}>Sessione</h4>
            <p style={{ margin: 4, color: 'var(--color-muted)' }}>Esci dal tuo account</p>
          </div>
          <button type="button" onClick={() => esci()} className="btn btn--outline">
            Logout
          </button>
        </div>

        <form onSubmit={handleCambiaPassword} className="card card--panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <h4 style={{ margin: 0 }}>Cambia password</h4>
          <input type="password" placeholder="Nuova password" value={nuovaPassword} onChange={(e) => setNuovaPassword(e.target.value)} required />
          <input type="password" placeholder="Conferma nuova password" value={confermaNuovaPassword} onChange={(e) => setConfermaNuovaPassword(e.target.value)} required />
          <button type="submit" disabled={salvataggio} className="btn btn--secondary btn--block">
            {salvataggio ? 'Salvataggio...' : 'Aggiorna password'}
          </button>
        </form>

        <div className="danger-zone">
          <h4>Zona pericolosa</h4>
          <p>Elimina definitivamente il tuo account e tutti i tuoi dati (profilo, chat, messaggi, follow, preferiti).</p>
          <button onClick={handleElimina} disabled={eliminando} className="btn btn--danger">
            {eliminando ? 'Eliminazione...' : 'Elimina account'}
          </button>
        </div>
      </div>
    </main>
  );
}
