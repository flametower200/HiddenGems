'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import ProfileCard from '../../components/ProfileCard';
import { cerca } from '../../lib/search';
import {
  COUNTRY_OPTIONS,
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../../lib/profileOptions';

const RUOLI = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
const PIEDI = ['destro', 'sinistro', 'ambidestro'];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];

const FILTRI_VUOTI = {
  ruolo: '', piede: '', genere: '', inCercaSquadra: undefined, statoContratto: '',
  nazione: '', lingua: '', etaMin: '', etaMax: '',
  patentino: '', moduloPreferito: '',
  categoria: '', annataSquadra: '', genereSquadra: '', inCercaAllenatori: undefined, inCercaGiocatori: undefined, palmares: '',
};

export default function Cerca() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cercando, setCercando] = useState(false);
  const [tipoAccount, setTipoAccount] = useState('giocatore');
  const [testoRicerca, setTestoRicerca] = useState('');
  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [risultati, setRisultati] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  const aggiorna = (campo, valore) => setFiltri((f) => ({ ...f, [campo]: valore }));

  const eseguiRicerca = async (e) => {
    e?.preventDefault();
    setCercando(true);
    try {
      const filtriPuliti = {};
      Object.entries(filtri).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) filtriPuliti[k] = v;
      });
      if (filtriPuliti.etaMin) filtriPuliti.etaMin = Number(filtriPuliti.etaMin);
      if (filtriPuliti.etaMax) filtriPuliti.etaMax = Number(filtriPuliti.etaMax);

      const { risultati: r } = await cerca(tipoAccount, { testoRicerca: testoRicerca || undefined, filtri: filtriPuliti });
      setRisultati(r);
    } catch (err) {
      alert('Errore nella ricerca: ' + err.message);
    }
    setCercando(false);
  };

  const cambiaTipo = (nuovoTipo) => {
    setTipoAccount(nuovoTipo);
    setFiltri(FILTRI_VUOTI);
    setRisultati(null);
  };

  const filtriAttivi = Object.values(filtri).filter((value) => value !== '' && value !== undefined && value !== false).length;

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="cerca" />
      <div className="container container--wide search-screen">
        <div className="page-heading">
          <div>
            <p className="page-eyebrow">HIDDENGEMS / SCOUTING</p>
            <h1>Trova il tuo prossimo talento</h1>
            <p>Filtra la rete per ruolo, esperienza e disponibilità.</p>
          </div>
        </div>

        <form onSubmit={eseguiRicerca} className="search-form">
          <div className="search-form__primary">
            <div className="field search-form__type">
              <label className="field__label" htmlFor="search-type">Cerco</label>
              <select id="search-type" value={tipoAccount} onChange={(e) => cambiaTipo(e.target.value)}>
                <option value="giocatore">Giocatori</option>
                <option value="allenatore">Allenatori</option>
                <option value="scout">Scout</option>
                <option value="societa">Società</option>
              </select>
            </div>
            <label className="search-form__query">
              <span className="field__label">Nome o cognome</span>
              <input type="search" placeholder="Es. Rossi, Milano…" value={testoRicerca} onChange={(e) => setTestoRicerca(e.target.value)} />
            </label>
            <button type="submit" disabled={cercando} className="search-submit">
              {cercando ? 'Cerco…' : 'Cerca'}
            </button>
          </div>

          <details className="search-filters">
            <summary>
              <span>Affina la ricerca</span>
              {filtriAttivi > 0 && <span className="search-filters__count">{filtriAttivi} attivi</span>}
            </summary>
            <div className="search-filters__content">

          {tipoAccount === 'giocatore' && (
            <div className="subform">
              <div className="field-row">
                <select value={filtri.ruolo} onChange={(e) => aggiorna('ruolo', e.target.value)}>
                  <option value="">Ruolo (tutti)</option>
                  {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filtri.piede} onChange={(e) => aggiorna('piede', e.target.value)}>
                  <option value="">Piede (tutti)</option>
                  {PIEDI.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field-row">
                <input type="number" placeholder="Età min" value={filtri.etaMin} onChange={(e) => aggiorna('etaMin', e.target.value)} />
                <input type="number" placeholder="Età max" value={filtri.etaMax} onChange={(e) => aggiorna('etaMax', e.target.value)} />
              </div>
              <select value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)}>
                <option value="">Tutte le nazioni</option>
                {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
              </select>
              <select value={filtri.statoContratto} onChange={(e) => aggiorna('statoContratto', e.target.value)}>
                <option value="">Tutti gli stati contrattuali</option>
                {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filtri.lingua} onChange={(e) => aggiorna('lingua', e.target.value)}>
                <option value="">Tutte le lingue</option>
                {LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
              </select>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaSquadra} onChange={(e) => aggiorna('inCercaSquadra', e.target.checked || undefined)} />
                Solo chi è in cerca di squadra
              </label>
            </div>
          )}

          {tipoAccount === 'allenatore' && (
            <div className="subform">
              <select value={filtri.patentino} onChange={(e) => aggiorna('patentino', e.target.value)}>
                <option value="">Tutti i patentini</option>
                {COACH_LICENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filtri.moduloPreferito} onChange={(e) => aggiorna('moduloPreferito', e.target.value)}>
                <option value="">Tutti i moduli</option>
                {FORMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <div className="field-row">
                <input type="number" placeholder="Età min" value={filtri.etaMin} onChange={(e) => aggiorna('etaMin', e.target.value)} />
                <input type="number" placeholder="Età max" value={filtri.etaMax} onChange={(e) => aggiorna('etaMax', e.target.value)} />
              </div>
              <select value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)}>
                <option value="">Tutte le nazioni</option>
                {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
              </select>
              <select value={filtri.lingua} onChange={(e) => aggiorna('lingua', e.target.value)}>
                <option value="">Tutte le lingue</option>
                {LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
              </select>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaSquadra} onChange={(e) => aggiorna('inCercaSquadra', e.target.checked || undefined)} />
                Solo chi è in cerca di squadra
              </label>
            </div>
          )}

          {tipoAccount === 'scout' && (
            <div className="subform">
              <select value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)}>
                <option value="">Tutte le nazioni</option>
                {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
              </select>
            </div>
          )}

          {tipoAccount === 'societa' && (
            <div className="subform">
              <div className="field-row">
                <input type="text" placeholder="Categoria" value={filtri.categoria} onChange={(e) => aggiorna('categoria', e.target.value)} />
                <select value={filtri.annataSquadra} onChange={(e) => aggiorna('annataSquadra', e.target.value)}>
                  <option value="">Annata (tutte)</option>
                  {ANNATE.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Palmares contiene..." value={filtri.palmares} onChange={(e) => aggiorna('palmares', e.target.value)} />
              <select value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)}>
                <option value="">Tutte le nazioni</option>
                {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
              </select>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaGiocatori} onChange={(e) => aggiorna('inCercaGiocatori', e.target.checked || undefined)} />
                Solo società in cerca di giocatori
              </label>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaAllenatori} onChange={(e) => aggiorna('inCercaAllenatori', e.target.checked || undefined)} />
                Solo società in cerca di allenatori
              </label>
            </div>
          )}

            </div>
          </details>
        </form>

        {risultati !== null && (
          <section className="search-results" aria-live="polite">
            <div className="search-results__heading">
              <h2>Risultati</h2>
              <span>{risultati.length} {risultati.length === 1 ? 'profilo trovato' : 'profili trovati'}</span>
            </div>
            {risultati.length === 0 ? (
              <div className="directory-empty">
                <span className="directory-empty__mark" aria-hidden="true">?</span>
                <h2>Nessun profilo trovato</h2>
                <p>Prova a rimuovere un filtro o cerca con un altro nome.</p>
              </div>
            ) : (
              <div className="talent-grid">
                {risultati.map((profile) => <ProfileCard key={profile.id} profile={profile} currentUserId={session.user.id} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
