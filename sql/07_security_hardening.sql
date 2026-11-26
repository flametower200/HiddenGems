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

-- Migrazioni additive per gli account e i filtri descritti nell'MVP.
alter table public.coach_details
  add column if not exists in_cerca_giocatori boolean not null default false,
  add column if not exists verificato boolean not null default false;

alter table public.club_details
  add column if not exists cerca_patentino text,
  add column if not exists cerca_formazione text,
  add column if not exists cerca_lingua text;

drop trigger if exists trg_sync_club_email_verification on auth.users;
drop function if exists public.sync_club_email_verification();

update public.coach_details set verificato = false where verificato;
update public.scout_details set verificato = false where verificato;
update public.club_details set verificato = false where verificato;

create or replace function public.prevent_self_verification_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and new.verificato is distinct from old.verificato then
    raise exception 'La verifica del profilo richiede una revisione amministrativa.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_coach_verification on public.coach_details;
create trigger trg_prevent_self_coach_verification
  before update of verificato on public.coach_details
  for each row execute function public.prevent_self_verification_changes();

drop trigger if exists trg_prevent_self_scout_verification on public.scout_details;
create trigger trg_prevent_self_scout_verification
  before update of verificato on public.scout_details
  for each row execute function public.prevent_self_verification_changes();

drop trigger if exists trg_prevent_self_club_verification on public.club_details;
create trigger trg_prevent_self_club_verification
  before update of verificato on public.club_details
  for each row execute function public.prevent_self_verification_changes();

create table if not exists public.club_roster (
  club_id uuid not null references public.club_details(profile_id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('giocatore','allenatore')),
  created_at timestamptz not null default now(),
  primary key (club_id, member_id)
);

revoke all privileges on table public.club_roster from public, anon, authenticated;
grant select, insert, update, delete on table public.club_roster to authenticated;

create index if not exists idx_club_roster_member on public.club_roster(member_id);
alter table public.club_roster enable row level security;

drop policy if exists "club_roster: lettura autenticati" on public.club_roster;
create policy "club_roster: lettura autenticati" on public.club_roster
  for select using (auth.role() = 'authenticated');
drop policy if exists "club_roster: il club gestisce la propria rosa" on public.club_roster;
create policy "club_roster: il club gestisce la propria rosa" on public.club_roster
  for all
  using (club_id = auth.uid())
  with check (club_id = auth.uid());

create or replace function public.sync_club_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := case when tg_op = 'DELETE' then old.role else new.role end;
  if tg_op <> 'DELETE' then
    if not exists (
      select 1 from public.profiles
      where id = new.member_id
        and tipo_account = v_role
    ) then
      raise exception 'Il membro della rosa deve avere il ruolo indicato';
    end if;
  end if;
  if tg_op = 'DELETE' then
    if v_role = 'giocatore' then
      update public.player_details set squadra_attuale_id = null
      where profile_id = old.member_id and squadra_attuale_id = old.club_id;
    elsif v_role = 'allenatore' then
      update public.coach_details set squadra_attuale_id = null
      where profile_id = old.member_id and squadra_attuale_id = old.club_id;
    end if;
    return old;
  end if;
  if v_role = 'giocatore' then
    update public.player_details set squadra_attuale_id = new.club_id where profile_id = new.member_id;
  elsif v_role = 'allenatore' then
    update public.coach_details set squadra_attuale_id = new.club_id where profile_id = new.member_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_club_roster_insert_update on public.club_roster;
create trigger trg_sync_club_roster_insert_update
  after insert or update on public.club_roster
  for each row execute function public.sync_club_roster();
drop trigger if exists trg_sync_club_roster_delete on public.club_roster;
create trigger trg_sync_club_roster_delete
  after delete on public.club_roster
  for each row execute function public.sync_club_roster();
