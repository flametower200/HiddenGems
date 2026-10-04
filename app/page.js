'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { registraUtente, accedi } from '../lib/registration';
import { caricaListaProfili } from '../lib/profileHelpers';
import AppHeader from '../components/AppHeader';

const RUOLI = ['Portiere', 'Difensore', 'Centrocampista', 'Attaccante'];
const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];
const ANNATE = ['U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Prima Squadra'];

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
    if (session) caricaProfili();
  }, [session, filtroRuolo]);

  const caricaProfili = async () => {
    try {
      const data = await caricaListaProfili(filtroRuolo);
      setProfili(data);
    } catch (error) {
      console.error('Errore caricamento profili:', error.message);
    }
  };

  // Riga informativa in più sotto il badge di ruolo, diversa per ogni tipo account.
  const infoAggiuntiva = (p) => {
    const d = p.dettaglio;
    if (!d) return null;
    if (p.tipo_account === 'giocatore') {
      return [d.ruolo_principale, d.piede, d.nazione].filter(Boolean).join(' · ');
    }
    if (p.tipo_account === 'allenatore') {
      return [d.patentino, d.nazione].filter(Boolean).join(' · ');
    }
    if (p.tipo_account === 'scout') {
      return d.societa_attuale || null;
    }
    if (p.tipo_account === 'societa') {
      return [d.categoria, d.annata_squadra].filter(Boolean).join(' · ');
    }
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    let dettagli = {};
    if (tipoAccount === 'giocatore') {
      dettagli = {
        ruolo_principale: ruoloPrincipale, piede,
        altezza: altezza ? Number(altezza) : null,
        nazione, regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'allenatore') {
      dettagli = {
        patentino, nazione,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'scout') {
      dettagli = {
        societa_attuale: societaAttuale || null, nazione: nazione || null,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
      };
    } else if (tipoAccount === 'societa') {
      dettagli = {
        categoria: categoria || null, genere_squadra: genereSquadra,
        annata_squadra: annataSquadra, nazione: nazione || null,
        regione: nazione === 'Italia' ? regione : null,
        provincia: nazione === 'Italia' ? provincia : null,
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
                  {tipoAccount !== 'societa' && (
                    <>
                      <input type="text" placeholder="Nazione" value={nazione} onChange={(e) => setNazione(e.target.value)} required />
                      {nazione === 'Italia' && (
                        <div className="field-row">
                          <input type="text" placeholder="Regione" value={regione} onChange={(e) => setRegione(e.target.value)} />
                          <input type="text" placeholder="Provincia" value={provincia} onChange={(e) => setProvincia(e.target.value)} />
                        </div>
                      )}
                    </>
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
                    </div>
                  )}

                  {tipoAccount === 'allenatore' && (
                    <div className="subform">
                      <h4>Dettagli allenatore</h4>
                      <input type="text" placeholder="Patentino (es. UEFA B)" value={patentino} onChange={(e) => setPatentino(e.target.value)} required />
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
                      <input type="text" placeholder="Nazione (opzionale)" value={nazione} onChange={(e) => setNazione(e.target.value)} />
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
      <div className="container container--wide">
        <div className="section-title">
          <h3>Bacheca scouting</h3>
          <select value={filtroRuolo} onChange={(e) => setFiltroRuolo(e.target.value)}>
            <option value="tutti">Tutti i profili</option>
            <option value="giocatore">Giocatori</option>
            <option value="allenatore">Allenatori</option>
            <option value="scout">Scout</option>
            <option value="societa">Società</option>
          </select>
        </div>

        <div className="card-stack">
          {profili.length === 0 ? (
            <p className="state-message">Nessun profilo trovato per questa categoria.</p>
          ) : (
            profili.map((p) => (
              <Link
                key={p.id}
                href={p.id === session.user.id ? '/profilo' : `/profilo/${p.id}`}
                className={`card card--clickable card--role-${p.tipo_account}`}
              >
                <h4 style={{ marginBottom: 4 }}>{p.nome} {p.cognome}</h4>
                <span className={`badge badge--${p.tipo_account}`}>{p.tipo_account}</span>
                {infoAggiuntiva(p) && (
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.88rem' }}>{infoAggiuntiva(p)}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
