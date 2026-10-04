-- =====================================================================
-- HIDDENGEMS — SCHEMA DATABASE (Supabase / PostgreSQL)
-- Da eseguire nel Query Editor di Supabase, in ordine, dall'alto in basso.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. ESTENSIONI
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- ricerca veloce per nome (ILIKE / similarity)

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- Tabella comune a tutti i tipi di account, collegata 1:1 a auth.users.
-- Per le società: "nome" contiene il nome della squadra, "cognome" resta NULL.
-- ---------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  tipo_account   text not null check (tipo_account in ('giocatore','allenatore','scout','societa')),
  nome           text not null,          -- per società = nome della squadra
  cognome        text,                   -- NULL per le società
  genere         text,                   -- persona: es. uomo/donna/altro — società: maschile/femminile
  foto_url       text,
  bio            varchar(500),           -- descrizione libera (max 500 caratteri, come da spec)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_profiles_tipo_account on public.profiles (tipo_account);
-- indice per la ricerca veloce "per nome" nella barra di ricerca fissa
create index idx_profiles_nome_trgm on public.profiles
  using gin ((coalesce(nome,'') || ' ' || coalesce(cognome,'')) gin_trgm_ops);


-- ---------------------------------------------------------------------
-- 2. PLAYER_DETAILS
-- ---------------------------------------------------------------------
create table public.player_details (
  profile_id            uuid primary key references public.profiles(id) on delete cascade,
  data_nascita          date not null,
  ruolo_principale      text not null,
  ruolo_secondario      text,
  piede                 text check (piede in ('destro','sinistro','ambidestro')),
  altezza               numeric(5,2),
  peso                  numeric(5,2),
  lingue_parlate        text[],
  in_cerca_squadra      boolean not null default false,
  stato_contratto       text,            -- es. 'prestito' | 'svincolato' | 'club' (libero: doc dice "ecc..")
  nazione               text not null,
  regione               text,            -- solo se nazione = 'Italia'
  provincia             text,            -- solo se nazione = 'Italia'
  carriera              jsonb not null default '[]'::jsonb,   -- storico squadre/stagioni
  squadra_attuale_id    uuid references public.profiles(id) on delete set null,
  punti                 integer not null default 0,
  media_voto            numeric(4,2) not null default 0,
  media_voto_ponderata  numeric(4,2) not null default 0
);

create index idx_player_ruolo on public.player_details (ruolo_principale);
create index idx_player_piede on public.player_details (piede);
create index idx_player_cerca_squadra on public.player_details (in_cerca_squadra);
create index idx_player_stato_contratto on public.player_details (stato_contratto);
create index idx_player_luogo on public.player_details (nazione, regione, provincia);
-- indice pensato apposta per l'ORDER BY dell'algoritmo di ricerca
create index idx_player_ranking on public.player_details (punti desc, media_voto desc, media_voto_ponderata desc);


-- ---------------------------------------------------------------------
-- 3. COACH_DETAILS
-- ---------------------------------------------------------------------
create table public.coach_details (
  profile_id            uuid primary key references public.profiles(id) on delete cascade,
  data_nascita          date not null,
  patentino             text not null,
  modulo_preferito      text,
  stile_gioco           text,
  lingue_parlate        text[],          -- necessario per il filtro "lingua" in ricerca
  in_cerca_squadra      boolean not null default false,
  nazione               text not null,
  regione               text,
  provincia             text,
  carriera              jsonb not null default '[]'::jsonb,
  squadra_attuale_id    uuid references public.profiles(id) on delete set null
);

create index idx_coach_patentino on public.coach_details (patentino);
create index idx_coach_modulo on public.coach_details (modulo_preferito);
create index idx_coach_cerca_squadra on public.coach_details (in_cerca_squadra);
create index idx_coach_luogo on public.coach_details (nazione, regione, provincia);


