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
 * Comprime un video: lo ritaglia ai primi 30 secondi (se più lungo) e lo
 * scala a 480p di altezza, mantenendo le proporzioni originali.
 * @param {File} file - il video scelto dall'utente
 * @param {(progresso: number) => void} [onProgress] - 0..1
 * @returns {Promise<{ blob: Blob, durata: number, tagliato: boolean }>}
 */
export async function comprimiVideo480p(file, onProgress) {
  const durataOriginale = await leggiDurataVideo(file);
  const tagliato = durataOriginale > DURATA_MASSIMA_SECONDI;
  const durataFinale = Math.min(durataOriginale, DURATA_MASSIMA_SECONDI);

  const ffmpeg = await ottieniFFmpeg();
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => onProgress(Math.min(Math.max(progress, 0), 1)));
  }

  const nomeInput = 'input' + (file.name.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.mp4');
  const nomeOutput = 'output.mp4';

  await ffmpeg.writeFile(nomeInput, await fetchFile(file));

  await ffmpeg.exec([
    '-i', nomeInput,
    '-t', String(DURATA_MASSIMA_SECONDI),
    '-vf', 'scale=-2:480',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '28',
    '-maxrate', '800k',
    '-bufsize', '1600k',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-movflags', '+faststart',
    nomeOutput,
  ]);

  const dati = await ffmpeg.readFile(nomeOutput);
  const blob = new Blob([dati.buffer], { type: 'video/mp4' });

  // Puliamo il filesystem virtuale di ffmpeg.wasm per non accumulare memoria
  // se l'utente comprime più video nella stessa sessione.
  await ffmpeg.deleteFile(nomeInput);
  await ffmpeg.deleteFile(nomeOutput);

  return { blob, durata: durataFinale, tagliato };
}
