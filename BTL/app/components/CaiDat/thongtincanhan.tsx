import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig!.extra!.apiUrl as string;

interface UserInfo {
  ID_NguoiDung: number;
  ho_ten?: string;
  truong_hoc?: string;
  vi_tri?: string;
  anh_dai_dien?: string;
  email?: string;
  ten_dang_nhap?: string;
  diem_so?: number;
}

export default function ThongTinCaNhanScreen() {
  // === STATE ===
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{ uri: string } | null>(null);

  const [hoTen, setHoTen] = useState<string>('');
  const [truongHoc, setTruongHoc] = useState<string>('');
  const [viTri, setViTri] = useState<string>('');

  // === LOAD USER DATA ===
  useFocusEffect(
    useCallback(() => {
      const loadUserData = async () => {
        setIsLoading(true);
        try {
          const userJson = await AsyncStorage.getItem('userInfo');
          if (userJson) {
            const userData = JSON.parse(userJson);
            if (userData) {
              setUserInfo(userData);
              setHoTen(userData.ho_ten || '');
              setTruongHoc(userData.truong_hoc || '');
              setViTri(userData.vi_tri || '');
              setAvatar(userData.anh_dai_dien || null);
            }
          }
        } catch (error) {
          console.error('Lỗi khi tải thông tin người dùng:', error);
          Alert.alert('Lỗi', 'Không thể tải dữ liệu người dùng.');
        } finally {
          setIsLoading(false);
        }
      };
      loadUserData();
    }, []),
  );

  // === PICK IMAGE ===
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setAvatar(imageUri);
      setAvatarFile({ uri: imageUri });
    }
  };

  // === UPLOAD IMAGE ===
  const uploadImage = async (image: { uri: string }): Promise<string | null> => {
    const formData = new FormData();
    const filename = image.uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image';

    formData.append('avatar', {
      uri: image.uri,
      name: filename || 'avatar.jpg',
      type: type,
    } as any);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể tải ảnh lên.');
      return data.imageUrl;
    } catch (error) {
      console.error('Lỗi upload ảnh:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên server.');
      return null;
    }
  };

  // === SAVE USER INFO ===
  const handleSave = async (): Promise<void> => {
    if (!userInfo) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng để cập nhật.');
      return;
    }

    setIsSaving(true);

    try {
      let finalAvatarUrl = userInfo.anh_dai_dien;

      if (avatarFile) {
        const uploadedUrl = await uploadImage(avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          setIsSaving(false);
          return;
        }
      }

      const updatePayload = {
        ho_ten: hoTen,
        truong_hoc: truongHoc,
        vi_tri: viTri,
        anh_dai_dien: finalAvatarUrl,
      };

      const userId = userInfo.ID_NguoiDung;
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_BASE_URL}/api/nguoidung/update/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const responseData = await response.json();

      if (response.ok) {
        let updatedUserObject: UserInfo;

        if (responseData.user) {
          updatedUserObject = responseData.user;
          Alert.alert('Thành công', 'Cập nhật thông tin cá nhân thành công!');
        } else {
          Alert.alert('Thông báo', 'Cập nhật thành công.');
          updatedUserObject = {
            ...(userInfo as UserInfo),
            ho_ten: hoTen,
            truong_hoc: truongHoc,
            vi_tri: viTri,
            anh_dai_dien: finalAvatarUrl,
          };
        }

        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserObject));

        setUserInfo(updatedUserObject);
        setHoTen(updatedUserObject.ho_ten || '');
        setTruongHoc(updatedUserObject.truong_hoc || '');
        setViTri(updatedUserObject.vi_tri || '');
        setAvatar(updatedUserObject.anh_dai_dien || null);
        setAvatarFile(null);
      } else {
        Alert.alert('Cập nhật thất bại', responseData.message || 'Đã có lỗi xảy ra.');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật thông tin:', error);
      Alert.alert('Lỗi mạng', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // === DELETE ACCOUNT FUNCTIONS ===

  // 1. XÁC NHẬN XÓA (Alert đầu tiên)
  const handleDeleteAccount = (): void => {
    if (!userInfo) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài khoản.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa tài khoản',
      `Bạn có chắc chắn muốn xóa tài khoản "${userInfo.email || userInfo.ten_dang_nhap}"?\n\n` +
        'Hành động này sẽ:\n' +
        '• Xóa vĩnh viễn tất cả dữ liệu cá nhân\n' +
        '• Xóa bài viết, bình luận của bạn\n' +
        '• Không thể khôi phục lại\n\n' +
        `Tên: ${userInfo.ho_ten || 'Không xác định'}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục xóa',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ],
      { cancelable: true },
    );
  };

  // 2. NHẬP MẬT KHẨU VÀ XÓA
  const performAccountDeletion = async (): Promise<void> => {
    if (!userInfo) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tài khoản.');
      return;
    }

    if (!deletePassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu để xác nhận xóa.');
      return;
    }

    if (deletePassword.trim().length < 0) {
      Alert.alert('Cảnh Báo', 'Bạn chưa nhập ký tự nào trong mật khẩu.');
      return;
    }

    setIsDeleting(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = userInfo.ID_NguoiDung;

      // GỌI API DELETE VỚI PASSWORD VERIFICATION
      console.log(`Đang xóa user ID: ${userId}`);

      const deleteResponse = await fetch(`${API_BASE_URL}/api/nguoidung/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mat_khau: deletePassword.trim(),
        }),
      });

      const deleteData = await deleteResponse.json();

      console.log('API Response Status:', deleteResponse.status);
      console.log('API Response Data:', deleteData);

      if (deleteResponse.ok && deleteData.success) {
        // XÓA THÀNH CÔNG
        console.log('Đang xóa local storage...');

        const storageKeysToRemove = [
          'userToken',
          'userInfo',
          'cart',
          'preferences',
          'session',
          'notifications',
        ];

        // Xóa tất cả local data
        await Promise.allSettled(
          storageKeysToRemove.map((key) =>
            AsyncStorage.removeItem(key).catch((err) => {
              console.warn(`Không thể xóa ${key}:`, err);
            }),
          ),
        );

        console.log('Đã xóa tất cả local data');

        // Đóng modal trước khi show alert
        setShowDeleteModal(false);
        setDeletePassword('');

        // Hiển thị thông báo thành công
        Alert.alert(
          'Xóa tài khoản thành công',
          `Tài khoản "${deleteData.data?.deletedEmail || userInfo.email}" đã được xóa vĩnh viễn.\n\n` +
            'Tất cả dữ liệu liên quan đã được xóa hoàn toàn.\n\n' +
            'Cảm ơn bạn đã sử dụng ứng dụng!',
          [
            {
              text: 'Về trang chính',
              onPress: () => {
                setUserInfo(null);
                router.replace('/(tabs)/caidat');
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        // LỖI TỪ API
        console.error('API Delete failed:', deleteData);

        let errorMessage = 'Có lỗi xảy ra khi xóa tài khoản.';

        // Xử lý các loại lỗi cụ thể
        if (deleteResponse.status === 401) {
          errorMessage = 'Mật khẩu xác nhận không chính xác.\n\nVui lòng kiểm tra lại mật khẩu.';
        } else if (deleteResponse.status === 403) {
          errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
        } else if (deleteResponse.status === 404) {
          errorMessage = 'Tài khoản không tồn tại hoặc đã bị xóa.';
        } else if (deleteData.message) {
          errorMessage = deleteData.message;
        }

        Alert.alert('Không thể xóa tài khoản', errorMessage, [
          { text: 'Thử lại', style: 'default' },
          { text: 'Hủy', style: 'cancel' },
        ]);
      }
    } catch (error) {
      // LỖI NETWORK
      console.error('Network error khi xóa tài khoản:', error);

      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ.\n\n' +
          'Vui lòng kiểm tra:\n' +
          '• Kết nối internet\n' +
          '• Trạng thái server\n\n' +
          'Sau đó thử lại.',
        [
          {
            text: 'Thử lại',
            onPress: performAccountDeletion,
            style: 'default',
          },
          {
            text: 'Hủy',
            style: 'cancel',
          },
        ],
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. HỦY XÓA
  const cancelDeletion = (): void => {
    setShowDeleteModal(false);
    setDeletePassword('');
  };

  // === RENDER ===
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#791228" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isDeleting}
          >
            <Text style={{ color: '#fffcef', fontSize: 24 }}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        </View>

        {/* PROFILE HEADER */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: avatar || 'https://i.pravatar.cc/150' }}
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.cameraButtonOverlay}
              onPress={pickImage}
              disabled={isSaving || isDeleting}
            >
              <Ionicons name="camera" size={22} color="#791228" />
            </TouchableOpacity>
          </View>
          
          {/* Điểm hiện tại */}
          <View style={styles.pointsContainer}>
            <View style={styles.pointsCard}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.pointsLabel}>Điểm hiện tại</Text>
              <Text style={styles.pointsValue}>{userInfo?.diem_so || 0}</Text>
            </View>
          </View>
        </View>

        {/* FORM */}
        <View style={styles.formWrapper}>
          <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
          <View style={styles.formContainer}>
            {/* Họ và tên */}
            <View style={styles.inputItem}>
              <TextInput
                style={styles.inputField}
                placeholder="Họ và tên"
                value={hoTen}
                onChangeText={setHoTen}
                editable={!isSaving && !isDeleting}
              />
            </View>

            {/* Email (chỉ đọc) */}
            <View style={styles.inputItem}>
              <TextInput
                style={[styles.inputField, styles.readOnly]}
                value={userInfo?.email || ''}
                editable={false}
              />
            </View>

            {/* Tên đăng nhập (chỉ đọc) */}
            <View style={styles.inputItem}>
              <TextInput
                style={[styles.inputField, styles.readOnly]}
                value={userInfo?.ten_dang_nhap || ''}
                editable={false}
              />
            </View>

            {/* Trường học */}
            <View style={styles.inputItem}>
              <TextInput
                style={styles.inputField}
                placeholder="Trường học"
                value={truongHoc}
                onChangeText={setTruongHoc}
                editable={!isSaving && !isDeleting}
              />
            </View>

            {/* Vị trí */}
            <View style={styles.inputItem}>
              <TextInput
                style={styles.inputField}
                placeholder="Vị trí"
                value={viTri}
                onChangeText={setViTri}
                editable={!isSaving && !isDeleting}
              />
            </View>
          </View>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          style={[styles.saveButton, (isSaving || isDeleting) && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaving || isDeleting}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>LƯU THAY ĐỔI</Text>
          )}
        </TouchableOpacity>

        {/* DANGER ZONE */}
        <View style={styles.dangerZoneWrapper}>
          <Text style={[styles.sectionTitle, isDeleting && styles.disabledText]}>
            Khu vực nguy hiểm
          </Text>

          <View style={[styles.dangerZoneContainer, isDeleting && styles.deletingContainer]}>
            <Text style={[styles.dangerText, isDeleting && { color: '#ff6b6b' }]}>
              {isDeleting
                ? 'Đang xử lý xóa tài khoản...'
                : 'Xóa tài khoản sẽ xóa VĨNH VIỄN tất cả dữ liệu liên quan.'}
            </Text>

            {isDeleting ? (
              <View style={styles.deletingIndicator}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.deletingText}>Đang xóa...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.deleteButton, isDeleting && styles.disabledButton]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteButtonText}>XÓA TÀI KHOẢN</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={cancelDeletion}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <View style={styles.warningIconContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
              </View>
              <Text style={styles.modalTitle}>Xác nhận xóa tài khoản</Text>
              <TouchableOpacity onPress={cancelDeletion} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* MODAL BODY */}
            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Bạn đang chuẩn bị xóa tài khoản{' '}
                <Text style={styles.highlightText}>
                  "{userInfo?.email || userInfo?.ten_dang_nhap}"
                </Text>
              </Text>

              <Text style={styles.warningText}>Hành động này sẽ:</Text>

              <View style={styles.warningList}>
                <View style={styles.warningItem}>
                  <Text style={styles.warningBullet}>•</Text>
                  <Text style={styles.warningDetail}>Xóa vĩnh viễn tất cả dữ liệu cá nhân</Text>
                </View>
                <View style={styles.warningItem}>
                  <Text style={styles.warningBullet}>•</Text>
                  <Text style={styles.warningDetail}>Xóa bài viết, bình luận của bạn</Text>
                </View>
                <View style={styles.warningItem}>
                  <Text style={styles.warningBullet}>•</Text>
                  <Text style={styles.warningDetail}>Không thể khôi phục dữ liệu</Text>
                </View>
              </View>

              <TextInput
                style={[styles.passwordInput, !deletePassword.trim() && styles.invalidPassword]}
                placeholder="Nhập mật khẩu hiện tại để xác nhận"
                placeholderTextColor="#999"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                autoCapitalize="none"
                editable={!isDeleting}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={performAccountDeletion}
              />

              {deletePassword.length > 0 && (
                <Text
                  style={[
                    styles.passwordValidation,
                    deletePassword.trim().length >= 3
                      ? styles.validPassword
                      : styles.invalidPassword,
                  ]}
                >
                  {deletePassword.trim().length >= 3
                    ? 'Mật khẩu đã nhập'
                    : 'Vui lòng nhập mật khẩu hiện tại'}
                </Text>
              )}
            </View>

            {/* MODAL FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelDeletion}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>HỦY BỎ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.deleteConfirmButton,
                  (!deletePassword.trim() || deletePassword.trim().length < 3 || isDeleting) &&
                    styles.disabledButton,
                  (!deletePassword.trim() || isDeleting) && styles.disabledButton,
                ]}
                onPress={performAccountDeletion}
                disabled={!deletePassword.trim() || deletePassword.trim().length < 3 || isDeleting}
                disabled={!deletePassword.trim() || isDeleting}
                activeOpacity={0.7}
              >
                {isDeleting ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingButtonText}>ĐANG XÓA...</Text>
                  </View>
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>XÓA VĨNH VIỄN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffcef',
  },
  loadingText: {
    marginTop: 10,
    color: '#791228',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#791228',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fffcef',
    marginRight: 34,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pointsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pointsLabel: {
    color: '#fffcef',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
  },
  pointsValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
  },
  cameraButtonOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#fffcef',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#791228',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fffcef',
    marginBottom: 10,
  },
  changePhotoText: {
    color: '#fffcef',
    fontSize: 16,
    opacity: 0.9,
    fontWeight: '500',
  },
  disabledText: {
    opacity: 0.5,
  },
  formWrapper: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fffcef',
    opacity: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  formContainer: {
    backgroundColor: '#fffcef',
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  inputItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 55,
    justifyContent: 'center',
  },
  inputField: {
    color: '#791228',
    fontSize: 16,
  },
  readOnly: {
    color: '#999',
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 30,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#5abf83',
    alignItems: 'center',
    height: 55,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerZoneWrapper: {
    marginHorizontal: 20,
    marginVertical: 40,
  },
  dangerZoneContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  deletingContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  dangerText: {
    color: '#fffcef',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 21,
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deletingIndicator: {
    alignItems: 'center',
    marginTop: 15,
  },
  deletingText: {
    color: '#fff',
    marginTop: 5,
    fontSize: 14,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe6e6',
  },
  warningIconContainer: {
    marginRight: 10,
  },
  warningIcon: {
    fontSize: 24,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d63384',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    paddingTop: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#d63384',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningList: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  warningBullet: {
    color: '#d63384',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  warningDetail: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  passwordInput: {
    borderWidth: 2,
    borderColor: '#e74c3c',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  invalidPassword: {
    borderColor: '#6c757d',
  },
  passwordValidation: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  validPassword: {
    color: '#28a745',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    backgroundColor: '#e74c3c',
  },
  deleteConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
