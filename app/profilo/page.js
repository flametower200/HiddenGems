'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import ProfileStatGrid from '../../components/ProfileStatGrid';
import CareerEditor from '../../components/CareerEditor';
import ItalianLocationFields from '../../components/ItalianLocationFields';
import PlayerPositionFields from '../../components/PlayerPositionFields';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { getContatoriProfilo } from '../../lib/social';
import { caricaProfiloCompleto, invalidaCacheProfili } from '../../lib/profileHelpers';
import LanguagePicker from '../../components/LanguagePicker';
import { caricaRosaSocieta, aggiungiMembroRosa, rimuoviMembroRosa } from '../../lib/clubRoster';
import { useToast } from '../../components/ToastProvider';
import {
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
  LANGUAGE_OPTIONS,
  canonicalContractStatus,
  normalizeLanguageList,
  withLegacyOption,
} from '../../lib/profileOptions';

const PIEDI = [
  { value: 'destro', label: 'Destro' },
  { value: 'sinistro', label: 'Sinistro' },
  { value: 'ambidestro', label: 'Ambidestro' },
];
const AVATAR_FORMATS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function etaDaData(dataNascita) {
  if (!dataNascita) return null;
  const nascita = new Date(`${dataNascita}T00:00:00`);
  if (Number.isNaN(nascita.getTime())) return null;
  const oggi = new Date();
  let eta = oggi.getFullYear() - nascita.getFullYear();
  if (oggi.getMonth() < nascita.getMonth() || (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate())) eta -= 1;
  return eta;
}

