import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { FontAwesome5, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

// === TYPES & INTERFACES ===
interface LoginResponse {
  token: string;
  user: {
    ID_NguoiDung: number;
    ho_ten?: string;
    email?: string;
    ten_dang_nhap?: string;
    da_xac_thuc?: number;
  };
}

interface LoginFormData {
  email: string;
  mat_khau: string;
}

interface UserInfo {
  ID_NguoiDung: number;
  ho_ten?: string;
  truong_hoc?: string;
  vi_tri?: string;
  anh_dai_dien?: string;
  email?: string;
  ten_dang_nhap?: string;
  da_xac_thuc?: number;
}

// === CONSTANTS ===
const COLORS = {
  primaryRed: '#791228',
  primaryWhite: '#fffcef',
  accentGreen: '#5abf83',
  white: '#ffffff',
  googleRed: '#DB4437',
  facebookBlue: '#3b5998',
  zaloGreen: '#008000',
} as const;

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const API_URL = `${API_BASE_URL}/api/nguoidung/login`;

// === COMPONENT PROPS ===
interface LoginScreenProps {
  // Có thể thêm props nếu cần trong tương lai
}

// === MAIN COMPONENT ===
export default function LoginScreen({}: LoginScreenProps): React.JSX.Element {
  // === STATE ===
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordSecure, setIsPasswordSecure] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // === HANDLERS ===
  const handleLogin = async (): Promise<void> => {
    // Validation
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Thiếu thông tin',
        text2: 'Vui lòng nhập cả email và mật khẩu.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const loginData: LoginFormData = {
        email: email.trim(),
        mat_khau: password,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data: LoginResponse | { message?: string } = await response.json();

      if (response.ok && 'token' in data && data.token) {
        // Đăng nhập thành công
        const { token, user } = data as LoginResponse;

        await Promise.all([
          AsyncStorage.setItem('userToken', token),
          AsyncStorage.setItem('userInfo', JSON.stringify(user)),
        ]);

        // Hiển thị thông báo thành công
        const userName = user.ho_ten || user.email || 'người dùng';
        Toast.show({
          type: 'success',
          text1: 'Đăng nhập thành công!',
          text2: `Chào mừng trở lại, ${userName} 👋`,
        });

        // Điều hướng sau 1.5s
        setTimeout(() => {
          router.replace('/caidat');
        }, 1500);
      } else {
        // Lỗi từ server
        const errorMessage = 'message' in data ? data.message : 'Email hoặc mật khẩu không đúng.';
        Toast.show({
          type: 'error',
          text1: 'Đăng nhập thất bại',
          text2: errorMessage,
        });
      }
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi kết nối',
        text2: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (): void => {
    if (!isLoading) {
      Toast.show({
        type: 'info',
        text1: 'Thông báo',
        text2: 'Chức năng này đang được phát triển.',
      });
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook' | 'zalo'): void => {
    if (!isLoading) {
      Toast.show({
        type: 'info',
        text1: 'Thông báo',
        text2: `Đăng nhập với ${provider} đang được phát triển.`,
      });
    }
  };

  const togglePasswordVisibility = (): void => {
    setIsPasswordSecure(!isPasswordSecure);
  };

  // === RENDER ===
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Logo */}
      <Text style={styles.logo}>OLODO</Text>

      {/* Form đăng nhập */}
      <View style={styles.formContainer}>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <FontAwesome name="user" size={20} color={COLORS.primaryRed} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Email"
            placeholderTextColor={COLORS.primaryRed}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text: string) => setEmail(text)}
            editable={!isLoading}
            selectTextOnFocus={!isLoading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={22} color={COLORS.primaryRed} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="Mật khẩu"
            placeholderTextColor={COLORS.primaryRed}
            secureTextEntry={isPasswordSecure}
            value={password}
            onChangeText={(text: string) => setPassword(text)}
            editable={!isLoading}
            selectTextOnFocus={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={togglePasswordVisibility}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name={isPasswordSecure ? 'eye-slash' : 'eye'}
              size={20}
              color={COLORS.primaryRed}
            />
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Links */}
      <View style={styles.linksContainer}>
        <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading} activeOpacity={0.7}>
          <Text style={styles.linkText}>Quên mật khẩu?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => !isLoading && router.push('/components/CaiDat/dangky')}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>Tạo tài khoản mới</Text>
        </TouchableOpacity>
      </View>

      {/* Social Login */}
      <View style={styles.socialLoginContainer}>
        <Text style={styles.orText}>Hoặc đăng nhập với</Text>
        <View style={styles.socialIcons}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('google')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <FontAwesome name="google" size={24} color={COLORS.googleRed} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('facebook')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="facebook" size={24} color={COLORS.facebookBlue} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => handleSocialLogin('zalo')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <FontAwesome name="phone" size={24} color={COLORS.zaloGreen} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// === STYLES ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryRed,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    fontFamily: 'Oughter',
    fontSize: 130,
    color: COLORS.primaryWhite,
    textAlign: 'center',
    lineHeight: 115,
    marginTop: 70,
    marginBottom: 50,
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
    borderColor: COLORS.primaryWhite,
    borderRadius: 12,
    backgroundColor: COLORS.primaryWhite,
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
  loginButton: {
    width: '100%',
    padding: 15,
    borderRadius: 12,
    backgroundColor: COLORS.accentGreen,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linksContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 15,
  },
  linkText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  socialLoginContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  orText: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 15,
    opacity: 0.8,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 20,
  },
  socialButton: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 50,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
