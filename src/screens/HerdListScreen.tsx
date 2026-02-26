import React, { useState, useCallback, useEffect, useContext } from 'react';
import { AppContext } from '../../App';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCows, searchCows, getAllPastures, searchCowsByMedical } from '../services/database';
import { exportToExcelAndEmail } from '../services/export';
import { Cow, CowStatus, Pasture } from '../types';

const STATUS_COLORS: Record<CowStatus, string> = {
  wet: '#4CAF50',
  dry: '#9E9E9E',
  bred: '#FFC107',
  bull: '#795548',
  steer: '#607D8B',
  cull: '#D32F2F',
};

function parseDateRange(query: string): { from: number; to: number } | null {
  // Match patterns like "02/2024-06/2025" or "02/2024 - 06/2025"
  const match = query.match(/^(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const fromMonth = parseInt(match[1], 10);
  const fromYear = parseInt(match[2], 10);
  const toMonth = parseInt(match[3], 10);
  const toYear = parseInt(match[4], 10);
  return { from: fromYear * 100 + fromMonth, to: toYear * 100 + toMonth };
}

export default function HerdListScreen({ navigation, route }: any) {
  const { switchToRanchSelect } = useContext(AppContext);
  const ranchId = route.params?.ranchId;
  const myRole = route.params?.myRole;
  const ranchName = route.params?.ranchName || 'Ranch';

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{ranchName}</Text>
          <Text style={{ color: '#ccc', fontSize: 11 }}>RanchBook</Text>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => switchToRanchSelect()}
          style={{ paddingRight: 12 }}
        >
          <Text style={{ color: '#fff', fontSize: 14 }}>← Ranches</Text>
        </TouchableOpacity>
      ),
    });
  }, [ranchName]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'lastUpdated' | 'leastUpdated'>('newest');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pastures, setPastures] = useState<Pasture[]>([]);

  const loadCows = useCallback(async () => {
    const all = await getAllCows(ranchId);
    setTotalCount(all.length);
    if (!query.trim()) {
      setCows(all);
      return;
    }
    const range = parseDateRange(query.trim());
    if (range) {
      const all = await getAllCows(ranchId);
      setCows(all.filter(cow => {
        if (!cow.birthMonth || !cow.birthYear) return false;
        const cowDate = cow.birthYear * 100 + cow.birthMonth;
        return cowDate >= range.from && cowDate <= range.to;
      }));
    } else {
      // Search both regular fields and medical issues
      const regularResults = await searchCows(query, ranchId);
      const medicalCowIds = await searchCowsByMedical(query, ranchId);
      if (medicalCowIds.length > 0) {
        const all = await getAllCows(ranchId);
        const medicalCows = all.filter(c => medicalCowIds.includes(c.id));
        const merged = [...regularResults];
        medicalCows.forEach(mc => {
          if (!merged.find(c => c.id === mc.id)) merged.push(mc);
        });
        setCows(merged);
      } else {
        setCows(regularResults);
      }
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      loadCows();
      getAllPastures(ranchId).then(setPastures);
    }, [loadCows])
  );

  const handleExport = async () => {
    try {
      const allCows = await getAllCows(ranchId);
      const allPastures = await getAllPastures(ranchId);
      await exportToExcelAndEmail(allCows, allPastures);
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Failed to export');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCows();
    setRefreshing(false);
  };

  const getPrimaryTag = (cow: Cow) => {
    if (cow.tags.length > 0) return cow.tags[0].number;
    return 'No Tag';
  };

  const sortedCows = [...cows].sort((a, b) => {
    switch (sortBy) {
      case 'oldest': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'lastUpdated': return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      case 'leastUpdated': return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
      default: return 0;
    }
  });

  const renderCow = ({ item }: { item: Cow }) => {
    const cowPasture = pastures.find(p => p.id === item.pastureId);
    return (
    <TouchableOpacity
      style={styles.cowRow}
      onPress={() => navigation.navigate('CowDetail', { cowId: item.id, ranchId, myRole })}
      activeOpacity={0.7}
    >
      <View style={styles.cowInfo}>
        <Text style={styles.tagNumber}>{getPrimaryTag(item)}</Text>
        {cowPasture && <Text style={styles.pastureName}>📍 {cowPasture.name}</Text>}
        {item.tags.length > 1 && (
          <Text style={styles.extraTags}>+{item.tags.length - 1} more tags</Text>
        )}
        {(sortBy === 'lastUpdated' || sortBy === 'leastUpdated') && item.updatedAt && (
          <Text style={styles.updatedDate}>Updated: {new Date(item.updatedAt).toLocaleDateString()}</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>  
        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cow count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {query.trim() && cows.length !== totalCount
            ? `Showing ${cows.length} of ${totalCount} Cows`
            : `${totalCount} Cows`}
        </Text>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Search tag, pasture, or 02/2024-06/2025..."
        placeholderTextColor="#999"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
        }}
        onSubmitEditing={loadCows}
        returnKeyType="search"
        autoCorrect={false}
      />
      {/* Sort options */}
      <View style={styles.sortRow}>
        {([
          { key: 'newest', label: 'Newest' },
          { key: 'oldest', label: 'Oldest' },
          { key: 'lastUpdated', label: 'Last Updated' },
          { key: 'leastUpdated', label: '⚠️ Not Updated' },
        ] as const).map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
            onPress={() => setSortBy(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortBtnText, sortBy === opt.key && styles.sortBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={sortedCows}
        keyExtractor={(item) => item.id}
        renderItem={renderCow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐂</Text>
            <Text style={styles.emptyText}>
              {query ? 'No cows match your search' : 'No cows yet — tap + to add one'}
            </Text>
          </View>
        }
        contentContainerStyle={cows.length === 0 ? styles.emptyContainer : undefined}
      />
      <View style={styles.leftFabs}>
        <TouchableOpacity
          style={styles.exportFab}
          onPress={handleExport}
          activeOpacity={0.8}
        >
          <Text style={styles.exportFabText}>📊</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.teamFab}
          onPress={() => navigation.navigate('Team', { ranchId: route.params?.ranchId, myRole: route.params?.myRole })}
          activeOpacity={0.8}
        >
          <Text style={styles.teamFabText}>👥</Text>
        </TouchableOpacity>
      </View>
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
  countRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  countText: { fontSize: 16, fontWeight: 'bold', color: '#2D5016' },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 4,
  },
  sortBtnActive: { backgroundColor: '#2D5016' },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  sortBtnTextActive: { color: '#fff' },
  updatedDate: { fontSize: 12, color: '#999', marginTop: 2 },
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
  pastureName: { fontSize: 14, color: '#8B4513', marginTop: 2 },
  extraTags: { fontSize: 13, color: '#999', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  leftFabs: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    flexDirection: 'row',
  },
  exportFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 10,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  exportFabText: { fontSize: 24 },
  teamFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D5016',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  teamFabText: { fontSize: 24 },
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