export default function MioProfilo() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState('');
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
  const [ruoloPrincipale, setRuoloPrincipale] = useState('');
  const [ruoloSecondario, setRuoloSecondario] = useState('');
  const [piede, setPiede] = useState('destro');
  const [altezza, setAltezza] = useState('');
  const [peso, setPeso] = useState('');
  const [statoContratto, setStatoContratto] = useState('');
  const [patentino, setPatentino] = useState('');
  const [moduloPreferito, setModuloPreferito] = useState('');
  const [regioneProfilo, setRegioneProfilo] = useState('');
  const [provinciaProfilo, setProvinciaProfilo] = useState('');
  const [stileGioco, setStileGioco] = useState('');
  const [societaAttuale, setSocietaAttuale] = useState('');
  const [palmares, setPalmares] = useState('');
  const [categoria, setCategoria] = useState('');
  const [linguePartlate, setLinguePartlate] = useState([]);
  const [carriera, setCarriera] = useState([]);
  const [erroreCarriera, setErroreCarriera] = useState('');
  const [inCercaGiocatoriAllenatore, setInCercaGiocatoriAllenatore] = useState(false);
  const [cercaPatentino, setCercaPatentino] = useState('');
  const [cercaFormazione, setCercaFormazione] = useState('');
  const [cercaLingua, setCercaLingua] = useState('');
  const [rosaGiocatori, setRosaGiocatori] = useState([]);
  const [rosaAllenatori, setRosaAllenatori] = useState([]);
  const [profiliDisponibili, setProfiliDisponibili] = useState([]);
  const [membroRosaId, setMembroRosaId] = useState('');
  const [membroRosaRuolo, setMembroRosaRuolo] = useState('giocatore');
  const [squadraAttuale, setSquadraAttuale] = useState(null);
  const notify = useToast();

  const caricaProfilo = useCallback(async (userId) => {
    setLoading(true);
    setErroreCaricamento('');
    try {
      const [{ profilo: p, dettaglio: d, squadraAttuale: squadra }, c] = await Promise.all([
        caricaProfiloCompleto(userId),
        getContatoriProfilo(userId),
      ]);
      setProfilo(p);
      setDettaglio(d);
      setSquadraAttuale(squadra);

      setBio(p.bio || '');
      setFotoUrl(p.foto_url || '');
      setRegioneProfilo(d?.regione || '');
      setProvinciaProfilo(d?.provincia || '');
      setCarriera((Array.isArray(d?.carriera) ? d.carriera : [])
        .filter((experience) => typeof experience === 'string' || (experience && typeof experience === 'object'))
        .map((experience, index) => (
        typeof experience === 'string'
          ? { id: `legacy-${index}-${Date.now()}`, title: experience, startDate: '', endDate: '' }
          : {
            id: `saved-${index}-${Date.now()}`,
            title: experience.title || '',
            startDate: experience.startDate || '',
            endDate: experience.endDate || '',
          }
        )));
      if (p.tipo_account === 'giocatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setRuoloPrincipale(d.ruolo_principale || '');
        setRuoloSecondario(d.ruolo_secondario || '');
        setPiede(d.piede || 'destro');
        setAltezza(d.altezza ?? '');
        setPeso(d.peso ?? '');
        setStatoContratto(canonicalContractStatus(d.stato_contratto));
        setLinguePartlate(normalizeLanguageList((d.lingue_parlate || []).flatMap((language) => language.split(','))));
      } else if (p.tipo_account === 'allenatore' && d) {
        setInCercaSquadra(!!d.in_cerca_squadra);
        setInCercaGiocatoriAllenatore(!!d.in_cerca_giocatori);
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
        setCercaPatentino(d.cerca_patentino || '');
        setCercaFormazione(d.cerca_formazione || '');
        setCercaLingua(d.cerca_lingua || '');
        const roster = await caricaRosaSocieta(p.id);
        setRosaGiocatori(roster.giocatori);
        setRosaAllenatori(roster.allenatori);
        const { data: membri, error: erroreMembri } = await supabase
          .from('profiles')
          .select('id,nome,cognome,tipo_account')
          .in('tipo_account', ['giocatore', 'allenatore'])
          .neq('id', userId)
          .order('nome');
        if (erroreMembri) throw erroreMembri;
        setProfiliDisponibili(membri || []);
      }

      setContatori(c);
    } catch (err) {
      console.error('Errore caricamento profilo:', err.message);
      setErroreCaricamento('Non è stato possibile caricare il profilo. Controlla la connessione e riprova.');
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
      notify({ type: 'error', message: 'Immagine troppo grande: massimo 3 MB.' });
      e.target.value = '';
      return;
    }
    if (!AVATAR_FORMATS[file.type]) {
      notify({ type: 'error', message: 'Formato non supportato. Scegli un’immagine JPEG, PNG o WebP.' });
      e.target.value = '';
      return;
    }
    setCaricandoFoto(true);
    setModifica(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Devi effettuare nuovamente l’accesso.');
      const estensione = AVATAR_FORMATS[file.type];
      const percorso = `${user.id}/avatar-${Date.now()}.${estensione}`;
      const { error: errUpload } = await supabase.storage.from('avatars').upload(percorso, file, { upsert: true, contentType: file.type });
      if (errUpload) throw errUpload;
      const { data: pubblico } = supabase.storage.from('avatars').getPublicUrl(percorso);
      setFotoUrl(pubblico.publicUrl);
      notify({ type: 'success', message: 'Foto profilo caricata. Salva le modifiche per applicarla.' });
    } catch (err) {
      notify({ type: 'error', message: `Errore caricamento foto: ${err.message}. Verifica che il bucket avatars sia configurato su Supabase.` });
    } finally {
      setCaricandoFoto(false);
    }
  };

  const aggiungiRosa = async () => {
    if (!membroRosaId.trim()) return;
    try {
      await aggiungiMembroRosa(profilo.id, membroRosaId.trim(), membroRosaRuolo);
      const roster = await caricaRosaSocieta(profilo.id);
      setRosaGiocatori(roster.giocatori);
      setRosaAllenatori(roster.allenatori);
      setMembroRosaId('');
    } catch (error) {
      notify({ type: 'error', message: `Errore aggiornamento rosa: ${error.message}` });
    }
  };

  const rimuoviRosa = async (memberId) => {
    try {
      await rimuoviMembroRosa(profilo.id, memberId);
      const roster = await caricaRosaSocieta(profilo.id);
      setRosaGiocatori(roster.giocatori);
      setRosaAllenatori(roster.allenatori);
    } catch (error) {
      notify({ type: 'error', message: `Errore aggiornamento rosa: ${error.message}` });
    }
  };

  const salva = async () => {
    setSalvataggio(true);
    setErroreCarriera('');
    try {
    if (!regioneProfilo || !provinciaProfilo) {
      notify({ type: 'error', message: 'Seleziona la regione e la provincia del profilo.' });
      return;
    }
    if (profilo.tipo_account === 'giocatore' && !ruoloPrincipale) {
      notify({ type: 'error', message: 'Seleziona il ruolo specifico del giocatore.' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Devi effettuare nuovamente l’accesso.');
    }
    const esperienzeIncomplete = carriera.some((experience) => (
      !experience.title.trim()
      || experience.title.length > 30
      || !experience.startDate
      || (experience.endDate && experience.endDate < experience.startDate)
    ));
    if (esperienzeIncomplete) {
      setErroreCarriera('Completa ogni esperienza: inserisci una descrizione entro 30 caratteri e una data di inizio; la data di fine deve seguire quella di inizio.');
      return;
    }

    const { error: errProfilo } = await supabase
      .from('profiles')
      .update({ bio: bio.slice(0, 500), foto_url: fotoUrl || null })
      .eq('id', user.id);

    let errDettaglio = null;
    const carrieraJson = carriera.map(({ title, startDate, endDate }) => ({
      title: title.trim(),
      startDate,
      endDate: endDate || null,
    }));
    if (profilo.tipo_account === 'giocatore') {
      ({ error: errDettaglio } = await supabase.from('player_details').update({
        in_cerca_squadra: inCercaSquadra,
        ruolo_principale: ruoloPrincipale,
        ruolo_secondario: ruoloSecondario || null,
        piede,
        altezza: altezza ? Number(altezza) : null,
        peso: peso ? Number(peso) : null,
        stato_contratto: statoContratto || null,
        lingue_parlate: linguePartlate.length ? linguePartlate : null,
        nazione: 'IT',
        regione: regioneProfilo,
        provincia: provinciaProfilo,
        carriera: carrieraJson,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'allenatore') {
      ({ error: errDettaglio } = await supabase.from('coach_details').update({
        in_cerca_squadra: inCercaSquadra,
        in_cerca_giocatori: inCercaGiocatoriAllenatore,
        patentino,
        modulo_preferito: moduloPreferito || null,
        stile_gioco: stileGioco || null,
        lingue_parlate: linguePartlate.length ? linguePartlate : null,
        nazione: 'IT',
        regione: regioneProfilo,
        provincia: provinciaProfilo,
        carriera: carrieraJson,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'scout') {
      ({ error: errDettaglio } = await supabase.from('scout_details').update({
        in_cerca_squadra: inCercaSquadra,
        societa_attuale: societaAttuale || null,
        nazione: 'IT',
        regione: regioneProfilo,
        provincia: provinciaProfilo,
        carriera: carrieraJson,
      }).eq('profile_id', user.id));
    } else if (profilo.tipo_account === 'societa') {
      ({ error: errDettaglio } = await supabase.from('club_details').update({
        in_cerca_allenatori: inCercaAllenatori,
        in_cerca_giocatori: inCercaGiocatori,
        palmares: palmares || null,
        categoria: categoria || null,
        nazione: 'IT',
        regione: regioneProfilo,
        provincia: provinciaProfilo,
        cerca_patentino: cercaPatentino || null,
        cerca_formazione: cercaFormazione || null,
        cerca_lingua: cercaLingua || null,
      }).eq('profile_id', user.id));
    }

    if (errProfilo || errDettaglio) {
      throw new Error(errProfilo?.message || errDettaglio?.message);
    }
    invalidaCacheProfili();
    setModifica(false);
    await caricaProfilo(user.id);
    notify({ type: 'success', message: 'Profilo aggiornato con successo.' });
    } catch (error) {
      notify({ type: 'error', message: `Errore salvataggio: ${error.message}` });
    } finally {
      setSalvataggio(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="profile" />;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;
  if (!profilo) {
    return (
      <main className="page">
        <div className="state-message" role="alert">
          <h1>{erroreCaricamento ? 'Profilo non disponibile' : 'Profilo non trovato'}</h1>
          <p>{erroreCaricamento || 'Il profilo non è disponibile.'}</p>
          {erroreCaricamento && <button type="button" className="btn btn--primary" onClick={() => caricaProfilo(session.user.id)}>Riprova</button>}
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
            <label className="profile-avatar-upload" title="Carica o modifica la foto profilo">
              <UserAvatar src={fotoUrl} name={`${profilo.nome} ${profilo.cognome || ''}`} size={72} className="avatar" />
              <span className="profile-avatar-upload__badge" aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M3 6.5h3l1.5-2h5l1.5 2h3v9H3v-9Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="10" cy="10.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCaricaFoto} aria-label="Carica una foto profilo" />
            </label>
            {squadraAttuale && (
              <UserAvatar src={squadraAttuale.foto_url} name={squadraAttuale.nome} size={48} className="avatar" />
            )}
            <div>
              <p className="page-eyebrow">IL TUO PROFILO</p>
              <h1>{profilo.nome} {profilo.cognome}</h1>
              <span className={`badge badge--${profilo.tipo_account}`}>{profilo.tipo_account}</span>
            </div>
          </div>

          <button onClick={() => setModifica(true)} className="btn btn--primary profile-edit-button">
            Modifica profilo
          </button>

          <div className="stat-row profile-overview__stats">
            <div className="stat-chip"><span className="stat-chip__value">{contatori.follower ?? 0}</span><span className="stat-chip__label">follower</span></div>
            <div className="stat-chip"><span className="stat-chip__value">{contatori.seguiti ?? 0}</span><span className="stat-chip__label">seguiti</span></div>
            <div className="stat-chip"><span className="stat-chip__value">{contatori.preferiti ?? 0}</span><span className="stat-chip__label">nei preferiti</span></div>
          </div>
        </section>

        {!modifica ? (
          <>
            <section className="profile-details">
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
                    { label: 'Stato contrattuale', value: CONTRACT_STATUS_OPTIONS.find((option) => option.value === canonicalContractStatus(dettaglio.stato_contratto))?.label || dettaglio.stato_contratto || '—' },
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
                <p className="profile-info"><strong>Zona:</strong> {[dettaglio.regione, dettaglio.provincia].filter(Boolean).join(' · ')}</p>
              )}
              {Array.isArray(dettaglio?.carriera) && dettaglio.carriera.length > 0 && (
                <div className="profile-career">
                  <h3>La tua carriera</h3>
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
          </>
        ) : (
          <div className="card card--panel profile-editor">
            <div className="field">
              <label className="field__label">Foto profilo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserAvatar src={fotoUrl} name={`${profilo.nome} ${profilo.cognome || ''}`} size={56} className="avatar" />
                <label className="btn btn--outline btn--sm" style={{ cursor: 'pointer' }}>
                  {caricandoFoto ? <><span className="button-spinner" aria-hidden="true" /> Caricamento…</> : 'Scegli immagine'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCaricaFoto} disabled={caricandoFoto} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div className="field">
              <label className="field__label">Descrizione (max 500 caratteri)</label>
              <textarea value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} rows={4} />
            </div>
            <ItalianLocationFields
              region={regioneProfilo}
              province={provinciaProfilo}
              onRegionChange={setRegioneProfilo}
              onProvinceChange={setProvinciaProfilo}
              idPrefix="profile"
              required
            />

            {profilo.tipo_account === 'giocatore' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <PlayerPositionFields
                  position={ruoloPrincipale}
                  onPositionChange={setRuoloPrincipale}
                  secondaryPosition={ruoloSecondario}
                  onSecondaryPositionChange={setRuoloSecondario}
                  idPrefix="profile-player"
                />
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
                <CareerEditor experiences={carriera} onChange={setCarriera} error={erroreCarriera} />
              </>
            )}

            {profilo.tipo_account === 'allenatore' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaGiocatoriAllenatore} onChange={(e) => setInCercaGiocatoriAllenatore(e.target.checked)} /> In cerca di giocatori</label>
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
                <CareerEditor experiences={carriera} onChange={setCarriera} error={erroreCarriera} />
              </>
            )}

            {profilo.tipo_account === 'scout' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaSquadra} onChange={(e) => setInCercaSquadra(e.target.checked)} /> In cerca di squadra</label>
                <input type="text" placeholder="Società attuale" value={societaAttuale} onChange={(e) => setSocietaAttuale(e.target.value)} />
                <CareerEditor experiences={carriera} onChange={setCarriera} error={erroreCarriera} />
              </>
            )}

            {profilo.tipo_account === 'societa' && (
              <>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaAllenatori} onChange={(e) => setInCercaAllenatori(e.target.checked)} /> In cerca di allenatori</label>
                <label className="checkbox-field"><input type="checkbox" checked={inCercaGiocatori} onChange={(e) => setInCercaGiocatori(e.target.checked)} /> In cerca di giocatori</label>
                <input type="text" placeholder="Palmares" value={palmares} onChange={(e) => setPalmares(e.target.value)} />
                <input type="text" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                <select value={cercaPatentino} onChange={(e) => setCercaPatentino(e.target.value)}>
                  <option value="">Patentino cercato (qualunque)</option>
                  {COACH_LICENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={cercaFormazione} onChange={(e) => setCercaFormazione(e.target.value)}>
                  <option value="">Modulo cercato (qualunque)</option>
                  {FORMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select value={cercaLingua} onChange={(e) => setCercaLingua(e.target.value)}>
                  <option value="">Lingua cercata (qualunque)</option>
                  {LANGUAGE_OPTIONS.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                </select>
                <div className="field">
                  <label className="field__label">Rosa della società</label>
                  <div className="field-row">
                    <select value={membroRosaId} onChange={(e) => setMembroRosaId(e.target.value)}>
                      <option value="">Seleziona un profilo</option>
                      {profiliDisponibili
                        .filter((member) => member.tipo_account === membroRosaRuolo)
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {[member.nome, member.cognome].filter(Boolean).join(' ')}
                          </option>
                        ))}
                    </select>
                    <select value={membroRosaRuolo} onChange={(e) => { setMembroRosaRuolo(e.target.value); setMembroRosaId(''); }}>
                      <option value="giocatore">Giocatore</option>
                      <option value="allenatore">Allenatore</option>
                    </select>
                  </div>
                  <button type="button" onClick={aggiungiRosa} className="btn btn--outline btn--sm">Aggiungi alla rosa</button>
                  {[...rosaGiocatori.map((profile) => ({ ...profile, role: 'giocatore' })), ...rosaAllenatori.map((profile) => ({ ...profile, role: 'allenatore' }))].map((profile) => (
                    <p key={profile.id}>
                      {profile.nome} {profile.cognome || ''} ({profile.role})
                      <button type="button" onClick={() => rimuoviRosa(profile.id)} className="btn btn--outline btn--sm" style={{ marginLeft: 8 }}>Rimuovi</button>
                    </p>
                  ))}
                </div>
              </>
            )}

            <div className="action-row" style={{ marginTop: 6, marginBottom: 0 }}>
              <button onClick={salva} disabled={salvataggio} className="btn btn--primary" aria-busy={salvataggio}>
                {salvataggio ? <><span className="button-spinner" aria-hidden="true" /> Salvataggio…</> : 'Salva'}
              </button>
              <button onClick={() => { setFotoUrl(profilo.foto_url || ''); setModifica(false); }} className="btn btn--outline">Annulla</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
