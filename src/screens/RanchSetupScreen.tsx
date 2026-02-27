import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { createRanch, getMyRanches, acceptInvite, getPendingInvites, signOut, deleteRanch } from '../services/auth';

interface Props {
  onRanchSelected: (ranchId: string, role: string, name?: string) => void;
  onLogout: () => void;
}

export default function RanchSetupScreen({ onRanchSelected, onLogout }: Props) {
  const [ranchName, setRanchName] = useState('');
  const [ranches, setRanches] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [myRanches, pending] = await Promise.all([getMyRanches(), getPendingInvites()]);
      setRanches(myRanches || []);
      setInvites(pending || []);
    } catch (e) {
      // User might not have ranches yet
    }
  };

  const handleCreateRanch = async () => {
    if (!ranchName.trim()) {
      Alert.alert('Need a Name', 'Give your ranch a name.');
      return;
    }
    setCreating(true);
    try {
      const ranch = await createRanch(ranchName.trim());
      onRanchSelected(ranch.id, 'manager', ranch.name);
    } catch (e: any) {
      let msg = e.message || 'Failed to create ranch';
      if (msg.includes('infinite recursion')) msg = 'Database permission error. Please contact support.';
      else if (msg.includes('violates')) msg = 'Could not create ranch. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    try {
      await acceptInvite(invite.ranch_id);
      onRanchSelected(invite.ranch_id, invite.role, (invite.ranches as any)?.name);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    }
  };

  const handleDeleteRanch = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) {
      Alert.alert('Name doesn\'t match', 'Type the exact ranch name to confirm deletion.');
      return;
    }
    setDeleting(true);
    try {
      await deleteRanch(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteConfirmText('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete ranch');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo-ranchbook.jpg')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      <Text style={styles.title}>Your Ranches</Text>

      {/* Existing ranches */}
      {ranches.length > 0 && (
        <View style={styles.section}>
          {ranches.map((item: any, index: number) => {
            const ranchData = item.ranches as any;
            const name = ranchData?.name || 'Ranch';
            return (
              <View key={item.ranch_id} style={styles.ranchRow}>
                <TouchableOpacity
                  style={[styles.ranchCard, { flex: 1 }]}
                  onPress={() => {
                    console.log('Selected ranch:', { ranch_id: item.ranch_id, role: item.role, name, raw: item });
                    onRanchSelected(item.ranch_id, item.role, name);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ranchName}>{name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
                {item.role === 'manager' && (
                  <TouchableOpacity
                    style={styles.deleteRanchBtn}
                    onPress={() => { setDeleteTarget({ id: item.ranch_id, name }); setDeleteConfirmText(''); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteRanchBtnText}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {invites.map((inv: any) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.inviteCard}
              onPress={() => handleAcceptInvite(inv)}
              activeOpacity={0.7}
            >
              <Text style={styles.inviteName}>{(inv.ranches as any)?.name || 'A Ranch'}</Text>
              <Text style={styles.inviteRole}>as {inv.role} → Tap to accept</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Create new ranch */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create a New Ranch</Text>
        <TextInput
          style={styles.input}
          placeholder="Ranch name (e.g. Bar K Ranch)"
          placeholderTextColor="#999"
          value={ranchName}
          onChangeText={setRanchName}
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, creating && styles.buttonDisabled]}
          onPress={handleCreateRanch}
          disabled={creating}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {creating ? 'CREATING...' : 'CREATE RANCH (I\'M THE MANAGER)'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Ranch Confirmation Modal */}
      <Modal visible={deleteTarget !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Delete Ranch</Text>
            <Text style={styles.modalWarning}>
              This will permanently delete "{deleteTarget?.name}" and ALL its data:
            </Text>
            <Text style={styles.modalWarningList}>
              • All cows and their tags{'\n'}
              • All photos and notes{'\n'}
              • All pastures and breed presets{'\n'}
              • All team member access
            </Text>
            <Text style={styles.modalWarning}>This cannot be undone.</Text>
            <Text style={styles.modalConfirmLabel}>
              Type "{deleteTarget?.name}" to confirm:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Ranch name..."
              placeholderTextColor="#999"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.modalDeleteBtn,
                deleteConfirmText !== deleteTarget?.name && styles.modalDeleteDisabled,
              ]}
              onPress={handleDeleteRanch}
              disabled={deleteConfirmText !== deleteTarget?.name || deleting}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDeleteText}>
                {deleting ? 'DELETING...' : 'DELETE RANCH FOREVER'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0', padding: 24, paddingTop: 60 },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  ranchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#C5A55A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ranchName: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  roleBadge: { backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleText: { color: '#C5A55A', fontWeight: 'bold', fontSize: 12 },
  inviteCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#C5A55A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteName: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  inviteRole: { fontSize: 14, color: '#6B6B6B', marginTop: 4 },
  input: {
    padding: 16,
    fontSize: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#C5A55A',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#D32F2F', fontSize: 16 },
  ranchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  deleteRanchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteRanchBtnText: { fontSize: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalWarning: {
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalWarningList: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 12,
    lineHeight: 22,
    paddingLeft: 8,
  },
  modalConfirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 8,
  },
  modalInput: {
    padding: 14,
    fontSize: 16,
    backgroundColor: '#F5F5F0',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D32F2F',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  modalDeleteBtn: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDeleteDisabled: { opacity: 0.4 },
  modalDeleteText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalCancelBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: { color: '#6B6B6B', fontSize: 16 },
});
