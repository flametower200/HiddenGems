// =====================================================================
// lib/feed.js
// =====================================================================
import { supabase } from './supabase';
import { getCachedData, invalidateCachedData } from './memoryCache';

/** Carica i post del feed (più recenti prima), con dati base dell'autore. */
export function getFeed(options = {}) {
  if (!options.userId) return loadFeed(options);
  const limite = options.limite ?? 20;
  return getCachedData(`feed:${options.userId}:${limite}`, () => loadFeed({ ...options, limite }));
}

async function loadFeed({ limite = 20, userId } = {}) {
  const { data: post, error: errPost } = await supabase
    .from('feed_posts')
    .select('id,autore_id,video_url,didascalia,created_at,feed_likes(count)')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (errPost) throw errPost;
  if (!post || post.length === 0) return [];

  const postIds = post.map((p) => p.id);
  const autoreIds = [...new Set(post.map((p) => p.autore_id))];
  const currentUserId = userId ?? (await supabase.auth.getSession()).data.session?.user.id;
  const [{ data: autori, error: errAutori }, { data: likes, error: errLikes }] = await Promise.all([
    supabase.from('profiles').select('id, nome, cognome, foto_url').in('id', autoreIds),
    currentUserId
      ? supabase.from('feed_likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (errAutori) throw errAutori;
  const autorePerId = new Map(autori.map((a) => [a.id, a]));
  if (errLikes) throw errLikes;

  const likesByPost = new Set((likes || []).map((like) => like.post_id));

  return post.map((p) => {
    return {
      ...p,
      autore: autorePerId.get(p.autore_id) || null,
      numeroLike: Number(p.feed_likes?.[0]?.count) || 0,
      miPiace: likesByPost.has(p.id),
    };
  });
}

export async function metti_like(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere per mettere like.');
  const { error } = await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
  if (error && error.code !== '23505') throw error; // già messo, ignora
  invalidateCachedData('feed:');
}

export async function togli_like(postId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Devi accedere.');
  const { error } = await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
  if (error) throw error;
  invalidateCachedData('feed:');
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
 * eventuale didascalia. Il server lo carica su Cloudinary e crea il
 * post (passa da un'unica route perché Cloudinary richiede credenziali
 * segrete che non devono mai arrivare al browser).
 */
export async function pubblicaVideo({ blob, durata, didascalia }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Devi accedere per pubblicare.');

  const formData = new FormData();
  formData.append('video', blob, 'video.mp4');
  formData.append('durata', String(durata));
  if (didascalia) formData.append('didascalia', didascalia);

  const res = await fetch('/api/feed/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore durante la pubblicazione.');
  invalidateCachedData('feed:');
  return data.post;
}

export async function eliminaVideo(postId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Devi accedere per eliminare un video.');

  const response = await fetch(`/api/feed/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Errore durante l\'eliminazione del video.');

  invalidateCachedData('feed:');
  return data;
}
