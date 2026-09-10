// =====================================================================
// HIDDENGEMS — MODULO 3: Algoritmo di ricerca e ordinamento
//
// Come profileHelpers.js: niente embed automatici di Supabase. Per ogni
// tipo di ricerca facciamo due query separate (profiles + tabella di
// dettaglio), le uniamo e le ordiniamo qui in JavaScript. Più prevedibile
// e non dipende da nomi di vincoli o dalla cache dello schema.
//
// NOTA SULL'ORDINAMENTO: la clausola (punti, media_voto,
// media_voto_ponderata, nome) usa campi che esistono SOLO in
// player_details, quindi si applica solo alla ricerca giocatori. Per
// allenatori, scout e società l'ordinamento è alfabetico per nome.
// =====================================================================
import { supabase } from './supabase';

const TABELLA_DETTAGLIO = {
  giocatore: 'player_details',
  allenatore: 'coach_details',
  scout: 'scout_details',
  societa: 'club_details',
};

function etaInIntervalloDate({ etaMin, etaMax }) {
  const oggi = new Date();
  const range = {};
  if (etaMax !== undefined && etaMax !== null) {
    const dataMin = new Date(oggi);
    dataMin.setFullYear(oggi.getFullYear() - etaMax - 1);
    range.dataNascitaMin = dataMin.toISOString().slice(0, 10);
  }
  if (etaMin !== undefined && etaMin !== null) {
    const dataMax = new Date(oggi);
    dataMax.setFullYear(oggi.getFullYear() - etaMin);
    range.dataNascitaMax = dataMax.toISOString().slice(0, 10);
  }
  return range;
}

/**
 * Motore di ricerca generico: query separate su profiles e sulla tabella
 * di dettaglio del tipo richiesto, unite per profile_id.
 */
async function cercaGenerico(tipoAccount, { testoRicerca, filtriProfilo = {}, filtriDettaglio = {}, extraDettaglio, ordina } = {}) {
  let queryProfili = supabase.from('profiles').select('*').eq('tipo_account', tipoAccount);
  if (testoRicerca) {
    queryProfili = queryProfili.or(`nome.ilike.%${testoRicerca}%,cognome.ilike.%${testoRicerca}%`);
  }
  Object.entries(filtriProfilo).forEach(([colonna, valore]) => {
    if (valore !== undefined && valore !== null && valore !== '') queryProfili = queryProfili.eq(colonna, valore);
  });
  const { data: profili, error: errProfili } = await queryProfili;
  if (errProfili) throw errProfili;
  if (!profili || profili.length === 0) return [];

  const tabella = TABELLA_DETTAGLIO[tipoAccount];
  let queryDettagli = supabase.from(tabella).select('*');
  Object.entries(filtriDettaglio).forEach(([colonna, valore]) => {
    if (valore === undefined || valore === null || valore === '') return;
    queryDettagli = Array.isArray(valore) ? queryDettagli.contains(colonna, valore) : queryDettagli.eq(colonna, valore);
  });
  if (extraDettaglio) queryDettagli = extraDettaglio(queryDettagli);

  const { data: dettagli, error: errDettagli } = await queryDettagli;
  if (errDettagli) throw errDettagli;

  const dettaglioPerProfilo = new Map((dettagli || []).map((d) => [d.profile_id, d]));
  const uniti = profili
    .filter((p) => dettaglioPerProfilo.has(p.id))
    .map((p) => ({ ...p, dettaglio: dettaglioPerProfilo.get(p.id) }));

  if (ordina) uniti.sort(ordina);
  return uniti;
}

const ordinaAlfabetico = (a, b) => `${a.nome} ${a.cognome || ''}`.localeCompare(`${b.nome} ${b.cognome || ''}`);

/**
 * Ricerca GIOCATORI: età, ruolo, secondo ruolo, piede, genere,
 * in cerca di squadra, stato, nazionalità, lingue parlate, luogo.
 * Ordinamento ufficiale: punti DESC, media_voto DESC, media_voto_ponderata DESC, nome ASC.
 */
export async function cercaGiocatori({ testoRicerca, filtri = {} } = {}) {
  const filtriProfilo = {};
  if (filtri.genere) filtriProfilo.genere = filtri.genere;

  const filtriDettaglio = {};
  if (filtri.ruolo) filtriDettaglio.ruolo_principale = filtri.ruolo;
  if (filtri.ruoloSecondario) filtriDettaglio.ruolo_secondario = filtri.ruoloSecondario;
  if (filtri.piede) filtriDettaglio.piede = filtri.piede;
  if (filtri.inCercaSquadra !== undefined) filtriDettaglio.in_cerca_squadra = filtri.inCercaSquadra;
  if (filtri.statoContratto) filtriDettaglio.stato_contratto = filtri.statoContratto;
  if (filtri.nazione) filtriDettaglio.nazione = filtri.nazione;
  if (filtri.regione) filtriDettaglio.regione = filtri.regione;
  if (filtri.provincia) filtriDettaglio.provincia = filtri.provincia;
  if (filtri.lingua) filtriDettaglio.lingue_parlate = [filtri.lingua];

  const extraDettaglio = (query) => {
    if (filtri.etaMin === undefined && filtri.etaMax === undefined) return query;
    const { dataNascitaMin, dataNascitaMax } = etaInIntervalloDate(filtri);
    if (dataNascitaMin) query = query.gte('data_nascita', dataNascitaMin);
    if (dataNascitaMax) query = query.lte('data_nascita', dataNascitaMax);
    return query;
  };

  const risultati = await cercaGenerico('giocatore', {
    testoRicerca, filtriProfilo, filtriDettaglio, extraDettaglio,
    ordina: (a, b) =>
      (b.dettaglio.punti - a.dettaglio.punti) ||
      (b.dettaglio.media_voto - a.dettaglio.media_voto) ||
      (b.dettaglio.media_voto_ponderata - a.dettaglio.media_voto_ponderata) ||
      ordinaAlfabetico(a, b),
  });
  return { risultati };
}

