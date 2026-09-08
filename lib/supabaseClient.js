// =====================================================================
// HIDDENGEMS — Inizializzazione client Supabase
// Importato da tutti gli altri moduli.
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Config mancante: imposta SUPABASE_URL e SUPABASE_ANON_KEY nelle variabili ambiente.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
