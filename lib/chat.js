// =====================================================================
// HIDDENGEMS — MODULO 4: Gestione chat a due fasi (UI & Realtime)
// =====================================================================
import { supabase } from './supabase';
import { getCachedData, invalidateCachedData } from './memoryCache';

/**
 * STEP 1 — Avvia una richiesta di chat (NON un messaggio diretto).
 * Chiamata quando si clicca sul bottone "Messaggi" nel profilo di un altro utente.
 * @param {string} riceventeId - profiles.id dell'utente target
 */
export async function avviaConversazione(riceventeId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi effettuare l\'accesso.');
  if (user.id === riceventeId) throw new Error('Non puoi scriverti da solo.');

  const { data, error } = await supabase
    .from('chats')
    .insert({ sender_id: user.id, receiver_id: riceventeId, status: 'pending' })
    .select()
    .single();

  if (error) {
    // 23505 = violazione unique constraint: la richiesta esiste già
    if (error.code === '23505') {
      const { data: esistente } = await supabase
        .from('chats')
        .select('*')
        .eq('sender_id', user.id)
        .eq('receiver_id', riceventeId)
        .single();
      invalidateCachedData('chats:list:');
      return esistente;
    }
    throw error;
  }
  invalidateCachedData('chats:list:');
  return data;
}

/** Il destinatario accetta la richiesta di chat. */
export async function accettaChat(chatId) {
  const { data, error } = await supabase
    .from('chats')
    .update({ status: 'accepted' })
    .eq('id', chatId)
    .select()
    .single();
  if (error) throw error;
  invalidateCachedData('chats:list:');
  return data;
}

/** Il destinatario rifiuta la richiesta di chat. */
export async function rifiutaChat(chatId) {
  const { data, error } = await supabase
    .from('chats')
    .update({ status: 'rejected' })
    .eq('id', chatId)
    .select()
    .single();
  if (error) throw error;
  invalidateCachedData('chats:list:');
  return data;
}

/** Tab "In approvazione": richieste ricevute e non ancora gestite. */
export async function getChatInApprovazione() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Devi effettuare l\'accesso.');

  return getCachedData(`chats:list:pending:${session.user.id}`, async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*, mittente:sender_id(id, nome, cognome, foto_url, tipo_account)')
      .eq('receiver_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }, 5000);
}

/** Tab "Approvate": tutte le chat accettate a cui l'utente partecipa. */
export async function getChatApprovate() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Devi effettuare l\'accesso.');

  return getCachedData(`chats:list:accepted:${session.user.id}`, async () => {
    const { data, error } = await supabase
      .from('chats')
      .select(`
      *,
      mittente:sender_id(id, nome, cognome, foto_url, tipo_account),
      destinatario:receiver_id(id, nome, cognome, foto_url, tipo_account)
    `)
      .eq('status', 'accepted')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }, 5000);
}

/**
 * Invia un messaggio. BLOCCO INVIO: possibile solo se la chat è 'accepted'
 * (doppio controllo: qui lato client per la UX, e a livello di RLS nel
 * database come rete di sicurezza — vedi policy "messages: invio solo su chat accettate").
 */
export async function inviaMessaggio(chatId, testo) {
  if (!testo || !testo.trim()) throw new Error('Il messaggio non può essere vuoto.');

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('status')
    .eq('id', chatId)
    .single();
  if (chatError) throw chatError;
  if (chat.status !== 'accepted') {
    throw new Error('Non puoi ancora scrivere: la chat non è stata approvata.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: user.id, testo: testo.trim() })
    .select()
    .single();
  if (error) throw error;
  invalidateCachedData(`messages:${chatId}:`);
  return data;
}

/** Recupera lo storico messaggi di una chat (in ordine cronologico). */
export async function getMessaggi(chatId) {
  return getCachedData(`messages:${chatId}:history`, async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }, 5000);
}

/**
 * Sottoscrizione realtime ai nuovi messaggi di una chat aperta.
 * @param {string} chatId
 * @param {(msg: object) => void} onNuovoMessaggio
 * @returns {() => void} funzione per annullare la sottoscrizione
 */
export function sottoscriviMessaggi(chatId, onNuovoMessaggio) {
  const canale = supabase
    .channel(`messages-chat-${chatId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
      (payload) => {
        invalidateCachedData(`messages:${chatId}:`);
        onNuovoMessaggio(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(canale);
}

/**
 * Sottoscrizione realtime alle nuove richieste di chat in arrivo
 * (per aggiornare live il badge/tab "In approvazione").
 * @param {string} userId
 * @param {(chat: object) => void} onNuovaRichiesta
 * @returns {() => void}
 */
export function sottoscriviRichiesteChat(userId, onNuovaRichiesta) {
  const canale = supabase
    .channel(`chat-requests-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chats', filter: `receiver_id=eq.${userId}` },
      (payload) => {
        invalidateCachedData(`chats:list:pending:${userId}`);
        onNuovaRichiesta(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(canale);
}
