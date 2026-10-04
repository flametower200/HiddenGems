// =====================================================================
// lib/profileHelpers.js
//
// Versione precedente: usava l'embed automatico di Supabase
// (player_details!player_details_profile_id_fkey(*) ecc.) per unire
// profiles e le tabelle di dettaglio in una sola query. Il meccanismo
// dipende dal nome esatto del vincolo di chiave esterna E dal fatto che
// la cache dello schema di Supabase sia aggiornata — due cose fuori dal
// nostro controllo diretto, che hanno causato errori intermittenti.
//
// Questa versione fa DUE query semplici (una su profiles, una sulla
// tabella di dettaglio specifica) e le unisce qui in JavaScript. Più
// verboso, ma non dipende da nessun meccanismo di join automatico:
// se una query fallisce, l'errore dice esattamente quale tabella e
// perché, invece di un generico "relationship not found".
// =====================================================================
import { supabase } from './supabase';

export const TABELLA_DETTAGLIO = {
  giocatore: 'player_details',
  allenatore: 'coach_details',
  scout: 'scout_details',
  societa: 'club_details',
};

/**
 * Carica UN profilo (per id) insieme al suo dettaglio specifico.
 * @returns {Promise<{ profilo: object, dettaglio: object|null }>}
 */
export async function caricaProfiloCompleto(profileId) {
  const { data: profilo, error: errProfilo } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (errProfilo) throw errProfilo;

  const tabella = TABELLA_DETTAGLIO[profilo.tipo_account];
  const { data: dettaglio, error: errDettaglio } = await supabase
    .from(tabella)
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  if (errDettaglio) throw errDettaglio;

  return { profilo, dettaglio };
}

/**
 * Carica una LISTA di profili (con filtro opzionale per tipo_account),
 * ognuno con il proprio dettaglio già unito nel campo `dettaglio`.
 * Usa al massimo 5 query totali (1 per profiles + 1 per ciascuna delle
 * 4 tabelle di dettaglio), indipendentemente da quanti profili ci sono.
 * @param {'tutti'|'giocatore'|'allenatore'|'scout'|'societa'} filtroTipo
 * @returns {Promise<Array<object>>} ogni elemento è il profilo con in più `dettaglio`
 */
export async function caricaListaProfili(filtroTipo) {
  let query = supabase.from('profiles').select('id,nome,cognome,tipo_account');
  if (filtroTipo && filtroTipo !== 'tutti') query = query.eq('tipo_account', filtroTipo);
  const { data: profili, error: errProfili } = await query;
  if (errProfili) throw errProfili;
  if (!profili || profili.length === 0) return [];

  const tipiDaCaricare = filtroTipo && filtroTipo !== 'tutti' ? [filtroTipo] : Object.keys(TABELLA_DETTAGLIO);
  const dettagliPerTabella = {};

  await Promise.all(tipiDaCaricare.map(async (tipo) => {
    const tabella = TABELLA_DETTAGLIO[tipo];
    const { data, error } = await supabase.from(tabella).select('*');
    if (error) throw error;
    dettagliPerTabella[tabella] = data || [];
  }));

  return profili.map((p) => {
    const tabella = TABELLA_DETTAGLIO[p.tipo_account];
    const righe = dettagliPerTabella[tabella] || [];
    const dettaglio = righe.find((d) => d.profile_id === p.id) || null;
    return { ...p, dettaglio };
  });
}
