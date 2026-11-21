'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { registraUtente, accedi } from '../lib/registration';
import LanguagePicker from '../components/LanguagePicker';
import ItalianLocationFields from '../components/ItalianLocationFields';
import PlayerPositionFields from '../components/PlayerPositionFields';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastProvider';
import Feed from './feed/page';
import {
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
} from '../lib/profileOptions';

const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];
export default function Home() {
  const notify = useToast();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [authView, setAuthView] = useState(false);
  const [formError, setFormError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [genere, setGenere] = useState('');
  const [tipoAccount, setTipoAccount] = useState('giocatore');
  const [dataNascita, setDataNascita] = useState('');
  const [regione, setRegione] = useState('');
  const [provincia, setProvincia] = useState('');

  const [ruoloPrincipale, setRuoloPrincipale] = useState('Punta centrale');
  const [ruoloSecondario, setRuoloSecondario] = useState('');
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

  const openAuth = (nextMode) => {
    setMode(nextMode);
    setFormError('');
    setAuthView(true);
    window.scrollTo(0, 0);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    let dettagli = {};
    if (tipoAccount === 'giocatore') {
      dettagli = {
        ruolo_principale: ruoloPrincipale, piede,
        altezza: altezza ? Number(altezza) : null,
        stato_contratto: statoContratto || null,
        lingue_parlate: lingueParlate.length ? lingueParlate : null,
        ruolo_secondario: ruoloSecondario || null,
        nazione: 'IT', regione, provincia,
      };
    } else if (tipoAccount === 'allenatore') {
      dettagli = {
        patentino, modulo_preferito: moduloPreferito || null,
        lingue_parlate: lingueParlate.length ? lingueParlate : null,
        nazione: 'IT', regione, provincia,
      };
    } else if (tipoAccount === 'scout') {
      dettagli = {
        societa_attuale: societaAttuale || null,
        nazione: 'IT',
        regione,
        provincia,
      };
    } else if (tipoAccount === 'societa') {
      dettagli = {
        categoria: categoria || null, genere_squadra: genereSquadra,
        annata_squadra: annataSquadra,
        nazione: 'IT',
        regione,
        provincia,
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
        notify({ type: 'success', message: 'Registrazione avviata. Controlla la tua email per confermare l’account.' });
        setMode('login');
      }
    } catch (err) {
      setFormError(err.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    try {
      await accedi(email, password);
    } catch (err) {
      setFormError(err.message);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSkeleton variant="auth" />;

  if (session) return <Feed />;

  return (
    <div className="landing-shell">
      <header className="landing-header">
        <Link className="landing-brand" href="/" aria-label="HiddenGems, pagina iniziale">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 2 30 16 16 30 2 16 16 2Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16 7 25 16 16 25 7 16 16 7Z" fill="currentColor" />
            <path d="M16 7v18M7 16h18" stroke="#163022" strokeWidth="1.5" />
          </svg>
          <span>HiddenGems</span>
        </Link>
        <nav className="landing-header__actions" aria-label="Accesso">
          {authView ? (
            <button type="button" className="landing-nav-link" onClick={() => { setAuthView(false); setFormError(''); }}>
              Torna alla presentazione
            </button>
          ) : (
            <>
              <button type="button" className="landing-nav-link" onClick={() => openAuth('login')}>
                Accedi
              </button>
              <button type="button" className="landing-nav-cta" onClick={() => openAuth('register')}>
                Registrati
              </button>
            </>
          )}
        </nav>
      </header>

      {!authView ? (
        <main className="landing-main">
          <section className="landing-hero">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow"><span /> SCOUTING, SENZA BARRIERE</p>
              <h1>Il campo torna <span>a parlare.</span></h1>
              <p className="landing-hero__description">
                Qui conta il talento, non conoscere le persone giuste. HiddenGems mette
                in contatto giocatori, allenatori, scout e società, dando spazio alle
                capacità mostrate in campo e aiutando a scoprire nuovi profili.
              </p>
              <div className="landing-hero__actions">
                <button type="button" className="landing-primary-cta" onClick={() => openAuth('register')}>
                  Entra nella rete <span aria-hidden="true">→</span>
                </button>
                <a className="landing-secondary-cta" href="#come-funziona">Scopri come funziona</a>
              </div>
            </div>

            <div className="landing-hero__visual" aria-hidden="true">
              <div className="landing-visual__topline"><span>HIDDEN GEMS / ITALIA</span><span>01 — 04</span></div>
              <div className="landing-pitch">
                <span className="landing-pitch__halfway" />
                <span className="landing-pitch__circle" />
                <span className="landing-pitch__box landing-pitch__box--top" />
                <span className="landing-pitch__box landing-pitch__box--bottom" />
                <span className="landing-pitch__spot landing-pitch__spot--one" />
                <span className="landing-pitch__spot landing-pitch__spot--two" />
                <span className="landing-pitch__spot landing-pitch__spot--three" />
                <div className="landing-signal landing-signal--one"><i /> TALENTO IN MOVIMENTO</div>
                <div className="landing-signal landing-signal--two"><i /> NUOVE CONNESSIONI</div>
              </div>
              <div className="landing-visual__footer">
                <span>Il prossimo nome da ricordare</span>
                <strong>potrebbe essere il tuo.</strong>
              </div>
            </div>
          </section>

          <section className="landing-intro" id="come-funziona">
            <div className="landing-intro__heading">
              <p className="landing-eyebrow">UNA RETE PIÙ APERTA</p>
              <h2>Il talento c’è.<br />Facciamolo incontrare.</h2>
            </div>
            <p>
              Nel calcio, emergere non dovrebbe dipendere dalle conoscenze o dalla
              geografia. HiddenGems rende più semplice scoprire persone e percorsi
              calcistici, dando a ogni profilo uno spazio per raccontarsi e a chi
              cerca nuove figure strumenti per orientarsi.
            </p>
          </section>

          <section className="landing-features" aria-label="Cosa puoi fare su HiddenGems">
            <article className="landing-feature landing-feature--primary">
              <span className="landing-feature__index">01 / GIOCATORI</span>
              <div className="landing-feature__icon landing-feature__icon--play" aria-hidden="true">▶</div>
              <h3>Fatti vedere in campo.</h3>
              <p>Racconta il tuo profilo e condividi i video delle tue giocate con una rete che cerca nuovi talenti.</p>
              <span className="landing-feature__link">Profilo e video <span aria-hidden="true">↗</span></span>
            </article>
            <article className="landing-feature">
              <span className="landing-feature__index">02 / SCOUTING</span>
              <div className="landing-feature__icon" aria-hidden="true">⌕</div>
              <h3>Trova il profilo giusto.</h3>
              <p>Cerca per ruolo, caratteristiche e zona. Scopri giocatori e professionisti anche fuori dai circuiti abituali.</p>
              <span className="landing-feature__link">Ricerca mirata <span aria-hidden="true">↗</span></span>
            </article>
            <article className="landing-feature">
              <span className="landing-feature__index">03 / PERCORSI</span>
              <div className="landing-feature__icon" aria-hidden="true">↗</div>
              <h3>Costruisci connessioni.</h3>
              <p>Presenta la tua esperienza, segui i profili interessanti e avvia conversazioni in modo diretto e trasparente.</p>
              <span className="landing-feature__link">Una rete, più vicina <span aria-hidden="true">↗</span></span>
            </article>
          </section>

          <section className="landing-closing">
            <div>
              <p className="landing-eyebrow">IL PROSSIMO PASSO È TUO</p>
              <h2>Il talento merita<br />un campo più grande.</h2>
            </div>
            <button type="button" className="landing-primary-cta" onClick={() => openAuth('register')}>
              Crea il tuo profilo <span aria-hidden="true">→</span>
            </button>
          </section>
          <footer className="landing-footer">
            <span>HiddenGems</span>
            <span>Una rete più aperta per il calcio.</span>
          </footer>
        </main>
      ) : (
        <main className="page auth-shell landing-auth">
          <div className="auth-card">
            <div className="auth-brand">
              <span className="brand-badge">HG</span>
              <h1>{mode === 'login' ? 'Bentornato' : 'Entra nella rete'}</h1>
              <p>{mode === 'login' ? 'Accedi al tuo spazio HiddenGems' : 'Crea il tuo profilo HiddenGems'}</p>
            </div>

            <div className="auth-toggle">
              <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setFormError(''); }}>Accedi</button>
              <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setFormError(''); }}>Registrati</button>
            </div>

            {formError && <p className="form-error" role="alert">{formError}</p>}
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="auth-form">
              {mode === 'register' && (
                <>
                  <div className="field">
                    <label className="field__label">Tipo account</label>
                    <select value={tipoAccount} onChange={(e) => { setTipoAccount(e.target.value); setDataNascita(''); setFormError(''); }}>
                      <option value="giocatore">Giocatore</option>
                      <option value="allenatore">Allenatore</option>
                      <option value="scout">Scout</option>
                      <option value="societa">Società</option>
                    </select>
                  </div>

                  <input type="text" autoComplete="given-name" maxLength={100} placeholder={tipoAccount === 'societa' ? 'Nome società' : 'Nome'} value={nome} onChange={(e) => setNome(e.target.value)} required />

                  {tipoAccount !== 'societa' && (
                    <input type="text" autoComplete="family-name" maxLength={100} placeholder="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} required />
                  )}
                  {tipoAccount !== 'societa' && (
                    <select value={genere} onChange={(e) => setGenere(e.target.value)} required aria-label="Genere">
                      <option value="">Seleziona il genere…</option>
                      <option value="uomo">Uomo</option>
                      <option value="donna">Donna</option>
                      <option value="altro">Altro</option>
                    </select>
                  )}
                  {tipoAccount !== 'societa' && (
                    <div className="field">
                      <label className="field__label">Data di nascita</label>
                      <input
                        type="date"
                        value={dataNascita}
                        max={(() => {
                          const limite = new Date();
                          limite.setFullYear(limite.getFullYear() - (tipoAccount === 'giocatore' ? 14 : 18));
                          return limite.toISOString().slice(0, 10);
                        })()}
                        onChange={(e) => setDataNascita(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <ItalianLocationFields
                    region={regione}
                    province={provincia}
                    onRegionChange={setRegione}
                    onProvinceChange={setProvincia}
                    idPrefix="registration"
                    required
                  />

                  {tipoAccount === 'giocatore' && (
                    <div className="subform">
                      <h4>Dettagli giocatore</h4>
                      <PlayerPositionFields
                        position={ruoloPrincipale}
                        onPositionChange={setRuoloPrincipale}
                        secondaryPosition={ruoloSecondario}
                        onSecondaryPositionChange={setRuoloSecondario}
                        idPrefix="registration-player"
                      />
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

              <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} placeholder="Password (almeno 8 caratteri)" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {mode === 'register' && (
                <input type="password" autoComplete="new-password" minLength={8} placeholder="Conferma password" value={confermaPassword} onChange={(e) => setConfermaPassword(e.target.value)} required />
              )}

              <button type="submit" disabled={loading} className="btn btn--primary btn--block">
                {loading ? <><span className="button-spinner" aria-hidden="true" /> Attendi…</> : mode === 'login' ? 'Accedi' : 'Crea account'}
              </button>
            </form>
          </div>
        </main>
      )}
    </div>
  );
}
