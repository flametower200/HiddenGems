// =====================================================================
// app/api/feed/upload/route.js
//
// Riceve il video GIÀ COMPRESSO in 480p dal browser (la trasformazione
// avviene lato client con ffmpeg.wasm, vedi lib/videoCompress.js — il
// server non fa transcodifica, solo upload verso Cloudinary).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { caricaSuCloudinary, cancellaDaCloudinary } from '../../../../lib/server/cloudinary';
import { requestHasTrustedBrowserOrigin } from '../../../../lib/server/requestSecurity';

export const runtime = 'nodejs';

const DIMENSIONE_MASSIMA_BYTES = 4 * 1024 * 1024;
const DURATA_MASSIMA_SECONDI = 30;
const ALTEZZA_RITRATTO = 854;
const LARGHEZZA_RITRATTO = 480;
const SCARTO_MULTIPART_BYTES = 64 * 1024;

function creaClientUtente(bearerToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });
}

function creaClientAmministratore() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configurata.');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function POST(request) {
  try {
    if (!requestHasTrustedBrowserOrigin(request)) {
      return Response.json({ error: 'Origine della richiesta non consentita.' }, { status: 403 });
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > DIMENSIONE_MASSIMA_BYTES + SCARTO_MULTIPART_BYTES) {
      return Response.json({ error: 'Video troppo grande: il file compresso supera il limite consentito.' }, { status: 413 });
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return Response.json({ error: 'Non autenticato.' }, { status: 401 });
    }
    const supabase = creaClientUtente(token);

    const { data: { user }, error: errUser } = await supabase.auth.getUser();
    if (errUser || !user) {
      return Response.json({ error: 'Sessione non valida.' }, { status: 401 });
    }

    // Solo i giocatori possono pubblicare (controllo applicativo; il
    // trigger check_autore_giocatore su feed_posts lo rende comunque
    // impossibile aggirare anche inserendo direttamente nel database).
    const { data: profilo, error: errProfilo } = await supabase
      .from('profiles')
      .select('tipo_account')
      .eq('id', user.id)
      .maybeSingle();
    if (errProfilo) throw new Error('Impossibile verificare il tipo di account.');
    if (!profilo) return Response.json({ error: 'Profilo non trovato.' }, { status: 403 });
    if (profilo.tipo_account !== 'giocatore') {
      return Response.json({ error: 'Solo i giocatori possono pubblicare video nel feed.' }, { status: 403 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Richiesta multipart non valida.' }, { status: 400 });
    }
    const file = formData.get('video');
    const durataRaw = formData.get('durata');
    const didascaliaRaw = formData.get('didascalia');

    if (!file || typeof file.arrayBuffer !== 'function' || typeof file.size !== 'number') {
      return Response.json({ error: 'Nessun video ricevuto.' }, { status: 400 });
    }
    if (file.type !== 'video/mp4') {
      return Response.json({ error: 'Il video deve essere convertito in MP4 verticale prima della pubblicazione.' }, { status: 415 });
    }
    if (file.size < 12 || file.size > DIMENSIONE_MASSIMA_BYTES) {
      return Response.json({ error: 'File troppo grande: qualcosa non ha funzionato nella compressione.' }, { status: 400 });
    }
    if (typeof durataRaw !== 'string' || !Number.isFinite(Number(durataRaw)) || Number(durataRaw) <= 0 || Number(durataRaw) > DURATA_MASSIMA_SECONDI) {
      return Response.json({ error: 'Durata video non valida.' }, { status: 400 });
    }
    if (didascaliaRaw !== null && (typeof didascaliaRaw !== 'string' || didascaliaRaw.length > 280)) {
      return Response.json({ error: 'Didascalia non valida.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.toString('ascii', 4, 8) !== 'ftyp') {
      return Response.json({ error: 'Il file non contiene un video MP4 valido.' }, { status: 415 });
    }

    const { data: rateAllowed, error: rateError } = await supabase.rpc('consume_video_upload_slot');
    if (rateError) {
      console.error('Rate limiter video non disponibile. Applicare sql/07_security_hardening.sql su Supabase.');
      return Response.json({ error: 'Pubblicazione temporaneamente non disponibile. Riprova più tardi.' }, { status: 503 });
    }
    if (!rateAllowed) {
      return Response.json({ error: 'Hai raggiunto il limite di pubblicazioni. Riprova tra un’ora.' }, {
        status: 429,
        headers: { 'Retry-After': '3600' },
      });
    }

    const publicId = `hiddengems-feed/giocatore-${user.id}/video-${Date.now()}-${crypto.randomUUID()}`;
    const uploaded = await caricaSuCloudinary(buffer, publicId);
    const cloudinaryPublicId = uploaded.publicId;
    const portrait = uploaded.width === LARGHEZZA_RITRATTO
      && uploaded.height === ALTEZZA_RITRATTO
      && uploaded.width < uploaded.height
      && uploaded.format === 'mp4'
      && uploaded.bytes <= DIMENSIONE_MASSIMA_BYTES;

    if (!portrait) {
      await cancellaDaCloudinary(cloudinaryPublicId);
      return Response.json({ error: 'Il video non è nel formato verticale 9:16 richiesto.' }, { status: 422 });
    }

    const supabaseAdmin = creaClientAmministratore();
    const { data: post, error: errInsert } = await supabaseAdmin
      .from('feed_posts')
      .insert({
        autore_id: user.id,
        video_url: uploaded.url,
        storage_key: cloudinaryPublicId,
        durata_secondi: Number(durataRaw),
        didascalia: didascaliaRaw?.trim() || null,
      })
      .select()
      .single();
    if (errInsert) {
      try {
        await cancellaDaCloudinary(cloudinaryPublicId);
      } catch {
        console.error('Cleanup Cloudinary fallito dopo errore insert feed.');
      }
      throw new Error('Impossibile salvare il post nel feed.');
    }

    return Response.json({ post });
  } catch {
    console.error('Errore durante la pubblicazione video.');
    return Response.json({ error: 'Errore durante la pubblicazione. Riprova più tardi.' }, { status: 500 });
  }
}
