import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as XLSX from 'xlsx';
import { Cow, Pasture } from '../types';

export async function exportToExcelAndEmail(cows: Cow[], pastures: Pasture[]) {
  // Build rows
  const rows = cows.map(cow => {
    const pasture = pastures.find(p => p.id === cow.pastureId);
    return {
      'Primary Tag': cow.tags[0]?.number || '',
      'All Tags': cow.tags.map(t => `${t.label}: ${t.number}`).join(', '),
      'Name': cow.name || '',
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

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Herd');

  ws['!cols'] = [
    { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 10 },
    { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 30 },
    { wch: 40 }, { wch: 8 }, { wch: 12 },
  ];

  // Write to base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  // Write file using the new expo-file-system API
  const { File, Paths } = require('expo-file-system/next');
  const fileName = `RanchBook_Herd_${new Date().toISOString().split('T')[0]}.xlsx`;
  const filePath = Paths.cache + '/' + fileName;
  
  // Convert base64 to Uint8Array
  const binaryString = atob(wbout);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const file = new File(filePath);
  file.write(bytes);

  // Try email first, fall back to share sheet
  const isMailAvailable = await MailComposer.isAvailableAsync();
  if (isMailAvailable) {
    await MailComposer.composeAsync({
      subject: `RanchBook Herd Export - ${new Date().toLocaleDateString()}`,
      body: `Attached is your RanchBook herd export with ${cows.length} cow(s).`,
      attachments: [filePath],
    });
  } else {
    // Fall back to share sheet (works on all devices)
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share Herd Export',
    });
  }
}
