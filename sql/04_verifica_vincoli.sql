-- =====================================================================
-- VERIFICA: i nomi dei vincoli di chiave esterna usati nel codice
-- (lib/profileHelpers.js e lib/search.js, es. "player_details_profile_id_fkey")
-- corrispondono davvero a quelli generati dal tuo database?
-- Esegui questa query nel Query Editor di Supabase.
-- =====================================================================

select
  conname as nome_vincolo,
  conrelid::regclass as tabella,
  confrelid::regclass as tabella_riferita
from pg_constraint
where contype = 'f'
  and conrelid::regclass::text in ('player_details', 'coach_details', 'scout_details', 'club_details')
order by tabella, nome_vincolo;

-- Ti aspetti di vedere, tra le altre:
--   player_details_profile_id_fkey        | player_details | profiles
--   player_details_squadra_attuale_id_fkey | player_details | profiles
--   coach_details_profile_id_fkey         | coach_details  | profiles
--   coach_details_squadra_attuale_id_fkey  | coach_details  | profiles
--   scout_details_profile_id_fkey         | scout_details  | profiles
--   scout_details_squadra_attuale_id_fkey  | scout_details  | profiles
--   club_details_profile_id_fkey          | club_details   | profiles   (una sola, nessuna ambiguità)
--
-- Se i nomi che vedi sono DIVERSI da questi, dimmelo esattamente come
-- appaiono: vuol dire che li ho previsti in modo sbagliato e vanno
-- corretti in lib/profileHelpers.js e lib/search.js.
