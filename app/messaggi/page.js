'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import {
  getChatInApprovazione, getChatApprovate, accettaChat, rifiutaChat,
  getMessaggi, inviaMessaggio, sottoscriviMessaggi,
} from '../../lib/chat';

export default function Messaggi() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState('');
  const [caricandoChat, setCaricandoChat] = useState(false);
  const [tab, setTab] = useState('approvate');
  const [inApprovazione, setInApprovazione] = useState([]);
  const [approvate, setApprovate] = useState([]);
  const [chatAperta, setChatAperta] = useState(null);
  const [messaggi, setMessaggi] = useState([]);
  const [testo, setTesto] = useState('');
  const bottomRef = useRef(null);

  const caricaListe = useCallback(async (mostraCaricamento = true) => {
    if (mostraCaricamento) setLoading(true);
    setErroreCaricamento('');
    try {
      const [pending, accepted] = await Promise.all([getChatInApprovazione(), getChatApprovate()]);
      setInApprovazione(pending);
      setApprovate(accepted);
    } catch (error) {
      setErroreCaricamento('Non è stato possibile caricare le conversazioni. Riprova tra poco.');
      console.error('Errore caricamento chat:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) caricaListe(false);
      else setLoading(false);
    });
  }, [caricaListe]);

  const apriChat = async (chat) => {
    setCaricandoChat(true);
    setChatAperta(chat);
    try {
      setMessaggi(await getMessaggi(chat.id));
    } catch (error) {
      setChatAperta(null);
      alert('Non è stato possibile aprire la conversazione. Riprova.');
      console.error('Errore caricamento messaggi:', error.message);
    } finally {
      setCaricandoChat(false);
    }
  };

  useEffect(() => {
    const chatId = chatAperta?.id;
    if (!chatId) return undefined;
    const annulla = sottoscriviMessaggi(chatId, (nuovo) => {
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
    <main className="page messages-screen">
      <AppHeader session={session} theme="messaggi" />
      <div className="container container--wide messages-screen__container">
        <div className="page-heading">
          <div>
            <p className="page-eyebrow">HIDDENGEMS / CONNESSIONI</p>
            <h1>Messaggi</h1>
            <p>Richieste e conversazioni con la rete.</p>
          </div>
        </div>

        {erroreCaricamento && <p className="form-error" role="alert">{erroreCaricamento}</p>}

        <div className="tabs message-tabs" role="group" aria-label="Caselle messaggi">
          <button
            onClick={() => { setTab('approvazione'); setChatAperta(null); }}
            className={`tab ${tab === 'approvazione' ? 'is-active' : ''}`}
            aria-pressed={tab === 'approvazione'}
          >
            In approvazione {inApprovazione.length > 0 ? `(${inApprovazione.length})` : ''}
          </button>
          <button
            onClick={() => { setTab('approvate'); setChatAperta(null); }}
            className={`tab ${tab === 'approvate' ? 'is-active' : ''}`}
            aria-pressed={tab === 'approvate'}
          >
            Approvate
          </button>
        </div>

        {tab === 'approvazione' && (
          <div className="message-list">
            {inApprovazione.length === 0 ? (
              <div className="directory-empty">
                <span className="directory-empty__mark" aria-hidden="true">01</span>
                <h2>Nessuna richiesta in attesa</h2>
                <p>Quando qualcuno ti contatta, puoi rivedere e approvare la richiesta qui.</p>
                <Link href="/cerca" className="btn btn--outline">Esplora profili</Link>
              </div>
            ) : (
              inApprovazione.map((chat) => (
                <div key={chat.id} className="message-request">
                  <span className="message-request__copy"><strong>{chat.mittente?.nome} {chat.mittente?.cognome}</strong><span>Vuole iniziare una conversazione</span></span>
                  <div className="message-request__actions">
                    <button onClick={() => handleAccetta(chat.id)} className="btn btn--sm btn--primary">Accetta</button>
                    <button onClick={() => handleRifiuta(chat.id)} className="btn btn--sm btn--outline">Rifiuta</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'approvate' && !chatAperta && (
          <div className="message-list">
            {approvate.length === 0 ? (
              <div className="directory-empty">
                <span className="directory-empty__mark" aria-hidden="true">02</span>
                <h2>La tua inbox è pronta</h2>
                <p>Avvia una conversazione dal profilo di un giocatore, allenatore, scout o società.</p>
                <Link href="/cerca" className="btn btn--secondary">Trova un profilo</Link>
              </div>
            ) : (
              approvate.map((chat) => {
                const altro = chat.mittente?.id === session.user.id ? chat.destinatario : chat.mittente;
                return (
                  <button key={chat.id} type="button" onClick={() => apriChat(chat)} className="message-conversation">
                    <span className="message-conversation__avatar">
                      <UserAvatar src={altro?.foto_url} name={`${altro?.nome || ''} ${altro?.cognome || ''}`} size={48} />
                    </span>
                    <span className="message-conversation__details"><strong>{nomeAltroPartecipante(chat)}</strong><span>Apri conversazione</span></span>
                    <span className="message-conversation__arrow" aria-hidden="true">→</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {tab === 'approvate' && chatAperta && (
          <div className="conversation-panel">
            <button onClick={() => setChatAperta(null)} className="btn--ghost" style={{ marginBottom: 10 }}>
              ← Torna alla lista
            </button>
            <h4>{nomeAltroPartecipante(chatAperta)}</h4>
            {caricandoChat ? <p className="state-message">Caricamento messaggi…</p> : null}
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
