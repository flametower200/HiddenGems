'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import AppHeader from '../../../components/AppHeader';
import { comprimiVideo480p } from '../../../lib/videoCompress';
import { pubblicaVideo } from '../../../lib/feed';

export default function CaricaVideo() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tipoAccount, setTipoAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [didascalia, setDidascalia] = useState('');
  const [fase, setFase] = useState('scegli'); // scegli | comprimendo | pronto | pubblicando
  const [progresso, setProgresso] = useState(0);
  const [anteprima, setAnteprima] = useState(null);
  const [risultatoCompressione, setRisultatoCompressione] = useState(null);
  const [errore, setErrore] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const { data: profilo } = await supabase.from('profiles').select('tipo_account').eq('id', session.user.id).single();
        setTipoAccount(profilo?.tipo_account || null);
      }
      setLoading(false);
    });
  }, []);

  const scegliFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErrore('');
    setFile(f);
    setFase('comprimendo');
    setProgresso(0);
    try {
      const risultato = await comprimiVideo480p(f, setProgresso);
      setRisultatoCompressione(risultato);
      setAnteprima(URL.createObjectURL(risultato.blob));
      setFase('pronto');
    } catch (err) {
      setErrore('Errore durante la compressione: ' + err.message);
      setFase('scegli');
    }
  };

  const pubblica = async () => {
    if (!risultatoCompressione) return;
    setFase('pubblicando');
    setErrore('');
    try {
      await pubblicaVideo({
        blob: risultatoCompressione.blob,
        durata: risultatoCompressione.durata,
        didascalia,
      });
      router.push('/feed');
    } catch (err) {
      setErrore('Errore durante la pubblicazione: ' + err.message);
      setFase('pronto');
    }
  };

  if (loading) return <div className="state-message">Caricamento...</div>;
  if (!session) return <div className="state-message">Devi accedere per vedere questa pagina.</div>;
  if (tipoAccount !== 'giocatore') {
    return (
      <main className="page">
        <AppHeader session={session} />
        <div className="container">
          <p className="state-message">Solo i giocatori possono pubblicare video nel feed.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <AppHeader session={session} />
      <div className="container">
        <h3>Pubblica un video</h3>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Il video viene compresso automaticamente in 480p direttamente nel tuo browser (nessun dato lascia il
          dispositivo finché non clicchi "Pubblica"). Se dura più di 30 secondi, verranno tenuti solo i primi 30.
        </p>

        {errore && (
          <div className="card" style={{ borderLeftColor: 'var(--color-danger)', marginBottom: 16, color: '#6B2E24' }}>
            {errore}
          </div>
        )}

        {fase === 'scegli' && (
          <label className="btn btn--primary" style={{ cursor: 'pointer' }}>
            Scegli un video
            <input type="file" accept="video/*" onChange={scegliFile} style={{ display: 'none' }} />
          </label>
        )}

        {fase === 'comprimendo' && (
          <div className="card card--panel">
            <p>Compressione in corso... {Math.round(progresso * 100)}%</p>
            <div style={{ height: 8, background: 'var(--color-line)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(progresso * 100)}%`, background: 'var(--color-gold)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {(fase === 'pronto' || fase === 'pubblicando') && anteprima && (
          <div className="card card--panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <video src={anteprima} controls style={{ width: '100%', maxHeight: 400, background: '#000' }} />
            {risultatoCompressione?.tagliato && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                Il video originale durava più di 30 secondi: sono stati tenuti solo i primi 30.
              </p>
            )}
            <div className="field">
              <label className="field__label">Didascalia (opzionale, max 280 caratteri)</label>
              <textarea value={didascalia} maxLength={280} onChange={(e) => setDidascalia(e.target.value)} rows={3} />
            </div>
            <div className="action-row" style={{ margin: 0 }}>
              <button onClick={pubblica} disabled={fase === 'pubblicando'} className="btn btn--primary">
                {fase === 'pubblicando' ? 'Pubblicazione...' : 'Pubblica'}
              </button>
              <button onClick={() => { setFase('scegli'); setFile(null); setAnteprima(null); setRisultatoCompressione(null); }} disabled={fase === 'pubblicando'} className="btn btn--outline">
                Scegli un altro video
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
