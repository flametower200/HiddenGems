// =====================================================================
// lib/videoCompress.js
//
// Gira interamente nel browser (WebAssembly) — nessun file grande viene
// mai inviato al nostro server: il video originale resta sul telefono/
// computer dell'utente, viene compresso lì, e solo il risultato (pochi
// MB) viene caricato. Usiamo la build "single-thread" di @ffmpeg/core,
// che NON richiede gli header COOP/COEP (più lenta della versione
// multi-thread, ma per 30 secondi di video va benissimo e non serve
// configurare nulla in next.config.js).
// =====================================================================
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
const DURATA_MASSIMA_SECONDI = 30;
const DIMENSIONE_MASSIMA_ORIGINALE_BYTES = 100 * 1024 * 1024;

let ffmpegSingleton = null;

async function ottieniFFmpeg(onLog) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;

  const ffmpeg = new FFmpeg();
  if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));

  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegSingleton = ffmpeg;
  return ffmpeg;
}

/**
 * Legge la durata (in secondi) di un file video usando l'elemento
 * <video> nativo del browser — veloce, non richiede ffmpeg.
 */
export function leggiDurataVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile leggere il file video: formato non riconosciuto.'));
    };
    video.src = url;
  });
}

/**
 * Comprime un video: lo ritaglia ai primi 30 secondi e lo porta in verticale
 * 9:16 (480x854), ritagliando il centro quando l'originale è orizzontale.
 * @param {File} file - il video scelto dall'utente
 * @param {(progresso: number) => void} [onProgress] - 0..1
 * @returns {Promise<{ blob: Blob, durata: number, tagliato: boolean }>}
 */
export async function comprimiVideo480p(file, onProgress) {
  if (!file || file.size <= 0 || file.size > DIMENSIONE_MASSIMA_ORIGINALE_BYTES) {
    throw new Error('Il video originale deve pesare meno di 100 MB.');
  }
  if (file.type && !file.type.startsWith('video/')) {
    throw new Error('Seleziona un file video valido.');
  }

  const durataOriginale = await leggiDurataVideo(file);
  if (!Number.isFinite(durataOriginale) || durataOriginale <= 0) {
    throw new Error('Durata video non valida.');
  }
  const tagliato = durataOriginale > DURATA_MASSIMA_SECONDI;
  const durataFinale = Math.min(durataOriginale, DURATA_MASSIMA_SECONDI);

  const ffmpeg = await ottieniFFmpeg();
  const suffisso = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nomeInput = `input-${suffisso}${file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp4'}`;
  const nomeOutput = `output-${suffisso}.mp4`;
  const progressListener = onProgress
    ? ({ progress }) => onProgress(Math.min(Math.max(progress, 0), 1))
    : null;

  if (progressListener) ffmpeg.on('progress', progressListener);

  try {
    await ffmpeg.writeFile(nomeInput, await fetchFile(file));

    await ffmpeg.exec([
      '-i', nomeInput,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-t', String(DURATA_MASSIMA_SECONDI),
      '-vf', 'scale=480:854:force_original_aspect_ratio=increase,crop=480:854,setsar=1',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-maxrate', '800k',
      '-bufsize', '1600k',
      '-c:a', 'aac',
      '-b:a', '96k',
      '-sn',
      '-dn',
      '-map_metadata', '-1',
      '-map_chapters', '-1',
      '-movflags', '+faststart',
      nomeOutput,
    ]);

    const dati = await ffmpeg.readFile(nomeOutput);
    const blob = new Blob([dati], { type: 'video/mp4' });
    return { blob, durata: durataFinale, tagliato };
  } finally {
    if (progressListener) ffmpeg.off('progress', progressListener);
    await Promise.all([nomeInput, nomeOutput].map(async (nome) => {
      try {
        await ffmpeg.deleteFile(nome);
      } catch {
        // The file may not have been created if a prior FFmpeg step failed.
      }
    }));
  }
}
