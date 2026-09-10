'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import {
  getChatInApprovazione, getChatApprovate, accettaChat, rifiutaChat,
  getMessaggi, inviaMessaggio, sottoscriviMessaggi,
} from '../../lib/chat';

export default function Messaggi() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('approvate');
  const [inApprovazione, setInApprovazione] = useState([]);
  const [approvate, setApprovate] = useState([]);
  const [chatAperta, setChatAperta] = useState(null);
  const [messaggi, setMessaggi] = useState([]);
  const [testo, setTesto] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) caricaListe();
      else setLoading(false);
    });
  }, []);

  const caricaListe = async () => {
    setLoading(true);
    const [pending, accepted] = await Promise.all([getChatInApprovazione(), getChatApprovate()]);
    setInApprovazione(pending);
    setApprovate(accepted);
    setLoading(false);
  };

  const apriChat = async (chat) => {
    setChatAperta(chat);
    const msgs = await getMessaggi(chat.id);
    setMessaggi(msgs);
  };

  useEffect(() => {
    if (!chatAperta) return;
    const annulla = sottoscriviMessaggi(chatAperta.id, (nuovo) => {
      setMessaggi((prev) => [...prev, nuovo]);
    });
    return () => annulla();
  }, [chatAperta?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi]);

  const handleAccetta = async (chatId) => {
    try {
      await accettaChat(chatId);
      await caricaListe();
      setTab('approvate');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const handleRifiuta = async (chatId) => {
    try {
      await rifiutaChat(chatId);
      await caricaListe();
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const handleInvia = async (e) => {
    e.preventDefault();
    if (!testo.trim()) return;
    try {
      await inviaMessaggio(chatAperta.id, testo);
      setTesto('');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  };

  const nomeAltroPartecipante = (chat) => {
    const altro = chat.mittente?.id === session.user.id ? chat.destinatario : chat.mittente;
    if (!altro) return chat.mittente ? `${chat.mittente.nome} ${chat.mittente.cognome || ''}` : 'Utente';
    return `${altro.nome} ${altro.cognome || ''}`;
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;

  return (
    <main className="page">
      <AppHeader session={session} />
      <div className="container container--wide">
        <h3>Messaggi</h3>

        <div className="tabs">
          <button
            onClick={() => { setTab('approvazione'); setChatAperta(null); }}
            className={`tab ${tab === 'approvazione' ? 'is-active' : ''}`}
          >
            In approvazione {inApprovazione.length > 0 ? `(${inApprovazione.length})` : ''}
          </button>
          <button
            onClick={() => { setTab('approvate'); setChatAperta(null); }}
            className={`tab ${tab === 'approvate' ? 'is-active' : ''}`}
          >
            Approvate
          </button>
        </div>

        {tab === 'approvazione' && (
          <div className="card-stack">
            {inApprovazione.length === 0 ? (
              <p className="state-message">Nessuna richiesta in attesa.</p>
            ) : (
              inApprovazione.map((chat) => (
                <div key={chat.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span><strong>{chat.mittente?.nome} {chat.mittente?.cognome}</strong> vuole scriverti</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleAccetta(chat.id)} className="btn btn--sm btn--primary">Accetta</button>
                    <button onClick={() => handleRifiuta(chat.id)} className="btn btn--sm btn--outline">Rifiuta</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'approvate' && !chatAperta && (
          <div className="card-stack">
            {approvate.length === 0 ? (
              <p className="state-message">Nessuna chat approvata ancora. Vai su un profilo e clicca "Messaggi" per iniziarne una.</p>
            ) : (
              approvate.map((chat) => (
                <div key={chat.id} onClick={() => apriChat(chat)} className="card card--clickable">
                  <strong>{nomeAltroPartecipante(chat)}</strong>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'approvate' && chatAperta && (
          <div>
            <button onClick={() => setChatAperta(null)} className="btn--ghost" style={{ marginBottom: 10 }}>
              ← Torna alla lista
            </button>
            <h4>{nomeAltroPartecipante(chatAperta)}</h4>
            <div className="chat-thread">
              {messaggi.map((m) => (
                <div key={m.id} className={`chat-bubble ${m.sender_id === session.user.id ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}>
                  {m.testo}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleInvia} className="chat-composer">
              <input type="text" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi un messaggio..." />
              <button type="submit" className="btn btn--primary">Invia</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
