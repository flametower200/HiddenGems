'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import ProfileCard from '../../components/ProfileCard';
import ItalianLocationFields from '../../components/ItalianLocationFields';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useToast } from '../../components/ToastProvider';
import { cerca } from '../../lib/search';
import {
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../../lib/profileOptions';
import {
  PLAYER_POSITION_CATEGORIES,
  positionsForCategory,
} from '../../lib/playerPositions';
const PIEDI = ['destro', 'sinistro', 'ambidestro'];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];

const FILTRI_VUOTI = {
  ruolo: '', ruoloCategoria: '', ruoloSecondario: '', piede: '', genere: '', inCercaSquadra: undefined, statoContratto: '',
  lingua: '', etaMin: '', etaMax: '',
  patentino: '', moduloPreferito: '', inCercaGiocatori: undefined,
  regione: '', provincia: '',
  categoria: '', annataSquadra: '', genereSquadra: '', inCercaAllenatori: undefined, palmares: '',
  cercaPatentino: '', cercaFormazione: '', cercaLingua: '',
};

export default function Cerca() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cercando, setCercando] = useState(false);
  const [erroreRicerca, setErroreRicerca] = useState('');
  const [tipoAccount, setTipoAccount] = useState('giocatore');
  const [testoRicerca, setTestoRicerca] = useState('');
  const [filtri, setFiltri] = useState(FILTRI_VUOTI);
  const [risultati, setRisultati] = useState(null);
  const notify = useToast();

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
    setErroreRicerca('');
    try {
      const etaMinima = tipoAccount === 'giocatore' ? 14 : 18;
      if (filtri.etaMin && Number(filtri.etaMin) < etaMinima) {
        setErroreRicerca(`L’età minima da cercare per questo profilo è ${etaMinima} anni.`);
        return;
      }
      if (filtri.etaMax && Number(filtri.etaMax) > 120) {
        setErroreRicerca('L’età massima da cercare non può superare 120 anni.');
        return;
      }
      if (filtri.etaMin && filtri.etaMax && Number(filtri.etaMin) > Number(filtri.etaMax)) {
        setErroreRicerca('L’età minima non può superare l’età massima.');
        return;
      }

      const filtriPuliti = {};
      Object.entries(filtri).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) filtriPuliti[k] = v;
      });
      if (filtriPuliti.etaMin) filtriPuliti.etaMin = Number(filtriPuliti.etaMin);
      if (filtriPuliti.etaMax) filtriPuliti.etaMax = Number(filtriPuliti.etaMax);

      const { risultati: r } = await cerca(tipoAccount, { testoRicerca: testoRicerca || undefined, filtri: filtriPuliti });
      setRisultati(r);
    } catch (err) {
      const message = 'Errore nella ricerca: ' + err.message;
      setErroreRicerca(message);
      notify({ type: 'error', message });
    } finally {
      setCercando(false);
    }
  };

  const cambiaTipo = (nuovoTipo) => {
    setTipoAccount(nuovoTipo);
    setFiltri(FILTRI_VUOTI);
    setRisultati(null);
  };

  const filtriAttivi = Object.values(filtri).filter((value) => value !== '' && value !== undefined && value !== false).length;

  if (loading) return <LoadingSkeleton variant="search" />;
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
          {erroreRicerca && <p className="form-error" role="alert">{erroreRicerca}</p>}
          <div className="search-form__primary">
            <label className="search-form__type" htmlFor="search-type">
              <span className="field__label">Cerco</span>
              <select id="search-type" value={tipoAccount} onChange={(e) => cambiaTipo(e.target.value)}>
                <option value="giocatore">Giocatori</option>
                <option value="allenatore">Allenatori</option>
                <option value="scout">Scout</option>
                <option value="societa">Società</option>
              </select>
            </label>
            <label className="search-form__query" htmlFor="search-name">
              <span className="field__label">Nome o cognome</span>
              <input id="search-name" type="search" placeholder="Es. Rossi, Milano…" value={testoRicerca} onChange={(e) => setTestoRicerca(e.target.value)} />
            </label>
            <button type="submit" disabled={cercando} className="search-submit" aria-busy={cercando}>
              {cercando ? <><span className="button-spinner" aria-hidden="true" /> Cerco…</> : 'Cerca'}
            </button>
          </div>

          <details className="search-filters">
            <summary>
              <svg className="search-filters__icon" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 5h14M5.5 10h9M8 15h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="7" cy="5" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="12" cy="10" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="10" cy="15" r="1.5" fill="#fff" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <span>Filtri avanzati</span>
              {filtriAttivi > 0 && <span className="search-filters__count">{filtriAttivi} attivi</span>}
              <svg className="search-filters__chevron" viewBox="0 0 20 20" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="search-filters__content">

          {tipoAccount === 'giocatore' && (
            <div className="subform">
              <div className="field-row">
                <select value={filtri.ruoloCategoria} onChange={(e) => { aggiorna('ruoloCategoria', e.target.value); aggiorna('ruolo', ''); }}>
                  <option value="">Reparto (tutti)</option>
                  {PLAYER_POSITION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <select value={filtri.ruolo} onChange={(e) => aggiorna('ruolo', e.target.value)} disabled={!filtri.ruoloCategoria}>
                  <option value="">Ruolo specifico (tutti)</option>
                  {positionsForCategory(filtri.ruoloCategoria).map((position) => <option key={position} value={position}>{position}</option>)}
                </select>
                <select value={filtri.ruoloSecondario} onChange={(e) => aggiorna('ruoloSecondario', e.target.value)}>
                  <option value="">Ruolo secondario (tutti)</option>
                  {PLAYER_POSITION_CATEGORIES.map((category) => (
                    <optgroup key={category} label={category}>
                      {positionsForCategory(category).map((position) => <option key={position} value={position}>{position}</option>)}
                    </optgroup>
                  ))}
                </select>
                <select value={filtri.piede} onChange={(e) => aggiorna('piede', e.target.value)}>
                  <option value="">Piede (tutti)</option>
                  {PIEDI.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field-row">
                <input type="number" min={14} max={120} inputMode="numeric" placeholder="Età min" value={filtri.etaMin} onChange={(e) => aggiorna('etaMin', e.target.value)} />
                <input type="number" min={14} max={120} inputMode="numeric" placeholder="Età max" value={filtri.etaMax} onChange={(e) => aggiorna('etaMax', e.target.value)} />
              </div>
              <select value={filtri.genere} onChange={(e) => aggiorna('genere', e.target.value)}>
                <option value="">Genere (tutti)</option>
                <option value="uomo">Uomo</option>
                <option value="donna">Donna</option>
                <option value="altro">Altro</option>
              </select>
              <ItalianLocationFields
                region={filtri.regione}
                province={filtri.provincia}
                onRegionChange={(value) => { aggiorna('regione', value); aggiorna('provincia', ''); }}
                onProvinceChange={(value) => aggiorna('provincia', value)}
                idPrefix="search-player"
              />
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
              <select value={filtri.genere} onChange={(e) => aggiorna('genere', e.target.value)}>
                <option value="">Genere (tutti)</option>
                <option value="uomo">Uomo</option>
                <option value="donna">Donna</option>
                <option value="altro">Altro</option>
              </select>
              <select value={filtri.patentino} onChange={(e) => aggiorna('patentino', e.target.value)}>
                <option value="">Tutti i patentini</option>
                {COACH_LICENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filtri.moduloPreferito} onChange={(e) => aggiorna('moduloPreferito', e.target.value)}>
                <option value="">Tutti i moduli</option>
                {FORMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <div className="field-row">
                <input type="number" min={18} max={120} inputMode="numeric" placeholder="Età min" value={filtri.etaMin} onChange={(e) => aggiorna('etaMin', e.target.value)} />
                <input type="number" min={18} max={120} inputMode="numeric" placeholder="Età max" value={filtri.etaMax} onChange={(e) => aggiorna('etaMax', e.target.value)} />
              </div>
              <ItalianLocationFields
                region={filtri.regione}
                province={filtri.provincia}
                onRegionChange={(value) => { aggiorna('regione', value); aggiorna('provincia', ''); }}
                onProvinceChange={(value) => aggiorna('provincia', value)}
                idPrefix="search-coach"
              />
              <select value={filtri.lingua} onChange={(e) => aggiorna('lingua', e.target.value)}>
                <option value="">Tutte le lingue</option>
                {LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
              </select>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaSquadra} onChange={(e) => aggiorna('inCercaSquadra', e.target.checked || undefined)} />
                Solo chi è in cerca di squadra
              </label>
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaGiocatori} onChange={(e) => aggiorna('inCercaGiocatori', e.target.checked || undefined)} />
                Solo allenatori in cerca di giocatori
              </label>
            </div>
          )}

          {tipoAccount === 'scout' && (
            <p className="search-filters__note">Gli scout si cercano esclusivamente per nome e cognome.</p>
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
              <ItalianLocationFields
                region={filtri.regione}
                province={filtri.provincia}
                onRegionChange={(value) => { aggiorna('regione', value); aggiorna('provincia', ''); }}
                onProvinceChange={(value) => aggiorna('provincia', value)}
                idPrefix="search-club"
              />
              <select value={filtri.cercaPatentino} onChange={(e) => aggiorna('cercaPatentino', e.target.value)}>
                <option value="">Patentino cercato (tutti)</option>
                {COACH_LICENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filtri.cercaFormazione} onChange={(e) => aggiorna('cercaFormazione', e.target.value)}>
                <option value="">Modulo cercato (tutti)</option>
                {FORMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select value={filtri.cercaLingua} onChange={(e) => aggiorna('cercaLingua', e.target.value)}>
                <option value="">Lingua cercata (tutte)</option>
                {LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
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

        {cercando && <LoadingSkeleton variant="results" />}
        {!cercando && risultati !== null && (
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
