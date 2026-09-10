// =====================================================================
// lib/supabase.js
// In Next.js le variabili d'ambiente sono visibili nel browser SOLO se
// prefissate con NEXT_PUBLIC_. Senza quel prefisso, in un componente
// 'use client' come app/page.js, process.env risulterebbe undefined
// e createClient() lancerebbe un errore silenzioso o si romperebbe
// alla prima chiamata di rete.
// =====================================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Config mancante: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, poi riavvia "npm run dev".'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
