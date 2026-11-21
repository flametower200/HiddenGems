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

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

function getWindowAuthOptions() {
  if (typeof window === 'undefined') {
    return { storageKey: `hiddengems-${projectRef}-server` };
  }

  const contextKey = `hiddengems-${projectRef}-auth-context`;
  let contextId = window.sessionStorage.getItem(contextKey);
  if (!contextId) {
    contextId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(contextKey, contextId);
  }

  return {
    storage: window.sessionStorage,
    // Supabase's BroadcastChannel uses storageKey, so it must also be window-specific.
    storageKey: `hiddengems-${projectRef}-${contextId}`,
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: getWindowAuthOptions(),
});
