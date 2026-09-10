-- =====================================================================
-- HIDDENGEMS — Storage per le foto profilo
-- Esegui questo script nel Query Editor di Supabase (dopo 01_schema.sql).
-- =====================================================================

-- Bucket pubblico in lettura (le foto profilo si vedono senza login),
-- ma protetto in scrittura dalle policy sotto.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Chiunque (anche non autenticato) può VEDERE le foto — sono pubbliche per natura.
create policy "avatars: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Un utente può caricare SOLO dentro una cartella che porta il proprio id
-- (es. avatars/<il-tuo-id>/foto.jpg) — non può scrivere nella cartella di altri.
create policy "avatars: carico solo la mia cartella"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: aggiorno solo la mia cartella"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: cancello solo la mia cartella"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
