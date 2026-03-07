import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker'; // Thêm ImagePicker
import { router } from 'expo-router'; // Thêm router để dùng nút Back

// --- Bảng màu cho giao diện ---
const COLORS = {
  primary: '#007BFF', // Màu xanh Facebook
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textSecondary: '#666666',
  border: '#EFEFEF',
  white: '#FFFFFF',
  black: '#000000',
  newBadge: '#E63946', // Màu đỏ cho "Mới"
};

// Lấy kích thước màn hình
const { width } = Dimensions.get('window');
const IMAGE_SIZE = width / 3; // Kích thước mỗi ô ảnh (3 cột)

// --- Các Component giao diện con ---

// 1. Header (Thêm props để xử lý sự kiện)
const ScreenHeader = ({
  onBackPress,
  onSettingsPress,
}: {
  onBackPress: () => void;
  onSettingsPress: () => void;
}) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBackPress}>
      <Ionicons name="close" size={30} color={COLORS.text} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Tạo tin</Text>
    <TouchableOpacity onPress={onSettingsPress}>
      <Ionicons name="settings-sharp" size={24} color={COLORS.text} />
    </TouchableOpacity>
  </View>
);

// 2. Các Tab loại Tin (Thêm props cho state)
const StoryTypeTabs = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => (
  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'text' && styles.tabActive]}
      onPress={() => setActiveTab('text')}
    >
      <FontAwesome5
        name="font"
        size={20}
        color={activeTab === 'text' ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>Văn bản</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'music' && styles.tabActive]}
      onPress={() => setActiveTab('music')}
    >
      <Ionicons
        name="musical-notes"
        size={20}
        color={activeTab === 'music' ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>Nhạc</Text>
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>Mới</Text>
      </View>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.tabButton, activeTab === 'album' && styles.tabActive]}
      onPress={() => setActiveTab('album')}
    >
      <MaterialCommunityIcons
        name="image-multiple"
        size={20}
        color={activeTab === 'album' ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.tabText, activeTab === 'album' && styles.tabTextActive]}>Nhóm ảnh</Text>
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>Mới</Text>
      </View>
    </TouchableOpacity>
  </View>
);

// 3. Thanh điều khiển Thư viện (Thêm props cho state)
const LibraryControls = ({
  isMultiSelect,
  onToggleMultiSelect,
}: {
  isMultiSelect: boolean;
  onToggleMultiSelect: () => void;
}) => (
  <View style={styles.libraryControls}>
    <TouchableOpacity style={styles.albumDropdown}>
      <Text style={styles.libraryTitle}>Thư viện</Text>
      <Ionicons name="chevron-down" size={20} color={COLORS.text} />
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.multiSelectButton, isMultiSelect && styles.multiSelectActive]}
      onPress={onToggleMultiSelect}
    >
      <MaterialCommunityIcons
        name="checkbox-multiple-blank-outline"
        size={20}
        color={isMultiSelect ? COLORS.white : COLORS.text}
      />
      <Text style={[styles.multiSelectText, isMultiSelect && styles.multiSelectTextActive]}>
        Chọn nhiều file
      </Text>
    </TouchableOpacity>
  </View>
);

