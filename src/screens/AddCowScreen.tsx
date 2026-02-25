import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { addCow } from '../services/database';
import { CowStatus, Tag } from '../types';

const STATUSES: CowStatus[] = ['wet', 'dry', 'bred', 'bull', 'steer', 'cull'];
const TAG_LABELS = ['ear tag', 'RFID', 'brand', 'other'];

interface TagInput {
  label: string;
  number: string;
}

export default function AddCowScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CowStatus>('wet');
  const [breed, setBreed] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [tags, setTags] = useState<TagInput[]>([{ label: 'ear tag', number: '' }]);
  const [saving, setSaving] = useState(false);

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

  const cycleLabelType = (index: number) => {
    const current = tags[index].label;
    const currentIdx = TAG_LABELS.indexOf(current);
    const next = TAG_LABELS[(currentIdx + 1) % TAG_LABELS.length];
    updateTag(index, 'label', next);
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
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        status,
        breed: breed.trim() || undefined,
        birthMonth: birthMonth ? parseInt(birthMonth, 10) : undefined,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
        tags: validTags.map(t => ({
          id: '',
          label: t.label,
          number: t.number.trim(),
        })),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save cow. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tags - most important, at the top */}
      <Text style={styles.label}>Tags</Text>
      {tags.map((tag, index) => (
        <View key={index} style={styles.tagRow}>
          <TouchableOpacity
            style={styles.tagLabelButton}
            onPress={() => cycleLabelType(index)}
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

      {/* Name */}
      <Text style={styles.label}>Name (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Bessie, Old Red..."
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
      />

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 16, paddingBottom: 40 },
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
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
  birthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthInput: {
    width: 80,
    textAlign: 'center',
  },
  birthSeparator: {
    fontSize: 24,
    color: '#666',
    marginHorizontal: 8,
  },
  saveButton: {
    marginTop: 24,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#2D5016',
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});
