-- =====================================================================
-- HIDDENGEMS — RESET COMPLETO
-- ATTENZIONE: cancella irreversibilmente tutte le tabelle, funzioni e
-- trigger custom di HiddenGems (dati compresi). NON tocca il progetto
-- Supabase in sé né gli utenti in auth.users — quelli vanno cancellati
-- a parte da Authentication → Users nella dashboard, oppure con la
-- query commentata in fondo a questo file.
--
-- Esegui questo script PRIMA di rieseguire 01_schema.sql e 02_functions.sql.
-- =====================================================================

drop trigger if exists trg_sync_club_email_verification on auth.users;
drop trigger if exists trg_handle_new_user on auth.users;

drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.favorites cascade;
drop table if exists public.follows cascade;
drop table if exists public.club_details cascade;
drop table if exists public.scout_details cascade;
drop table if exists public.coach_details cascade;
drop table if exists public.player_details cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.sync_club_email_verification() cascade;
drop function if exists public.check_squadra_is_societa() cascade;
drop function if exists public.touch_chat_updated_at() cascade;
-- versione precedente sostituita dal trigger — la cancella se esiste ancora
drop function if exists public.complete_registration(text,text,text,text,text,jsonb) cascade;

-- ---------------------------------------------------------------------
-- OPZIONALE — cancella anche tutti gli utenti Auth di test.
-- Scommenta solo se sei sicuro: è irreversibile e cancella TUTTI gli
-- utenti registrati, non solo quelli di prova. Per uno o due utenti di
-- test è più sicuro cancellarli a mano da Authentication → Users.
-- ---------------------------------------------------------------------
-- delete from auth.users;
