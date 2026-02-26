import { supabase } from './supabase';
import { Cow, CowNote, Tag, Pasture, MedicalIssue } from '../types';

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
    motherTag: row.mother_tag || undefined,
    medicalIssues: [],
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
  // Pre-check for duplicate tags
  if (cow.tags.length > 0 && ranchId) {
    const tagNumbers = cow.tags.map(t => t.number.trim()).filter(n => n);
    if (tagNumbers.length > 0) {
      const { data: existing } = await supabase
        .from('tags')
        .select('number, cow_id')
        .eq('ranch_id', ranchId)
        .in('number', tagNumbers);
      if (existing && existing.length > 0) {
        const dupe = existing[0];
        const err: any = new Error(`DUPLICATE_TAG:${dupe.number}:${dupe.cow_id}`);
        err.duplicateTag = dupe.number;
        err.duplicateCowId = dupe.cow_id;
        throw err;
      }
    }
  }

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
      mother_tag: cow.motherTag || null,
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
      ranch_id: ranchId || null,
    }));
    const { error: tagError } = await supabase.from('tags').insert(tagInserts);
    if (tagError) {
      // Clean up the cow if tags fail (e.g. duplicate tag)
      await supabase.from('cows').delete().eq('id', cowRow.id);
      if (tagError.code === '23505') {
        const dupeNum = cow.tags.map(t => t.number).join(', ');
        throw new Error(`Tag number already exists on this ranch: ${dupeNum}`);
      }
      throw tagError;
    }
  }

  // Reload to get full object
  const all = await getAllCows(ranchId);
  return all.find(c => c.id === cowRow.id) || cowRow;
}

