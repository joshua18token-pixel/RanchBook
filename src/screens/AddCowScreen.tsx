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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addCow, getAllPastures, addPasture, getRanchBreeds, addRanchBreed, addMedicalIssue, getMedicalPresets } from '../services/database';
import PhotoViewer from '../components/PhotoViewer';
import { CowStatus, Pasture } from '../types';

const STATUSES: CowStatus[] = ['wet', 'dry', 'bred', 'bull', 'steer', 'cull'];
const TAG_LABELS = ['ear tag', 'RFID', 'brand', 'other'];
const FALLBACK_BREEDS = ['Angus', 'Red Angus', 'Hereford', 'Charolais', 'Simmental', 'Brahman', 'Jersey', 'Holstein', 'Limousin', 'Shorthorn'];

interface TagInput {
  label: string;
  number: string;
}

export default function AddCowScreen({ navigation, route }: any) {
  const ranchId = route.params?.ranchId;
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CowStatus>('wet');
  const [breed, setBreed] = useState('');
  const [showCustomBreed, setShowCustomBreed] = useState(false);
  const [customBreed, setCustomBreed] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [tags, setTags] = useState<TagInput[]>([{ label: 'ear tag', number: '' }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [selectedPasture, setSelectedPasture] = useState<string | undefined>();
  const [showPastureInput, setShowPastureInput] = useState(false);
  const [newPastureName, setNewPastureName] = useState('');
  const [motherTag, setMotherTag] = useState('');
  const [medicalLabels, setMedicalLabels] = useState<string[]>([]);
  const [newMedicalInput, setNewMedicalInput] = useState('');
  const [medicalPresets, setMedicalPresets] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagLabelPickerIndex, setTagLabelPickerIndex] = useState<number | null>(null);
  const [ranchBreeds, setRanchBreeds] = useState<string[]>([]);

  useEffect(() => {
    getAllPastures(ranchId).then(setPastures);
    if (ranchId) {
      getRanchBreeds(ranchId)
        .then(breeds => setRanchBreeds(breeds.map(b => b.name)))
        .catch(() => setRanchBreeds(FALLBACK_BREEDS));
      getMedicalPresets(ranchId).then(setMedicalPresets).catch(() => {});
    }
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

  const handleSetCustomBreed = async () => {
    if (customBreed.trim()) {
      const name = customBreed.trim();
      setBreed(name);
      setShowCustomBreed(false);
      setCustomBreed('');
      // Add to ranch breeds if not already there
      if (ranchId && !ranchBreeds.includes(name)) {
        try {
          await addRanchBreed(name, ranchId);
          setRanchBreeds([...ranchBreeds, name].sort());
        } catch (e) { /* ignore duplicate */ }
      }
    }
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
        motherTag: motherTag.trim() || undefined,
        tags: validTags.map(t => ({
          id: '',
          label: t.label,
          number: t.number.trim(),
        })),
        medicalIssues: [],
      }, ranchId);

      // Add medical issues after cow is created
      if (medicalLabels.length > 0) {
        // Get the cow ID from the most recent cow
        const allCows = await (await import('../services/database')).getAllCows(ranchId);
        const newCow = allCows.find(c => c.tags.some(t => validTags.some(vt => vt.number.trim() === t.number)));
        if (newCow) {
          for (const label of medicalLabels) {
            await addMedicalIssue(newCow.id, label, ranchId);
          }
        }
      }

      navigation.goBack();
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
            navigation.replace('CowDetail', { cowId: dupeCowId, ranchId, myRole: route.params?.myRole });
          }
        } else {
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
        }
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
        <View style={styles.card}>
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
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.label}>Photos (optional)</Text>
          <PhotoViewer
            photos={photos}
            onDelete={removePhoto}
            onAdd={pickPhoto}
            onCamera={takePhoto}
          />
        </View>

        {/* Status */}
        <View style={styles.card}>
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
        </View>

        {/* Pasture */}
        <View style={styles.card}>
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
        </View>

        {/* Medical Watch */}
        <View style={styles.card}>
          <Text style={styles.label}>🏥 Medical Watch (optional)</Text>
          {medicalLabels.length > 0 && (
            <View style={styles.medicalRow}>
              {medicalLabels.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.medicalTag}
                  onPress={() => setMedicalLabels(medicalLabels.filter((_, idx) => idx !== i))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.medicalTagLabel}>{label}</Text>
                  <Text style={styles.medicalTagRemove}>✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* Medical presets from ranch */}
          {medicalPresets.filter(p => !medicalLabels.includes(p.label)).length > 0 && (
            <View style={styles.medicalPresetsRow}>
              {medicalPresets
                .filter(p => !medicalLabels.includes(p.label))
                .map(preset => (
                  <TouchableOpacity
                    key={preset.id}
                    style={styles.medicalPresetBtn}
                    onPress={() => setMedicalLabels([...medicalLabels, preset.label])}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.medicalPresetText}>+ {preset.label}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
          <View style={styles.addMedicalRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              value={newMedicalInput}
              onChangeText={setNewMedicalInput}
              placeholder="Add issue (e.g. prolapse, bad hip)..."
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.addPastureSave, !newMedicalInput.trim() && { opacity: 0.4 }]}
              onPress={() => {
                if (newMedicalInput.trim()) {
                  setMedicalLabels([...medicalLabels, newMedicalInput.trim()]);
                  setNewMedicalInput('');
                }
              }}
              disabled={!newMedicalInput.trim()}
            >
              <Text style={styles.addPastureSaveText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
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
        </View>

        {/* Breed */}
        <View style={styles.card}>
          <Text style={styles.label}>Breed (optional)</Text>
          <View style={styles.breedRow}>
            <TouchableOpacity
              style={[styles.breedOption, !breed && styles.breedActive]}
              onPress={() => { setBreed(''); setShowCustomBreed(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.breedOptionText, !breed && styles.breedActiveText]}>None</Text>
            </TouchableOpacity>
            {ranchBreeds.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.breedOption, breed === b && styles.breedActive]}
                onPress={() => { setBreed(b); setShowCustomBreed(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.breedOptionText, breed === b && styles.breedActiveText]}>{b}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addPastureBtn, breed && !ranchBreeds.includes(breed) && styles.breedActive]}
              onPress={() => setShowCustomBreed(!showCustomBreed)}
              activeOpacity={0.7}
            >
              <Text style={[styles.addPastureBtnText, breed && !ranchBreeds.includes(breed) && styles.breedActiveText]}>
                {breed && !ranchBreeds.includes(breed) ? breed : '+ Custom'}
              </Text>
            </TouchableOpacity>
          </View>
          {showCustomBreed && (
            <View style={styles.newPastureRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Custom breed..."
                placeholderTextColor="#999"
                value={customBreed}
                onChangeText={setCustomBreed}
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.addPastureSave} onPress={handleSetCustomBreed} activeOpacity={0.7}>
                <Text style={styles.addPastureSaveText}>SET</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Birth Date & Mother */}
        <View style={styles.card}>
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

          <Text style={[styles.label, { marginTop: 16 }]}>Mother's Tag (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Tag number of mother cow..."
            placeholderTextColor="#999"
            value={motherTag}
            onChangeText={setMotherTag}
            autoCorrect={false}
            autoCapitalize="characters"
          />
        </View>

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
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 10 },
  input: {
    padding: 14,
    fontSize: 18,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F0',
    minWidth: 70,
    alignItems: 'center',
    marginBottom: 4,
    marginRight: 8,
  },
  statusActive: { backgroundColor: '#1A1A1A' },
  statusButtonText: { fontSize: 14, fontWeight: 'bold', color: '#6B6B6B' },
  statusActiveText: { color: '#C5A55A' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tagLabelButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 90,
    marginRight: 8,
  },
  tagLabelText: { color: '#C5A55A', fontSize: 14, fontWeight: '600' },
  tagInput: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
  },
  removeTag: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTagText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addTagButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C5A55A',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addTagText: { fontSize: 16, color: '#C5A55A', fontWeight: '600' },
  pastureRow: { flexDirection: 'row', flexWrap: 'wrap' },
  pastureOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F0',
    marginRight: 8,
    marginBottom: 8,
  },
  pastureActive: { backgroundColor: '#C5A55A' },
  pastureOptionText: { fontSize: 14, fontWeight: '600', color: '#6B6B6B' },
  pastureActiveText: { color: '#fff' },
  medicalRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  medicalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  medicalTagLabel: { fontSize: 14, fontWeight: 'bold', color: '#D32F2F', marginRight: 8 },
  medicalTagRemove: { fontSize: 14, color: '#D32F2F', fontWeight: 'bold' },
  medicalPresetsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  medicalPresetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderStyle: 'dashed',
    marginRight: 8,
    marginBottom: 6,
  },
  medicalPresetText: { fontSize: 13, color: '#D32F2F', fontWeight: '600' },
  addMedicalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  breedRow: { flexDirection: 'row', flexWrap: 'wrap' },
  breedOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F0',
    marginRight: 8,
    marginBottom: 8,
  },
  breedActive: { backgroundColor: '#1A1A1A' },
  breedOptionText: { fontSize: 14, fontWeight: '600', color: '#6B6B6B' },
  breedActiveText: { color: '#C5A55A' },
  addPastureBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C5A55A',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addPastureBtnText: { fontSize: 14, fontWeight: '600', color: '#C5A55A' },
  newPastureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addPastureSave: {
    backgroundColor: '#C5A55A',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addPastureSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  birthRow: { flexDirection: 'row', alignItems: 'center' },
  birthInput: { width: 80, textAlign: 'center' },
  birthSeparator: { fontSize: 24, color: '#6B6B6B', marginHorizontal: 8 },
  saveButton: {
    marginTop: 12,
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#C5A55A',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: 260,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F0',
    marginBottom: 8,
    alignItems: 'center',
  },
  modalOptionActive: {
    backgroundColor: '#1A1A1A',
  },
  modalOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalOptionTextActive: {
    color: '#C5A55A',
  },
});
