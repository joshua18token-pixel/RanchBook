import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cow, CowNote, Tag } from '../types';
import { v4 as uuidv4 } from 'uuid';

const COWS_KEY = 'ranchbook_cows';

// Local-first database - works offline, syncs when connected

export async function getAllCows(): Promise<Cow[]> {
  const data = await AsyncStorage.getItem(COWS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveCows(cows: Cow[]): Promise<void> {
  await AsyncStorage.setItem(COWS_KEY, JSON.stringify(cows));
}

export async function addCow(cow: Omit<Cow, 'id' | 'createdAt' | 'updatedAt' | 'notes'>): Promise<Cow> {
  const cows = await getAllCows();
  const newCow: Cow = {
    ...cow,
    id: uuidv4(),
    notes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cows.push(newCow);
  await saveCows(cows);
  return newCow;
}

export async function updateCow(id: string, updates: Partial<Cow>): Promise<Cow | null> {
  const cows = await getAllCows();
  const index = cows.findIndex(c => c.id === id);
  if (index === -1) return null;
  cows[index] = { ...cows[index], ...updates, updatedAt: new Date().toISOString() };
  await saveCows(cows);
  return cows[index];
}

export async function addNote(cowId: string, text: string): Promise<CowNote | null> {
  const cows = await getAllCows();
  const cow = cows.find(c => c.id === cowId);
  if (!cow) return null;
  const note: CowNote = {
    id: uuidv4(),
    text,
    createdAt: new Date().toISOString(),
  };
  cow.notes.push(note);
  cow.updatedAt = new Date().toISOString();
  await saveCows(cows);
  return note;
}

export async function searchCows(query: string): Promise<Cow[]> {
  const cows = await getAllCows();
  const q = query.toLowerCase();
  return cows.filter(cow =>
    cow.name?.toLowerCase().includes(q) ||
    cow.tags.some(tag => tag.number.toLowerCase().includes(q)) ||
    cow.status.toLowerCase().includes(q) ||
    cow.breed?.toLowerCase().includes(q) ||
    cow.notes.some(note => note.text.toLowerCase().includes(q))
  );
}

export async function deleteCow(id: string): Promise<boolean> {
  const cows = await getAllCows();
  const filtered = cows.filter(c => c.id !== id);
  if (filtered.length === cows.length) return false;
  await saveCows(filtered);
  return true;
}
