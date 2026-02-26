import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCows, updateCow, addNote, deleteCow, getAllPastures, addPasture, getCowByTag, getCalves } from '../services/database';
import PhotoViewer from '../components/PhotoViewer';
import { Cow, CowStatus, Pasture } from '../types';

const STATUSES: CowStatus[] = ['wet', 'dry', 'bred', 'bull', 'steer', 'cull'];
const TAG_LABELS = ['ear tag', 'RFID', 'brand', 'other'];
const COMMON_BREEDS = ['Angus', 'Red Angus', 'Hereford', 'Charolais', 'Simmental', 'Brahman', 'Jersey', 'Holstein', 'Limousin', 'Shorthorn'];

const STATUS_COLORS: Record<CowStatus, string> = {
  wet: '#4CAF50',
  dry: '#9E9E9E',
  bred: '#FFC107',
  bull: '#795548',
  steer: '#607D8B',
  cull: '#D32F2F',
};

export default function CowDetailScreen({ route, navigation }: any) {
  const { cowId, ranchId, myRole } = route.params;
  const [cow, setCow] = useState<Cow | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [showPasturePicker, setShowPasturePicker] = useState(false);
  const [showPastureInput, setShowPastureInput] = useState(false);
  const [newPastureName, setNewPastureName] = useState('');
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showCustomBreed, setShowCustomBreed] = useState(false);
  const [customBreedInput, setCustomBreedInput] = useState('');

  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editBirthMonth, setEditBirthMonth] = useState('');
  const [editBirthYear, setEditBirthYear] = useState('');
  const [editMotherTag, setEditMotherTag] = useState('');

  // Tags (local editing with save button)
  const [tagLabelPickerIndex, setTagLabelPickerIndex] = useState<number | null>(null);
  const [editTags, setEditTags] = useState<{ id: string; label: string; number: string }[]>([]);
  const [tagsChanged, setTagsChanged] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  // Lineage
  const [calves, setCalves] = useState<Cow[]>([]);

  const loadCow = useCallback(async () => {
    const all = await getAllCows(ranchId);
    const found = all.find(c => c.id === cowId);
    setCow(found || null);
    if (found) {
      setEditDescription(found.description || '');
      setEditBirthMonth(found.birthMonth ? String(found.birthMonth) : '');
      setEditBirthYear(found.birthYear ? String(found.birthYear) : '');
      setEditMotherTag(found.motherTag || '');
      setEditTags(found.tags.map(t => ({ id: t.id, label: t.label, number: t.number })));
      setTagsChanged(false);
      // Load calves
      const tagNums = found.tags.map(t => t.number).filter(n => n);
      if (tagNums.length > 0) {
        getCalves(tagNums, ranchId).then(setCalves).catch(() => setCalves([]));
      } else {
        setCalves([]);
      }
    }
  }, [cowId, ranchId]);

  useEffect(() => {
    getAllPastures(ranchId).then(setPastures);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCow();
    }, [loadCow])
  );

  const saveField = async (field: string) => {
    if (!cow) return;
    const updates: Partial<Cow> = {};
    switch (field) {
      case 'description': updates.description = editDescription.trim() || undefined; break;
      case 'born':
        updates.birthMonth = editBirthMonth ? parseInt(editBirthMonth, 10) : undefined;
        updates.birthYear = editBirthYear ? parseInt(editBirthYear, 10) : undefined;
        break;
      case 'motherTag': updates.motherTag = editMotherTag.trim() || undefined; break;
    }
    await updateCow(cow.id, updates, ranchId);
    setEditingField(null);
    loadCow();
  };

  const handleStatusChange = async (newStatus: CowStatus) => {
    if (!cow) return;
    await updateCow(cow.id, { status: newStatus }, ranchId);
    setShowStatusPicker(false);
    loadCow();
  };

  const handlePastureChange = async (pastureId: string | undefined) => {
    if (!cow) return;
    await updateCow(cow.id, { pastureId: pastureId || undefined }, ranchId);
    setShowPasturePicker(false);
    loadCow();
  };

  const handleBreedChange = async (newBreed: string) => {
    if (!cow) return;
    await updateCow(cow.id, { breed: newBreed || undefined }, ranchId);
    setShowBreedPicker(false);
    setShowCustomBreed(false);
    loadCow();
  };

  const handleSetCustomBreed = async () => {
    if (customBreedInput.trim()) {
      await handleBreedChange(customBreedInput.trim());
      setCustomBreedInput('');
    }
  };

  const handleAddPasture = async () => {
    if (!newPastureName.trim() || !cow) return;
    const p = await addPasture(newPastureName.trim(), ranchId);
    setPastures([...pastures, p]);
    await updateCow(cow.id, { pastureId: p.id }, ranchId);
    setNewPastureName('');
    setShowPastureInput(false);
    setShowPasturePicker(false);
    loadCow();
  };

  const handleAddNote = async () => {
    if (!cow || !noteText.trim()) return;
    await addNote(cow.id, noteText.trim());
    setNoteText('');
    loadCow();
  };

  const pickPhoto = async () => {
    if (!cow) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const newPhotos = [...(cow.photos || []), ...result.assets.map(a => a.uri)];
      await updateCow(cow.id, { photos: newPhotos }, ranchId);
      loadCow();
    }
  };

  const takePhoto = async () => {
    if (!cow) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const newPhotos = [...(cow.photos || []), result.assets[0].uri];
      await updateCow(cow.id, { photos: newPhotos }, ranchId);
      loadCow();
    }
  };

  const removePhoto = async (index: number) => {
    if (!cow) return;
    const newPhotos = (cow.photos || []).filter((_, i) => i !== index);
    await updateCow(cow.id, { photos: newPhotos.length > 0 ? newPhotos : undefined }, ranchId);
    loadCow();
  };

  // Tag editing (local state with Save button)
  const handleEditTag = (tagIndex: number, field: 'label' | 'number', value: string) => {
    const newTags = [...editTags];
    newTags[tagIndex] = { ...newTags[tagIndex], [field]: value };
    setEditTags(newTags);
    setTagsChanged(true);
  };

  const addNewTag = () => {
    setEditTags([...editTags, { id: Date.now().toString(36), label: 'ear tag', number: '' }]);
    setTagsChanged(true);
  };

  const removeTagLocal = (index: number) => {
    if (editTags.length <= 1) return;
    setEditTags(editTags.filter((_, i) => i !== index));
    setTagsChanged(true);
  };

  const saveTags = async () => {
    if (!cow) return;
    const validTags = editTags.filter(t => t.number.trim() !== '');
    if (validTags.length === 0) {
      Alert.alert('Error', 'At least one tag must have a number.');
      return;
    }
    if (editTags.some(t => t.number.trim() === '')) {
      Alert.alert('Error', 'Remove or fill in empty tags before saving.');
      return;
    }
    setSavingTags(true);
    try {
      await updateCow(cow.id, { tags: validTags }, ranchId);
      setTagsChanged(false);
      loadCow();
    } catch (e: any) {
      if (e?.message?.startsWith('DUPLICATE_TAG:')) {
        const parts = e.message.split(':');
        const dupeNumber = parts[1];
        const dupeCowId = parts[2];
        if (Platform.OS === 'web') {
          const goToCow = window.confirm(
            `Tag "${dupeNumber}" is already assigned to another cow on this ranch.\n\nWould you like to go to that cow?`
          );
          if (goToCow) {
            navigation.push('CowDetail', { cowId: dupeCowId, ranchId, myRole });
          }
        } else {
          Alert.alert('Duplicate Tag', `Tag "${dupeNumber}" is already assigned to another cow.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go to that cow', onPress: () => navigation.push('CowDetail', { cowId: dupeCowId, ranchId, myRole }) },
          ]);
        }
      } else {
        Alert.alert('Error', 'Failed to save tags. Try again.');
      }
    } finally {
      setSavingTags(false);
    }
  };

  const cancelTagEdits = () => {
    if (cow) {
      setEditTags(cow.tags.map(t => ({ id: t.id, label: t.label, number: t.number })));
      setTagsChanged(false);
    }
  };

  const navigateToCow = async (tagNumber: string) => {
    const found = await getCowByTag(tagNumber, ranchId);
    if (found) {
      navigation.push('CowDetail', { cowId: found.id, ranchId, myRole });
    } else {
      Alert.alert('Not Found', `No cow found with tag "${tagNumber}" on this ranch.`);
    }
  };

  const handleDelete = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this cow? This cannot be undone.')) {
        if (cow) {
          await deleteCow(cow.id);
          navigation.goBack();
        }
      }
    } else {
      Alert.alert('Delete Cow', 'Are you sure? This cannot be undone.', [
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
      ]);
    }
  };

  if (!cow) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Cow not found</Text>
      </View>
    );
  }

  const pasture = pastures.find(p => p.id === cow.pastureId);
  const sortedNotes = [...cow.notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header with primary tag + status */}
        <View style={styles.header}>
          <Text style={styles.cowName}>{editTags[0]?.number || cow.tags[0]?.number || 'No Tag'}</Text>
          <TouchableOpacity
            style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[cow.status] }]}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            activeOpacity={0.7}
          >
            <Text style={styles.statusBadgeText}>{cow.status.toUpperCase()} ▼</Text>
          </TouchableOpacity>
        </View>

        {showStatusPicker && (
          <View style={styles.pickerRow}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerOption, { backgroundColor: STATUS_COLORS[s] }]}
                onPress={() => handleStatusChange(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionText}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tags — moved up */}
        <Text style={styles.sectionTitle}>Tags</Text>
        {editTags.map((tag, i) => (
          <View key={tag.id || i} style={styles.tagRow}>
            <TouchableOpacity
              style={styles.tagLabelBadge}
              onPress={() => setTagLabelPickerIndex(i)}
              activeOpacity={0.7}
            >
              <Text style={styles.tagLabelText}>{tag.label} ▼</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.tagNumberInput}
              value={tag.number}
              onChangeText={(v) => handleEditTag(i, 'number', v)}
              placeholder="Tag number"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {editTags.length > 1 && (
              <TouchableOpacity style={styles.tagRemove} onPress={() => removeTagLocal(i)}>
                <Text style={styles.tagRemoveText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addTagBtn} onPress={addNewTag} activeOpacity={0.7}>
          <Text style={styles.addTagBtnText}>+ Add Tag</Text>
        </TouchableOpacity>
        {tagsChanged && (
          <View style={styles.tagActions}>
            <TouchableOpacity style={styles.tagSaveBtn} onPress={saveTags} disabled={savingTags} activeOpacity={0.7}>
              <Text style={styles.tagSaveBtnText}>{savingTags ? 'SAVING...' : 'SAVE TAGS'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tagCancelBtn} onPress={cancelTagEdits} activeOpacity={0.7}>
              <Text style={styles.tagCancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photos — moved up */}
        <Text style={styles.sectionTitle}>Photos ({(cow.photos || []).length})</Text>
        <PhotoViewer
          photos={cow.photos || []}
          onDelete={removePhoto}
          onAdd={pickPhoto}
          onCamera={takePhoto}
        />

        {/* Pasture */}
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setShowPasturePicker(!showPasturePicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Pasture</Text>
          <Text style={styles.infoValue}>{pasture?.name || 'None'} ▼</Text>
        </TouchableOpacity>

        {showPasturePicker && (
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.pickerOption, { backgroundColor: !cow.pastureId ? '#2D5016' : '#9E9E9E' }]}
              onPress={() => handlePastureChange(undefined)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerOptionText}>None</Text>
            </TouchableOpacity>
            {pastures.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pickerOption, { backgroundColor: cow.pastureId === p.id ? '#2D5016' : '#8B4513' }]}
                onPress={() => handlePastureChange(p.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionText}>{p.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.pickerOption, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#8B4513' }]}
              onPress={() => setShowPastureInput(!showPastureInput)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerOptionText, { color: '#8B4513' }]}>+ New</Text>
            </TouchableOpacity>
          </View>
        )}
        {showPastureInput && (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { flex: 1 }]}
              placeholder="New pasture name..."
              placeholderTextColor="#999"
              value={newPastureName}
              onChangeText={setNewPastureName}
              autoFocus
            />
            <TouchableOpacity style={styles.editSave} onPress={handleAddPasture}>
              <Text style={styles.editSaveText}>ADD</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        {editingField === 'description' ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { flex: 1, minHeight: 80 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description..."
              placeholderTextColor="#999"
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.editSave} onPress={() => saveField('description')}>
              <Text style={styles.editSaveText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.descriptionCard} onPress={() => setEditingField('description')}>
            <Text style={styles.descriptionText}>
              {cow.description || 'Tap to add description...'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Breed — button picker */}
        <TouchableOpacity
          style={styles.infoRow}
          onPress={() => setShowBreedPicker(!showBreedPicker)}
          activeOpacity={0.7}
        >
          <Text style={styles.infoLabel}>Breed</Text>
          <Text style={styles.infoValue}>{cow.breed || 'None'} ▼</Text>
        </TouchableOpacity>

        {showBreedPicker && (
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.pickerOption, { backgroundColor: !cow.breed ? '#2D5016' : '#9E9E9E' }]}
              onPress={() => handleBreedChange('')}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerOptionText}>None</Text>
            </TouchableOpacity>
            {COMMON_BREEDS.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.pickerOption, { backgroundColor: cow.breed === b ? '#2D5016' : '#795548' }]}
                onPress={() => handleBreedChange(b)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionText}>{b}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.pickerOption, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#795548' }]}
              onPress={() => setShowCustomBreed(!showCustomBreed)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerOptionText, { color: '#795548' }]}>
                {cow.breed && !COMMON_BREEDS.includes(cow.breed) ? cow.breed : '+ Custom'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {showCustomBreed && (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { flex: 1 }]}
              placeholder="Custom breed..."
              placeholderTextColor="#999"
              value={customBreedInput}
              onChangeText={setCustomBreedInput}
              autoFocus
            />
            <TouchableOpacity style={styles.editSave} onPress={handleSetCustomBreed}>
              <Text style={styles.editSaveText}>SET</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Birth Date */}
        {editingField === 'born' ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { width: 60, textAlign: 'center' }]}
              value={editBirthMonth}
              onChangeText={(v) => setEditBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="MM"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={2}
              autoFocus
            />
            <Text style={styles.birthSep}>/</Text>
            <TextInput
              style={[styles.editInput, { width: 80, textAlign: 'center' }]}
              value={editBirthYear}
              onChangeText={(v) => setEditBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="YYYY"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity style={styles.editSave} onPress={() => saveField('born')}>
              <Text style={styles.editSaveText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.infoRow} onPress={() => setEditingField('born')}>
            <Text style={styles.infoLabel}>Born</Text>
            <Text style={styles.infoValue}>
              {cow.birthMonth && cow.birthYear
                ? `${String(cow.birthMonth).padStart(2, '0')}/${cow.birthYear}`
                : 'Tap to set'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Mother (Lineage) */}
        {editingField === 'motherTag' ? (
          <View style={styles.editRow}>
            <TextInput
              style={[styles.editInput, { flex: 1 }]}
              value={editMotherTag}
              onChangeText={setEditMotherTag}
              placeholder="Mother's tag number..."
              placeholderTextColor="#999"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            <TouchableOpacity style={styles.editSave} onPress={() => saveField('motherTag')}>
              <Text style={styles.editSaveText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.infoRow} onPress={() => setEditingField('motherTag')}>
            <Text style={styles.infoLabel}>Mother</Text>
            {cow.motherTag ? (
              <TouchableOpacity onPress={() => navigateToCow(cow.motherTag!)}>
                <Text style={styles.linkText}>🐄 {cow.motherTag} →</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.infoValue}>Tap to set</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Calves */}
        {calves.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Calves ({calves.length})</Text>
            {calves.map((calf) => (
              <TouchableOpacity
                key={calf.id}
                style={styles.calfRow}
                onPress={() => navigation.push('CowDetail', { cowId: calf.id, ranchId, myRole })}
                activeOpacity={0.7}
              >
                <Text style={styles.calfTag}>🐄 {calf.tags[0]?.number || 'No Tag'}</Text>
                <Text style={styles.calfInfo}>
                  {calf.status.toUpperCase()} {calf.breed ? `• ${calf.breed}` : ''}
                </Text>
                <Text style={styles.calfArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Notes */}
        <Text style={styles.sectionTitle}>Notes ({cow.notes.length})</Text>
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

      {/* Tag Label Picker Modal */}
      <Modal visible={tagLabelPickerIndex !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTagLabelPickerIndex(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tag Type</Text>
            {TAG_LABELS.map((label) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.modalOption,
                  tagLabelPickerIndex !== null && editTags[tagLabelPickerIndex]?.label === label && styles.modalOptionActive,
                ]}
                onPress={() => {
                  if (tagLabelPickerIndex !== null) {
                    handleEditTag(tagLabelPickerIndex, 'label', label);
                    setTagLabelPickerIndex(null);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  tagLabelPickerIndex !== null && editTags[tagLabelPickerIndex]?.label === label && styles.modalOptionTextActive,
                ]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 16, paddingBottom: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cowName: { fontSize: 28, fontWeight: 'bold', color: '#2D5016' },
  statusBadgeLarge: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 16, color: '#666' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  linkText: { fontSize: 16, fontWeight: '600', color: '#2D5016', textDecorationLine: 'underline' },
  descriptionCard: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
    minHeight: 50,
  },
  descriptionText: { fontSize: 16, color: '#333', lineHeight: 22 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  editInput: {
    padding: 12,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D5016',
    color: '#333',
    marginRight: 8,
  },
  editSave: {
    backgroundColor: '#2D5016',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  birthSep: { fontSize: 24, color: '#666', marginHorizontal: 4 },
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
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
  },
  tagLabelBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 12,
  },
  tagLabelText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tagNumberInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 6,
  },
  tagRemove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tagRemoveText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  addTagBtn: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 8,
  },
  addTagBtnText: { fontSize: 14, color: '#2D5016', fontWeight: '600' },
  tagActions: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  tagSaveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    marginRight: 8,
  },
  tagSaveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tagCancelBtn: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tagCancelBtnText: { color: '#666', fontWeight: 'bold', fontSize: 16 },
  calfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  calfTag: { fontSize: 18, fontWeight: 'bold', color: '#2D5016', flex: 1 },
  calfInfo: { fontSize: 14, color: '#666', marginRight: 8 },
  calfArrow: { fontSize: 18, color: '#2D5016' },
  addNoteRow: { flexDirection: 'row', marginBottom: 12 },
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
  emptyText: { fontSize: 18, color: '#999', textAlign: 'center', marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    padding: 20,
    width: 260,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalOptionActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  modalOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalOptionTextActive: {
    color: '#fff',
  },
});
