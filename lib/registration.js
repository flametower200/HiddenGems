// =====================================================================
// HIDDENGEMS — MODULO 2: Registrazione, accesso e validazione dati
// =====================================================================
import { supabase } from './supabase';
import { invalidaCacheProfili } from './profileHelpers';
import {
  COUNTRY_OPTIONS,
  COACH_LICENSE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  FORMATION_OPTIONS,
  LANGUAGE_OPTIONS,
} from './profileOptions';

const ETA_MINIMA = {
  giocatore: 14,
  allenatore: 18,
  scout: 18,
  // 'societa' non ha data di nascita: è un'entità, non una persona.
};

/**
 * Calcola l'età (in anni compiuti) a partire da una data di nascita.
 * @param {string|Date} dataNascita - formato 'YYYY-MM-DD' o oggetto Date
 * @returns {number}
 */
export function calcolaEta(dataNascita) {
  const nascita = new Date(dataNascita);
  if (Number.isNaN(nascita.getTime())) {
    throw new Error('Data di nascita non valida');
  }
  const oggi = new Date();
  let eta = oggi.getFullYear() - nascita.getFullYear();
  const meseNonAncoraRaggiunto =
    oggi.getMonth() < nascita.getMonth() ||
    (oggi.getMonth() === nascita.getMonth() && oggi.getDate() < nascita.getDate());
  if (meseNonAncoraRaggiunto) eta -= 1;
  return eta;
}

/**
 * Valida i dati del form di registrazione PRIMA di inviarli al database.
 * @param {object} formData
 * @param {'giocatore'|'allenatore'|'scout'|'societa'} formData.tipoAccount
 * @param {string} [formData.dataNascita] - richiesta per tutti tranne 'societa'
 * @param {string} formData.password
 * @param {string} formData.confermaPassword
 * @returns {{ valido: boolean, errori: string[] }}
 */
export function validaRegistrazione(formData) {
  const errori = [];
  const { tipoAccount, dataNascita, password, confermaPassword, dettagli = {} } = formData;

  if (!['giocatore', 'allenatore', 'scout', 'societa'].includes(tipoAccount)) {
    errori.push('Tipo di account non valido.');
  }

  // Controllo età: non si applica alle società (non è una persona fisica)
  if (tipoAccount !== 'societa') {
    if (!dataNascita) {
      errori.push('La data di nascita è obbligatoria.');
    } else {
      const eta = calcolaEta(dataNascita);
      const minima = ETA_MINIMA[tipoAccount];
      if (minima !== undefined && eta < minima) {
        errori.push(`Età minima richiesta per ${tipoAccount}: ${minima} anni.`);
      }
    }
  }

  if (tipoAccount !== 'societa' && tipoAccount !== 'scout' && !COUNTRY_OPTIONS.some((option) => option.value === dettagli.nazione)) {
    errori.push('Seleziona una nazione valida dall’elenco.');
  }
  if ((tipoAccount === 'societa' || tipoAccount === 'scout') && dettagli.nazione && !COUNTRY_OPTIONS.some((option) => option.value === dettagli.nazione)) {
    errori.push('Seleziona una nazione valida dall’elenco.');
  }
  if (tipoAccount === 'giocatore') {
    if (dettagli.stato_contratto && !CONTRACT_STATUS_OPTIONS.some((option) => option.value === dettagli.stato_contratto)) {
      errori.push('Seleziona uno stato contrattuale valido dall’elenco.');
    }
    if (dettagli.lingue_parlate && !Array.isArray(dettagli.lingue_parlate)) {
      errori.push('Le lingue parlate devono essere selezionate dall’elenco.');
    } else if ((dettagli.lingue_parlate || []).some((language) => !LANGUAGE_OPTIONS.some((option) => option.value === language))) {
      errori.push('Seleziona le lingue parlate dall’elenco.');
    }
  }
  if (tipoAccount === 'allenatore') {
    if (!COACH_LICENSE_OPTIONS.some((option) => option.value === dettagli.patentino)) {
      errori.push('Seleziona un patentino valido dall’elenco.');
    }
    if (dettagli.modulo_preferito && !FORMATION_OPTIONS.some((option) => option.value === dettagli.modulo_preferito)) {
      errori.push('Seleziona un modulo tattico valido dall’elenco.');
    }
    if (dettagli.lingue_parlate && !Array.isArray(dettagli.lingue_parlate)) {
      errori.push('Le lingue parlate devono essere selezionate dall’elenco.');
    } else if ((dettagli.lingue_parlate || []).some((language) => !LANGUAGE_OPTIONS.some((option) => option.value === language))) {
      errori.push('Seleziona le lingue parlate dall’elenco.');
    }
  }

  // Conferma password (lato client)
  if (!password || password.length === 0) {
    errori.push('La password è obbligatoria.');
  }
  if (password !== confermaPassword) {
    errori.push('Le due password non coincidono.');
  }

  return { valido: errori.length === 0, errori };
}

