'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import UserAvatar from '../../../components/UserAvatar';
import ProfileStatGrid from '../../../components/ProfileStatGrid';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import { avviaConversazione } from '../../../lib/chat';
import { segui, smettiDiSeguire, aggiungiPreferito, rimuoviPreferito, controllaStato, getContatoriProfilo } from '../../../lib/social';
import { caricaProfiloCompleto } from '../../../lib/profileHelpers';
import { caricaRosaSocieta } from '../../../lib/clubRoster';
import { useToast } from '../../../components/ToastProvider';

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
  const [erroreProfilo, setErroreProfilo] = useState('');
  const [erroreAzione, setErroreAzione] = useState('');
  const [azioneSociale, setAzioneSociale] = useState('');
  const [profilo, setProfilo] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [contatori, setContatori] = useState({ follower: 0, seguiti: 0, preferiti: 0 });
  const [stato, setStato] = useState({ seguito: false, preferito: false });
  const [inviandoRichiesta, setInviandoRichiesta] = useState(false);
  const [squadraAttuale, setSquadraAttuale] = useState(null);
  const [rosaGiocatori, setRosaGiocatori] = useState([]);
  const [rosaAllenatori, setRosaAllenatori] = useState([]);
  const notify = useToast();

  const carica = useCallback(async () => {
    setLoading(true);
    setErroreProfilo('');
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
      setErroreProfilo('Non è stato possibile caricare il profilo. Riprova tra poco.');
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
    setErroreAzione('');
    try {
      await avviaConversazione(id);
      setErroreAzione('Richiesta inviata. Potrai scrivere quando verrà accettata.');
      notify({ type: 'success', message: 'Richiesta di chat inviata.' });
    } catch (err) {
      setErroreAzione(`Non è stato possibile inviare la richiesta: ${err.message}`);
      notify({ type: 'error', message: `Impossibile inviare la richiesta. ${err.message}` });
    } finally {
      setInviandoRichiesta(false);
    }
  };

  const toggleSocial = async (tipo) => {
    if (azioneSociale) return;
    const seguitoPrima = stato.seguito;
    const preferitoPrima = stato.preferito;
    const contatoriPrima = contatori;
    const attivoPrima = tipo === 'segui' ? seguitoPrima : preferitoPrima;
    const cambiaStato = tipo === 'segui' ? segui : aggiungiPreferito;
    const rimuoviStato = tipo === 'segui' ? smettiDiSeguire : rimuoviPreferito;
    const conteggio = tipo === 'segui' ? 'follower' : 'preferiti';
    const delta = attivoPrima ? -1 : 1;

    setAzioneSociale(tipo);
    setErroreAzione('');
    setStato((current) => ({ ...current, [tipo === 'segui' ? 'seguito' : 'preferito']: !attivoPrima }));
    setContatori((current) => ({ ...current, [conteggio]: Math.max(0, (current[conteggio] || 0) + delta) }));
    try {
      await (attivoPrima ? rimuoviStato(id) : cambiaStato(id));
      notify({ type: 'success', message: tipo === 'segui'
        ? (attivoPrima ? 'Hai smesso di seguire il profilo.' : 'Profilo seguito con successo.')
        : (attivoPrima ? 'Profilo rimosso dai preferiti.' : 'Profilo aggiunto ai preferiti.') });
    } catch (err) {
      setStato({ seguito: seguitoPrima, preferito: preferitoPrima });
      setContatori(contatoriPrima);
      setErroreAzione(`Modifica non riuscita. Riprova. ${err.message}`);
      notify({ type: 'error', message: `Modifica non riuscita. ${err.message}` });
    } finally {
      setAzioneSociale('');
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" />;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;
  if (!profilo) {
    return (
      <main className="page">
        <div className="state-message" role="alert">
          <h1>{erroreProfilo ? 'Profilo non disponibile' : 'Profilo non trovato'}</h1>
          <p>{erroreProfilo || 'Questo profilo non esiste o non è più disponibile.'}</p>
          {erroreProfilo && <button type="button" className="btn btn--primary" onClick={carica}>Riprova</button>}
        </div>
      </main>
    );
  }

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
          <button onClick={handleMessaggi} disabled={inviandoRichiesta} className="btn btn--secondary" aria-busy={inviandoRichiesta}>
            {inviandoRichiesta ? <><span className="button-spinner" aria-hidden="true" /> Invio…</> : '✉ Messaggi'}
          </button>
          <button onClick={() => toggleSocial('segui')} disabled={Boolean(azioneSociale)} className={stato.seguito ? 'btn btn--outline' : 'btn btn--primary'} aria-busy={azioneSociale === 'segui'}>
            {azioneSociale === 'segui' ? <><span className="button-spinner" aria-hidden="true" /> Aggiorno…</> : stato.seguito ? '✓ Segui già' : '+ Segui'}
          </button>
          <button onClick={() => toggleSocial('preferito')} disabled={Boolean(azioneSociale)} className={stato.preferito ? 'btn btn--outline' : 'btn btn--primary'} aria-busy={azioneSociale === 'preferito'}>
            {azioneSociale === 'preferito' ? <><span className="button-spinner" aria-hidden="true" /> Aggiorno…</> : stato.preferito ? '★ Nei preferiti' : '☆ Aggiungi ai preferiti'}
          </button>
        </div>
        {erroreAzione && (
          <p
            className={`action-feedback${erroreAzione.startsWith('Richiesta inviata') ? '' : ' is-error'}`}
            role={erroreAzione.startsWith('Richiesta inviata') ? 'status' : 'alert'}
          >
            {erroreAzione}
          </p>
        )}
        </section>

        <section className="card card--panel profile-details">
          <ProfileStatGrid
            items={[
              ...(profilo.tipo_account !== 'societa' ? [
                { label: 'Genere', value: profilo.genere || '—' },
                { label: 'Età', value: etaDaData(dettaglio?.data_nascita) ?? '—' },
              ] : []),
              ...(profilo.tipo_account === 'giocatore' && dettaglio ? [
                { label: 'Ruolo', value: [dettaglio.ruolo_principale, dettaglio.ruolo_secondario].filter(Boolean).join(' / ') || '—' },
                { label: 'Piede preferito', value: dettaglio.piede || '—', icon: 'foot' },
                { label: 'Altezza / peso', value: [dettaglio.altezza && `${dettaglio.altezza} cm`, dettaglio.peso && `${dettaglio.peso} kg`].filter(Boolean).join(' / ') || '—' },
                { label: 'Disponibilità', value: dettaglio.in_cerca_squadra ? 'In cerca di squadra' : 'Non disponibile', available: !!dettaglio.in_cerca_squadra },
              ] : []),
              ...(profilo.tipo_account === 'allenatore' && dettaglio ? [
                { label: 'Patentino', value: dettaglio.patentino || '—' },
                { label: 'Modulo preferito', value: dettaglio.modulo_preferito || '—' },
                { label: 'Disponibilità', value: dettaglio.in_cerca_squadra ? 'In cerca di squadra' : 'Non disponibile', available: !!dettaglio.in_cerca_squadra },
              ] : []),
              ...(profilo.tipo_account === 'scout' && dettaglio ? [
                { label: 'Società attuale', value: dettaglio.societa_attuale || '—' },
                { label: 'Disponibilità', value: dettaglio.in_cerca_squadra ? 'In cerca di squadra' : 'Non disponibile', available: !!dettaglio.in_cerca_squadra },
              ] : []),
              ...(profilo.tipo_account === 'societa' && dettaglio ? [
                { label: 'Categoria', value: dettaglio.categoria || '—' },
                { label: 'Annata', value: dettaglio.annata_squadra || '—' },
                { label: 'Giocatori in rosa', value: rosaGiocatori.length },
                { label: 'Allenatori in rosa', value: rosaAllenatori.length },
              ] : []),
            ]}
          />
          {profilo.tipo_account === 'societa' && dettaglio?.palmares && <p className="profile-info"><strong>Palmares:</strong> {dettaglio.palmares}</p>}
          {profilo.tipo_account === 'societa' && (
            <div className="profile-info">
              {rosaAllenatori.length > 0 && <p><strong>Allenatori:</strong> {rosaAllenatori.map((profile) => `${profile.nome} ${profile.cognome || ''}`).join(', ')}</p>}
              {rosaGiocatori.length > 0 && <p><strong>Giocatori:</strong> {rosaGiocatori.map((profile) => `${profile.nome} ${profile.cognome || ''}`).join(', ')}</p>}
            </div>
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
          {profilo.bio && <p className="profile-info">{profilo.bio}</p>}
        </section>
      </div>
    </main>
  );
}