/**
 * Ricerca ALLENATORI: lingua, patentino, età, genere, modulo preferito,
 * in cerca di squadra, luogo.
 * ("account verificato" citato nel documento originale non è disponibile:
 *  il campo `verificato` esiste solo per le società — vedi README.)
 */
export async function cercaAllenatori({ testoRicerca, filtri = {} } = {}) {
  const filtriProfilo = {};
  if (filtri.genere) filtriProfilo.genere = filtri.genere;

  const filtriDettaglio = {};
  if (filtri.patentino) filtriDettaglio.patentino = filtri.patentino;
  if (filtri.moduloPreferito) filtriDettaglio.modulo_preferito = filtri.moduloPreferito;
  if (filtri.inCercaSquadra !== undefined) filtriDettaglio.in_cerca_squadra = filtri.inCercaSquadra;
  if (filtri.nazione) filtriDettaglio.nazione = filtri.nazione;
  if (filtri.regione) filtriDettaglio.regione = filtri.regione;
  if (filtri.provincia) filtriDettaglio.provincia = filtri.provincia;
  if (filtri.lingua) filtriDettaglio.lingue_parlate = [filtri.lingua];

  const extraDettaglio = (query) => {
    if (filtri.etaMin === undefined && filtri.etaMax === undefined) return query;
    const { dataNascitaMin, dataNascitaMax } = etaInIntervalloDate(filtri);
    if (dataNascitaMin) query = query.gte('data_nascita', dataNascitaMin);
    if (dataNascitaMax) query = query.lte('data_nascita', dataNascitaMax);
    return query;
  };

  const risultati = await cercaGenerico('allenatore', {
    testoRicerca, filtriProfilo, filtriDettaglio, extraDettaglio, ordina: ordinaAlfabetico,
  });
  return { risultati };
}

/** Ricerca SCOUT: ricercabili SOLO tramite nome e cognome. */
export async function cercaScout({ testoRicerca } = {}) {
  const risultati = await cercaGenerico('scout', { testoRicerca, ordina: ordinaAlfabetico });
  return { risultati };
}

/**
 * Ricerca SOCIETÀ: palmares, categoria, in cerca di giocatori/allenatori, annata, luogo.
 * NOTA: il filtro "che tipo di allenatore cercano" (modulo/lingua/patentino
 * desiderati) non è disponibile: club_details non ha questi campi — vedi README.
 */
export async function cercaSocieta({ testoRicerca, filtri = {} } = {}) {
  const filtriDettaglio = {};
  if (filtri.categoria) filtriDettaglio.categoria = filtri.categoria;
  if (filtri.annataSquadra) filtriDettaglio.annata_squadra = filtri.annataSquadra;
  if (filtri.genereSquadra) filtriDettaglio.genere_squadra = filtri.genereSquadra;
  if (filtri.inCercaAllenatori !== undefined) filtriDettaglio.in_cerca_allenatori = filtri.inCercaAllenatori;
  if (filtri.inCercaGiocatori !== undefined) filtriDettaglio.in_cerca_giocatori = filtri.inCercaGiocatori;
  if (filtri.nazione) filtriDettaglio.nazione = filtri.nazione;
  if (filtri.regione) filtriDettaglio.regione = filtri.regione;
  if (filtri.provincia) filtriDettaglio.provincia = filtri.provincia;

  const extraDettaglio = (query) => (filtri.palmares ? query.ilike('palmares', `%${filtri.palmares}%`) : query);

  const risultati = await cercaGenerico('societa', {
    testoRicerca, filtriDettaglio, extraDettaglio, ordina: ordinaAlfabetico,
  });
  return { risultati };
}

/** Dispatcher unico usato dalla pagina di ricerca. */
export function cerca(tipoAccount, params) {
  switch (tipoAccount) {
    case 'giocatore': return cercaGiocatori(params);
    case 'allenatore': return cercaAllenatori(params);
    case 'scout': return cercaScout(params);
    case 'societa': return cercaSocieta(params);
    default: throw new Error(`tipo_account non valido per la ricerca: ${tipoAccount}`);
  }
}
