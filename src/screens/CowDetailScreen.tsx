import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCows, updateCow, addNote, deleteCow } from '../services/database';
import { Cow, CowStatus } from '../types';

const STATUSES: CowStatus[] = ['wet', 'dry', 'bred', 'bull', 'steer', 'cull'];

const STATUS_COLORS: Record<CowStatus, string> = {
  wet: '#4CAF50',
  dry: '#9E9E9E',
  bred: '#FFC107',
  bull: '#795548',
  steer: '#607D8B',
  cull: '#D32F2F',
};

export default function CowDetailScreen({ route, navigation }: any) {
  const { cowId } = route.params;
  const [cow, setCow] = useState<Cow | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const loadCow = useCallback(async () => {
    const all = await getAllCows();
    const found = all.find(c => c.id === cowId);
    setCow(found || null);
  }, [cowId]);

  useFocusEffect(
    useCallback(() => {
      loadCow();
    }, [loadCow])
  );

  const handleStatusChange = async (newStatus: CowStatus) => {
    if (!cow) return;
    await updateCow(cow.id, { status: newStatus });
    setShowStatusPicker(false);
    loadCow();
  };

  const handleAddNote = async () => {
    if (!cow || !noteText.trim()) return;
    await addNote(cow.id, noteText.trim());
    setNoteText('');
    loadCow();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Cow',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (cow) {
              await deleteCow(cow.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  if (!cow) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Cow not found</Text>
      </View>
    );
  }

  const sortedNotes = [...cow.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.cowName}>{cow.name || 'Unnamed'}</Text>
        <TouchableOpacity
          style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[cow.status] }]}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.statusBadgeText}>{cow.status.toUpperCase()} ▼</Text>
        </TouchableOpacity>
      </View>

      {/* Status picker */}
      {showStatusPicker && (
        <View style={styles.statusPicker}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, { backgroundColor: STATUS_COLORS[s] }]}
              onPress={() => handleStatusChange(s)}
              activeOpacity={0.7}
            >
              <Text style={styles.statusOptionText}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Description */}
      {cow.description ? (
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>{cow.description}</Text>
        </View>
      ) : null}

      {/* Breed */}
      {cow.breed ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Breed</Text>
          <Text style={styles.infoValue}>{cow.breed}</Text>
        </View>
      ) : null}

      {/* Birth Date */}
      {cow.birthMonth && cow.birthYear ? (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Born</Text>
          <Text style={styles.infoValue}>{String(cow.birthMonth).padStart(2, '0')}/{cow.birthYear}</Text>
        </View>
      ) : null}

      {/* Tags */}
      <Text style={styles.sectionTitle}>Tags</Text>
      {cow.tags.map((tag, i) => (
        <View key={tag.id || i} style={styles.tagRow}>
          <View style={styles.tagLabelBadge}>
            <Text style={styles.tagLabelText}>{tag.label}</Text>
          </View>
          <Text style={styles.tagNumber}>{tag.number}</Text>
        </View>
      ))}

      {/* Notes */}
      <Text style={styles.sectionTitle}>Notes ({cow.notes.length})</Text>

      {/* Add note */}
      <View style={styles.addNoteRow}>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note..."
          placeholderTextColor="#999"
          value={noteText}
          onChangeText={setNoteText}
          multiline
        />
        <TouchableOpacity
          style={[styles.addNoteButton, !noteText.trim() && styles.addNoteDisabled]}
          onPress={handleAddNote}
          disabled={!noteText.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.addNoteButtonText}>ADD</Text>
        </TouchableOpacity>
      </View>

      {sortedNotes.map((note) => (
        <View key={note.id} style={styles.noteCard}>
          <Text style={styles.noteText}>{note.text}</Text>
          <Text style={styles.noteDate}>
            {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      ))}

      {sortedNotes.length === 0 && (
        <Text style={styles.noNotes}>No notes yet</Text>
      )}

      {/* Delete */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.7}>
        <Text style={styles.deleteText}>DELETE COW</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cowName: { fontSize: 28, fontWeight: 'bold', color: '#2D5016', flex: 1 },
  statusBadgeLarge: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statusOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  statusOptionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 16, color: '#666' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginTop: 20,
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
  },
  tagLabelBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  tagLabelText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tagNumber: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  addNoteRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  noteInput: {
    flex: 1,
    marginRight: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
    minHeight: 50,
  },
  addNoteButton: {
    backgroundColor: '#2D5016',
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNoteDisabled: { opacity: 0.4 },
  addNoteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noteCard: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2D5016',
  },
  noteText: { fontSize: 16, color: '#333', lineHeight: 22 },
  noteDate: { fontSize: 12, color: '#999', marginTop: 6 },
  noNotes: { fontSize: 16, color: '#999', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  deleteButton: {
    marginTop: 30,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#ff5252',
    alignItems: 'center',
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  descriptionCard: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  descriptionText: { fontSize: 16, color: '#333', lineHeight: 22 },
  emptyText: { fontSize: 18, color: '#999', textAlign: 'center', marginTop: 40 },
});
