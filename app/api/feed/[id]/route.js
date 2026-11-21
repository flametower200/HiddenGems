import { createClient } from '@supabase/supabase-js';
import { cancellaDaCloudinary } from '../../../../lib/server/cloudinary';
import { requestHasTrustedBrowserOrigin } from '../../../../lib/server/requestSecurity';

export const runtime = 'nodejs';

function creaClientUtente(token) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: Bearer  } },
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

export async function DELETE(request, { params }) {
  try {
    if (!requestHasTrustedBrowserOrigin(request)) {
      return Response.json({ error: 'Origine della richiesta non consentita.' }, { status: 403 });
    }

    const authorization = request.headers.get('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return Response.json({ error: 'Non autenticato.' }, { status: 401 });

    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return Response.json({ error: 'Post non valido.' }, { status: 400 });
    }

    const supabase = creaClientUtente(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Sessione non valida.' }, { status: 401 });

    const supabaseAdmin = creaClientAmministratore();
    const { data: post, error: postError } = await supabaseAdmin
      .from('feed_posts')
      .select('id,storage_key')
      .eq('id', id)
      .eq('autore_id', user.id)
      .maybeSingle();

    if (postError) throw postError;
    if (!post) return Response.json({ error: 'Post non trovato o non eliminabile.' }, { status: 404 });
    if (!post.storage_key) return Response.json({ error: 'Il video non ha un riferimento Cloudinary valido.' }, { status: 409 });

    const expectedPrefix = `hiddengems-feed/giocatore-${user.id}/`;
    if (!post.storage_key.startsWith(expectedPrefix)) {
      return Response.json({ error: 'Il video non appartiene a questo account.' }, { status: 403 });
    }

    const { data: deletedPost, error: deleteError } = await supabaseAdmin
      .from('feed_posts')
      .delete()
      .eq('id', id)
      .eq('autore_id', user.id)
      .select('id')
      .maybeSingle();

    if (deleteError) throw deleteError;
    if (!deletedPost) {
      return Response.json({ error: 'Il video è stato rimosso, ma il post non è stato aggiornato. Ricarica il feed.' }, { status: 409 });
    }

    try {
      await cancellaDaCloudinary(post.storage_key);
    } catch (error) {
      console.error('Post eliminato ma cleanup Cloudinary fallito:', error);
    }

    return Response.json({ success: true, id: deletedPost.id });
  } catch (error) {
    console.error('Errore eliminazione post feed:', error);
    return Response.json({ error: 'Non è stato possibile eliminare il video.' }, { status: 500 });
  }
}
