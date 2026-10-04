'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import { avviaConversazione } from '../../../lib/chat';
import { segui, smettiDiSeguire, aggiungiPreferito, rimuoviPreferito, controllaStato, getContatoriProfilo } from '../../../lib/social';
import { caricaProfiloCompleto } from '../../../lib/profileHelpers';

export default function ProfiloPubblico() {
  const { id } = useParams();
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [contatori, setContatori] = useState({ follower: 0, seguiti: 0, preferiti: 0 });
  const [stato, setStato] = useState({ seguito: false, preferito: false });
  const [inviandoRichiesta, setInviandoRichiesta] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        if (session.user.id === id) {
          router.replace('/profilo');
          return;
        }
        carica();
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  const carica = async () => {
    setLoading(true);
    try {
      const { profilo: p, dettaglio: d } = await caricaProfiloCompleto(id);
      setProfilo(p);
      setDettaglio(d);

      const [c, s] = await Promise.all([getContatoriProfilo(id), controllaStato(id)]);
      setContatori(c);
      setStato(s);
    } catch (err) {
      console.error('Errore caricamento profilo:', err.message);
    }
    setLoading(false);
  };

  const handleMessaggi = async () => {
    setInviandoRichiesta(true);
    try {
      await avviaConversazione(id);
      alert('Richiesta di chat inviata! La trovi nella sezione Messaggi non appena viene accettata.');
      router.push('/messaggi');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    setInviandoRichiesta(false);
  };

  const toggleSegui = async () => {
    try {
      if (stato.seguito) await smettiDiSeguire(id);
      else await segui(id);
      const [c, s] = await Promise.all([getContatoriProfilo(id), controllaStato(id)]);
      setContatori(c);
      setStato(s);
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const togglePreferito = async () => {
    try {
      if (stato.preferito) await rimuoviPreferito(id);
      else await aggiungiPreferito(id);
      const [c, s] = await Promise.all([getContatoriProfilo(id), controllaStato(id)]);
      setContatori(c);
      setStato(s);
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;
  if (!profilo) return <div className="state-message">Profilo non trovato.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="profilo" />
      <div className="container">
        <div className="profile-head">
          <img src={profilo.foto_url || 'https://placehold.co/80x80?text=%20'} alt="" className="avatar" />
          <div>
            <h2 style={{ marginBottom: 2 }}>{profilo.nome} {profilo.cognome}</h2>
            <span className={`badge badge--${profilo.tipo_account}`}>{profilo.tipo_account}</span>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-chip"><span className="stat-chip__value">{contatori.follower ?? 0}</span><span className="stat-chip__label">follower</span></div>
          <div className="stat-chip"><span className="stat-chip__value">{contatori.seguiti ?? 0}</span><span className="stat-chip__label">seguiti</span></div>
          <div className="stat-chip"><span className="stat-chip__value">{contatori.preferiti ?? 0}</span><span className="stat-chip__label">nei preferiti</span></div>
        </div>

        <div className="action-row">
          <button onClick={handleMessaggi} disabled={inviandoRichiesta} className="btn btn--secondary">
            {inviandoRichiesta ? 'Invio...' : '✉ Messaggi'}
          </button>
          <button onClick={toggleSegui} className={stato.seguito ? 'btn btn--outline' : 'btn btn--primary'}>
            {stato.seguito ? '✓ Segui già' : '+ Segui'}
          </button>
          <button onClick={togglePreferito} className={stato.preferito ? 'btn btn--outline' : 'btn btn--primary'}>
            {stato.preferito ? '★ Nei preferiti' : '☆ Aggiungi ai preferiti'}
          </button>
        </div>

        <div className="card card--panel">
          {profilo.tipo_account === 'giocatore' && dettaglio && (
            <>
              <p><strong>Ruolo:</strong> {dettaglio.ruolo_principale} {dettaglio.ruolo_secondario ? `/ ${dettaglio.ruolo_secondario}` : ''}</p>
              <p><strong>Piede:</strong> {dettaglio.piede || '—'}</p>
              <p><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
              <p style={{ marginBottom: 0 }}><strong>Nazione:</strong> {dettaglio.nazione}</p>
            </>
          )}
          {profilo.tipo_account === 'allenatore' && dettaglio && (
            <>
              <p><strong>Patentino:</strong> {dettaglio.patentino}</p>
              <p style={{ marginBottom: 0 }}><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
            </>
          )}
          {profilo.tipo_account === 'scout' && dettaglio && (
            <p style={{ marginBottom: 0 }}><strong>Società attuale:</strong> {dettaglio.societa_attuale || '—'}</p>
          )}
          {profilo.tipo_account === 'societa' && dettaglio && (
            <>
              <p><strong>Categoria:</strong> {dettaglio.categoria || '—'}</p>
              <p style={{ marginBottom: 0 }}><strong>Annata:</strong> {dettaglio.annata_squadra}</p>
            </>
          )}
          {profilo.bio && <p style={{ marginTop: 12, marginBottom: 0 }}>{profilo.bio}</p>}
        </div>
      </div>
    </main>
  );
}
