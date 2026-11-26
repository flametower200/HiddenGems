-- =====================================================================
-- HIDDENGEMS — Verifica credenziali
-- Esegui dopo 01_schema.sql e 02_functions.sql.
-- La conferma email prova il controllo di un indirizzo, non una qualifica
-- professionale. Le verifiche credenziali restano disattivate finché non
-- esiste una procedura amministrativa documentata.
-- =====================================================================

alter table public.coach_details
  add column if not exists verificato boolean not null default false;

drop trigger if exists trg_sync_club_email_verification on auth.users;
drop function if exists public.sync_club_email_verification();

-- Rimuove i badge eventualmente assegnati solo in base alla conferma email.
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
