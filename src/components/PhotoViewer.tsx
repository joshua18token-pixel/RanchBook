import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PhotoViewerProps {
  photos: string[];
  onDelete: (index: number) => void;
  onAdd: () => void;
  onCamera: () => void;
}

export default function PhotoViewer({ photos, onDelete, onAdd, onCamera }: PhotoViewerProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openPhoto = (index: number) => {
    setSelectedIndex(index);
    setViewerVisible(true);
  };

  const confirmDelete = (index: number) => {
    Alert.alert('Delete Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(index);
          if (photos.length <= 1) setViewerVisible(false);
          else if (selectedIndex >= photos.length - 1) setSelectedIndex(Math.max(0, photos.length - 2));
        },
      },
    ]);
  };

  return (
    <View>
      {/* Photo grid - large thumbnails */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => openPhoto(i)} activeOpacity={0.8}>
              <Image source={{ uri }} style={styles.photoThumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Add photo buttons */}
      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.photoBtn} onPress={onCamera} activeOpacity={0.7}>
          <Text style={styles.photoBtnText}>📷 Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={onAdd} activeOpacity={0.7}>
          <Text style={styles.photoBtnText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen viewer modal */}
      <Modal visible={viewerVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={() => setViewerVisible(false)}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Zoomable image */}
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            contentContainerStyle={styles.zoomContainer}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: photos[selectedIndex] }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </ScrollView>

          {/* Navigation + Delete */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.navBtn, selectedIndex === 0 && styles.navDisabled]}
              onPress={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
            >
              <Text style={styles.navBtnText}>◀</Text>
            </TouchableOpacity>

            <Text style={styles.photoCounter}>{selectedIndex + 1} / {photos.length}</Text>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => confirmDelete(selectedIndex)}
            >
              <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, selectedIndex >= photos.length - 1 && styles.navDisabled]}
              onPress={() => setSelectedIndex(Math.min(photos.length - 1, selectedIndex + 1))}
              disabled={selectedIndex >= photos.length - 1}
            >
              <Text style={styles.navBtnText}>▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  photoScroll: { marginBottom: 8 },
  photoThumb: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginRight: 10,
  },
  photoButtons: { flexDirection: 'row', marginBottom: 8 },
  photoBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  photoBtnText: { fontSize: 16, color: '#333' },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  zoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 10,
  },
  navBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.3 },
  navBtnText: { color: '#fff', fontSize: 22 },
  photoCounter: { color: '#fff', fontSize: 16 },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ff5252',
  },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
