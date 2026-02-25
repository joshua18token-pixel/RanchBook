import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system/next';
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

  // Write workbook to Uint8Array
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const bytes = new Uint8Array(wbout);

  const fileName = `RanchBook_Herd_${new Date().toISOString().split('T')[0]}.xlsx`;
  const file = new File(Paths.cache, fileName);
  
  file.write(bytes);

  const filePath = file.uri;

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