-- ---------------------------------------------------------------------
-- 4. SCOUT_DETAILS
-- (ricercabili solo per nome/cognome, quindi niente indici sui filtri)
-- ---------------------------------------------------------------------
create table public.scout_details (
  profile_id       uuid primary key references public.profiles(id) on delete cascade,
  data_nascita     date not null,
  societa_attuale  text,
  in_cerca_squadra boolean not null default false,
  nazione          text,
  regione          text,
  provincia        text,
  carriera         jsonb not null default '[]'::jsonb,
  squadra_attuale_id uuid references public.profiles(id) on delete set null
);


-- ---------------------------------------------------------------------
-- 5. CLUB_DETAILS
-- ---------------------------------------------------------------------
create table public.club_details (
  profile_id       uuid primary key references public.profiles(id) on delete cascade,
  nome_societa     text not null,
  categoria        text,                 -- libero: troppe leghe/categorie per un CHECK rigido
  genere_squadra   text not null check (genere_squadra in ('maschile','femminile')),
  annata_squadra   text not null check (
                     annata_squadra in ('U14','U15','U16','U17','U18','U19','Prima Squadra')
                   ),
  palmares         text,
  in_cerca_allenatori boolean not null default false,
  in_cerca_giocatori  boolean not null default false,
  nazione          text,
  regione          text,
  provincia        text,
  verificato       boolean not null default false
);

create index idx_club_categoria on public.club_details (categoria);
create index idx_club_annata on public.club_details (annata_squadra);
create index idx_club_verificato on public.club_details (verificato);


-- ---------------------------------------------------------------------
-- 6. TRIGGER DI VALIDAZIONE: squadra_attuale_id deve puntare a una società
-- (una semplice FOREIGN KEY non può esprimere "solo profili con tipo_account = societa")
-- ---------------------------------------------------------------------
create or replace function public.check_squadra_is_societa()
returns trigger
language plpgsql
as $$
begin
  if new.squadra_attuale_id is not null then
    if not exists (
      select 1 from public.profiles
      where id = new.squadra_attuale_id and tipo_account = 'societa'
    ) then
      raise exception 'squadra_attuale_id deve fare riferimento a un account di tipo societa';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_player_squadra_check
  before insert or update of squadra_attuale_id on public.player_details
  for each row execute function public.check_squadra_is_societa();

create trigger trg_coach_squadra_check
  before insert or update of squadra_attuale_id on public.coach_details
  for each row execute function public.check_squadra_is_societa();

create trigger trg_scout_squadra_check
  before insert or update of squadra_attuale_id on public.scout_details
  for each row execute function public.check_squadra_is_societa();


-- ---------------------------------------------------------------------
-- 7. CHATS & MESSAGES (gestione a due fasi)
-- ---------------------------------------------------------------------
create table public.chats (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_chat_not_self check (sender_id <> receiver_id),
  -- evita richieste duplicate nella stessa direzione
  constraint uq_chat_sender_receiver unique (sender_id, receiver_id)
);

create index idx_chats_receiver_status on public.chats (receiver_id, status);
create index idx_chats_sender_status on public.chats (sender_id, status);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.chats(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  testo      text not null,
  created_at timestamptz not null default now()
);

create index idx_messages_chat on public.messages (chat_id, created_at);

-- updated_at automatico sulle chat quando lo status cambia
create or replace function public.touch_chat_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_chats_touch
  before update on public.chats
  for each row execute function public.touch_chat_updated_at();


-- ---------------------------------------------------------------------
-- 8. TABELLE SUPPLEMENTARI (follow / preferiti)
-- Non richieste esplicitamente nello schema tecnico del modulo 1, ma
-- necessarie per le funzionalità di profilo e ricerca descritte nel
-- documento originale (follower/seguiti, "metterli nei preferiti").
-- ---------------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint chk_follow_not_self check (follower_id <> following_id)
);

create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  constraint chk_favorite_not_self check (user_id <> profile_id)
);


