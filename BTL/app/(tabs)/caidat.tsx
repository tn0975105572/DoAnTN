import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { normalizeBackendMediaUrl } from '../../utils/mediaUrl';

const API_BASE_URL = Constants.expoConfig!.extra!.apiUrl as string;

// LoginPrompt
const LoginPrompt = ({ onLoginPress, onRegisterPress }) => (
  <View style={styles.promptContainer}>
    <Image
      source={{ uri: 'https://img.icons8.com/plasticine/100/user-male-circle.png' }}
      style={styles.promptIcon}
    />
    <Text style={styles.promptTitle}>Trải nghiệm tốt hơn!</Text>
    <Text style={styles.promptSubtitle}>
      Đăng nhập để lưu các cài đặt và thông tin cá nhân của bạn.
    </Text>
    <View style={styles.buttonGroup}>
      <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={onLoginPress}>
        <Text style={styles.buttonText}>Đăng nhập</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={onRegisterPress}>
        <Text style={[styles.buttonText, styles.registerButtonText]}>Đăng ký</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// VerificationStatus
const VerificationStatus = ({ isVerified, onPress }) => {
  const iconName = isVerified ? 'checkmark-circle' : 'shield-checkmark-outline';
  const color = isVerified ? '#4CAF50' : '#FF9800';
  const statusText = isVerified ? 'Đã xác thực' : 'Chưa xác thực';
  const backgroundColor = isVerified ? '#E8F5E8' : '#FFF3E0';
  const borderColor = isVerified ? '#4CAF50' : '#FF9800';
  return (
    <TouchableOpacity
      style={[styles.verificationContainer, { backgroundColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={iconName} size={20} color={color} />
      <Text style={[styles.verificationText, { color }]}>{statusText}</Text>
      {!isVerified && <Ionicons name="chevron-forward" size={16} color="#aaa" />}
    </TouchableOpacity>
  );
};

// 👑 VipBadge - nhãn nhỏ cạnh tên
const VipBadge = ({ isVip, vipExpiry }) => {
  if (!isVip) return null;
  const expiryDate = vipExpiry ? new Date(vipExpiry) : null;
  if (!expiryDate || expiryDate <= new Date()) return null;
  return (
    <View style={styles.vipBadge}>
      <Ionicons name="diamond" size={11} color="#FFD700" />
      <Text style={styles.vipBadgeText}>VIP</Text>
    </View>
  );
};

// ✨ VipBanner - card nổi bật trên nền sáng
const VipBanner = ({ vipExpiry }) => {
  const expiryDate = vipExpiry ? new Date(vipExpiry) : null;
  if (!expiryDate || expiryDate <= new Date()) return null;
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
  return (
    <View style={styles.vipBanner}>
      {/* Dải vàng trên */}
      <View style={styles.vipBannerTopStripe} />
      <View style={styles.vipBannerBody}>
        {/* Icon vòng tròn vàng */}
        <View style={styles.vipBannerIcon}>
          <Ionicons name="diamond" size={28} color="#B8860B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.vipBannerTitle}>👑 Tài khoản VIP</Text>
          <Text style={styles.vipBannerSub}>
            Còn {daysLeft} ngày • Hết hạn {expiryDate.toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.vipBannerTag}>
          <Text style={styles.vipBannerTagText}>VIP</Text>
        </View>
      </View>
    </View>
  );
};

// UserProfile
const UserProfile = ({
  name, email, avatar, isVerified, isVip, vipExpiry, points, onEditPress, onVerificationPress
}) => {
  const isVipActive = isVip && vipExpiry && new Date(vipExpiry) > new Date();
  const avatarBorder = isVipActive ? '#FFD700' : isVerified ? '#4CAF50' : '#FF9800';
  return (
    <View style={[styles.profileSection, isVipActive && styles.profileSectionVip]}>
      <TouchableOpacity style={styles.avatarContainer} onPress={onEditPress} activeOpacity={0.7}>
        <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: avatarBorder }]} />
        <View style={styles.avatarOverlay}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </View>
      </TouchableOpacity>
      <View style={styles.profileInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={styles.name}>{name}</Text>
          <VipBadge isVip={isVip} vipExpiry={vipExpiry} />
        </View>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.pointsContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.pointsText}>{points || 0} điểm</Text>
        </View>
      </View>
      <View style={styles.profileActions}>
        <VerificationStatus isVerified={isVerified} onPress={onVerificationPress} />
        <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={20} color="#7f001f" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// SettingsItem
const SettingsItem = ({ icon, label, isSwitch = false, switchValue, onSwitchChange, onPress }: {
  icon: any; label: string; isSwitch?: boolean; switchValue?: boolean; onSwitchChange?: () => void; onPress?: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={styles.settingItem} disabled={isSwitch}>
    <Ionicons name={icon} size={22} color="#555" style={styles.settingIcon} />
    <Text style={styles.settingText}>{label}</Text>
    {isSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#ccc', true: '#7f001f' }}
        thumbColor="#fff"
      />
    ) : (
      <Ionicons name="chevron-forward" size={22} color="#aaa" />
    )}
  </TouchableOpacity>
);

// SettingsSection
const SettingsSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

// === COMPONENT CHÍNH ===
const AccountScreen = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isVipActive = !!(userInfo?.la_vip === 1 && userInfo?.ngay_het_han_vip && new Date(userInfo.ngay_het_han_vip) > new Date());

  useFocusEffect(
    useCallback(() => {
      const checkLoginStatus = async () => {
        setIsLoading(true);
        try {
          const userJson = await AsyncStorage.getItem('userInfo');
          const token = await AsyncStorage.getItem('userToken');
          if (userJson !== null) {
            const userData = JSON.parse(userJson);
            // 🔥 Gọi API để lấy điểm mới nhất từ database
            if (userData.ID_NguoiDung && token) {
              try {
                const res = await fetch(
                  `${API_BASE_URL}/api/nguoidung/get/${userData.ID_NguoiDung}?_t=${Date.now()}`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Cache-Control': 'no-cache, no-store, must-revalidate',
                      'Pragma': 'no-cache',
                    },
                  }
                );
                if (res.ok) {
                  const data = await res.json();
                  // API trả về { success: true, user: {...} }
                  const latestUser = data.user || data;
                  setUserInfo(latestUser);
                  const verificationStatus = latestUser.da_xac_thuc === 1;
                  setIsVerified(verificationStatus);
                  await AsyncStorage.setItem('userInfo', JSON.stringify(latestUser));
                  return; // Done, skip fallback
                }
              } catch (e) {
                console.error('Error fetching fresh user data:', e);
              }
            }
            // Fallback: dùng cache nếu API fail
            setUserInfo(userData);
            const verificationStatus = userData.da_xac_thuc === 1;
            setIsVerified(verificationStatus);
          } else {
            setUserInfo(null);
            setIsVerified(false);
          }
        } catch (error) {
          console.error('Lỗi khi đọc dữ liệu từ AsyncStorage:', error);
          setUserInfo(null);
          setIsVerified(false);
        } finally {
          setIsLoading(false);
        }
      };

      checkLoginStatus();
    }, []),
  );

  const handleLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userInfo');
            setUserInfo(null);
            setIsVerified(false);
          } catch (error) {
            console.error('Lỗi khi đăng xuất:', error);
            Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi đăng xuất.');
          }
        },
      },
    ]);
  };

  const handleVerificationPress = () => {
    if (isVerified) {
      Alert.alert(
        'Tài khoản đã được xác thực',
        'Tài khoản của bạn đã được xác thực thành công với CCCD gắn chip.',
        [{ text: 'Đóng' }],
      );
    } else {
      Alert.alert(
        'Xác thực tài khoản',
        'Xác thực CCCD giúp bảo vệ tài khoản của bạn. Bạn có muốn xác thực ngay?',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Xác thực ngay',
            onPress: () => router.push('/components/CaiDat/Xacminh/xacminh'),
          },
        ],
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#fffcef' }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7f001f" />
          <Text style={styles.loadingText}>Đang tải thông tin tài khoản...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffcef" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Tài khoản</Text>

        {userInfo ? (
          <UserProfile
            name={userInfo.ho_ten || userInfo.name || 'Người dùng'}
            email={userInfo.email || userInfo.ten_dang_nhap || 'Không có email'}
            avatar={normalizeBackendMediaUrl(userInfo.anh_dai_dien) || 'https://i.pravatar.cc/150'}
            isVerified={isVerified}
            isVip={userInfo.la_vip === 1}
            vipExpiry={userInfo.ngay_het_han_vip}
            points={userInfo.diem_so}
            onEditPress={() => router.push('/caidat/thongtincanhan')}
            onVerificationPress={handleVerificationPress}
          />
        ) : (
          <LoginPrompt
            onLoginPress={() => router.push('/components/CaiDat/dangnhap')}
            onRegisterPress={() => router.push('/components/CaiDat/dangky')}
          />
        )}

        {/* 👑 VIP Banner - sau ô thông tin tài khoản */}
        {isVipActive && <VipBanner vipExpiry={userInfo?.ngay_het_han_vip} />}

        {userInfo && (
          <SettingsSection title="Tài khoản">
            <SettingsItem
              icon="person-outline"
              label="Thông tin cá nhân"
              onPress={() => router.push('/components/CaiDat/thongtincanhan')}
            />
            {/* 👑 VIP */}
            <TouchableOpacity
              style={[
                styles.settingItem,
                isVipActive ? styles.vipItemActive : null,
              ]}
              onPress={() =>
                Alert.alert(
                  isVipActive ? '👑 Bạn đang là VIP' : '👑 Nâng cấp VIP',
                  isVipActive
                    ? `Gói VIP của bạn còn hiệu lực đến: ${new Date(userInfo.ngay_het_han_vip).toLocaleDateString('vi-VN')}`
                    : 'Nâng cấp VIP để trải nghiệm đầy đủ tính năng cao cấp!',
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="diamond-outline"
                size={22}
                color={isVipActive ? '#B8860B' : '#555'}
                style={styles.settingIcon}
              />
              <Text style={[
                styles.settingText,
                isVipActive ? { color: '#B8860B', fontWeight: '700' } : null,
              ]}>
                {isVipActive
                  ? `VIP · Hết hạn ${new Date(userInfo.ngay_het_han_vip).toLocaleDateString('vi-VN')}`
                  : 'Nâng cấp VIP'}
              </Text>
              <Ionicons name="chevron-forward" size={22} color="#aaa" />
            </TouchableOpacity>
            <SettingsItem icon="star-outline" label="Tích điểm & Lịch sử" onPress={() => router.push('/components/CaiDat/tichdiem')} />
            <SettingsItem icon="play-circle-outline" label="Xem Video Kiếm Điểm" onPress={() => router.push('/components/CaiDat/xemvideo')} />
            <SettingsItem icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => router.push('/components/CaiDat/capnhatmk')} />
            <SettingsItem icon="scan-outline" label="Quét mã QR đăng nhập web" onPress={() => router.push('/scanner')} />
            <SettingsItem icon="shield-checkmark-outline" label="Xác thực 2 yếu tố" onPress={() => router.push('/components/CaiDat/Xacminh/xacminh')} />
          </SettingsSection>
        )}

        <SettingsSection title="Cài đặt chung">
          <SettingsItem icon="language-outline" label="Ngôn ngữ" onPress={() => Alert.alert('Thông báo', 'Chức năng Ngôn ngữ đang được phát triển.')} />
          <SettingsItem icon="contrast-outline" label="Chế độ tối" isSwitch switchValue={isDarkMode} onSwitchChange={() => setIsDarkMode(!isDarkMode)} />
          <SettingsItem icon="help-circle-outline" label="Hỗ trợ & Góp ý" onPress={() => Alert.alert('Thông báo', 'Chức năng Hỗ trợ đang được phát triển.')} />
        </SettingsSection>

        {userInfo && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// === STYLESHEET ĐÃ CẬP NHẬT ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffcef', // ✅ Trả lại màu nền chủ đạo
  },
  content: {
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  // (Giữ nguyên style gốc của bạn)
  promptContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    borderColor: '#eee',
    borderWidth: 1,
  },
  promptIcon: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  promptSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#7f001f', // ✅ Màu chủ đạo
    marginRight: 5,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7f001f', // ✅ Màu chủ đạo
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  registerButtonText: {
    color: '#7f001f', // ✅ Màu chủ đạo
  },

  // --- Profile Section (Đã cập nhật) ---
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15, // Giảm padding một chút để avatar to hơn
    borderRadius: 16,
    borderColor: '#eee',
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15, // Thêm khoảng cách
  },
  avatar: {
    width: 70, // ✅ Tăng kích thước
    height: 70, // ✅ Tăng kích thước
    borderRadius: 35, // ✅ Tăng kích thước
    borderWidth: 3,
    borderColor: '#ddd',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7f001f', // ✅ Màu chủ đạo
    borderRadius: 15,
    padding: 5, // ✅ Tăng kích thước
  },
  profileInfo: {
    flex: 1, // Để chiếm hết không gian còn lại
    justifyContent: 'center',
  },
  name: {
    fontSize: 20, // ✅ Tăng kích thước
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4, // ✅ Tăng khoảng cách
  },
  email: {
    fontSize: 15, // ✅ Tăng kích thước
    color: '#888',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  pointsText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Nhóm các action bên phải
  profileActions: {
    alignItems: 'flex-end',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    // marginRight: 10, // Bỏ
  },
  verificationText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginTop: 8, // Thêm khoảng cách
  },
  // --- (Kết thúc Profile Section) ---

  // --- VIP Banner (nền đen sang trọng) ---
  vipBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#B8860B',
    backgroundColor: '#0D0D0D',
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  vipBannerTopStripe: {
    height: 3,
    backgroundColor: '#FFD700',
  },
  vipBannerBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  vipBannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A1A00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8860B',
  },
  vipBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.4,
  },
  vipBannerSub: {
    fontSize: 12,
    color: '#C9A84C',
    marginTop: 3,
  },
  vipBannerTag: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  vipBannerTagText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  // --- VIP Badge (inline cạnh tên) ---
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3C4',
    borderWidth: 1,
    borderColor: '#D4AF37',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    gap: 4,
  },
  vipBadgeText: {
    color: '#7A5800',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileSectionVip: {
    borderColor: '#D4AF37',
    borderWidth: 1.5,
  },
  vipItemActive: {
    backgroundColor: '#FFFBEA',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },

  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
    paddingLeft: 5,
  },
  sectionBody: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#eee',
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingIcon: {
    marginRight: 15,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  // ✅ Trả lại style nút Đăng xuất (như code gốc của bạn)
  logoutButton: {
    backgroundColor: '#fff',
    borderColor: '#e74c3c',
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountScreen;
