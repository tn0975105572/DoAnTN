import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

// === TYPES & INTERFACES ===
interface UserInfo {
  ID_NguoiDung: number;
  ho_ten?: string;
  email?: string;
  ten_dang_nhap?: string;
  da_xac_thuc?: number;
}

// === CẬP NHẬT INTERFACE ===
// Thêm 'mat_khau_cu' để gửi lên API
interface UpdatePasswordFormData {
  mat_khau_cu: string;
  mat_khau: string; // Mật khẩu mới
}

// === CONSTANTS ===
const COLORS = {
  primaryRed: '#7f001f',
  primaryWhite: '#fffcef',
  accentGreen: '#5abf83',
  white: '#ffffff',
  gray: '#a9a9a9',
  lightGray: '#f0f0f0',
} as const;

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

// === MAIN COMPONENT ===
export default function UpdatePasswordScreen(): React.JSX.Element {
  // === CẬP NHẬT STATE ===
  const [oldPassword, setOldPassword] = useState<string>(''); // Thêm state cho mật khẩu cũ
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [isOldSecure, setIsOldSecure] = useState<boolean>(true); // Thêm state ẩn/hiện
  const [isPasswordSecure, setIsPasswordSecure] = useState<boolean>(true);
  const [isConfirmSecure, setIsConfirmSecure] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // === EFFECTS ===
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        if (userInfoString) {
          setUserInfo(JSON.parse(userInfoString) as UserInfo);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Lỗi xác thực',
            text2: 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
          });
          router.replace('/components/CaiDat/dangnhap');
        }
      } catch (error) {
        console.error('Lỗi lấy userInfo từ AsyncStorage:', error);
      }
    };

    fetchUserData();
  }, []);

  // === HANDLERS ===
  // === CẬP NHẬT HANDLER ===
  const handleUpdatePassword = async (): Promise<void> => {
    // 1. Validation
    // Thêm check cho 'oldPassword'
    if (!oldPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: 'Vui lòng nhập đầy đủ 3 trường mật khẩu.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Mật khẩu không khớp',
        text2: 'Mật khẩu mới và xác nhận không giống nhau.',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'info',
        text1: 'Mật khẩu yếu',
        text2: 'Mật khẩu mới nên có ít nhất 6 ký tự.',
      });
      return;
    }

    if (!userInfo) {
      Toast.show({
        type: 'error',
        text1: 'Lỗi người dùng',
        text2: 'Không thể xác định người dùng. Vui lòng thử lại.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Lấy token để xác thực
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi xác thực',
          text2: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        });
        router.replace('/components/CaiDat/dangnhap');
        return;
      }

      // 3. Chuẩn bị gọi API
      const API_URL = `${API_BASE_URL}/api/nguoidung/update/${userInfo.ID_NguoiDung}`;

      // === CẬP NHẬT PAYLOAD ===
      // Thêm 'mat_khau_cu'
      const payload: UpdatePasswordFormData = {
        mat_khau_cu: oldPassword, // Đây là key tôi giả định
        mat_khau: newPassword,
      };

      // 4. Gọi API
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // 5. Xử lý thành công
        Toast.show({
          type: 'success',
          text1: 'Thành công!',
          text2: 'Đã cập nhật mật khẩu mới.',
        });

        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/caidat');
          }
        }, 1500);
      } else {
        // 6. Xử lý lỗi từ server (ví dụ: mật khẩu cũ không đúng)
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Cập nhật thất bại',
          text2: errorData.message || 'Mật khẩu cũ không đúng hoặc có lỗi xảy ra.',
        });
      }
    } catch (error) {
      // 7. Xử lý lỗi mạng
      console.error('Lỗi cập nhật mật khẩu:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi kết nối',
        text2: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // === CẬP NHẬT HANDLER ===
  // Thêm 'old' vào logic
  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm'): void => {
    if (field === 'old') {
      setIsOldSecure(!isOldSecure);
    } else if (field === 'new') {
      setIsPasswordSecure(!isPasswordSecure);
    } else {
      setIsConfirmSecure(!isConfirmSecure);
    }
  };

  // === RENDER ===
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.iconHeader}>
        <FontAwesome5 name="key" size={80} color={COLORS.primaryRed} />
      </View>

      <Text style={styles.title}>Đổi Mật Khẩu</Text>
      {/* Cập nhật subtitle */}
      <Text style={styles.subtitle}>Nhập mật khẩu cũ và mật khẩu mới để thay đổi.</Text>

      {/* Form cập nhật */}
      <View style={styles.formContainer}>
        {/* === THÊM MỚI: Old Password Input === */}
        <View style={styles.inputContainer}>
          <FontAwesome
            name="history"
            size={20}
            color={COLORS.primaryRed}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.inputField}
            placeholder="Mật khẩu cũ"
            placeholderTextColor={COLORS.gray}
            secureTextEntry={isOldSecure}
            value={oldPassword}
            onChangeText={setOldPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => togglePasswordVisibility('old')}
            disabled={isLoading}
          >
            <FontAwesome5
              name={isOldSecure ? 'eye-slash' : 'eye'}
              size={20}
              color={COLORS.primaryRed}
            />
          </TouchableOpacity>
        </View>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={22} color={COLORS.primaryRed} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Mật khẩu mới"
            placeholderTextColor={COLORS.gray}
            secureTextEntry={isPasswordSecure}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => togglePasswordVisibility('new')}
            disabled={isLoading}
          >
            <FontAwesome5
              name={isPasswordSecure ? 'eye-slash' : 'eye'}
              size={20}
              color={COLORS.primaryRed}
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={22} color={COLORS.primaryRed} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Xác nhận mật khẩu mới"
            placeholderTextColor={COLORS.gray}
            secureTextEntry={isConfirmSecure}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => togglePasswordVisibility('confirm')}
            disabled={isLoading}
          >
            <FontAwesome5
              name={isConfirmSecure ? 'eye-slash' : 'eye'}
              size={20}
              color={COLORS.primaryRed}
            />
          </TouchableOpacity>
        </View>

        {/* Update Button */}
        <TouchableOpacity
          style={[styles.updateButton, isLoading && styles.disabledButton]}
          onPress={handleUpdatePassword}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.updateButtonText}>{isLoading ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// === STYLES ===
// (Không thay đổi styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryWhite,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconHeader: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: COLORS.lightGray,
    borderRadius: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryRed,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.primaryRed,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
    width: 22,
    textAlign: 'center',
  },
  inputField: {
    flex: 1,
    paddingVertical: 15,
    color: COLORS.primaryRed,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  updateButton: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.primaryRed,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
    opacity: 0.7,
  },
  updateButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
