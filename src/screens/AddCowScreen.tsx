import React, { useState, useEffect } from 'react';
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
  Image,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addCow, getAllPastures, addPasture } from '../services/database';
import PhotoViewer from '../components/PhotoViewer';
import { CowStatus, Pasture } from '../types';

const STATUSES: CowStatus[] = ['wet', 'dry', 'bred', 'bull', 'steer', 'cull'];
const TAG_LABELS = ['ear tag', 'RFID', 'brand', 'other'];

interface TagInput {
  label: string;
  number: string;
}

export default function AddCowScreen({ navigation, route }: any) {
  const ranchId = route.params?.ranchId;
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CowStatus>('wet');
  const [breed, setBreed] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [tags, setTags] = useState<TagInput[]>([{ label: 'ear tag', number: '' }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [selectedPasture, setSelectedPasture] = useState<string | undefined>();
  const [showPastureInput, setShowPastureInput] = useState(false);
  const [newPastureName, setNewPastureName] = useState('');
  const [saving, setSaving] = useState(false);
  const [tagLabelPickerIndex, setTagLabelPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    getAllPastures(ranchId).then(setPastures);
  }, []);

  const addTagRow = () => {
    setTags([...tags, { label: 'ear tag', number: '' }]);
  };

  const updateTag = (index: number, field: keyof TagInput, value: string) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], [field]: value };
    setTags(updated);
  };

  const removeTag = (index: number) => {
    if (tags.length === 1) return;
    setTags(tags.filter((_, i) => i !== index));
  };

  const selectTagLabel = (index: number, label: string) => {
    updateTag(index, 'label', label);
    setTagLabelPickerIndex(null);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      setPhotos([...photos, ...result.assets.map(a => a.uri)]);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleAddPasture = async () => {
    if (!newPastureName.trim()) return;
    const p = await addPasture(newPastureName.trim(), ranchId);
    setPastures([...pastures, p]);
    setSelectedPasture(p.id);
    setNewPastureName('');
    setShowPastureInput(false);
  };

  const handleSave = async () => {
    const validTags = tags.filter(t => t.number.trim());
    if (validTags.length === 0) {
      Alert.alert('Need a Tag', 'Add at least one tag number for this cow.');
      return;
    }

    setSaving(true);
    try {
      await addCow({
        description: description.trim() || undefined,
        status,
        breed: breed.trim() || undefined,
        birthMonth: birthMonth ? parseInt(birthMonth, 10) : undefined,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        pastureId: selectedPasture,
        photos: photos.length > 0 ? photos : undefined,
        tags: validTags.map(t => ({
          id: '',
          label: t.label,
          number: t.number.trim(),
        })),
      }, ranchId);
      navigation.goBack();
    } catch (e: any) {
      if (e?.message?.startsWith('DUPLICATE_TAG:')) {
        const parts = e.message.split(':');
        const dupeNumber = parts[1];
        const dupeCowId = parts[2];
        Alert.alert(
          'Duplicate Tag',
          `Tag "${dupeNumber}" is already assigned to another cow on this ranch.`,
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Go to that cow',
              onPress: () => navigation.replace('CowDetail', { cowId: dupeCowId, ranchId, myRole: route.params?.myRole }),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save cow. Try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Tags - most important, at the top */}
        <Text style={styles.label}>Tags</Text>
        {tags.map((tag, index) => (
          <View key={index} style={styles.tagRow}>
            <TouchableOpacity
              style={styles.tagLabelButton}
              onPress={() => setTagLabelPickerIndex(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.tagLabelText}>{tag.label} ▼</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.tagInput}
              placeholder="Tag number"
              placeholderTextColor="#999"
              value={tag.number}
              onChangeText={(v) => updateTag(index, 'number', v)}
              autoCorrect={false}
              autoCapitalize="characters"
            />
            {tags.length > 1 && (
              <TouchableOpacity
                style={styles.removeTag}
                onPress={() => removeTag(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeTagText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addTagButton} onPress={addTagRow} activeOpacity={0.7}>
          <Text style={styles.addTagText}>+ Add Another Tag</Text>
        </TouchableOpacity>

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusButton, status === s && styles.statusActive]}
              onPress={() => setStatus(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusButtonText, status === s && styles.statusActiveText]}>
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pasture */}
        <Text style={styles.label}>Pasture (optional)</Text>
        <View style={styles.pastureRow}>
          <TouchableOpacity
            style={[styles.pastureOption, !selectedPasture && styles.pastureActive]}
            onPress={() => setSelectedPasture(undefined)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pastureOptionText, !selectedPasture && styles.pastureActiveText]}>None</Text>
          </TouchableOpacity>
          {pastures.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pastureOption, selectedPasture === p.id && styles.pastureActive]}
              onPress={() => setSelectedPasture(p.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pastureOptionText, selectedPasture === p.id && styles.pastureActiveText]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addPastureBtn}
            onPress={() => setShowPastureInput(!showPastureInput)}
            activeOpacity={0.7}
          >
            <Text style={styles.addPastureBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
        {showPastureInput && (
          <View style={styles.newPastureRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Pasture name..."
              placeholderTextColor="#999"
              value={newPastureName}
              onChangeText={setNewPastureName}
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.addPastureSave} onPress={handleAddPasture} activeOpacity={0.7}>
              <Text style={styles.addPastureSaveText}>ADD</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Description */}
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any notes about this cow..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Breed */}
        <Text style={styles.label}>Breed (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Angus, Hereford..."
          placeholderTextColor="#999"
          value={breed}
          onChangeText={setBreed}
          autoCorrect={false}
        />

        {/* Birth Date */}
        <Text style={styles.label}>Born (optional)</Text>
        <View style={styles.birthRow}>
          <TextInput
            style={[styles.input, styles.birthInput]}
            placeholder="MM"
            placeholderTextColor="#999"
            value={birthMonth}
            onChangeText={(v) => setBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.birthSeparator}>/</Text>
          <TextInput
            style={[styles.input, styles.birthInput]}
            placeholder="YYYY"
            placeholderTextColor="#999"
            value={birthYear}
            onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        {/* Photos */}
        <Text style={styles.label}>Photos (optional)</Text>
        <PhotoViewer
          photos={photos}
          onDelete={removePhoto}
          onAdd={pickPhoto}
          onCamera={takePhoto}
        />

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveText}>{saving ? 'SAVING...' : 'SAVE COW'}</Text>
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
                  tagLabelPickerIndex !== null && tags[tagLabelPickerIndex]?.label === label && styles.modalOptionActive,
                ]}
                onPress={() => tagLabelPickerIndex !== null && selectTagLabel(tagLabelPickerIndex, label)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  tagLabelPickerIndex !== null && tags[tagLabelPickerIndex]?.label === label && styles.modalOptionTextActive,
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
  label: { fontSize: 16, fontWeight: '600', color: '#2D5016', marginTop: 16, marginBottom: 8 },
  input: {
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    minWidth: 70,
    alignItems: 'center',
    marginBottom: 4,
    marginRight: 8,
  },
  statusActive: { backgroundColor: '#2D5016' },
  statusButtonText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  statusActiveText: { color: '#fff' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tagLabelButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 90,
    marginRight: 8,
  },
  tagLabelText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tagInput: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  removeTag: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTagText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addTagButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addTagText: { fontSize: 16, color: '#2D5016', fontWeight: '600' },
  pastureRow: { flexDirection: 'row', flexWrap: 'wrap' },
  pastureOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
  },
  pastureActive: { backgroundColor: '#8B4513' },
  pastureOptionText: { fontSize: 14, fontWeight: '600', color: '#666' },
  pastureActiveText: { color: '#fff' },
  addPastureBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B4513',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addPastureBtnText: { fontSize: 14, fontWeight: '600', color: '#8B4513' },
  newPastureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addPastureSave: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addPastureSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  birthRow: { flexDirection: 'row', alignItems: 'center' },
  birthInput: { width: 80, textAlign: 'center' },
  birthSeparator: { fontSize: 24, color: '#666', marginHorizontal: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: -4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  photoButtons: { flexDirection: 'row' },
  photoButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  photoButtonText: { fontSize: 16, color: '#333' },
  saveButton: {
    marginTop: 24,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#2D5016',
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
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
