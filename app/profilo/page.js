'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { getContatoriProfilo } from '../../lib/social';
import { caricaProfiloCompleto, invalidaCacheProfili } from '../../lib/profileHelpers';
import LanguagePicker from '../../components/LanguagePicker';
import {
  COUNTRY_OPTIONS,
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
  canonicalContractStatus,
  countryLabel,
  normalizeCountry,
  normalizeLanguageList,
  withLegacyOption,
} from '../../lib/profileOptions';

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
  const [patentino, setPatentino] = useState('');
  const [moduloPreferito, setModuloPreferito] = useState('');
  const [nazioneProfilo, setNazioneProfilo] = useState('');
  const [regioneProfilo, setRegioneProfilo] = useState('');
  const [provinciaProfilo, setProvinciaProfilo] = useState('');
  const [stileGioco, setStileGioco] = useState('');
  const [societaAttuale, setSocietaAttuale] = useState('');
  const [palmares, setPalmares] = useState('');
  const [categoria, setCategoria] = useState('');
  const [linguePartlate, setLinguePartlate] = useState([]);

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
      setNazioneProfilo(normalizeCountry(d?.nazione));
      setRegioneProfilo(d?.regione || '');
      setProvinciaProfilo(d?.provincia || '');
      if (p.tipo_account === 'giocatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setRuoloSecondario(d.ruolo_secondario || '');
        setPiede(d.piede || 'destro');
        setAltezza(d.altezza ?? '');
        setPeso(d.peso ?? '');
        setStatoContratto(canonicalContractStatus(d.stato_contratto));
        setLinguePartlate(normalizeLanguageList((d.lingue_parlate || []).flatMap((language) => language.split(','))));
      } else if (p.tipo_account === 'allenatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setPatentino(d.patentino || '');
        setModuloPreferito(d.modulo_preferito || '');
        setStileGioco(d.stile_gioco || '');
        setLinguePartlate(normalizeLanguageList((d.lingue_parlate || []).flatMap((language) => language.split(','))));
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
      ({ error: errDettaglio } = await supabase.from('player_details').update({
        in_cerca_squadra: inCercaSquadra,
        ruolo_secondario: ruoloSecondario || null,
        piede,
        altezza: altezza ? Number(altezza) : null,
        peso: peso ? Number(peso) : null,
        stato_contratto: statoContratto || null,
        lingue_parlate: linguePartlate.length ? linguePartlate : null,
        nazione: nazioneProfilo,
        regione: nazioneProfilo === 'IT' ? regioneProfilo || null : null,
        provincia: nazioneProfilo === 'IT' ? provinciaProfilo || null : null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'allenatore') {
      ({ error: errDettaglio } = await supabase.from('coach_details').update({
        in_cerca_squadra: inCercaSquadra,
        patentino,
        modulo_preferito: moduloPreferito || null,
        stile_gioco: stileGioco || null,
        lingue_parlate: linguePartlate.length ? linguePartlate : null,
        nazione: nazioneProfilo,
        regione: nazioneProfilo === 'IT' ? regioneProfilo || null : null,
        provincia: nazioneProfilo === 'IT' ? provinciaProfilo || null : null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'scout') {
      ({ error: errDettaglio } = await supabase.from('scout_details').update({
        in_cerca_squadra: inCercaSquadra,
        societa_attuale: societaAttuale || null,
        nazione: nazioneProfilo || null,
        regione: nazioneProfilo === 'IT' ? regioneProfilo || null : null,
        provincia: nazioneProfilo === 'IT' ? provinciaProfilo || null : null,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'societa') {
      ({ error: errDettaglio } = await supabase.from('club_details').update({
        in_cerca_allenatori: inCercaAllenatori,
        in_cerca_giocatori: inCercaGiocatori,
        palmares: palmares || null,
        categoria: categoria || null,
        nazione: nazioneProfilo || null,
        regione: nazioneProfilo === 'IT' ? regioneProfilo || null : null,
        provincia: nazioneProfilo === 'IT' ? provinciaProfilo || null : null,
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
                  <p><strong>Stato:</strong> {CONTRACT_STATUS_OPTIONS.find((option) => option.value === canonicalContractStatus(dettaglio.stato_contratto))?.label || dettaglio.stato_contratto || '—'}</p>
                  <p style={{ marginBottom: 0 }}><strong>Nazione:</strong> {countryLabel(dettaglio.nazione)} {dettaglio.regione ? `(${dettaglio.regione}, ${dettaglio.provincia || ''})` : ''}</p>
                </>
              )}
              {profilo.tipo_account === 'allenatore' && dettaglio && (
                <>
                  <p><strong>Patentino:</strong> {dettaglio.patentino}</p>
                  <p><strong>Modulo preferito:</strong> {dettaglio.modulo_preferito || '—'}</p>
                  <p><strong>In cerca di squadra:</strong> {dettaglio.in_cerca_squadra ? 'Sì' : 'No'}</p>
                  <p style={{ marginBottom: 0 }}><strong>Nazione:</strong> {countryLabel(dettaglio.nazione)}</p>
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
            <div className="field">
              <label className="field__label" htmlFor="profile-country">Nazione</label>
              <select id="profile-country" value={nazioneProfilo} onChange={(e) => { setNazioneProfilo(e.target.value); setRegioneProfilo(''); setProvinciaProfilo(''); }} required={profilo.tipo_account === 'giocatore' || profilo.tipo_account === 'allenatore'}>
                <option value="">Seleziona una nazione…</option>
                {withLegacyOption(COUNTRY_OPTIONS, nazioneProfilo).map((country) => <option key={country.value} value={country.value}>{country.label}</option>)}
              </select>
            </div>
            {nazioneProfilo === 'IT' && (
              <div className="field-row">
                <input type="text" placeholder="Regione" value={regioneProfilo} onChange={(e) => setRegioneProfilo(e.target.value)} />
                <input type="text" placeholder="Provincia" value={provinciaProfilo} onChange={(e) => setProvinciaProfilo(e.target.value)} />
              </div>
            )}

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
                <div className="field">
                  <label className="field__label" htmlFor="profile-contract-status">Stato contrattuale</label>
                  <select id="profile-contract-status" value={statoContratto} onChange={(e) => setStatoContratto(e.target.value)}>
                    <option value="">Seleziona uno stato…</option>
                    {withLegacyOption(CONTRACT_STATUS_OPTIONS, statoContratto).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <LanguagePicker value={linguePartlate} onChange={setLinguePartlate} />
              </>
            )}

            {profilo.tipo_account === 'allenatore' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <div className="field">
                  <label className="field__label" htmlFor="profile-coach-license">Patentino</label>
                  <select id="profile-coach-license" value={patentino} onChange={(e) => setPatentino(e.target.value)} required>
                    {withLegacyOption(COACH_LICENSE_OPTIONS, patentino).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="profile-formation">Modulo preferito</label>
                  <select id="profile-formation" value={moduloPreferito} onChange={(e) => setModuloPreferito(e.target.value)}>
                    <option value="">Seleziona un modulo…</option>
                    {withLegacyOption(FORMATION_OPTIONS, moduloPreferito).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <input type="text" placeholder="Stile di gioco" value={stileGioco} onChange={(e) => setStileGioco(e.target.value)} />
                <LanguagePicker value={linguePartlate} onChange={setLinguePartlate} />
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
