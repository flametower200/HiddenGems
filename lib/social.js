// =====================================================================
// HIDDENGEMS — MODULO SUPPLEMENTARE: Follow e Preferiti
// Non incluso nei 5 moduli tecnici richiesti esplicitamente, ma
// necessario per le "azioni rapide" citate nel documento originale
// (risultati di ricerca: seguire, mettere nei preferiti, scrivere) e
// per i contatori follower/seguiti/preferiti mostrati nel profilo.
// Si appoggia alle tabelle supplementari follows/favorites (01_schema.sql).
// =====================================================================
import { supabase } from './supabaseClient.js';

export async function segui(profiloId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi effettuare l\'accesso.');
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: profiloId });
  if (error && error.code !== '23505') throw error; // 23505 = già seguito, ok ignorare
}

export async function smettiDiSeguire(profiloId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', profiloId);
  if (error) throw error;
}

export async function aggiungiPreferito(profiloId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, profile_id: profiloId });
  if (error && error.code !== '23505') throw error;
}

export async function rimuoviPreferito(profiloId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('profile_id', profiloId);
  if (error) throw error;
}

/** Conta follower, seguiti e preferiti ricevuti per un profilo — usato nella pagina profilo. */
export async function getContatoriProfilo(profiloId) {
  const [{ count: follower }, { count: seguiti }, { count: preferiti }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profiloId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profiloId),
    supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('profile_id', profiloId),
  ]);
  return { follower, seguiti, preferiti };
}
