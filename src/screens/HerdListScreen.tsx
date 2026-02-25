import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCows, searchCows } from '../services/database';
import { Cow, CowStatus } from '../types';

const STATUS_COLORS: Record<CowStatus, string> = {
  wet: '#4CAF50',
  dry: '#9E9E9E',
  bred: '#FFC107',
  open: '#2196F3',
  calf: '#FF9800',
  bull: '#795548',
  steer: '#607D8B',
};

export default function HerdListScreen({ navigation }: any) {
  const [cows, setCows] = useState<Cow[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadCows = useCallback(async () => {
    const data = query.trim() ? await searchCows(query) : await getAllCows();
    setCows(data);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadCows();
    }, [loadCows])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCows();
    setRefreshing(false);
  };

  const getPrimaryTag = (cow: Cow) => {
    if (cow.tags.length > 0) return cow.tags[0].number;
    return 'No Tag';
  };

  const renderCow = ({ item }: { item: Cow }) => (
    <TouchableOpacity
      style={styles.cowRow}
      onPress={() => navigation.navigate('CowDetail', { cowId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cowInfo}>
        <Text style={styles.tagNumber}>{getPrimaryTag(item)}</Text>
        {item.name ? <Text style={styles.cowName}>{item.name}</Text> : null}
        {item.tags.length > 1 && (
          <Text style={styles.extraTags}>+{item.tags.length - 1} more tags</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>  
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search by tag, name, or status..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
        }}
        onSubmitEditing={loadCows}
        returnKeyType="search"
        autoCorrect={false}
      />
      <FlatList
        data={cows}
        keyExtractor={(item) => item.id}
        renderItem={renderCow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐄</Text>
            <Text style={styles.emptyText}>
              {query ? 'No cows match your search' : 'No cows yet — tap + to add one'}
            </Text>
          </View>
        }
        contentContainerStyle={cows.length === 0 ? styles.emptyContainer : undefined}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCow')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  searchBar: {
    margin: 12,
    padding: 14,
    fontSize: 18,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  cowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cowInfo: { flex: 1 },
  tagNumber: { fontSize: 22, fontWeight: 'bold', color: '#2D5016' },
  cowName: { fontSize: 16, color: '#666', marginTop: 2 },
  extraTags: { fontSize: 13, color: '#999', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 64 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16, textAlign: 'center' },
  emptyContainer: { flexGrow: 1 },
});
