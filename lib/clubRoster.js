import { supabase } from './supabase';

export async function caricaRosaSocieta(clubId) {
  const { data: roster, error } = await supabase
    .from('club_roster')
    .select('member_id,role')
    .eq('club_id', clubId);
  if (error) throw error;
  if (!roster?.length) return { giocatori: [], allenatori: [] };

  const memberIds = [...new Set(roster.map((item) => item.member_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id,nome,cognome,foto_url,tipo_account')
    .in('id', memberIds);
  if (profilesError) throw profilesError;

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return {
    giocatori: roster.filter((item) => item.role === 'giocatore').map((item) => profileById.get(item.member_id)).filter(Boolean),
    allenatori: roster.filter((item) => item.role === 'allenatore').map((item) => profileById.get(item.member_id)).filter(Boolean),
  };
}

export async function aggiungiMembroRosa(clubId, memberId, role) {
  if (!['giocatore', 'allenatore'].includes(role)) throw new Error('Ruolo rosa non valido.');
  const { data, error } = await supabase
    .from('club_roster')
    .insert({ club_id: clubId, member_id: memberId, role })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rimuoviMembroRosa(clubId, memberId) {
  const { error } = await supabase
    .from('club_roster')
    .delete()
    .eq('club_id', clubId)
    .eq('member_id', memberId);
  if (error) throw error;
}
