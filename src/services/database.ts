import { supabase } from './supabase';
import { Cow, CowNote, Tag, Pasture } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// ── Transform helpers (Supabase rows ↔ App types) ──

function rowToCow(row: any, tags: any[], notes: any[]): Cow {
  return {
    id: row.id,
    description: row.description || undefined,
    status: row.status,
    breed: row.breed || undefined,
    birthMonth: row.birth_month || undefined,
    birthYear: row.birth_year || undefined,
    pastureId: row.pasture_id || undefined,
    photos: row.photos || undefined,
    tags: tags.map(t => ({ id: t.id, label: t.label, number: t.number })),
    notes: notes.map(n => ({ id: n.id, text: n.text, createdAt: n.created_at })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Cows ──

export async function getAllCows(ranchId?: string): Promise<Cow[]> {
  let query = supabase.from('cows').select('*');
  if (ranchId) query = query.eq('ranch_id', ranchId);
  query = query.order('created_at', { ascending: false });

  const { data: cowRows, error } = await query;
  if (error) throw error;
  if (!cowRows || cowRows.length === 0) return [];

  const cowIds = cowRows.map(c => c.id);

  const [{ data: tagRows }, { data: noteRows }] = await Promise.all([
    supabase.from('tags').select('*').in('cow_id', cowIds),
    supabase.from('notes').select('*').in('cow_id', cowIds).order('created_at', { ascending: false }),
  ]);

  return cowRows.map(row => rowToCow(
    row,
    (tagRows || []).filter(t => t.cow_id === row.id),
    (noteRows || []).filter(n => n.cow_id === row.id),
  ));
}

export async function addCow(
  cow: Omit<Cow, 'id' | 'createdAt' | 'updatedAt' | 'notes'>,
  ranchId?: string
): Promise<Cow> {
  const { data: cowRow, error: cowError } = await supabase
    .from('cows')
    .insert({
      description: cow.description || null,
      status: cow.status,
      breed: cow.breed || null,
      birth_month: cow.birthMonth || null,
      birth_year: cow.birthYear || null,
      pasture_id: cow.pastureId || null,
      photos: cow.photos || null,
      ranch_id: ranchId || null,
    })
    .select()
    .single();

  if (cowError) throw cowError;

  // Insert tags
  if (cow.tags.length > 0) {
    const tagInserts = cow.tags.map(t => ({
      cow_id: cowRow.id,
      label: t.label,
      number: t.number,
    }));
    const { error: tagError } = await supabase.from('tags').insert(tagInserts);
    if (tagError) throw tagError;
  }

  // Reload to get full object
  const all = await getAllCows(ranchId);
  return all.find(c => c.id === cowRow.id) || cowRow;
}

export async function updateCow(id: string, updates: Partial<Cow>): Promise<Cow | null> {
  const dbUpdates: any = { updated_at: new Date().toISOString() };

  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.breed !== undefined) dbUpdates.breed = updates.breed || null;
  if (updates.birthMonth !== undefined) dbUpdates.birth_month = updates.birthMonth || null;
  if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear || null;
  if (updates.pastureId !== undefined) dbUpdates.pasture_id = updates.pastureId || null;
  if (updates.photos !== undefined) dbUpdates.photos = updates.photos || null;

  const { error } = await supabase.from('cows').update(dbUpdates).eq('id', id);
  if (error) throw error;

  // Handle tag updates
  if (updates.tags !== undefined) {
    // Delete existing tags and re-insert
    await supabase.from('tags').delete().eq('cow_id', id);
    if (updates.tags.length > 0) {
      const tagInserts = updates.tags.map(t => ({
        cow_id: id,
        label: t.label,
        number: t.number,
      }));
      await supabase.from('tags').insert(tagInserts);
    }
  }

  return null; // Caller should reload
}

export async function addNote(cowId: string, text: string): Promise<CowNote | null> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ cow_id: cowId, text })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, text: data.text, createdAt: data.created_at };
}

export async function searchCows(query: string, ranchId?: string): Promise<Cow[]> {
  // For now, fetch all and filter client-side (Supabase free tier doesn't have full-text search)
  const all = await getAllCows(ranchId);
  const pastures = await getAllPastures(ranchId);
  const q = query.toLowerCase();

  return all.filter(cow => {
    const pasture = pastures.find(p => p.id === cow.pastureId);
    return (
      cow.tags.some(tag => tag.number.toLowerCase().includes(q)) ||
      cow.status.toLowerCase().includes(q) ||
      cow.breed?.toLowerCase().includes(q) ||
      cow.description?.toLowerCase().includes(q) ||
      pasture?.name.toLowerCase().includes(q) ||
      cow.notes.some(note => note.text.toLowerCase().includes(q))
    );
  });
}

export async function deleteCow(id: string): Promise<boolean> {
  const { error } = await supabase.from('cows').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ── Pastures (stored in Supabase too) ──

export async function getAllPastures(ranchId?: string): Promise<Pasture[]> {
  // Using AsyncStorage for pastures for now since we don't have a pastures table in Supabase yet
  // TODO: migrate pastures to Supabase
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const key = ranchId ? `ranchbook_pastures_${ranchId}` : 'ranchbook_pastures';
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export async function savePastures(pastures: Pasture[], ranchId?: string): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const key = ranchId ? `ranchbook_pastures_${ranchId}` : 'ranchbook_pastures';
  await AsyncStorage.setItem(key, JSON.stringify(pastures));
}

export async function addPasture(name: string, ranchId?: string): Promise<Pasture> {
  const pastures = await getAllPastures(ranchId);
  const p: Pasture = { id: generateId(), name, createdAt: new Date().toISOString() };
  pastures.push(p);
  await savePastures(pastures, ranchId);
  return p;
}

export async function deletePasture(id: string, ranchId?: string): Promise<boolean> {
  const pastures = await getAllPastures(ranchId);
  const filtered = pastures.filter(p => p.id !== id);
  if (filtered.length === pastures.length) return false;
  await savePastures(filtered, ranchId);
  return true;
}
