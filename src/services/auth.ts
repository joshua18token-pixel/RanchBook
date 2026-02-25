import { supabase } from './supabase';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Ranch management
export async function createRanch(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { data: ranch, error: ranchError } = await supabase
    .from('ranches')
    .insert({ name, owner_id: user.id })
    .select()
    .single();

  if (ranchError) throw ranchError;

  // Add self as manager
  const { error: memberError } = await supabase
    .from('ranch_members')
    .insert({
      ranch_id: ranch.id,
      user_id: user.id,
      email: user.email,
      role: 'manager',
      accepted: true,
      invited_by: user.id,
    });

  if (memberError) throw memberError;
  return ranch;
}

export async function getMyRanches() {
  const { data, error } = await supabase
    .from('ranch_members')
    .select('ranch_id, role, ranches(id, name, owner_id)')
    .eq('accepted', true);

  if (error) throw error;
  return data;
}

export async function inviteMember(ranchId: string, email: string, role: 'read' | 'write') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('ranch_members')
    .upsert(
      { ranch_id: ranchId, email: email.toLowerCase(), role, invited_by: user.id, accepted: false },
      { onConflict: 'ranch_id,email' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMemberRole(memberId: string, role: 'read' | 'write') {
  const { error } = await supabase
    .from('ranch_members')
    .update({ role })
    .eq('id', memberId);

  if (error) throw error;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from('ranch_members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

export async function getRanchMembers(ranchId: string) {
  const { data, error } = await supabase
    .from('ranch_members')
    .select('*')
    .eq('ranch_id', ranchId)
    .order('created_at');

  if (error) throw error;
  return data;
}

export async function acceptInvite(ranchId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('ranch_members')
    .update({ accepted: true, user_id: user.id })
    .eq('ranch_id', ranchId)
    .eq('email', user.email);

  if (error) throw error;
}

export async function getPendingInvites() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('ranch_members')
    .select('*, ranches(name)')
    .eq('email', user.email)
    .eq('accepted', false);

  if (error) throw error;
  return data;
}
