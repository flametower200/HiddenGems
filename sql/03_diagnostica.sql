-- =====================================================================
-- DIAGNOSTICA: perché la bacheca è vuota?
-- Esegui queste query UNA ALLA VOLTA nel Query Editor di Supabase.
-- =====================================================================

-- 1) La tabella profiles esiste ed è davvero vuota?
select count(*) as totale_profili from public.profiles;

-- 2) L'utente Auth che hai registrato esiste? Ha i metadati giusti?
--    (raw_user_meta_data deve contenere tipo_account, nome, ecc. —
--     se è vuoto/null, il problema è nel FRONTEND: signUp() non sta
--     passando options.data)
select id, email, email_confirmed_at, raw_user_meta_data
from auth.users
order by created_at desc
limit 5;

-- 3) Il trigger esiste davvero nel database?
--    (se questa query non restituisce righe, 02_functions.sql
--     non è mai stato eseguito, oppure è fallito)
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgname = 'trg_handle_new_user';

-- =====================================================================
-- CASO A — raw_user_meta_data è pieno di dati ma profiles è vuota:
-- il trigger non era ancora installato quando ti sei registrato
-- (l'hai creato DOPO aver fatto il primo test di signup). Il trigger
-- scatta solo per gli INSERT futuri su auth.users, non retroattivamente.
-- Soluzione più semplice: cancella l'utente di test da
-- Authentication → Users nella dashboard Supabase, e registrati di nuovo.
--
-- CASO B — raw_user_meta_data è null/vuoto:
-- il problema è nel frontend, non nel database — vedi lib/registration.js
-- e verifica che signUp() includa davvero `options: { data: {...} }`.
--
-- CASO C — la query 3 non restituisce righe:
-- non hai ancora eseguito sql/02_functions.sql. Eseguilo ora, poi
-- ripeti la registrazione da zero (cancellando prima l'utente di test).
-- =====================================================================
