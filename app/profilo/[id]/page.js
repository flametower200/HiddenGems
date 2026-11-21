'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import UserAvatar from '../../../components/UserAvatar';
import { avviaConversazione } from '../../../lib/chat';
import { segui, smettiDiSeguire, aggiungiPreferito, rimuoviPreferito, controllaStato, getContatoriProfilo } from '../../../lib/social';
import { caricaProfiloCompleto } from '../../../lib/profileHelpers';
import { caricaRosaSocieta } from '../../../lib/clubRoster';

function etaDaData(dataNascita) {
  if (!dataNascita) return null;
  const nascita = new Date(`${dataNascita}T00:00:00`);
  if (Number.isNaN(nascita.getTime())) return null;
  const oggi = new Date();
  let eta = oggi.getFullYear() - nascita.getFullYear();
  if (oggi.getMonth() < nascita.getMonth() || (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate())) eta -= 1;
  return eta;
}

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
  const [squadraAttuale, setSquadraAttuale] = useState(null);
  const [rosaGiocatori, setRosaGiocatori] = useState([]);
  const [rosaAllenatori, setRosaAllenatori] = useState([]);

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const [{ profilo: p, dettaglio: d, squadraAttuale: squadra }, c, s] = await Promise.all([
        caricaProfiloCompleto(id),
        getContatoriProfilo(id),
        controllaStato(id),
      ]);
      setProfilo(p);
      setDettaglio(d);
      setSquadraAttuale(squadra);
      if (p.tipo_account === 'societa') {
        const roster = await caricaRosaSocieta(p.id);
        setRosaGiocatori(roster.giocatori);
        setRosaAllenatori(roster.allenatori);
      }
      setContatori(c);
      setStato(s);
    } catch (err) {
      console.error('Errore caricamento profilo:', err.message);
    }
    setLoading(false);
  }, [id]);

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
  }, [carica, id, router]);

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
    <main className="page profile-screen">
      <AppHeader session={session} theme="profilo" />
      <div className="container profile-screen__container">
        <section className="profile-overview">
        <div className="profile-head">
          <UserAvatar src={profilo.foto_url} name={`${profilo.nome} ${profilo.cognome || ''}`} size={88} className="avatar" />
          {squadraAttuale && (
            <UserAvatar src={squadraAttuale.foto_url} name={squadraAttuale.nome} size={48} className="avatar" />
          )}
          <div>
            <p className="page-eyebrow">PROFILO / SCOUTING</p>
            <h1>{profilo.nome} {profilo.cognome}</h1>
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
        </section>

        <section className="card card--panel profile-details">
          {profilo.tipo_account !== 'societa' && (
            <>
              <p><strong>Genere:</strong> {profilo.genere || '—'}</p>
              <p><strong>Età:</strong> {etaDaData(dettaglio?.data_nascita) ?? '—'}</p>
            </>
          )}
          {profilo.tipo_account === 'giocatore' && dettaglio && (
            <>
              <p><strong>Ruolo:</strong> {dettaglio.ruolo_principale} {dettaglio.ruolo_secondario ? `/ ${dettaglio.ruolo_secondario}` : ''}</p>
              <p><strong>Piede:</strong> {dettaglio.piede || '—'}</p>
              <p><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
            </>
          )}
          {profilo.tipo_account === 'allenatore' && dettaglio && (
            <>
              <p><strong>Patentino:</strong> {dettaglio.patentino}</p>
              <p style={{ marginBottom: 0 }}><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
            </>
          )}
          {profilo.tipo_account === 'scout' && dettaglio && (
            <>
              <p><strong>Società attuale:</strong> {dettaglio.societa_attuale || '—'}</p>
            </>
          )}
          {profilo.tipo_account === 'societa' && dettaglio && (
            <>
              <p><strong>Categoria:</strong> {dettaglio.categoria || '—'}</p>
              <p style={{ marginBottom: 0 }}><strong>Annata:</strong> {dettaglio.annata_squadra}</p>
              {dettaglio.palmares && <p><strong>Palmares:</strong> {dettaglio.palmares}</p>}
              {rosaAllenatori.length > 0 && <p><strong>Allenatori:</strong> {rosaAllenatori.map((profile) => `${profile.nome} ${profile.cognome || ''}`).join(', ')}</p>}
              {rosaGiocatori.length > 0 && <p><strong>Giocatori:</strong> {rosaGiocatori.map((profile) => `${profile.nome} ${profile.cognome || ''}`).join(', ')}</p>}
            </>
          )}
          {(dettaglio?.regione || dettaglio?.provincia) && (
            <p><strong>Zona:</strong> {[dettaglio.regione, dettaglio.provincia].filter(Boolean).join(' · ')}</p>
          )}
          {Array.isArray(dettaglio?.carriera) && dettaglio.carriera.length > 0 && (
            <div className="profile-career">
              <h3>Carriera</h3>
              {dettaglio.carriera.filter((experience) => typeof experience === 'string' || (experience && typeof experience === 'object')).map((experience, index) => (
                <p key={`${typeof experience === 'string' ? experience : experience.title || 'esperienza'}-${index}`}>
                  <strong>{typeof experience === 'string' ? experience : experience.title}</strong>
                  {typeof experience !== 'string' && (
                    <span> · {experience.startDate || 'Data inizio non indicata'} – {experience.endDate || 'In corso'}</span>
                  )}
                </p>
              ))}
            </div>
          )}
          {profilo.bio && <p style={{ marginTop: 12, marginBottom: 0 }}>{profilo.bio}</p>}
        </section>
      </div>
    </main>
  );
}
