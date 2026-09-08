// =====================================================================
// HIDDENGEMS — MODULO 5: Impostazioni account e sicurezza
// Presente in ogni tipo di profilo: cambio password + eliminazione account.
// =====================================================================
import { supabase } from './supabaseClient.js';

/**
 * Cambia la password dell'utente attualmente autenticato.
 * @param {string} nuovaPassword
 * @param {string} confermaNuovaPassword
 */
export async function cambiaPassword(nuovaPassword, confermaNuovaPassword) {
  if (nuovaPassword !== confermaNuovaPassword) {
    throw new Error('Le due password non coincidono.');
  }
  if (!nuovaPassword || nuovaPassword.length < 8) {
    throw new Error('La password deve avere almeno 8 caratteri.');
  }

  const { data, error } = await supabase.auth.updateUser({ password: nuovaPassword });
  if (error) throw error;
  return data;
}

/**
 * Elimina l'account dell'utente corrente.
 *
 * Chiama una Edge Function server-side ("delete-account", vedi
 * supabase/functions/delete-account/index.ts) che usa la service-role key
 * per cancellare l'utente da Supabase Auth. La cancellazione di auth.users
 * fa scattare in cascata (ON DELETE CASCADE) l'eliminazione di:
 * profiles → player_details/coach_details/scout_details/club_details,
 * chats, messages, follows, favorites.
 *
 * NB: l'eliminazione NON può essere fatta interamente lato client con la
 * chiave "anon", perché richiede privilegi di amministrazione su Auth.
 */
export async function eliminaAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Devi effettuare l\'accesso.');

  const { data, error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;

  await supabase.auth.signOut();
  return data;
}
