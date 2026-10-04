'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import { getFeed, metti_like, togli_like, getCommenti, aggiungiCommento } from '../../lib/feed';

function PostCard({ post, sessionUserId }) {
  const [miPiace, setMiPiace] = useState(post.miPiace);
  const [numeroLike, setNumeroLike] = useState(post.numeroLike);
  const [commentiAperti, setCommentiAperti] = useState(false);
  const [commenti, setCommenti] = useState([]);
  const [caricandoCommenti, setCaricandoCommenti] = useState(false);
  const [nuovoCommento, setNuovoCommento] = useState('');

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

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <img src={post.autore?.foto_url || 'https://placehold.co/36x36?text=%20'} alt="" className="avatar" style={{ width: 36, height: 36 }} />
        <Link href={post.autore_id === sessionUserId ? '/profilo' : `/profilo/${post.autore_id}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'inherit' }}>
          {post.autore ? `${post.autore.nome} ${post.autore.cognome || ''}` : 'Giocatore'}
        </Link>
      </div>

      <video
        src={post.video_url}
        controls
        playsInline
        preload="metadata"
        style={{ width: '100%', maxHeight: 480, backgroundColor: '#000', display: 'block' }}
      />

      <div style={{ padding: '12px 14px' }}>
        {post.didascalia && <p style={{ marginTop: 0 }}>{post.didascalia}</p>}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={toggleLike} className="btn--ghost" style={{ fontWeight: 600 }}>
            {miPiace ? '♥' : '♡'} {numeroLike}
          </button>
          <button onClick={apriCommenti} className="btn--ghost" style={{ fontWeight: 600 }}>
            💬 Commenti
          </button>
        </div>

        {commentiAperti && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--color-line)', paddingTop: 12 }}>
            {caricandoCommenti ? (
              <p className="state-message" style={{ padding: 10 }}>Caricamento...</p>
            ) : commenti.length === 0 ? (
              <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>Nessun commento ancora.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {commenti.map((c) => (
                  <p key={c.id} style={{ margin: 0, fontSize: '0.9rem' }}>
                    <strong>{c.autore ? `${c.autore.nome} ${c.autore.cognome || ''}` : 'Utente'}:</strong> {c.testo}
                  </p>
                ))}
              </div>
            )}
            <form onSubmit={invia} style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Scrivi un commento..." value={nuovoCommento} onChange={(e) => setNuovoCommento(e.target.value)} />
              <button type="submit" className="btn btn--sm btn--primary">Invia</button>
            </form>
          </div>
        )}
      </div>
    </div>
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
        const { data: profilo } = await supabase.from('profiles').select('tipo_account').eq('id', session.user.id).single();
        setTipoAccount(profilo?.tipo_account || null);
        try {
          setPost(await getFeed());
        } catch (err) {
          console.error('Errore caricamento feed:', err.message);
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} />
      <div className="container">
        <div className="section-title">
          <h3>Feed</h3>
          {tipoAccount === 'giocatore' && (
            <Link href="/feed/carica" className="btn btn--primary btn--sm">+ Pubblica video</Link>
          )}
        </div>

        <div className="card-stack">
          {post.length === 0 ? (
            <p className="state-message">Nessun video ancora nel feed.</p>
          ) : (
            post.map((p) => <PostCard key={p.id} post={p} sessionUserId={session.user.id} />)
          )}
        </div>
      </div>
    </main>
  );
}
