import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cow, CowNote, Pasture } from '../types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

const COWS_KEY = 'ranchbook_cows';
const PASTURES_KEY = 'ranchbook_pastures';

// ── Cows ──

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
    id: generateId(),
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
    id: generateId(),
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
  const pastures = await getAllPastures();
  const q = query.toLowerCase();
  return cows.filter(cow => {
    const pasture = pastures.find(p => p.id === cow.pastureId);
    return (
      cow.name?.toLowerCase().includes(q) ||
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
  const cows = await getAllCows();
  const filtered = cows.filter(c => c.id !== id);
  if (filtered.length === cows.length) return false;
  await saveCows(filtered);
  return true;
}

// ── Pastures ──

export async function getAllPastures(): Promise<Pasture[]> {
  const data = await AsyncStorage.getItem(PASTURES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function savePastures(pastures: Pasture[]): Promise<void> {
  await AsyncStorage.setItem(PASTURES_KEY, JSON.stringify(pastures));
}

export async function addPasture(name: string): Promise<Pasture> {
  const pastures = await getAllPastures();
  const p: Pasture = { id: generateId(), name, createdAt: new Date().toISOString() };
  pastures.push(p);
  await savePastures(pastures);
  return p;
}

export async function deletePasture(id: string): Promise<boolean> {
  const pastures = await getAllPastures();
  const filtered = pastures.filter(p => p.id !== id);
  if (filtered.length === pastures.length) return false;
  await savePastures(filtered);
  return true;
}
