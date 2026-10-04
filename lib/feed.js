// =====================================================================
// lib/feed.js
// =====================================================================
import { supabase } from './supabase';

/** Carica i post del feed (più recenti prima), con dati base dell'autore. */
export async function getFeed({ limite = 20 } = {}) {
  const { data: post, error: errPost } = await supabase
    .from('feed_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (errPost) throw errPost;
  if (!post || post.length === 0) return [];

  const autoreIds = [...new Set(post.map((p) => p.autore_id))];
  const { data: autori, error: errAutori } = await supabase
    .from('profiles')
    .select('id, nome, cognome, foto_url')
    .in('id', autoreIds);
  if (errAutori) throw errAutori;
  const autorePerId = new Map(autori.map((a) => [a.id, a]));

  const postIds = post.map((p) => p.id);
  const { data: likes, error: errLikes } = await supabase
    .from('feed_likes')
    .select('post_id, user_id')
    .in('post_id', postIds);
  if (errLikes) throw errLikes;

  const { data: { user } } = await supabase.auth.getUser();

  return post.map((p) => {
    const likeDelPost = (likes || []).filter((l) => l.post_id === p.id);
    return {
      ...p,
      autore: autorePerId.get(p.autore_id) || null,
      numeroLike: likeDelPost.length,
      miPiace: user ? likeDelPost.some((l) => l.user_id === user.id) : false,
    };
  });
}

export async function metti_like(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere per mettere like.');
  const { error } = await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
  if (error && error.code !== '23505') throw error; // già messo, ignora
}

export async function togli_like(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere.');
  const { error } = await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
  if (error) throw error;
}

export async function getCommenti(postId) {
  const { data: commenti, error: errCommenti } = await supabase
    .from('feed_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (errCommenti) throw errCommenti;
  if (!commenti || commenti.length === 0) return [];

  const autoreIds = [...new Set(commenti.map((c) => c.user_id))];
  const { data: autori, error: errAutori } = await supabase
    .from('profiles')
    .select('id, nome, cognome')
    .in('id', autoreIds);
  if (errAutori) throw errAutori;
  const autorePerId = new Map(autori.map((a) => [a.id, a]));

  return commenti.map((c) => ({ ...c, autore: autorePerId.get(c.user_id) || null }));
}

export async function aggiungiCommento(postId, testo) {
  if (!testo || !testo.trim()) throw new Error('Il commento non può essere vuoto.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere per commentare.');
  const { data, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, user_id: user.id, testo: testo.trim().slice(0, 500) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Invia al server un video già compresso (Blob) insieme a durata ed
 * eventuale didascalia. Il server lo carica su Cloudflare R2 e crea il post.
 */
export async function pubblicaVideo({ blob, durata, didascalia }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere per pubblicare.');

  // Upload diretto dal browser a Supabase Storage (stesso meccanismo già
  // usato per le foto profilo) — nessuna route server di mezzo. La
  // regola "solo i giocatori caricano" è applicata dalla policy del
  // bucket (sql/07_storage_feed_videos.sql), non solo da questo codice.
  const chiave = `${user.id}/video-${Date.now()}.mp4`;
  const { error: errUpload } = await supabase.storage
    .from('feed-videos')
    .upload(chiave, blob, { contentType: 'video/mp4' });
  if (errUpload) throw errUpload;

  const { data: pubblico } = supabase.storage.from('feed-videos').getPublicUrl(chiave);

  const { data: post, error: errInsert } = await supabase
    .from('feed_posts')
    .insert({
      autore_id: user.id,
      video_url: pubblico.publicUrl,
      storage_key: chiave,
      durata_secondi: durata,
      didascalia: didascalia || null,
    })
    .select()
    .single();
  if (errInsert) throw errInsert;
  return post;
}
