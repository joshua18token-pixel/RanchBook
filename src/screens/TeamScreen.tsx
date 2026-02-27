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
  Modal,
} from 'react-native';
import { getRanchMembers, inviteMember, updateMemberRole, removeMember } from '../services/auth';
import { supabase } from '../services/supabase';

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  write: 'Read & Write',
  read: 'Read Only',
};

const ROLE_COLORS: Record<string, string> = {
  manager: '#1A1A1A',
  write: '#1976D2',
  read: '#9E9E9E',
};

export default function TeamScreen({ route }: any) {
  const { ranchId, myRole } = route.params;
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'read' | 'write'>('read');
  const [loading, setLoading] = useState(false);
  const isManager = myRole === 'manager';
  const [rolePickerMember, setRolePickerMember] = useState<any>(null);

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
      if (Platform.OS === 'web') {
        window.alert('Enter the email address to invite.');
      } else {
        Alert.alert('Enter Email', 'Enter the email address to invite.');
      }
      return;
    }
    setLoading(true);
    try {
      await inviteMember(ranchId, email.trim(), inviteRole);
      if (Platform.OS === 'web') {
        window.alert(`${email.trim()} has been invited with ${ROLE_LABELS[inviteRole]} access.`);
      } else {
        Alert.alert('Invited!', `${email.trim()} has been invited with ${ROLE_LABELS[inviteRole]} access.`);
      }
      setEmail('');
      loadMembers();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message || 'Failed to invite');
      } else {
        Alert.alert('Error', e.message || 'Failed to invite');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetRole = async (member: any, newRole: string) => {
    setRolePickerMember(null);

    if (newRole === member.role) return;

    // Promoting to manager
    if (newRole === 'manager') {
      const { error } = await supabase
        .from('ranch_members')
        .update({ role: 'manager' })
        .eq('id', member.id);
      if (error) {
        const msg = error.message || 'Failed to update role';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
        return;
      }
    } else {
      // Demoting — make sure we're not removing the last manager
      if (member.role === 'manager') {
        const managerCount = members.filter(m => m.role === 'manager').length;
        if (managerCount <= 1) {
          const msg = 'Cannot demote the last manager. Promote someone else first.';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Cannot Demote', msg);
          return;
        }
      }
      await updateMemberRole(member.id, newRole as 'read' | 'write');
    }
    loadMembers();
  };

  const handleRemove = async (member: any) => {
    // Don't allow removing the last manager
    if (member.role === 'manager') {
      const managerCount = members.filter(m => m.role === 'manager').length;
      if (managerCount <= 1) {
        const msg = 'Cannot remove the last manager.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Cannot Remove', msg);
        return;
      }
    }

    const doRemove = async () => {
      try {
        await removeMember(member.id);
        loadMembers();
      } catch (e: any) {
        Platform.OS === 'web' ? window.alert(e.message || 'Failed') : Alert.alert('Error', e.message || 'Failed');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${member.email} from this ranch?`)) {
        await doRemove();
      }
    } else {
      Alert.alert('Remove Member', `Remove ${member.email} from this ranch?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Team Members</Text>

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
                onPress={() => isManager ? setRolePickerMember(m) : null}
                activeOpacity={isManager ? 0.7 : 1}
              >
                <Text style={styles.roleText}>
                  {ROLE_LABELS[m.role] || m.role.toUpperCase()}{isManager ? ' ▼' : ''}
                </Text>
              </TouchableOpacity>
              {isManager && (
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

        {/* Role picker modal */}
        <Modal visible={!!rolePickerMember} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setRolePickerMember(null)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Change Role</Text>
              <Text style={styles.modalSubtitle}>{rolePickerMember?.email}</Text>

              {(['manager', 'write', 'read'] as const).map((role) => {
                const isCurrentRole = rolePickerMember?.role === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.rolePickerOption, isCurrentRole && styles.rolePickerCurrent]}
                    onPress={() => handleSetRole(rolePickerMember, role)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.rolePickerDot, { backgroundColor: ROLE_COLORS[role] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rolePickerLabel, isCurrentRole && { fontWeight: 'bold' }]}>
                        {ROLE_LABELS[role]}{isCurrentRole ? ' (current)' : ''}
                      </Text>
                      <Text style={styles.rolePickerDesc}>
                        {role === 'manager' && 'Full access: manage team, settings, and herd'}
                        {role === 'write' && 'Can view and edit herd data'}
                        {role === 'read' && 'Can only view herd data'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRolePickerMember(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

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
              Only Ranch Managers can invite or manage team members.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 },
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  rolePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  rolePickerCurrent: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  rolePickerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  rolePickerLabel: { fontSize: 16, color: '#333' },
  rolePickerDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  modalCancel: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: { fontSize: 16, color: '#999' },
  // Invite section
  inviteSection: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
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
  roleSelected: { backgroundColor: '#1A1A1A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  roleOptionText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  roleSelectedText: { color: '#fff' },
  roleDesc: { fontSize: 11, color: '#999', marginTop: 4 },
  inviteBtn: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#C5A55A',
    alignItems: 'center',
  },
  inviteBtnDisabled: { opacity: 0.6 },
  inviteBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  infoBox: { padding: 16, backgroundColor: '#fff', borderRadius: 10, marginTop: 24 },
  infoText: { fontSize: 15, color: '#666', textAlign: 'center' },
});
