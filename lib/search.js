// =====================================================================
// HIDDENGEMS — MODULO 3: Algoritmo di ricerca e ordinamento
//
// NOTA IMPORTANTE SULL'ORDINAMENTO:
// la clausola ORDER BY (punti, media_voto, media_voto_ponderata, nome)
// fornita nelle specifiche usa campi che esistono SOLO in player_details.
// Si applica quindi solo alla ricerca giocatori. Per allenatori, scout e
// società (che non hanno queste metriche) l'ordinamento ricade
// sull'ordine alfabetico per nome, come da punto 4 della tabella.
// =====================================================================
import { supabase } from './supabaseClient.js';

/**
 * Converte un intervallo di età (anni) in un intervallo di date di nascita.
 * Approssimazione a livello di giorno, sufficiente per un filtro di ricerca.
 */
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
 * Ricerca GIOCATORI con i filtri previsti: età, ruolo, secondo ruolo, piede,
 * genere, in cerca di squadra, stato, nazionalità, lingue parlate, luogo.
 */
export async function cercaGiocatori({ testoRicerca, filtri = {}, pagina = 0, perPagina = 20 } = {}) {
  let query = supabase
    .from('player_details')
    .select('*, profiles!inner(*)', { count: 'exact' });

  if (testoRicerca) {
    query = query.or(
      `nome.ilike.%${testoRicerca}%,cognome.ilike.%${testoRicerca}%`,
      { foreignTable: 'profiles' }
    );
  }
  if (filtri.ruolo) query = query.eq('ruolo_principale', filtri.ruolo);
  if (filtri.ruoloSecondario) query = query.eq('ruolo_secondario', filtri.ruoloSecondario);
  if (filtri.piede) query = query.eq('piede', filtri.piede);
  if (filtri.genere) query = query.eq('profiles.genere', filtri.genere);
  if (filtri.inCercaSquadra !== undefined) query = query.eq('in_cerca_squadra', filtri.inCercaSquadra);
  if (filtri.statoContratto) query = query.eq('stato_contratto', filtri.statoContratto);
  if (filtri.nazione) query = query.eq('nazione', filtri.nazione);
  if (filtri.regione) query = query.eq('regione', filtri.regione);
  if (filtri.provincia) query = query.eq('provincia', filtri.provincia);
  if (filtri.lingua) query = query.contains('lingue_parlate', [filtri.lingua]);
  if (filtri.etaMin !== undefined || filtri.etaMax !== undefined) {
    const { dataNascitaMin, dataNascitaMax } = etaInIntervalloDate(filtri);
    if (dataNascitaMin) query = query.gte('data_nascita', dataNascitaMin);
    if (dataNascitaMax) query = query.lte('data_nascita', dataNascitaMax);
  }

  // Ordinamento ufficiale: punti DESC, media_voto DESC, media_voto_ponderata DESC, nome ASC
  query = query
    .order('punti', { ascending: false })
    .order('media_voto', { ascending: false })
    .order('media_voto_ponderata', { ascending: false })
    .order('nome', { referencedTable: 'profiles', ascending: true })
    .range(pagina * perPagina, pagina * perPagina + perPagina - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { risultati: data, totale: count };
}

/**
 * Ricerca ALLENATORI: lingua, patentino, età, genere, modulo preferito,
 * in cerca di giocatori/società, luogo.
 * ("account verificato" è un filtro citato nel documento ma il campo
 *  `verificato` esiste solo per le società nello schema tecnico fornito:
 *  qui viene ignorato — vedi nota nel README.)
 */
export async function cercaAllenatori({ testoRicerca, filtri = {}, pagina = 0, perPagina = 20 } = {}) {
  let query = supabase
    .from('coach_details')
    .select('*, profiles!inner(*)', { count: 'exact' });

  if (testoRicerca) {
    query = query.or(
      `nome.ilike.%${testoRicerca}%,cognome.ilike.%${testoRicerca}%`,
      { foreignTable: 'profiles' }
    );
  }
  if (filtri.lingua) query = query.contains('lingue_parlate', [filtri.lingua]);
  if (filtri.patentino) query = query.eq('patentino', filtri.patentino);
  if (filtri.genere) query = query.eq('profiles.genere', filtri.genere);
  if (filtri.moduloPreferito) query = query.eq('modulo_preferito', filtri.moduloPreferito);
  if (filtri.inCercaSquadra !== undefined) query = query.eq('in_cerca_squadra', filtri.inCercaSquadra);
  if (filtri.nazione) query = query.eq('nazione', filtri.nazione);
  if (filtri.regione) query = query.eq('regione', filtri.regione);
  if (filtri.provincia) query = query.eq('provincia', filtri.provincia);
  if (filtri.etaMin !== undefined || filtri.etaMax !== undefined) {
    const { dataNascitaMin, dataNascitaMax } = etaInIntervalloDate(filtri);
    if (dataNascitaMin) query = query.gte('data_nascita', dataNascitaMin);
    if (dataNascitaMax) query = query.lte('data_nascita', dataNascitaMax);
  }

  // Niente punti/media_voto per gli allenatori: ordine alfabetico
  query = query
    .order('nome', { referencedTable: 'profiles', ascending: true })
    .range(pagina * perPagina, pagina * perPagina + perPagina - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { risultati: data, totale: count };
}

/**
 * Ricerca SCOUT: ricercabili SOLO tramite nome e cognome (nessun altro filtro).
 */
export async function cercaScout({ testoRicerca, pagina = 0, perPagina = 20 } = {}) {
  let query = supabase
    .from('scout_details')
    .select('*, profiles!inner(*)', { count: 'exact' });

  if (testoRicerca) {
    query = query.or(
      `nome.ilike.%${testoRicerca}%,cognome.ilike.%${testoRicerca}%`,
      { foreignTable: 'profiles' }
    );
  }

  query = query
    .order('nome', { referencedTable: 'profiles', ascending: true })
    .range(pagina * perPagina, pagina * perPagina + perPagina - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { risultati: data, totale: count };
}

/**
 * Ricerca SOCIETÀ: palmares, categoria, in cerca di giocatori/allenatori,
 * annata, luogo.
 * NOTA: il documento cita anche un filtro per "che tipo di allenatore
 * cercano" (modulo/lingua/patentino desiderati dalla società), ma lo
 * schema tecnico di club_details fornito non include questi campi.
 * Andrebbero aggiunti (es. modulo_cercato, lingua_cercata, patentino_cercato)
 * per rendere operativo questo filtro — vedi README.
 */
export async function cercaSocieta({ testoRicerca, filtri = {}, pagina = 0, perPagina = 20 } = {}) {
  let query = supabase
    .from('club_details')
    .select('*, profiles!inner(*)', { count: 'exact' });

  if (testoRicerca) {
    query = query.ilike('profiles.nome', `%${testoRicerca}%`);
  }
  if (filtri.categoria) query = query.eq('categoria', filtri.categoria);
  if (filtri.annataSquadra) query = query.eq('annata_squadra', filtri.annataSquadra);
  if (filtri.genereSquadra) query = query.eq('genere_squadra', filtri.genereSquadra);
  if (filtri.inCercaAllenatori !== undefined) query = query.eq('in_cerca_allenatori', filtri.inCercaAllenatori);
  if (filtri.inCercaGiocatori !== undefined) query = query.eq('in_cerca_giocatori', filtri.inCercaGiocatori);
  if (filtri.palmares) query = query.ilike('palmares', `%${filtri.palmares}%`);
  if (filtri.nazione) query = query.eq('nazione', filtri.nazione);
  if (filtri.regione) query = query.eq('regione', filtri.regione);
  if (filtri.provincia) query = query.eq('provincia', filtri.provincia);

  query = query
    .order('nome', { referencedTable: 'profiles', ascending: true })
    .range(pagina * perPagina, pagina * perPagina + perPagina - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { risultati: data, totale: count };
}

/**
 * Dispatcher unico usato dalla barra di ricerca + filtro "giocatori/allenatori/società/scout".
 * @param {'giocatore'|'allenatore'|'scout'|'societa'} tipoAccount
 */
export function cerca(tipoAccount, params) {
  switch (tipoAccount) {
    case 'giocatore':
      return cercaGiocatori(params);
    case 'allenatore':
      return cercaAllenatori(params);
    case 'scout':
      return cercaScout(params);
    case 'societa':
      return cercaSocieta(params);
    default:
      throw new Error(`tipo_account non valido per la ricerca: ${tipoAccount}`);
  }
}