-- ---------------------------------------------------------------------
-- 9. VERIFICA EMAIL OBBLIGATORIA PER LE SOCIETÀ
-- Supabase Auth gestisce la conferma email a livello di progetto (globale),
-- non per singolo tipo di utente. Per rendere la verifica "obbligatoria
-- solo per le società" a livello applicativo, sincronizziamo lo stato di
-- conferma email di auth.users dentro club_details.verificato tramite
-- un trigger su auth.users. L'app poi blocca le funzionalità di società
-- non verificate finché club_details.verificato non è true.
-- ---------------------------------------------------------------------
create or replace function public.sync_club_email_verification()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email_confirmed_at is not null and (old.email_confirmed_at is null) then
    update public.club_details
       set verificato = true
     where profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_club_email_verification on auth.users;
create trigger trg_sync_club_email_verification
  after update of email_confirmed_at on auth.users
  for each row execute function public.sync_club_email_verification();


-- =====================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.player_details enable row level security;
alter table public.coach_details  enable row level security;
alter table public.scout_details  enable row level security;
alter table public.club_details   enable row level security;
alter table public.chats          enable row level security;
alter table public.messages       enable row level security;
alter table public.follows        enable row level security;
alter table public.favorites      enable row level security;

-- PROFILES: profili pubblici in lettura per chi è autenticato, scrivibili solo dal proprietario
create policy "profiles: lettura pubblica autenticati" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles: insert solo proprio profilo" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles: update solo proprio profilo" on public.profiles
  for update using (id = auth.uid());
create policy "profiles: delete solo proprio profilo" on public.profiles
  for delete using (id = auth.uid());

-- DETTAGLI PER RUOLO: stessa logica per tutte e quattro le tabelle
do $$
declare
  t text;
begin
  foreach t in array array['player_details','coach_details','scout_details','club_details']
  loop
    execute format($f$
      create policy "%1$s: lettura pubblica autenticati" on public.%1$s
        for select using (auth.role() = 'authenticated');
      create policy "%1$s: insert solo proprio profilo" on public.%1$s
        for insert with check (profile_id = auth.uid());
      create policy "%1$s: update solo proprio profilo" on public.%1$s
        for update using (profile_id = auth.uid());
      create policy "%1$s: delete solo proprio profilo" on public.%1$s
        for delete using (profile_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- CHATS
create policy "chats: vedo solo le mie chat" on public.chats
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy "chats: creo solo richieste come mittente" on public.chats
  for insert with check (sender_id = auth.uid());
-- solo il destinatario può accettare/rifiutare
create policy "chats: solo il destinatario aggiorna lo status" on public.chats
  for update using (receiver_id = auth.uid());

-- MESSAGES: si possono leggere solo i messaggi delle chat a cui si partecipa
create policy "messages: leggo solo le mie chat" on public.messages
  for select using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and (c.sender_id = auth.uid() or c.receiver_id = auth.uid())
    )
  );
-- BLOCCO INVIO applicato anche a livello di database, non solo in UI:
-- si può inserire un messaggio solo se la chat è 'accepted'
create policy "messages: invio solo su chat accettate" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and c.status = 'accepted'
        and (c.sender_id = auth.uid() or c.receiver_id = auth.uid())
    )
  );

-- FOLLOWS / FAVORITES
create policy "follows: lettura pubblica autenticati" on public.follows
  for select using (auth.role() = 'authenticated');
create policy "follows: creo solo i miei follow" on public.follows
  for insert with check (follower_id = auth.uid());
create policy "follows: cancello solo i miei follow" on public.follows
  for delete using (follower_id = auth.uid());

create policy "favorites: leggo solo i miei preferiti" on public.favorites
  for select using (user_id = auth.uid());
create policy "favorites: creo solo i miei preferiti" on public.favorites
  for insert with check (user_id = auth.uid());
create policy "favorites: cancello solo i miei preferiti" on public.favorites
  for delete using (user_id = auth.uid());
