import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as XLSX from 'xlsx';
import { Cow, Pasture } from '../types';

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

  // Write to base64 then to a temp file using React Native's fetch/blob approach
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const fileName = `RanchBook_Herd_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Use a blob + FileReader approach that works in Expo
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // Convert blob to base64 via FileReader
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Write using expo-file-system legacy API via require
  const ExpoFS = require('expo-file-system');
  const cacheDir = ExpoFS.cacheDirectory || ExpoFS.default?.cacheDirectory;
  const filePath = cacheDir + fileName;
  
  const writeAsync = ExpoFS.writeAsStringAsync || ExpoFS.default?.writeAsStringAsync;
  const encoding = ExpoFS.EncodingType?.Base64 || ExpoFS.default?.EncodingType?.Base64 || 'base64';
  
  await writeAsync(filePath, base64, { encoding });

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
