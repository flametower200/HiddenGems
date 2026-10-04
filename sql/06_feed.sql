-- =====================================================================
-- HIDDENGEMS — FEED VIDEO
-- Esegui dopo 01_schema.sql e 02_functions.sql.
--
-- Se avevi già eseguito una versione precedente di questo script basata
-- con un servizio di storage diverso (Box o Cloudflare R2), cancella prima le tre tabelle:
--   drop table if exists public.feed_comments cascade;
--   drop table if exists public.feed_likes cascade;
--   drop table if exists public.feed_posts cascade;
-- Non c'è perdita di dati reale: a questo punto del progetto il feed
-- non ha ancora utenti reali che hanno pubblicato video.
-- =====================================================================

create table public.feed_posts (
  id              uuid primary key default gen_random_uuid(),
  autore_id       uuid not null references public.profiles(id) on delete cascade,
  video_url       text not null,               -- URL pubblico diretto su Cloudinary (secure_url)
  storage_key     text not null,               -- public_id di Cloudinary (serve per poterlo cancellare in futuro)
  durata_secondi  numeric(5,2),
  didascalia      varchar(280),
  created_at      timestamptz not null default now()
);

create index idx_feed_posts_autore on public.feed_posts (autore_id);
create index idx_feed_posts_created on public.feed_posts (created_at desc);

-- Solo i GIOCATORI possono pubblicare — stesso pattern di validazione già
-- usato per squadra_attuale_id in 01_schema.sql (check_squadra_is_societa).
create or replace function public.check_autore_giocatore()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.autore_id and tipo_account = 'giocatore'
  ) then
    raise exception 'Solo i giocatori possono pubblicare video nel feed';
  end if;
  return new;
end;
$$;

create trigger trg_feed_posts_autore_giocatore
  before insert on public.feed_posts
  for each row execute function public.check_autore_giocatore();


create table public.feed_likes (
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.feed_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  testo      varchar(500) not null,
  created_at timestamptz not null default now()
);

create index idx_feed_comments_post on public.feed_comments (post_id, created_at);


-- ---------------------------------------------------------------------
-- RLS — like e commenti disponibili a "chiunque" nel senso di
-- "qualunque utente autenticato dell'app" (coerente con il resto di
-- HiddenGems, che richiede sempre login). Pubblicare video resta
-- riservato ai soli giocatori grazie al trigger sopra.
-- ---------------------------------------------------------------------
alter table public.feed_posts    enable row level security;
alter table public.feed_likes    enable row level security;
alter table public.feed_comments enable row level security;

create policy "feed_posts: lettura pubblica autenticati" on public.feed_posts
  for select using (auth.role() = 'authenticated');
create policy "feed_posts: solo il proprio autore pubblica" on public.feed_posts
  for insert with check (autore_id = auth.uid());
create policy "feed_posts: solo l'autore cancella il proprio post" on public.feed_posts
  for delete using (autore_id = auth.uid());

create policy "feed_likes: lettura pubblica autenticati" on public.feed_likes
  for select using (auth.role() = 'authenticated');
create policy "feed_likes: ognuno mette solo i propri like" on public.feed_likes
  for insert with check (user_id = auth.uid());
create policy "feed_likes: ognuno toglie solo i propri like" on public.feed_likes
  for delete using (user_id = auth.uid());

create policy "feed_comments: lettura pubblica autenticati" on public.feed_comments
  for select using (auth.role() = 'authenticated');
create policy "feed_comments: ognuno crea solo i propri commenti" on public.feed_comments
  for insert with check (user_id = auth.uid());
create policy "feed_comments: ognuno cancella solo i propri commenti" on public.feed_comments
  for delete using (user_id = auth.uid());
