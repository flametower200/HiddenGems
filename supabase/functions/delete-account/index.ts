// =====================================================================
// HIDDENGEMS — Edge Function: delete-account
// Deploy: supabase functions deploy delete-account
// Richiede le variabili d'ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// (già disponibili di default nell'ambiente delle Edge Functions Supabase).
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
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

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
