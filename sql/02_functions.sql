-- =====================================================================
-- HIDDENGEMS — FUNZIONE: handle_new_user (trigger su auth.users)
-- Da eseguire DOPO 01_schema.sql.
--
-- Perché un trigger e non una RPC chiamata dal client (come in una prima
-- versione di questo file): se in Auth è attiva la conferma email
-- obbligatoria, subito dopo supabase.auth.signUp() l'utente NON ha
-- ancora una sessione attiva, quindi auth.uid() sarebbe NULL e una RPC
-- chiamata dal client fallirebbe. Il trigger invece scatta lato server
-- alla creazione della riga in auth.users, indipendentemente dal fatto
-- che l'email sia già stata confermata o meno: profilo e dettagli
-- vengono creati subito, in modo affidabile in entrambi i casi.
--
-- I dati (tipo_account, nome, cognome, genere, dettagli) vengono passati
-- dal client dentro `options.data` di supabase.auth.signUp() e finiscono
-- automaticamente in auth.users.raw_user_meta_data.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta          jsonb := new.raw_user_meta_data;
  v_tipo        text  := meta->>'tipo_account';
  v_nome        text  := meta->>'nome';
  v_cognome     text  := meta->>'cognome';
  v_genere      text  := meta->>'genere';
  v_dettagli    jsonb := coalesce(meta->'dettagli', '{}'::jsonb);
begin
  -- Se l'utente è stato creato senza metadati HiddenGems (es. da Auth
  -- Admin API o script esterni), non fare nulla: evita errori spuri.
  if v_tipo is null then
    return new;
  end if;

  if v_tipo not in ('giocatore','allenatore','scout','societa') then
    raise exception 'tipo_account non valido: %', v_tipo;
  end if;

  insert into public.profiles (id, email, tipo_account, nome, cognome, genere)
  values (
    new.id,
    new.email,
    v_tipo,
    v_nome,
    case when v_tipo = 'societa' then null else v_cognome end,
    v_genere
  );

  if v_tipo = 'giocatore' then

    insert into public.player_details (
      profile_id, data_nascita, ruolo_principale, ruolo_secondario, piede,
      altezza, peso, lingue_parlate, in_cerca_squadra, stato_contratto,
      nazione, regione, provincia
    ) values (
      new.id,
      (v_dettagli->>'data_nascita')::date,
      v_dettagli->>'ruolo_principale',
      v_dettagli->>'ruolo_secondario',
      v_dettagli->>'piede',
      nullif(v_dettagli->>'altezza','')::numeric,
      nullif(v_dettagli->>'peso','')::numeric,
      case when v_dettagli ? 'lingue_parlate'
        then (select array_agg(x) from jsonb_array_elements_text(v_dettagli->'lingue_parlate') as x)
        else null end,
      coalesce((v_dettagli->>'in_cerca_squadra')::boolean, false),
      v_dettagli->>'stato_contratto',
      v_dettagli->>'nazione',
      v_dettagli->>'regione',
      v_dettagli->>'provincia'
    );

  elsif v_tipo = 'allenatore' then

    insert into public.coach_details (
      profile_id, data_nascita, patentino, modulo_preferito, stile_gioco,
      lingue_parlate, in_cerca_squadra, nazione, regione, provincia
    ) values (
      new.id,
      (v_dettagli->>'data_nascita')::date,
      v_dettagli->>'patentino',
      v_dettagli->>'modulo_preferito',
      v_dettagli->>'stile_gioco',
      case when v_dettagli ? 'lingue_parlate'
        then (select array_agg(x) from jsonb_array_elements_text(v_dettagli->'lingue_parlate') as x)
        else null end,
      coalesce((v_dettagli->>'in_cerca_squadra')::boolean, false),
      v_dettagli->>'nazione',
      v_dettagli->>'regione',
      v_dettagli->>'provincia'
    );

  elsif v_tipo = 'scout' then

    insert into public.scout_details (
      profile_id, data_nascita, societa_attuale, in_cerca_squadra,
      nazione, regione, provincia
    ) values (
      new.id,
      (v_dettagli->>'data_nascita')::date,
      v_dettagli->>'societa_attuale',
      coalesce((v_dettagli->>'in_cerca_squadra')::boolean, false),
      v_dettagli->>'nazione',
      v_dettagli->>'regione',
      v_dettagli->>'provincia'
    );

  elsif v_tipo = 'societa' then

    insert into public.club_details (
      profile_id, nome_societa, categoria, genere_squadra, annata_squadra,
      palmares, in_cerca_allenatori, in_cerca_giocatori, nazione, regione, provincia
    ) values (
      new.id,
      v_nome,
      v_dettagli->>'categoria',
      v_dettagli->>'genere_squadra',
      v_dettagli->>'annata_squadra',
      v_dettagli->>'palmares',
      coalesce((v_dettagli->>'in_cerca_allenatori')::boolean, false),
      coalesce((v_dettagli->>'in_cerca_giocatori')::boolean, false),
      v_dettagli->>'nazione',
      v_dettagli->>'regione',
      v_dettagli->>'provincia'
    );

  end if;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();
