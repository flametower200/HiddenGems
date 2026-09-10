'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { cerca } from '../../lib/search';

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

  const infoAggiuntiva = (p) => {
    const d = p.dettaglio;
    if (!d) return null;
    if (p.tipo_account === 'giocatore') return [d.ruolo_principale, d.piede, d.nazione].filter(Boolean).join(' · ');
    if (p.tipo_account === 'allenatore') return [d.patentino, d.nazione].filter(Boolean).join(' · ');
    if (p.tipo_account === 'scout') return d.societa_attuale || null;
    if (p.tipo_account === 'societa') return [d.categoria, d.annata_squadra].filter(Boolean).join(' · ');
    return null;
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} />
      <div className="container container--wide">
        <h3>Cerca</h3>

        <form onSubmit={eseguiRicerca} className="card card--panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div className="field">
            <label className="field__label">Tipo</label>
            <select value={tipoAccount} onChange={(e) => cambiaTipo(e.target.value)}>
              <option value="giocatore">Giocatori</option>
              <option value="allenatore">Allenatori</option>
              <option value="scout">Scout</option>
              <option value="societa">Società</option>
            </select>
          </div>

          <input type="text" placeholder="Cerca per nome e cognome..." value={testoRicerca} onChange={(e) => setTestoRicerca(e.target.value)} />

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
              <input type="text" placeholder="Nazione" value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)} />
              <input type="text" placeholder="Stato (svincolato, prestito, club...)" value={filtri.statoContratto} onChange={(e) => aggiorna('statoContratto', e.target.value)} />
              <input type="text" placeholder="Lingua parlata" value={filtri.lingua} onChange={(e) => aggiorna('lingua', e.target.value)} />
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaSquadra} onChange={(e) => aggiorna('inCercaSquadra', e.target.checked || undefined)} />
                Solo chi è in cerca di squadra
              </label>
            </div>
          )}

          {tipoAccount === 'allenatore' && (
            <div className="subform">
              <input type="text" placeholder="Patentino" value={filtri.patentino} onChange={(e) => aggiorna('patentino', e.target.value)} />
              <input type="text" placeholder="Modulo preferito" value={filtri.moduloPreferito} onChange={(e) => aggiorna('moduloPreferito', e.target.value)} />
              <div className="field-row">
                <input type="number" placeholder="Età min" value={filtri.etaMin} onChange={(e) => aggiorna('etaMin', e.target.value)} />
                <input type="number" placeholder="Età max" value={filtri.etaMax} onChange={(e) => aggiorna('etaMax', e.target.value)} />
              </div>
              <input type="text" placeholder="Nazione" value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)} />
              <input type="text" placeholder="Lingua parlata" value={filtri.lingua} onChange={(e) => aggiorna('lingua', e.target.value)} />
              <label className="checkbox-field">
                <input type="checkbox" checked={!!filtri.inCercaSquadra} onChange={(e) => aggiorna('inCercaSquadra', e.target.checked || undefined)} />
                Solo chi è in cerca di squadra
              </label>
            </div>
          )}

          {tipoAccount === 'scout' && (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: 0 }}>
              Gli scout si possono cercare solo per nome e cognome.
            </p>
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
              <input type="text" placeholder="Nazione" value={filtri.nazione} onChange={(e) => aggiorna('nazione', e.target.value)} />
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

          <button type="submit" disabled={cercando} className="btn btn--primary">
            {cercando ? 'Ricerca in corso...' : 'Cerca'}
          </button>
        </form>

        {risultati !== null && (
          <div className="card-stack">
            {risultati.length === 0 ? (
              <p className="state-message">Nessun risultato con questi filtri.</p>
            ) : (
              risultati.map((p) => (
                <Link
                  key={p.id}
                  href={p.id === session.user.id ? '/profilo' : `/profilo/${p.id}`}
                  className={`card card--clickable card--role-${p.tipo_account}`}
                >
                  <h4 style={{ marginBottom: 4 }}>{p.nome} {p.cognome}</h4>
                  <span className={`badge badge--${p.tipo_account}`}>{p.tipo_account}</span>
                  {infoAggiuntiva(p) && <p style={{ marginTop: 8, marginBottom: 0, fontSize: '0.88rem' }}>{infoAggiuntiva(p)}</p>}
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