// --- Component Màn hình chính ---
export default function CreateStoryScreen() {
  const [mediaAssets, setMediaAssets] = useState<MediaLibrary.Asset[]>([]);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions(); // Thêm quyền Camera

  // State cho giao diện
  const [activeTab, setActiveTab] = useState('text');
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // 1. Tải ảnh và xin quyền khi màn hình được mở
  useEffect(() => {
    loadMedia();
  }, [mediaPermission]); // Chạy lại nếu quyền media thay đổi

  // Hàm xin quyền và tải media
  const loadMedia = async () => {
    if (!mediaPermission) {
      await requestMediaPermission();
      return;
    }

    if (!mediaPermission.granted) {
      Alert.alert('Cần quyền truy cập', 'Bạn cần cấp quyền truy cập thư viện để tạo tin.');
      return;
    }

    try {
      const assets = await MediaLibrary.getAssetsAsync({
        first: 30,
        mediaType: ['photo', 'video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      setMediaAssets(assets.assets);
    } catch (e) {
      console.error('Không thể tải media:', e);
    }
  };

  // 2. Hàm mở Camera
  const openCamera = async () => {
    // Xin quyền nếu chưa có
    if (!cameraPermission) {
      const { status } = await requestCameraPermission();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Bạn cần cấp quyền truy cập camera để chụp ảnh.');
        return;
      }
    }

    if (!cameraPermission.granted) {
      Alert.alert('Cần quyền truy cập', 'Bạn cần cấp quyền truy cập camera để chụp ảnh.');
      return;
    }

    // Mở camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16], // Tỉ lệ story
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // TODO: Điều hướng đến màn hình chỉnh sửa với URI này
      Alert.alert('Chụp ảnh thành công', 'Sẵn sàng chỉnh sửa ảnh: ' + uri);
      // router.push({ pathname: '/editor', params: { uri } });
    }
  };

  // 3. Hàm xử lý khi bấm vào 1 media
  const handleMediaPress = (item: MediaLibrary.Asset) => {
    if (isMultiSelect) {
      // Nếu đang chọn nhiều, thêm/bớt khỏi danh sách
      setSelectedAssets((prev) =>
        prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
      );
    } else {
      // Nếu chọn 1, chuyển đến màn hình editor
      Alert.alert('Mở trình chỉnh sửa', `Chỉnh sửa file: ${item.filename}`);
      // router.push({ pathname: '/editor', params: { uri: item.uri } });
    }
  };

  // 4. Render một ô ảnh trong lưới (cải tiến)
  const renderMediaItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedAssets.includes(item.id);

    return (
      <TouchableOpacity style={styles.imageContainer} onPress={() => handleMediaPress(item)}>
        <Image source={{ uri: item.uri }} style={styles.imageTile} />
        {item.mediaType === 'video' && (
          <Text style={styles.durationText}>
            {new Date(item.duration * 1000).toISOString().substr(14, 5)}
          </Text>
        )}

        {/* Hiển thị khi ở chế độ chọn nhiều */}
        {isMultiSelect && (
          <View style={styles.selectionIcon}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={28}
              color={isSelected ? COLORS.primary : COLORS.white}
              style={!isSelected && styles.selectionIconOutline} // Thêm viền cho icon chưa chọn
            />
          </View>
        )}
        {/* Lớp phủ mờ khi được chọn */}
        {isSelected && <View style={styles.selectionOverlay} />}
      </TouchableOpacity>
    );
  };

  // 5. Giao diện chính
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        onBackPress={() => router.back()}
        onSettingsPress={() => Alert.alert('Cài đặt', 'Chuyển đến màn hình cài đặt!')}
      />
      <StoryTypeTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <LibraryControls
        isMultiSelect={isMultiSelect}
        onToggleMultiSelect={() => {
          setIsMultiSelect(!isMultiSelect);
          setSelectedAssets([]); // Reset khi tắt/bật
        }}
      />

      {/* Lưới hiển thị Media */}
      <FlatList
        data={mediaAssets}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        style={styles.gridContainer}
        // Thêm extraData để FlatList render lại khi state isMultiSelect hoặc selectedAssets thay đổi
        extraData={{ isMultiSelect, selectedAssets }}
      />

      {/* Nút Camera nổi */}
      <TouchableOpacity style={styles.cameraButton} onPress={openCamera}>
        <Ionicons name="camera" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- StyleSheet (Đã cập nhật) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: COLORS.backgroundLight,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#E0E0E0', // Bạn có thể đổi thành màu xanh nhạt
  },
  tabText: {
    marginTop: 5,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary, // Màu chữ khi active
  },
  newBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.primary, // Đổi thành màu đỏ
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  libraryControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  albumDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  libraryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
    color: COLORS.text,
  },
  multiSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  multiSelectActive: {
    backgroundColor: COLORS.primary, // Màu khi "Chọn nhiều file" active
  },
  multiSelectText: {
    marginLeft: 8,
    fontWeight: '500',
    color: COLORS.text,
  },
  multiSelectTextActive: {
    color: COLORS.white,
  },
  gridContainer: {
    flex: 1,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE, // Đảm bảo ô vuông
    borderWidth: 1,
    borderColor: COLORS.white,
    position: 'relative',
  },
  imageTile: {
    width: '100%',
    height: '100%',
  },
  durationText: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  // --- Style cho Multi-select ---
  selectionIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  selectionIconOutline: {
    // Thêm viền mờ để icon "chưa chọn" nổi bật trên ảnh
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Lớp phủ mờ
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  // --- Hết Style Multi-select ---
  cameraButton: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    backgroundColor: COLORS.primary, // Dùng màu chủ đạo
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
