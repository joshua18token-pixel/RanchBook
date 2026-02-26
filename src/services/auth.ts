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
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('ranch_members')
    .select('id, ranch_id, role, ranches(id, name, owner_id)')
    .eq('user_id', user.id)
    .eq('accepted', true);

  if (error) throw error;
  return data;
}

export async function inviteMember(ranchId: string, email: string, role: 'read' | 'write') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const normalizedEmail = email.toLowerCase();

  // Check if already invited
  const { data: existing } = await supabase
    .from('ranch_members')
    .select('id')
    .eq('ranch_id', ranchId)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    // Update existing invite
    const { data, error } = await supabase
      .from('ranch_members')
      .update({ role, invited_by: user.id })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // New invite
  const { data, error } = await supabase
    .from('ranch_members')
    .insert({ ranch_id: ranchId, email: normalizedEmail, role, invited_by: user.id, accepted: false })
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

export async function deleteRanch(ranchId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  // Verify ownership
  const { data: ranch } = await supabase
    .from('ranches')
    .select('owner_id')
    .eq('id', ranchId)
    .single();

  if (!ranch || ranch.owner_id !== user.id) {
    throw new Error('Only the ranch owner can delete a ranch');
  }

  // Delete ranch (cascades to members, cows, tags, notes, pastures, breeds)
  const { error } = await supabase.from('ranches').delete().eq('id', ranchId);
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
