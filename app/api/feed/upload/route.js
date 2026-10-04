// =====================================================================
// app/api/feed/upload/route.js
//
// Riceve il video GIÀ COMPRESSO in 480p dal browser (la trasformazione
// avviene lato client con ffmpeg.wasm, vedi lib/videoCompress.js — il
// server non fa transcodifica, solo upload verso Cloudinary).
// =====================================================================
import { createClient } from '@supabase/supabase-js';
import { caricaSuCloudinary } from '../../../../lib/server/cloudinary';

export const runtime = 'nodejs';

// Rete di sicurezza server-side: se qualcuno bypassasse la compressione
// lato client e chiamasse questa API direttamente con un file enorme,
// lo blocchiamo qui. Un video di 30s in 480p ben compresso pesa 3-5MB:
// 10MB è già un margine ampio.
const DIMENSIONE_MASSIMA_BYTES = 10 * 1024 * 1024;

function creaClientUtente(bearerToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Non autenticato.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
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
      .single();
    if (errProfilo) throw errProfilo;
    if (profilo.tipo_account !== 'giocatore') {
      return Response.json({ error: 'Solo i giocatori possono pubblicare video nel feed.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('video');
    const durata = formData.get('durata');
    const didascalia = formData.get('didascalia') || null;

    if (!file) {
      return Response.json({ error: 'Nessun video ricevuto.' }, { status: 400 });
    }
    if (file.size > DIMENSIONE_MASSIMA_BYTES) {
      return Response.json({ error: 'File troppo grande: qualcosa non ha funzionato nella compressione.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicId = `giocatore-${user.id}/video-${Date.now()}`;
    const { url: videoUrl, publicId: cloudinaryPublicId } = await caricaSuCloudinary(buffer, publicId);

    const { data: post, error: errInsert } = await supabase
      .from('feed_posts')
      .insert({
        autore_id: user.id,
        video_url: videoUrl,
        storage_key: cloudinaryPublicId,
        durata_secondi: durata ? Number(durata) : null,
        didascalia,
      })
      .select()
      .single();
    if (errInsert) throw errInsert;

    return Response.json({ post });
  } catch (err) {
    console.error('Errore upload feed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
