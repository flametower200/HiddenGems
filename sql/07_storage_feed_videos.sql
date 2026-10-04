-- =====================================================================
-- HIDDENGEMS — Storage per i video del feed (Supabase Storage)
-- Esegui dopo 01_schema.sql, 02_functions.sql e 06_feed.sql.
--
-- Stesso meccanismo già usato in 05_storage_avatars.sql per le foto
-- profilo: nessun servizio esterno, nessuna carta di credito, nessun
-- account da collegare — è lo Storage incluso nel progetto Supabase
-- che hai già.
-- =====================================================================

-- Bucket pubblico in lettura (i video si vedono senza dover fare login
-- al bucket), con un tetto di 10MB per file come rete di sicurezza:
-- un video di 30s in 480p ben compresso pesa 3-5MB, 10MB è già un
-- margine ampio per bloccare upload anomali.
insert into storage.buckets (id, name, public, file_size_limit)
values ('feed-videos', 'feed-videos', true, 10485760)
on conflict (id) do update set file_size_limit = 10485760;

-- Chiunque può VEDERE i video (coerente con "likeabili e commentabili da chiunque").
create policy "feed-videos: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'feed-videos');

-- Si può caricare SOLO dentro la propria cartella (come avatars) E
-- SOLO se si è un giocatore — il controllo "solo giocatori" avviene
-- qui, a livello di database, non solo nel codice dell'app: è
-- impossibile da aggirare anche chiamando Supabase direttamente.
create policy "feed-videos: solo i giocatori caricano nella propria cartella"
  on storage.objects for insert
  with check (
    bucket_id = 'feed-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and tipo_account = 'giocatore'
    )
  );

-- Un giocatore può cancellare solo i propri video (utile se in futuro
-- si aggiunge un bottone "elimina post").
create policy "feed-videos: l'autore cancella solo i propri video"
  on storage.objects for delete
  using (bucket_id = 'feed-videos' and (storage.foldername(name))[1] = auth.uid()::text);