/**
 * Esegue la registrazione: crea l'utente in Supabase Auth passando i dati
 * di profilo nei metadata; profilo e dettagli specifici vengono creati
 * lato server dal trigger `handle_new_user` (vedi sql/02_functions.sql).
 *
 * @param {object} formData
 * @param {string} formData.email
 * @param {string} formData.password
 * @param {string} formData.confermaPassword
 * @param {'giocatore'|'allenatore'|'scout'|'societa'} formData.tipoAccount
 * @param {string} formData.nome            - per 'societa' = nome della squadra
 * @param {string} [formData.cognome]       - non richiesto per 'societa'
 * @param {string} [formData.genere]
 * @param {object} formData.dettagli        - campi specifici per tipo account
 *   (data_nascita, ruolo_principale, piede, ... per giocatore; patentino, ... per
 *    allenatore; societa_attuale, ... per scout; categoria, annata_squadra, ... per società)
 * @returns {Promise<{ userId: string, richiedeConfermaEmail: boolean }>}
 */
export async function registraUtente(formData) {
  const { valido, errori } = validaRegistrazione(formData);
  if (!valido) {
    throw new Error(`Dati non validi: ${errori.join(' ')}`);
  }

  const { email, password, tipoAccount, nome, cognome, genere, dettagli = {} } = formData;

  // Per i tipi diversi da 'societa', la data di nascita fa parte dei dettagli
  const dettagliCompleti =
    tipoAccount !== 'societa'
      ? { ...dettagli, data_nascita: formData.dataNascita }
      : dettagli;

  // Creazione utente in Supabase Auth. I dati del profilo vengono passati
  // in options.data: finiscono in auth.users.raw_user_meta_data e da lì
  // il trigger `handle_new_user` (vedi 02_functions.sql) crea profilo +
  // dettagli lato server — funziona sia che l'email sia già confermata
  // sia che non lo sia ancora, perché non dipende da una sessione attiva.
  //
  // NB: Supabase impedisce già in automatico più account con la stessa
  // email (email è UNIQUE sia in auth.users che in public.profiles).
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tipo_account: tipoAccount,
        nome,
        cognome: tipoAccount === 'societa' ? null : cognome,
        genere,
        dettagli: dettagliCompleti,
      },
    },
  });
  if (authError) throw authError;
  invalidaCacheProfili();

  // Se il progetto ha "Confirm email" attivo (consigliato — vedi README,
  // nota sulla verifica obbligatoria per le società), qui authData.session
  // sarà null finché l'utente non clicca il link ricevuto via mail.
  return {
    userId: authData.user?.id,
    richiedeConfermaEmail: !authData.session,
  };
}

/**
 * Accesso: un solo account collegato alla volta per mail+password
 * (vincolo naturale, dato che l'email è univoca in Supabase Auth).
 * @param {string} email
 * @param {string} password
 */
export async function accedi(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function esci() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
