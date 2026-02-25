import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as XLSX from 'xlsx';
import { Cow, Pasture } from '../types';

// Base64 encode helper for React Native (no btoa for Uint8Array)
function uint8ToBase64(u8: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < u8.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + CHUNK))));
  }
  return btoa(parts.join(''));
}

export async function exportToExcelAndEmail(cows: Cow[], pastures: Pasture[]) {
  const rows = cows.map(cow => {
    const pasture = pastures.find(p => p.id === cow.pastureId);
    return {
      'Primary Tag': cow.tags[0]?.number || '',
      'All Tags': cow.tags.map(t => `${t.label}: ${t.number}`).join(', '),
      'Status': cow.status.toUpperCase(),
      'Breed': cow.breed || '',
      'Born': cow.birthMonth && cow.birthYear
        ? `${String(cow.birthMonth).padStart(2, '0')}/${cow.birthYear}`
        : '',
      'Pasture': pasture?.name || '',
      'Description': cow.description || '',
      'Notes': cow.notes.map(n => `${n.createdAt.split('T')[0]}: ${n.text}`).join(' | '),
      'Photos': (cow.photos?.length || 0).toString(),
      'Added': cow.createdAt.split('T')[0],
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Herd');

  ws['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 10 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
    { wch: 40 }, { wch: 8 }, { wch: 12 },
  ];

  // Write workbook to Uint8Array, then base64
  const wbout: Uint8Array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const base64 = uint8ToBase64(new Uint8Array(wbout));

  const fileName = `RanchBook_Herd_${new Date().toISOString().split('T')[0]}.xlsx`;

  // Write file using expo-file-system
  const ExpoFS = require('expo-file-system');
  const cacheDir = ExpoFS.cacheDirectory || ExpoFS.default?.cacheDirectory;
  const filePath = cacheDir + fileName;
  const writeAsync = ExpoFS.writeAsStringAsync || ExpoFS.default?.writeAsStringAsync;
  const EncodingType = ExpoFS.EncodingType || ExpoFS.default?.EncodingType;

  await writeAsync(filePath, base64, { encoding: EncodingType?.Base64 || 'base64' });

  // Try email, fall back to share sheet
  const isMailAvailable = await MailComposer.isAvailableAsync();
  if (isMailAvailable) {
    await MailComposer.composeAsync({
      subject: `RanchBook Herd Export - ${new Date().toLocaleDateString()}`,
      body: `Attached is your RanchBook herd export with ${cows.length} cow(s).`,
      attachments: [filePath],
    });
  } else {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share Herd Export',
    });
  }
}
