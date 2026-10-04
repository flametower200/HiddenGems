'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { getContatoriProfilo } from '../../lib/social';
import { caricaProfiloCompleto, invalidaCacheProfili } from '../../lib/profileHelpers';

const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];

export default function MioProfilo() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilo, setProfilo] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);
  const [contatori, setContatori] = useState({ follower: 0, seguiti: 0, preferiti: 0 });
  const [modifica, setModifica] = useState(false);
  const [salvataggio, setSalvataggio] = useState(false);
  const [caricandoFoto, setCaricandoFoto] = useState(false);

  const [bio, setBio] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [inCercaSquadra, setInCercaSquadra] = useState(false);
  const [inCercaAllenatori, setInCercaAllenatori] = useState(false);
  const [inCercaGiocatori, setInCercaGiocatori] = useState(false);
  const [ruoloSecondario, setRuoloSecondario] = useState('');
  const [piede, setPiede] = useState('destro');
  const [altezza, setAltezza] = useState('');
  const [peso, setPeso] = useState('');
  const [statoContratto, setStatoContratto] = useState('');
  const [moduloPreferito, setModuloPreferito] = useState('');
  const [stileGioco, setStileGioco] = useState('');
  const [societaAttuale, setSocietaAttuale] = useState('');
  const [palmares, setPalmares] = useState('');
  const [categoria, setCategoria] = useState('');
  const [linguePartlate, setLinguePartlate] = useState('');

  const caricaProfilo = useCallback(async (userId) => {
    setLoading(true);
    try {
      const [{ profilo: p, dettaglio: d }, c] = await Promise.all([
        caricaProfiloCompleto(userId),
        getContatoriProfilo(userId),
      ]);
      setProfilo(p);
      setDettaglio(d);

      setBio(p.bio || '');
      setFotoUrl(p.foto_url || '');
      if (p.tipo_account === 'giocatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setRuoloSecondario(d.ruolo_secondario || '');
        setPiede(d.piede || 'destro');
        setAltezza(d.altezza ?? '');
        setPeso(d.peso ?? '');
        setStatoContratto(d.stato_contratto || '');
        setLinguePartlate((d.lingue_parlate || []).join(', '));
      } else if (p.tipo_account === 'allenatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setModuloPreferito(d.modulo_preferito || '');
        setStileGioco(d.stile_gioco || '');
        setLinguePartlate((d.lingue_parlate || []).join(', '));
      } else if (p.tipo_account === 'scout' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setSocietaAttuale(d.societa_attuale || '');
      } else if (p.tipo_account === 'societa' && d) {
        setInCercaAllenatori(!!d.in_cerca_allenatori);
        setInCercaGiocatori(!!d.in_cerca_giocatori);
        setPalmares(d.palmares || '');
        setCategoria(d.categoria || '');
      }

      setContatori(c);
    } catch (err) {
      console.error('Errore caricamento profilo:', err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) caricaProfilo(session.user.id);
      else setLoading(false);
    });
  }, [caricaProfilo]);

  const handleCaricaFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Immagine troppo grande: massimo 3MB.');
      return;
    }
    setCaricandoFoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const estensione = file.name.split('.').pop();
      const percorso = `${user.id}/avatar-${Date.now()}.${estensione}`;
      const { error: errUpload } = await supabase.storage.from('avatars').upload(percorso, file, { upsert: true });
      if (errUpload) throw errUpload;
      const { data: pubblico } = supabase.storage.from('avatars').getPublicUrl(percorso);
      setFotoUrl(pubblico.publicUrl);
    } catch (err) {
      alert('Errore caricamento foto: ' + err.message + '\n\nSe non hai ancora eseguito sql/05_storage_avatars.sql su Supabase, l\'upload non funziona finché non lo fai.');
    }
    setCaricandoFoto(false);
  };

  const salva = async () => {
    setSalvataggio(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error: errProfilo } = await supabase
      .from('profiles')
      .update({ bio: bio.slice(0, 500), foto_url: fotoUrl || null })
      .eq('id', user.id);

    let errDettaglio = null;
    if (profilo.tipo_account === 'giocatore') {
      const lingue = linguePartlate.split(',').map((s) => s.trim()).filter(Boolean);
      ({ error: errDettaglio } = await supabase.from('player_details').update({
        in_cerca_squadra: inCercaSquadra,
        ruolo_secondario: ruoloSecondario || null,
        piede,
        altezza: altezza ? Number(altezza) : null,
        peso: peso ? Number(peso) : null,
        stato_contratto: statoContratto || null,
        lingue_parlate: lingue.length ? lingue : null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'allenatore') {
      const lingue = linguePartlate.split(',').map((s) => s.trim()).filter(Boolean);
      ({ error: errDettaglio } = await supabase.from('coach_details').update({
        in_cerca_squadra: inCercaSquadra,
        modulo_preferito: moduloPreferito || null,
        stile_gioco: stileGioco || null,
        lingue_parlate: lingue.length ? lingue : null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'scout') {
      ({ error: errDettaglio } = await supabase.from('scout_details').update({
        in_cerca_squadra: inCercaSquadra,
        societa_attuale: societaAttuale || null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'societa') {
      ({ error: errDettaglio } = await supabase.from('club_details').update({
        in_cerca_allenatori: inCercaAllenatori,
        in_cerca_giocatori: inCercaGiocatori,
        palmares: palmares || null,
        categoria: categoria || null,
      }).eq('profile_id', user.id));
    }

    setSalvataggio(false);
    if (errProfilo || errDettaglio) {
      alert('Errore salvataggio: ' + (errProfilo?.message || errDettaglio?.message));
      return;
    }
    invalidaCacheProfili();
    setModifica(false);
    caricaProfilo(user.id);
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;
  if (!profilo) return <div className="state-message">Profilo non trovato.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="profilo" />
      <div className="container">
        <div className="profile-head">
          <Image src={fotoUrl || 'https://placehold.co/80x80?text=%20'} alt="" width={80} height={80} unoptimized loading="eager" className="avatar" />
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

        {!modifica ? (
          <>
            <div className="card card--panel">
              {profilo.tipo_account === 'giocatore' && dettaglio && (
                <>
                  <p><strong>Ruolo:</strong> {dettaglio.ruolo_principale} {dettaglio.ruolo_secondario ? `/ ${dettaglio.ruolo_secondario}` : ''}</p>
                  <p><strong>Piede:</strong> {dettaglio.piede || '—'}</p>
                  <p><strong>Altezza/Peso:</strong> {dettaglio.altezza || '—'} cm / {dettaglio.peso || '—'} kg</p>
                  <p><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
                  <p><strong>Stato:</strong> {dettaglio.stato_contratto || '—'}</p>
                  <p style={{ marginBottom: 0 }}><strong>Nazione:</strong> {dettaglio.nazione} {dettaglio.regione ? `(${dettaglio.regione}, ${dettaglio.provincia || ''})` : ''}</p>
                </>
              )}
              {profilo.tipo_account === 'allenatore' && dettaglio && (
                <>
                  <p><strong>Patentino:</strong> {dettaglio.patentino}</p>
                  <p><strong>Modulo preferito:</strong> {dettaglio.modulo_preferito || '—'}</p>
                  <p><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
                  <p style={{ marginBottom: 0 }}><strong>Nazione:</strong> {dettaglio.nazione}</p>
                </>
              )}
              {profilo.tipo_account === 'scout' && dettaglio && (
                <>
                  <p><strong>Società attuale:</strong> {dettaglio.societa_attuale || '—'}</p>
                  <p style={{ marginBottom: 0 }}><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
                </>
              )}
              {profilo.tipo_account === 'societa' && dettaglio && (
                <>
                  <p><strong>Categoria:</strong> {dettaglio.categoria || '—'}</p>
                  <p><strong>Annata:</strong> {dettaglio.annata_squadra}</p>
                  <p style={{ marginBottom: 0 }}><strong>Palmares:</strong> {dettaglio.palmares || '—'}</p>
                </>
              )}
              {profilo.bio && <p style={{ marginTop: 12, marginBottom: 0 }}>{profilo.bio}</p>}
            </div>
            <button onClick={() => setModifica(true)} className="btn btn--primary" style={{ marginTop: 16 }}>
              Modifica profilo
            </button>
          </>
        ) : (
          <div className="card card--panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label className="field__label">Foto profilo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Image src={fotoUrl || 'https://placehold.co/56x56?text=%20'} alt="" width={56} height={56} unoptimized className="avatar" style={{ width: 56, height: 56 }} />
                <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                  {caricandoFoto ? 'Caricamento...' : 'Scegli immagine'}
                  <input type="file" accept="image/*" onChange={handleCaricaFoto} disabled={caricandoFoto} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div className="field">
              <label className="field__label">Descrizione (max 500 caratteri)</label>
              <textarea value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} rows={4} />
            </div>

            {profilo.tipo_account === 'giocatore' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <input type="text" placeholder="Ruolo secondario" value={ruoloSecondario} onChange={(e) => setRuoloSecondario(e.target.value)} />
                <select value={piede} onChange={(e) => setPiede(e.target.value)}>
                  {PIEDI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <div className="field-row">
                  <input type="number" placeholder="Altezza (cm)" value={altezza} onChange={(e) => setAltezza(e.target.value)} />
                  <input type="number" placeholder="Peso (kg)" value={peso} onChange={(e) => setPeso(e.target.value)} />
                </div>
                <input type="text" placeholder="Stato (es. svincolato, prestito, club)" value={statoContratto} onChange={(e) => setStatoContratto(e.target.value)} />
                <input type="text" placeholder="Lingue parlate (separate da virgola)" value={linguePartlate} onChange={(e) => setLinguePartlate(e.target.value)} />
              </>
            )}

            {profilo.tipo_account === 'allenatore' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <input type="text" placeholder="Modulo preferito" value={moduloPreferito} onChange={(e) => setModuloPreferito(e.target.value)} />
                <input type="text" placeholder="Stile di gioco" value={stileGioco} onChange={(e) => setStileGioco(e.target.value)} />
                <input type="text" placeholder="Lingue parlate (separate da virgola)" value={linguePartlate} onChange={(e) => setLinguePartlate(e.target.value)} />
              </>
            )}

            {profilo.tipo_account === 'scout' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <input type="text" placeholder="Società attuale" value={societaAttuale} onChange={(e) => setSocietaAttuale(e.target.value)} />
              </>
            )}

            {profilo.tipo_account === 'societa' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaAllenatori} onChange={(e) => setInCercaAllenatori(e.target.checked)} /> In cerca di allenatori</label>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaGiocatori} onChange={(e) => setInCercaGiocatori(e.target.checked)} /> In cerca di giocatori</label>
                <input type="text" placeholder="Palmares" value={palmares} onChange={(e) => setPalmares(e.target.value)} />
                <input type="text" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
              </>
            )}

            <div className="action-row" style={{ marginTop: 6, marginBottom: 0 }}>
              <button onClick={salva} disabled={salvataggio} className="btn btn--primary">
                {salvataggio ? 'Salvataggio...' : 'Salva'}
              </button>
              <button onClick={() => setModifica(false)} className="btn btn--outline">Annulla</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
