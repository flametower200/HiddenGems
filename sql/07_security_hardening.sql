-- =====================================================================
-- HIDDENGEMS — Security hardening
-- Esegui dopo 01_schema.sql, 02_functions.sql e 06_feed.sql.
-- Limita i privilegi per colonna, blocca modifiche strutturali alle chat
-- e aggiunge un limite upload atomico per account.
-- =====================================================================

-- I client non devono poter creare oggetti che potrebbero alterare la
-- risoluzione dei nomi nelle funzioni SQL dell'applicazione.
revoke create on schema public from public, anon, authenticated;

-- Il bucket avatar resta pubblico in lettura ma rifiuta upload non immagine
-- e file piu' grandi del limite gia' usato dall'interfaccia.
update storage.buckets
set public = true,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- L'indirizzo email non deve essere leggibile dal client PostgREST.
-- La registrazione continua a creare il profilo tramite il trigger SECURITY DEFINER.
revoke all privileges on table public.profiles from public, anon, authenticated;
grant select (id, tipo_account, nome, cognome, genere, foto_url, bio, created_at, updated_at)
  on table public.profiles to authenticated;
grant update (bio, foto_url) on table public.profiles to authenticated;

-- Gli utenti possono creare richieste pending e il destinatario puo
-- cambiare solo lo status, una sola volta da pending a uno stato finale.
revoke insert, update, delete on table public.chats from public, anon, authenticated;
grant select on table public.chats to authenticated;
grant insert (sender_id, receiver_id, status) on table public.chats to authenticated;
grant update (status) on table public.chats to authenticated;

drop policy if exists "chats: creo solo richieste come mittente" on public.chats;
create policy "chats: creo solo richieste pending come mittente"
  on public.chats for insert
  with check (sender_id = auth.uid() and receiver_id <> auth.uid() and status = 'pending');

drop policy if exists "chats: solo il destinatario aggiorna lo status" on public.chats;
create policy "chats: destinatario finalizza solo richieste pending"
  on public.chats for update
  using (receiver_id = auth.uid() and status = 'pending')
  with check (receiver_id = auth.uid() and status in ('accepted', 'rejected'));

-- I messaggi non possono essere riscritti o rimossi via client dopo l'invio.
revoke update, delete on table public.messages from public, anon, authenticated;
grant select on table public.messages to authenticated;
grant insert (chat_id, sender_id, testo) on table public.messages to authenticated;

-- Un solo contatore per utente: la funzione fissa la finestra e il limite,
-- quindi il client non puo' scegliere valori piu' permissivi.
create table if not exists public.video_upload_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count between 0 and 6)
);

alter table public.video_upload_rate_limits enable row level security;
revoke all privileges on table public.video_upload_rate_limits from public, anon, authenticated;

-- Il client non puo' creare post o falsificare storage_key/video_url:
-- l'upload Next.js usa la service-role key solo dopo auth e validazione.
revoke insert, update, delete on table public.feed_posts from public, anon, authenticated;
grant select on table public.feed_posts to authenticated;

create or replace function public.consume_video_upload_slot()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.video_upload_rate_limits (user_id, window_started_at, request_count)
  values (v_user_id, pg_catalog.now(), 1)
  on conflict (user_id) do update
  set window_started_at = case
        when public.video_upload_rate_limits.window_started_at <= pg_catalog.now() - interval '1 hour'
          then pg_catalog.now()
        else public.video_upload_rate_limits.window_started_at
      end,
      request_count = case
        when public.video_upload_rate_limits.window_started_at <= pg_catalog.now() - interval '1 hour'
          then 1
        else least(public.video_upload_rate_limits.request_count + 1, 6)
      end
  returning request_count into v_count;

  return v_count <= 5;
end;
$$;

revoke all privileges on function public.consume_video_upload_slot() from public, anon;
grant execute on function public.consume_video_upload_slot() to authenticated;
