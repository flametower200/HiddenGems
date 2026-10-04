'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import { getFeed, metti_like, togli_like, getCommenti, aggiungiCommento, eliminaVideo } from '../../lib/feed';

function IconLike({ active }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10v10H4V10h3Zm3 10h7.2a2 2 0 0 0 1.96-1.61l1.2-6A2 2 0 0 0 18.4 10H14l.65-3.12A2.4 2.4 0 0 0 12.3 4L8 10v10Z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconComment() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4h2A7.5 7.5 0 0 1 20 11.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PostCard({ post, sessionUserId, onDelete }) {
  const [miPiace, setMiPiace] = useState(post.miPiace);
  const [numeroLike, setNumeroLike] = useState(post.numeroLike);
  const [commentiAperti, setCommentiAperti] = useState(false);
  const [commenti, setCommenti] = useState([]);
  const [caricandoCommenti, setCaricandoCommenti] = useState(false);
  const [nuovoCommento, setNuovoCommento] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const isAuthor = post.autore_id === sessionUserId;

  const toggleLike = async () => {
    try {
      if (miPiace) {
        setMiPiace(false);
        setNumeroLike((n) => n - 1);
        await togli_like(post.id);
      } else {
        setMiPiace(true);
        setNumeroLike((n) => n + 1);
        await metti_like(post.id);
      }
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const apriCommenti = async () => {
    const apri = !commentiAperti;
    setCommentiAperti(apri);
    if (apri && commenti.length === 0) {
      setCaricandoCommenti(true);
      try {
        setCommenti(await getCommenti(post.id));
      } catch (err) {
        console.error('Errore caricamento commenti:', err.message);
      }
      setCaricandoCommenti(false);
    }
  };

  const invia = async (e) => {
    e.preventDefault();
    if (!nuovoCommento.trim()) return;
    try {
      const c = await aggiungiCommento(post.id, nuovoCommento);
      setCommenti((prev) => [...prev, { ...c, autore: null }]);
      setNuovoCommento('');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const elimina = async () => {
    if (!window.confirm('Vuoi eliminare definitivamente questo video?')) return;
    setEliminando(true);
    try {
      await eliminaVideo(post.id);
      onDelete(post.id);
    } catch (err) {
      window.alert('Errore eliminazione: ' + err.message);
      setEliminando(false);
    }
  };

  const createdAt = post.created_at ? new Date(post.created_at) : null;
  const dataPubblicazione = createdAt && Number.isFinite(createdAt.getTime())
    ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(createdAt)
    : null;

  return (
    <article className={`feed-post${eliminando ? ' feed-post--deleting' : ''}`}>
      <header className="feed-post__header">
        <Link className="feed-post__author" href={isAuthor ? '/profilo' : `/profilo/${post.autore_id}`}>
          <UserAvatar src={post.autore?.foto_url} name={`${post.autore?.nome || ''} ${post.autore?.cognome || ''}`} size={44} className="feed-post__avatar" />
          <span className="feed-post__identity">
            <strong>{post.autore ? `${post.autore.nome} ${post.autore.cognome || ''}` : 'Giocatore'}</strong>
            <span>{dataPubblicazione || 'Video giocatore'}</span>
          </span>
        </Link>
        {isAuthor && (
          <button type="button" className="feed-post__delete" onClick={elimina} disabled={eliminando} aria-label="Elimina il tuo video" title="Elimina video">
            <IconDelete />
            <span>{eliminando ? 'Eliminazione…' : 'Elimina'}</span>
          </button>
        )}
      </header>

      <div className="feed-post__video-wrap">
        <video src={post.video_url} controls playsInline preload="none" className="feed-post__video" />
      </div>

      <div className="feed-post__body">
        {post.didascalia && <p className="feed-post__caption">{post.didascalia}</p>}
        <div className="feed-post__actions">
          <button type="button" onClick={toggleLike} className={`feed-post__action${miPiace ? ' is-active' : ''}`} aria-pressed={miPiace}>
            <IconLike active={miPiace} />
            <span>{numeroLike}</span>
          </button>
          <button type="button" onClick={apriCommenti} className={`feed-post__action${commentiAperti ? ' is-active' : ''}`} aria-expanded={commentiAperti}>
            <IconComment />
            <span>Commenti</span>
          </button>
        </div>

        {commentiAperti && (
          <div className="feed-comments">
            {caricandoCommenti ? (
              <p className="feed-comments__empty">Caricamento commenti…</p>
            ) : commenti.length === 0 ? (
              <p className="feed-comments__empty">Nessun commento ancora. Inizia tu la conversazione.</p>
            ) : (
              <div className="feed-comments__list">
                {commenti.map((c) => (
                  <p key={c.id} className="feed-comments__item">
                    <strong>{c.autore ? `${c.autore.nome} ${c.autore.cognome || ''}` : 'Utente'}:</strong> {c.testo}
                  </p>
                ))}
              </div>
            )}
            <form onSubmit={invia} className="feed-comments__form">
              <input type="text" placeholder="Scrivi un commento..." value={nuovoCommento} onChange={(e) => setNuovoCommento(e.target.value)} />
              <button type="submit" className="btn btn--secondary btn--sm">Invia</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

export default function Feed() {
  const [session, setSession] = useState(null);
  const [tipoAccount, setTipoAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const profilePromise = supabase.from('profiles').select('tipo_account').eq('id', session.user.id).single();
        const feedPromise = getFeed({ userId: session.user.id }).catch((err) => {
          console.error('Errore caricamento feed:', err.message);
          return [];
        });
        const [{ data: profilo }, feedPosts] = await Promise.all([profilePromise, feedPromise]);
        setTipoAccount(profilo?.tipo_account || null);
        setPost(feedPosts);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} theme="feed" />
      <div className="container container--wide feed-container">
        <div className="feed-heading">
          <div>
            <p className="feed-heading__eyebrow">HIDDENGEMS / VIDEO</p>
            <h1>Feed giocatori</h1>
            <p className="feed-heading__subtitle">Azioni, tecnica e talento direttamente dal campo.</p>
          </div>
          {tipoAccount === 'giocatore' && (
            <Link href="/feed/carica" className="feed-heading__publish"><span aria-hidden="true">+</span> Pubblica video</Link>
          )}
        </div>

        <div className="feed-list">
          {post.length === 0 ? (
            <div className="feed-empty">
              <span className="feed-empty__mark" aria-hidden="true">HG</span>
              <h2>Il campo è libero</h2>
              <p>Non ci sono ancora video nel feed. I nuovi contenuti appariranno qui.</p>
              {tipoAccount === 'giocatore' && <Link href="/feed/carica" className="feed-heading__publish">Pubblica il primo video</Link>}
            </div>
          ) : (
            post.map((p) => <PostCard key={p.id} post={p} sessionUserId={session.user.id} onDelete={(id) => setPost((current) => current.filter((item) => item.id !== id))} />)
          )}
        </div>
      </div>
    </main>
  );
}
