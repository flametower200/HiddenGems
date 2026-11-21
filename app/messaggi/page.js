'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import UserAvatar from '../../components/UserAvatar';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useToast } from '../../components/ToastProvider';
import {
  getChatInApprovazione, getChatApprovate, accettaChat, rifiutaChat,
  getMessaggi, inviaMessaggio, sottoscriviMessaggi,
} from '../../lib/chat';

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4h2A7.5 7.5 0 0 1 20 11.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Messaggi() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState('');
  const [caricandoChat, setCaricandoChat] = useState(false);
  const [inviandoMessaggio, setInviandoMessaggio] = useState(false);
  const [erroreInvio, setErroreInvio] = useState('');
  const [tab, setTab] = useState('approvate');
  const [inApprovazione, setInApprovazione] = useState([]);
  const [approvate, setApprovate] = useState([]);
  const [chatAperta, setChatAperta] = useState(null);
  const [messaggi, setMessaggi] = useState([]);
  const [testo, setTesto] = useState('');
  const bottomRef = useRef(null);
  const notify = useToast();
  const [chatInAzione, setChatInAzione] = useState(null);

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
    setMessaggi([]);
    setErroreInvio('');
    setErroreCaricamento('');
    try {
      setMessaggi(await getMessaggi(chat.id));
    } catch (error) {
      setChatAperta(null);
      setErroreCaricamento('Non è stato possibile aprire la conversazione. Riprova.');
      console.error('Errore caricamento messaggi:', error.message);
    } finally {
      setCaricandoChat(false);
    }
  };

  useEffect(() => {
    const chatId = chatAperta?.id;
    if (!chatId) return undefined;
    const annulla = sottoscriviMessaggi(chatId, (nuovo) => {
      setMessaggi((prev) => {
        if (prev.some((messaggio) => messaggio.id === nuovo.id)) return prev;
        const ottimistico = prev.findIndex((messaggio) => (
          messaggio.inInvio
          && messaggio.sender_id === nuovo.sender_id
          && messaggio.testo === nuovo.testo
        ));
        return ottimistico === -1
          ? [...prev, nuovo]
          : prev.map((messaggio, index) => index === ottimistico ? nuovo : messaggio);
      });
    });
    return () => annulla();
  }, [chatAperta?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi]);

  const handleAccetta = async (chatId) => {
    if (chatInAzione) return;
    const richiesta = inApprovazione.find((chat) => chat.id === chatId);
    if (!richiesta) return;
    setChatInAzione(chatId);
    setInApprovazione((current) => current.filter((chat) => chat.id !== chatId));
    setApprovate((current) => [{ ...richiesta, status: 'accepted' }, ...current]);
    setTab('approvate');
    try {
      setErroreCaricamento('');
      await accettaChat(chatId);
      notify({ type: 'success', message: 'Richiesta di chat accettata.' });
      void caricaListe(false);
    } catch (err) {
      setInApprovazione((current) => [richiesta, ...current]);
      setApprovate((current) => current.filter((chat) => chat.id !== chatId));
      setTab('approvazione');
      notify({ type: 'error', message: `Non è stato possibile accettare la richiesta. ${err.message}` });
    } finally {
      setChatInAzione(null);
    }
  };

  const handleRifiuta = async (chatId) => {
    if (chatInAzione) return;
    const richiesta = inApprovazione.find((chat) => chat.id === chatId);
    if (!richiesta) return;
    setChatInAzione(chatId);
    setInApprovazione((current) => current.filter((chat) => chat.id !== chatId));
    try {
      setErroreCaricamento('');
      await rifiutaChat(chatId);
      notify({ type: 'success', message: 'Richiesta di chat rifiutata.' });
      void caricaListe(false);
    } catch (err) {
      setInApprovazione((current) => [richiesta, ...current]);
      notify({ type: 'error', message: `Non è stato possibile rifiutare la richiesta. ${err.message}` });
    } finally {
      setChatInAzione(null);
    }
  };

  const handleInvia = async (e) => {
    e.preventDefault();
    const testoMessaggio = testo.trim();
    if (!testoMessaggio || inviandoMessaggio || !chatAperta) return;
    const idOttimistico = `pending-${Date.now()}`;
    const messaggioOttimistico = {
      id: idOttimistico,
      chat_id: chatAperta.id,
      sender_id: session.user.id,
      testo: testoMessaggio,
      created_at: new Date().toISOString(),
      inInvio: true,
    };
    setMessaggi((prev) => [...prev, messaggioOttimistico]);
    setTesto('');
    setErroreInvio('');
    setInviandoMessaggio(true);
    try {
      const inviato = await inviaMessaggio(chatAperta.id, testoMessaggio);
      setMessaggi((prev) => (
        prev.some((messaggio) => messaggio.id === inviato.id)
          ? prev.filter((messaggio) => messaggio.id !== idOttimistico)
          : prev.map((messaggio) => messaggio.id === idOttimistico ? inviato : messaggio)
      ));
    } catch (err) {
      setMessaggi((prev) => prev.filter((messaggio) => messaggio.id !== idOttimistico));
      setTesto(testoMessaggio);
      setErroreInvio(`Messaggio non inviato. Riprova. ${err.message}`);
    } finally {
      setInviandoMessaggio(false);
    }
  };

  const nomeAltroPartecipante = (chat) => {
    const altro = chat.mittente?.id === session.user.id ? chat.destinatario : chat.mittente;
    if (!altro) return chat.mittente ? `${chat.mittente.nome} ${chat.mittente.cognome || ''}` : 'Utente';
    return `${altro.nome} ${altro.cognome || ''}`;
  };

  if (loading) return <LoadingSkeleton variant="messages" />;
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

        {erroreCaricamento && (
          <div className="form-error" role="alert">
            <p>{erroreCaricamento}</p>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => caricaListe()}>Riprova</button>
          </div>
        )}

        <div className="tabs message-tabs" role="group" aria-label="Caselle messaggi">
          <button
            onClick={() => { setTab('approvazione'); setChatAperta(null); }}
            className={`tab ${tab === 'approvazione' ? 'is-active' : ''}`}
            aria-pressed={tab === 'approvazione'}
          >
            In approvazione<span className="message-tabs__count">{inApprovazione.length}</span>
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
                <span className="directory-empty__mark" aria-hidden="true"><IconChat /></span>
                <h2>Nessuna richiesta in attesa</h2>
                <p>Quando qualcuno ti contatta, puoi rivedere e approvare la richiesta qui.</p>
                <Link href="/cerca" className="btn btn--outline">Esplora profili</Link>
              </div>
            ) : (
              inApprovazione.map((chat) => (
                <div key={chat.id} className="message-request">
                  <span className="message-request__copy"><strong>{chat.mittente?.nome} {chat.mittente?.cognome}</strong><span>Vuole iniziare una conversazione</span></span>
                  <div className="message-request__actions">
                    <button onClick={() => handleAccetta(chat.id)} disabled={Boolean(chatInAzione)} className="btn btn--sm btn--primary">
                      {chatInAzione === chat.id ? <><span className="button-spinner" aria-hidden="true" /> Accetto…</> : 'Accetta'}
                    </button>
                    <button onClick={() => handleRifiuta(chat.id)} disabled={Boolean(chatInAzione)} className="btn btn--sm btn--outline">
                      {chatInAzione === chat.id ? <><span className="button-spinner" aria-hidden="true" /> Aggiorno…</> : 'Rifiuta'}
                    </button>
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
                <span className="directory-empty__mark" aria-hidden="true"><IconChat /></span>
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
            {caricandoChat ? <LoadingSkeleton variant="thread" /> : (
              <div className="chat-thread">
                {messaggi.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.sender_id === session.user.id ? 'chat-bubble--mine' : 'chat-bubble--theirs'}${m.inInvio ? ' chat-bubble--pending' : ''}`}>
                    {m.testo}
                    {m.inInvio && <small>Invio…</small>}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
            {erroreInvio && <p className="form-error" role="alert">{erroreInvio}</p>}
            <form onSubmit={handleInvia} className="chat-composer">
              <input type="text" maxLength={2000} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi un messaggio..." aria-label="Scrivi un messaggio" />
              <button type="submit" disabled={inviandoMessaggio || !testo.trim()} className="btn btn--primary">
                {inviandoMessaggio ? <><span className="button-spinner" aria-hidden="true" /> Invio…</> : 'Invia'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
