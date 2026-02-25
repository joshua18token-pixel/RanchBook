import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getRanchMembers, inviteMember, updateMemberRole, removeMember } from '../services/auth';

export default function TeamScreen({ route }: any) {
  const { ranchId, myRole } = route.params;
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'read' | 'write'>('read');
  const [loading, setLoading] = useState(false);
  const isManager = myRole === 'manager';

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await getRanchMembers(ranchId);
      setMembers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Enter the email address to invite.');
      return;
    }
    setLoading(true);
    try {
      await inviteMember(ranchId, email.trim(), inviteRole);
      Alert.alert('Invited!', `${email.trim()} has been invited with ${inviteRole} access. They need to create an account with this email to see the ranch.`);
      setEmail('');
      loadMembers();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = (member: any) => {
    if (member.role === 'manager') return; // Can't change manager role
    const newRole = member.role === 'write' ? 'read' : 'write';
    Alert.alert(
      'Change Role',
      `Change ${member.email} from ${member.role} to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Set ${newRole.toUpperCase()}`,
          onPress: async () => {
            await updateMemberRole(member.id, newRole);
            loadMembers();
          },
        },
      ]
    );
  };

  const handleRemove = (member: any) => {
    if (member.role === 'manager') return;
    Alert.alert(
      'Remove Member',
      `Remove ${member.email} from this ranch?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeMember(member.id);
            loadMembers();
          },
        },
      ]
    );
  };

  const ROLE_COLORS: Record<string, string> = {
    manager: '#2D5016',
    write: '#1976D2',
    read: '#9E9E9E',
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Team Members</Text>

        {/* Member list */}
        {members.map((m) => (
          <View key={m.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberEmail}>{m.email}</Text>
              <Text style={styles.memberStatus}>
                {m.accepted ? '✓ Active' : '⏳ Pending invite'}
              </Text>
            </View>
            <View style={styles.memberActions}>
              <TouchableOpacity
                style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[m.role] || '#999' }]}
                onPress={() => isManager && handleChangeRole(m)}
                activeOpacity={isManager && m.role !== 'manager' ? 0.7 : 1}
              >
                <Text style={styles.roleText}>
                  {m.role.toUpperCase()}{isManager && m.role !== 'manager' ? ' ▼' : ''}
                </Text>
              </TouchableOpacity>
              {isManager && m.role !== 'manager' && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(m)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Invite section - managers only */}
        {isManager && (
          <View style={styles.inviteSection}>
            <Text style={styles.sectionTitle}>Invite Someone</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleOption, inviteRole === 'read' && styles.roleSelected]}
                onPress={() => setInviteRole('read')}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleOptionText, inviteRole === 'read' && styles.roleSelectedText]}>
                  👁️ READ ONLY
                </Text>
                <Text style={styles.roleDesc}>Can view herd, can't edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, inviteRole === 'write' && styles.roleSelected]}
                onPress={() => setInviteRole('write')}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleOptionText, inviteRole === 'write' && styles.roleSelectedText]}>
                  ✏️ READ & WRITE
                </Text>
                <Text style={styles.roleDesc}>Can view and edit herd</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.inviteBtn, loading && styles.inviteBtnDisabled]}
              onPress={handleInvite}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.inviteBtnText}>
                {loading ? 'INVITING...' : 'SEND INVITE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isManager && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Only the Ranch Manager can invite or manage team members.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2D5016', marginBottom: 16 },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
  },
  memberInfo: { flex: 1 },
  memberEmail: { fontSize: 16, fontWeight: '600', color: '#333' },
  memberStatus: { fontSize: 13, color: '#666', marginTop: 2 },
  memberActions: { flexDirection: 'row', alignItems: 'center' },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  roleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  removeBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff5252',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  inviteSection: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#2D5016', marginBottom: 12 },
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
  roleRow: { flexDirection: 'row', marginBottom: 16 },
  roleOption: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 8,
  },
  roleSelected: { backgroundColor: '#2D5016' },
  roleOptionText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  roleSelectedText: { color: '#fff' },
  roleDesc: { fontSize: 11, color: '#999', marginTop: 4 },
  inviteBtn: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  infoBox: { padding: 16, backgroundColor: '#fff', borderRadius: 10, marginTop: 24 },
  infoText: { fontSize: 15, color: '#666', textAlign: 'center' },
});
