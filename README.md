# HiddenGems — Setup completo

## Struttura finale del progetto

```
.env.local.example      → copialo in .env.local e compila i valori
lib/
  supabase.js            client Supabase (usa NEXT_PUBLIC_...)
  registration.js        Modulo 2 — validazione + registrazione/accesso
  search.js               Modulo 3 — ricerca con filtri
  chat.js                  Modulo 4 — chat a due fasi
  accountSettings.js       Modulo 5 — password + eliminazione account
  social.js                 supplementare — follow/preferiti
app/
  page.js                pagina login/registrazione/bacheca
sql/
  01_schema.sql          esegui PRIMO nel Query Editor Supabase
  02_functions.sql       esegui SECONDO
  08_verification_hardening.sql  disattiva badge senza revisione credenziali
  03_diagnostica.sql     query di controllo se qualcosa non torna
supabase/functions/delete-account/index.ts   Edge Function eliminazione account
```

## Checklist da zero (segui in ordine)

1. **Database**: nel Query Editor di Supabase esegui `sql/01_schema.sql`, `sql/02_functions.sql` e `sql/08_verification_hardening.sql`. Se usi anche le migrazioni successive, esegui `sql/07_security_hardening.sql` prima di `08`. La migrazione `08` rimuove le verifiche attribuite alla sola conferma email e impedisce agli utenti di assegnarsi da soli il badge; non attiva alcuna procedura di verifica professionale.
2. **Utente di test**: se hai già un account di prova registrato PRIMA di eseguire `02_functions.sql` (sembra il tuo caso), cancellalo da Supabase → Authentication → Users. Il trigger crea il profilo solo per le registrazioni fatte DOPO che esiste.
3. **Variabili d'ambiente**: copia `.env.local.example` in `.env.local` (stessa cartella di `package.json`) e inserisci URL e anon key da Supabase → Project Settings → API. **Riavvia `npm run dev`** dopo averlo salvato.
4. **File**: metti `lib/*.js` nella cartella `lib/` del progetto e `app/page.js` in `app/page.js` (sovrascrivi quello attuale).
5. **Registrati di nuovo** con l'account di test da zero, scegliendo un tipo account (es. giocatore) e compilando tutti i campi.
6. **Se hai la conferma email attiva** su Supabase (Authentication → Providers → Email → "Confirm email"): controlla la mail e clicca il link prima di fare login.
7. **Verifica**: in Supabase → Table Editor apri `profiles` — dovresti vedere la tua riga. Se non c'è, esegui `sql/03_diagnostica.sql` e segui i tre casi descritti nei commenti.
8. Ricarica la bacheca in localhost: ora dovresti vedere il tuo profilo nell'elenco.

## Requisiti ancora da completare prima del lancio

Le pagine Privacy, Termini, Cookie, Rimborsi e Note legali sono segnaposto espliciti, non policy definitive. Prima del lancio servono i dati reali del titolare e i testi approvati, oltre a regole per minori e consenso dei genitori, visibilità dei dati personali, processo di verifica delle credenziali e gestione delle richieste di cancellazione/disiscrizione email. Questi elementi non sono stati inventati. Non sono presenti strumenti analytics/pubblicitari né un sistema email promozionale da cui attivare la disiscrizione.

## Sessioni di accesso

La sessione di HiddenGems resta salvata nella scheda/finestra del browser in cui accedi. Finché quella scheda è aperta, un aggiornamento della pagina mantiene l'accesso; una nuova finestra richiede invece un accesso separato. Chiudendo la scheda, la sessione viene eliminata.

## Nota sulla Edge Function

`supabase/functions/delete-account/index.ts` serve solo per l'eliminazione account (Modulo 5) — non è necessaria per far funzionare login/registrazione/bacheca. Deployala solo quando arrivi a implementare le impostazioni account: `supabase functions deploy delete-account`.
