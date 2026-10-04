'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { registraUtente, accedi } from '../lib/registration';
import { caricaListaProfili } from '../lib/profileHelpers';
import AppHeader from '../components/AppHeader';
import LanguagePicker from '../components/LanguagePicker';
import ProfileCard from '../components/ProfileCard';
import {
  COUNTRY_OPTIONS,
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
} from '../lib/profileOptions';

const RUOLI = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];
const ETICHETTE_FILTRO = {
  tutti: 'Profili nella rete',
  giocatore: 'Giocatori',
  allenatore: 'Allenatori',
  scout: 'Scout',
  societa: 'Società',
};

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [genere, setGenere] = useState('');
  const [tipoAccount, setTipoAccount] = useState('giocatore');
  const [dataNascita, setDataNascita] = useState('');
  const [nazione, setNazione] = useState('');
  const [regione, setRegione] = useState('');
  const [provincia, setProvincia] = useState('');

  const [ruoloPrincipale, setRuoloPrincipale] = useState('Attaccante');
  const [piede, setPiede] = useState('destro');
  const [altezza, setAltezza] = useState('');
  const [patentino, setPatentino] = useState('');
  const [statoContratto, setStatoContratto] = useState('');
  const [moduloPreferito, setModuloPreferito] = useState('');
  const [lingueParlate, setLingueParlate] = useState([]);
  const [societaAttuale, setSocietaAttuale] = useState('');
  const [genereSquadra, setGenereSquadra] = useState('maschile');
  const [annataSquadra, setAnnataSquadra] = useState('Prima Squadra');
  const [categoria, setCategoria] = useState('');

  const [profili, setProfili] = useState([]);
  const [filtroRuolo, setFiltroRuolo] = useState('tutti');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let attivo = true;
    caricaListaProfili(filtroRuolo)
      .then((data) => { if (attivo) setProfili(data); })
      .catch((error) => console.error('Errore caricamento profili:', error.message));
    return () => { attivo = false; };
  }, [session, filtroRuolo]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    let dettagli = {};
    if (tipoAccount === 'giocatore') {
      dettagli = {
        ruolo_principale: ruoloPrincipale, piede,
        altezza: altezza ? Number(altezza) : null,
        stato_contratto: statoContratto || null,
        lingue_parlate: lingueParlate.length ? lingueParlate : null,
        nazione, regione: nazione === 'IT' ? regione : null,
        provincia: nazione === 'IT' ? provincia : null,
      };
    } else if (tipoAccount === 'allenatore') {
      dettagli = {
        patentino, modulo_preferito: moduloPreferito || null,
        lingue_parlate: lingueParlate.length ? lingueParlate : null,
        nazione, regione: nazione === 'IT' ? regione : null,
        provincia: nazione === 'IT' ? provincia : null,
      };
    } else if (tipoAccount === 'scout') {
      dettagli = {
        societa_attuale: societaAttuale || null,
        nazione: nazione || null,
        regione: nazione === 'IT' ? regione || null : null,
        provincia: nazione === 'IT' ? provincia || null : null,
      };
    } else if (tipoAccount === 'societa') {
      dettagli = {
        categoria: categoria || null, genere_squadra: genereSquadra,
        annata_squadra: annataSquadra, nazione: nazione || null,
        regione: nazione === 'IT' ? regione || null : null,
        provincia: nazione === 'IT' ? provincia || null : null,
      };
    }

    try {
      const { richiedeConfermaEmail } = await registraUtente({
        email, password, confermaPassword,
        tipoAccount, nome,
        cognome: tipoAccount === 'societa' ? undefined : cognome,
        genere: tipoAccount === 'societa' ? genereSquadra : genere,
        dataNascita: tipoAccount === 'societa' ? undefined : dataNascita,
        dettagli,
      });

      if (richiedeConfermaEmail) {
        alert('Registrazione avviata! Controlla la tua email per confermare l\'account prima di accedere.');
        setMode('login');
      }
    } catch (err) {
      alert('Errore registrazione: ' + err.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await accedi(email, password);
    } catch (err) {
      alert('Errore login: ' + err.message);
    }
    setLoading(false);
  };

  if (loading) return <div className="state-message">Caricamento in corso...</div>;

  if (!session) {
    return (
      <main className="page auth-shell">
        <div className="auth-card">
            <div className="auth-brand">
              <span className="brand-badge">HG</span>
              <h1>HiddenGems</h1>
              <p>Il campo dove i talenti si fanno notare</p>
            </div>

            <div className="auth-toggle">
              <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>Accedi</button>
              <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>Registrati</button>
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="auth-form">
              {mode === 'register' && (
                <>
                  <div className="field">
                    <label className="field__label">Tipo account</label>
                    <select value={tipoAccount} onChange={(e) => setTipoAccount(e.target.value)}>
                      <option value="giocatore">Giocatore</option>
                      <option value="allenatore">Allenatore</option>
                      <option value="scout">Scout</option>
                      <option value="societa">Società</option>
                    </select>
                  </div>

                  <input type="text" placeholder={tipoAccount === 'societa' ? 'Nome società' : 'Nome'} value={nome} onChange={(e) => setNome(e.target.value)} required />

                  {tipoAccount !== 'societa' && (
                    <input type="text" placeholder="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} required />
                  )}
                  {tipoAccount !== 'societa' && (
                    <input type="text" placeholder="Genere" value={genere} onChange={(e) => setGenere(e.target.value)} />
                  )}
                  {tipoAccount !== 'societa' && (
                    <div className="field">
                      <label className="field__label">Data di nascita</label>
                      <input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required />
                    </div>
                  )}
                  <div className="field">
                    <label className="field__label" htmlFor="registration-country">Nazione</label>
                    <select id="registration-country" value={nazione} onChange={(e) => { setNazione(e.target.value); setRegione(''); setProvincia(''); }} required={tipoAccount === 'giocatore' || tipoAccount === 'allenatore'}>
                      <option value="">Seleziona una nazione…</option>
                      {COUNTRY_OPTIONS.map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
                    </select>
                  </div>
                  {nazione === 'IT' && (
                    <div className="field-row">
                      <input type="text" placeholder="Regione" value={regione} onChange={(e) => setRegione(e.target.value)} />
                      <input type="text" placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
                    </div>
                  )}

                  {tipoAccount === 'giocatore' && (
                    <div className="subform">
                      <h4>Dettagli giocatore</h4>
                      <select value={ruoloPrincipale} onChange={(e) => setRuoloPrincipale(e.target.value)}>
                        {RUOLI.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select value={piede} onChange={(e) => setPiede(e.target.value)}>
                        {PIEDI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      <input type="number" placeholder="Altezza (cm)" value={altezza} onChange={(e) => setAltezza(e.target.value)} />
                      <div className="field">
                        <label className="field__label" htmlFor="registration-contract-status">Stato contrattuale</label>
                        <select id="registration-contract-status" value={statoContratto} onChange={(e) => setStatoContratto(e.target.value)}>
                          <option value="">Seleziona uno stato…</option>
                          {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <LanguagePicker value={lingueParlate} onChange={setLingueParlate} />
                    </div>
                  )}

                  {tipoAccount === 'allenatore' && (
                    <div className="subform">
                      <h4>Dettagli allenatore</h4>
                      <div className="field">
                        <label className="field__label" htmlFor="registration-coach-license">Patentino</label>
                        <select id="registration-coach-license" value={patentino} onChange={(e) => setPatentino(e.target.value)} required>
                          <option value="">Seleziona un patentino…</option>
                          {COACH_LICENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor="registration-formation">Modulo preferito</label>
                        <select id="registration-formation" value={moduloPreferito} onChange={(e) => setModuloPreferito(e.target.value)}>
                          <option value="">Seleziona un modulo…</option>
                          {FORMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <LanguagePicker value={lingueParlate} onChange={setLingueParlate} />
                    </div>
                  )}

                  {tipoAccount === 'scout' && (
                    <div className="subform">
                      <h4>Dettagli scout</h4>
                      <input type="text" placeholder="Società attuale (opzionale)" value={societaAttuale} onChange={(e) => setSocietaAttuale(e.target.value)} />
                    </div>
                  )}

                  {tipoAccount === 'societa' && (
                    <div className="subform">
                      <h4>Dettagli società</h4>
                      <select value={genereSquadra} onChange={(e) => setGenereSquadra(e.target.value)}>
                        <option value="maschile">Maschile</option>
                        <option value="femminile">Femminile</option>
                      </select>
                      <select value={annataSquadra} onChange={(e) => setAnnataSquadra(e.target.value)}>
                        {ANNATE.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <input type="text" placeholder="Categoria (opzionale)" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                    </div>
                  )}
                </>
              )}

              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {mode === 'register' && (
                <input type="password" placeholder="Conferma password" value={confermaPassword} onChange={(e) => setConfermaPassword(e.target.value)} required />
              )}

              <button type="submit" className="btn btn--primary btn--block">
                {mode === 'login' ? 'Accedi' : 'Crea account'}
              </button>
            </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <AppHeader session={session} theme="bacheca" />
      <div className="container container--wide directory-screen">
        <div className="directory-heading">
          <div>
            <p className="page-eyebrow">SCOUTING / NETWORK</p>
            <h1>Bacheca scouting</h1>
            <p>Talenti, staff e società. Un punto di partenza per la prossima opportunità.</p>
          </div>
          <label className="directory-filter">
            <span>Esplora per ruolo</span>
            <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
            <option value="tutti">Tutti i profili</option>
            <option value="giocatore">Giocatori</option>
            <option value="allenatore">Allenatori</option>
            <option value="scout">Scout</option>
            <option value="societa">Società</option>
            </select>
          </label>
        </div>

        <div className="directory-results-heading">
          <h2>{ETICHETTE_FILTRO[filtroRuolo] || ETICHETTE_FILTRO.tutti}</h2>
          <span>{profili.length} {profili.length === 1 ? 'profilo' : 'profili'}</span>
        </div>

        <div className="talent-grid">
          {profili.length === 0 ? (
            <div className="directory-empty">
              <span className="directory-empty__mark" aria-hidden="true">HG</span>
              <h2>Nessun profilo ancora</h2>
              <p>Prova un altro filtro o torna più tardi per scoprire nuovi membri della rete.</p>
              {filtroRuolo !== 'tutti' && <button type="button" className="btn btn--outline" onClick={() => setFiltroRuolo('tutti')}>Mostra tutti i profili</button>}
              {filtroRuolo === 'tutti' && <Link className="btn btn--secondary" href="/cerca">Cerca nella rete</Link>}
            </div>
          ) : (
            profili.map((profile) => <ProfileCard key={profile.id} profile={profile} currentUserId={session.user.id} />)
          )}
        </div>
      </div>
    </main>
  );
}