export async function updateCow(id: string, updates: Partial<Cow>, ranchId?: string): Promise<Cow | null> {
  const dbUpdates: any = { updated_at: new Date().toISOString() };

  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if ('breed' in updates) dbUpdates.breed = updates.breed || null;
  if (updates.birthMonth !== undefined) dbUpdates.birth_month = updates.birthMonth || null;
  if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear || null;
  if ('pastureId' in updates) dbUpdates.pasture_id = updates.pastureId || null;
  if (updates.photos !== undefined) dbUpdates.photos = updates.photos || null;
  if ('motherTag' in updates) dbUpdates.mother_tag = updates.motherTag || null;

  const { error } = await supabase.from('cows').update(dbUpdates).eq('id', id);
  if (error) throw error;

  // Handle tag updates
  if (updates.tags !== undefined) {
    // Only save tags that have a non-empty number
    const validTags = updates.tags.filter(t => t.number.trim() !== '');

    // Pre-check for duplicates so we can report which cow has the tag
    if (validTags.length > 0 && ranchId) {
      const tagNumbers = validTags.map(t => t.number.trim());
      const { data: existing } = await supabase
        .from('tags')
        .select('number, cow_id')
        .eq('ranch_id', ranchId)
        .neq('cow_id', id)
        .in('number', tagNumbers);
      if (existing && existing.length > 0) {
        const dupe = existing[0];
        const err: any = new Error(`DUPLICATE_TAG:${dupe.number}:${dupe.cow_id}`);
        err.duplicateTag = dupe.number;
        err.duplicateCowId = dupe.cow_id;
        throw err;
      }
    }

    // Backup existing tags before deleting
    const { data: oldTags } = await supabase.from('tags').select('*').eq('cow_id', id);

    await supabase.from('tags').delete().eq('cow_id', id);

    if (validTags.length > 0) {
      const tagInserts = validTags.map(t => ({
        cow_id: id,
        label: t.label,
        number: t.number.trim(),
        ranch_id: ranchId || null,
      }));
      const { error: tagError } = await supabase.from('tags').insert(tagInserts);
      if (tagError) {
        // Restore old tags on failure
        if (oldTags && oldTags.length > 0) {
          await supabase.from('tags').insert(oldTags.map(t => ({
            cow_id: t.cow_id,
            label: t.label,
            number: t.number,
            ranch_id: t.ranch_id,
          })));
        }
        if (tagError.code === '23505') {
          throw new Error('Tag number already exists on this ranch');
        }
        throw tagError;
      }
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

// ── Lineage helpers ──

export async function getCowByTag(tagNumber: string, ranchId: string): Promise<Cow | null> {
  const { data: tagRows } = await supabase
    .from('tags')
    .select('cow_id')
    .eq('ranch_id', ranchId)
    .eq('number', tagNumber);
  if (!tagRows || tagRows.length === 0) return null;
  const cowId = tagRows[0].cow_id;
  const all = await getAllCows(ranchId);
  return all.find(c => c.id === cowId) || null;
}

export async function getCalves(tagNumbers: string[], ranchId: string): Promise<Cow[]> {
  if (tagNumbers.length === 0) return [];
  const { data: cowRows } = await supabase
    .from('cows')
    .select('id')
    .eq('ranch_id', ranchId)
    .in('mother_tag', tagNumbers);
  if (!cowRows || cowRows.length === 0) return [];
  const all = await getAllCows(ranchId);
  const calfIds = new Set(cowRows.map(c => c.id));
  return all.filter(c => calfIds.has(c.id));
}

// ── Medical Issues ──

export async function getMedicalIssues(cowId: string): Promise<MedicalIssue[]> {
  const { data, error } = await supabase
    .from('medical_issues')
    .select('*')
    .eq('cow_id', cowId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(m => ({ id: m.id, label: m.label, createdAt: m.created_at }));
}

export async function addMedicalIssue(cowId: string, label: string, ranchId: string): Promise<MedicalIssue> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('medical_issues')
    .insert({ cow_id: cowId, label, ranch_id: ranchId, created_by: userData?.user?.id || null })
    .select()
    .single();
  if (error) throw error;
  // Auto-save as reusable preset
  await addMedicalPreset(label, ranchId);
  return { id: data.id, label: data.label, createdAt: data.created_at };
}

export async function removeMedicalIssue(id: string): Promise<void> {
  const { error } = await supabase.from('medical_issues').delete().eq('id', id);
  if (error) throw error;
}

export async function searchCowsByMedical(query: string, ranchId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('medical_issues')
    .select('cow_id')
    .eq('ranch_id', ranchId)
    .ilike('label', `%${query}%`);
  if (error) throw error;
  return [...new Set((data || []).map(m => m.cow_id))];
}

// ── Medical Presets ──

export async function getMedicalPresets(ranchId: string): Promise<{ id: string; label: string }[]> {
  const { data, error } = await supabase
    .from('medical_presets')
    .select('id, label')
    .eq('ranch_id', ranchId)
    .order('label', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addMedicalPreset(label: string, ranchId: string): Promise<void> {
  await supabase
    .from('medical_presets')
    .insert({ label, ranch_id: ranchId })
    .select();
  // ignore duplicate errors
}

// ── Ranch Breeds ──

export async function getRanchBreeds(ranchId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('ranch_breeds')
    .select('id, name')
    .eq('ranch_id', ranchId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addRanchBreed(name: string, ranchId: string): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('ranch_breeds')
    .insert({ name, ranch_id: ranchId })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name };
}

export async function removeRanchBreed(id: string): Promise<void> {
  const { error } = await supabase.from('ranch_breeds').delete().eq('id', id);
  if (error) throw error;
}

// ── Pastures (Supabase) ──

export async function getAllPastures(ranchId?: string): Promise<Pasture[]> {
  let query = supabase.from('pastures').select('*');
  if (ranchId) query = query.eq('ranch_id', ranchId);
  query = query.order('name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(p => ({ id: p.id, name: p.name, createdAt: p.created_at }));
}

export async function addPasture(name: string, ranchId?: string): Promise<Pasture> {
  const { data, error } = await supabase
    .from('pastures')
    .insert({ name, ranch_id: ranchId || null })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export async function deletePasture(id: string): Promise<boolean> {
  const { error } = await supabase.from('pastures').delete().eq('id', id);
  if (error) throw error;
  return true;
}
