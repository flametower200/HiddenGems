// =====================================================================
// HIDDENGEMS — Edge Function: delete-account
// Deploy: supabase functions deploy delete-account
// Richiede le variabili d'ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// (già disponibili di default nell'ambiente delle Edge Functions Supabase).
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metodo non consentito' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 });
    }

    // Client "anon" per verificare CHI sta chiamando, a partire dal suo token
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utente non valido' }), { status: 401 });
    }

    // Client con service-role key: unico modo per cancellare da Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const { data: posts } = await supabaseAdmin
      .from('feed_posts')
      .select('storage_key')
      .eq('autore_id', user.id);

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      for (const post of posts ?? []) {
        if (!post.storage_key?.startsWith(`hiddengems-feed/giocatore-${user.id}/`)) continue;
        try {
          await fetch(
            `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/video/upload`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ public_ids: [post.storage_key], invalidate: true }),
            }
          );
        } catch (error) {
          console.error('Cloudinary cleanup failed:', error);
        }
      }
    }

    const { data: avatarFiles } = await supabaseAdmin.storage
      .from('avatars')
      .list(user.id);
    if (avatarFiles?.length) {
      await supabaseAdmin.storage
        .from('avatars')
        .remove(avatarFiles.map((file) => `${user.id}/${file.name}`));
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
