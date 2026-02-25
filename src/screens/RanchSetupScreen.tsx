import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { createRanch, getMyRanches, acceptInvite, getPendingInvites, signOut } from '../services/auth';

interface Props {
  onRanchSelected: (ranchId: string, role: string) => void;
  onLogout: () => void;
}

export default function RanchSetupScreen({ onRanchSelected, onLogout }: Props) {
  const [ranchName, setRanchName] = useState('');
  const [ranches, setRanches] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

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
      onRanchSelected(ranch.id, 'manager');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create ranch');
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    try {
      await acceptInvite(invite.ranch_id);
      onRanchSelected(invite.ranch_id, invite.role);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    }
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🐄</Text>
      <Text style={styles.title}>Your Ranches</Text>

      {/* Existing ranches */}
      {ranches.length > 0 && (
        <View style={styles.section}>
          {ranches.map((item: any) => (
            <TouchableOpacity
              key={item.ranch_id}
              style={styles.ranchCard}
              onPress={() => onRanchSelected(item.ranch_id, item.role)}
              activeOpacity={0.7}
            >
              <Text style={styles.ranchName}>{(item.ranches as any)?.name || 'Ranch'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7', padding: 24, paddingTop: 60 },
  logo: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D5016', textAlign: 'center', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2D5016', marginBottom: 12 },
  ranchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2D5016',
  },
  ranchName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  roleBadge: { backgroundColor: '#2D5016', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  roleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  inviteCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  inviteName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  inviteRole: { fontSize: 14, color: '#666', marginTop: 4 },
  input: {
    padding: 16,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#2D5016',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#ff5252', fontSize: 16 },
});
