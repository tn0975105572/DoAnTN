import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Dimensions,
  AppState
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE_URL = Constants.expoConfig!.extra!.apiUrl as string;
const { width } = Dimensions.get('window');

interface UserInfo {
  ID_NguoiDung: string;
  ho_ten?: string;
  diem_so?: number;
}

interface PointHistory {
  ID_LichSu: string;
  loai_giao_dich: string;
  diem_thay_doi: number;
  diem_truoc: number;
  diem_sau: number;
  mo_ta: string;
  thoi_gian_tao: string;
}

const TichDiemScreen = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTransId, setPendingTransId] = useState<string | null>(null);

  // Load user data from API (must be declared before handleDeepLink)
  // 🔥 LUÔN lấy điểm số từ API, không phụ thuộc vào AsyncStorage cho giá trị điểm
  const loadUserData = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');

      if (userJson) {
        const userData = JSON.parse(userJson);

        if (userData.ID_NguoiDung && token) {
          try {
            // 🔥 LUÔN gọi API để lấy điểm số mới nhất từ database
            const res = await fetch(`${API_BASE_URL}/api/nguoidung/getById/${userData.ID_NguoiDung}?_t=${Date.now()}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });

            if (res.ok) {
              const latestUser = await res.json();
              // 🔥 Cập nhật state với dữ liệu mới nhất từ API
              setUserInfo(latestUser);
              // Cập nhật AsyncStorage để đồng bộ (nhưng không dùng cho hiển thị điểm)
              await AsyncStorage.setItem('userInfo', JSON.stringify(latestUser));
              return;
            }
          } catch (e) {
            console.error('Error fetching user from API:', e);
          }
        }
        // Fallback: chỉ dùng cache nếu API fail
        setUserInfo(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  // Load point history from API (must be declared before handleDeepLink)
  const loadPointHistory = useCallback(async () => {
    if (!userInfo?.ID_NguoiDung) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `${API_BASE_URL}/api/lich_su_tich_diem/getByUserId/${userInfo.ID_NguoiDung}?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPointHistory(data);
      }
    } catch (error) {

    }
  }, [userInfo?.ID_NguoiDung]);

  // Xử lý Deep Link khi user quay lại từ ZaloPay
  const handleDeepLink = useCallback(async (url: string) => {

    // Parse URL: OLODO://payment-result?app_trans_id=xxx
    if (url.includes('payment-result')) {
      try {
        const urlObj = new URL(url);
        const appTransId = urlObj.searchParams.get('app_trans_id');

        if (!appTransId) {

          return;
        }

        // Lưu app_trans_id để có thể check sau
        setPendingTransId(appTransId);
        await AsyncStorage.setItem('pending_zalopay_trans_id', appTransId);

        // Lấy userId - ưu tiên từ state, fallback sang AsyncStorage
        let userId = userInfo?.ID_NguoiDung;
        if (!userId) {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            userId = parsed.ID_NguoiDung;
          }
        }

        if (!userId) {

          Alert.alert("Thông báo", "Đang xử lý thanh toán, vui lòng bấm 'Kiểm tra thanh toán' sau vài giây.");
          return;
        }

        // Gọi API check status (với userId để backend có thể cộng điểm)
        setIsProcessing(true);
        const token = await AsyncStorage.getItem('userToken');


        const response = await fetch(
          `${API_BASE_URL}/api/zalopay/order-status/${appTransId}?userId=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();


        // return_code: 1 = Thành công, 2 = Đang xử lý, 3 = Thất bại
        if (data.return_code === 1) {
          const pointsAdded = data.points_added || 0;
          const pointsMsg = pointsAdded ? `+${pointsAdded} điểm` : '';
          Alert.alert("Thanh toán thành công! 🎉", pointsMsg || "Điểm đã được cập nhật.");

          // 🔥 CẬP NHẬT ĐIỂM TRỰC TIẾP VÀO STATE NGAY LẬP TỨC
          if (pointsAdded > 0) {
            setUserInfo(prev => {
              if (!prev) return prev;
              const newPoints = (prev.diem_so || 0) + pointsAdded;
              // Cập nhật AsyncStorage với điểm mới
              const updatedUser = { ...prev, diem_so: newPoints };
              AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
              return updatedUser;
            });
          }

          // Xóa pending trans_id
          await AsyncStorage.removeItem('pending_zalopay_trans_id');
          setPendingTransId(null);
          // Reload point history
          await loadPointHistory();
        } else if (data.return_code === 3) {
          Alert.alert("Thanh toán thất bại", data.return_message || "Vui lòng thử lại.");
          await AsyncStorage.removeItem('pending_zalopay_trans_id');
          setPendingTransId(null);
        } else {
          // return_code = 2 hoặc khác = đang xử lý
          Alert.alert("Đang xử lý", "Giao dịch đang được xử lý. Bấm 'Kiểm tra thanh toán' sau vài giây.");
        }
      } catch (error) {

        Alert.alert("Lỗi", "Không thể kiểm tra trạng thái. Vui lòng thử lại.");
      } finally {
        setIsProcessing(false);
      }
    }
  }, [userInfo?.ID_NguoiDung, loadUserData, loadPointHistory]);

  // Listen for Deep Link
  useEffect(() => {
    // Check if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [handleDeepLink]);

  // 🔥 AppState listener: auto-check pending payment when app returns from background (ZaloPay)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Detect app coming back to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App returned to foreground, checking pending ZaloPay transaction...');
        const storedTransId = await AsyncStorage.getItem('pending_zalopay_trans_id');
        if (storedTransId) {
          // Get userId
          let userId = userInfo?.ID_NguoiDung;
          if (!userId) {
            const storedUser = await AsyncStorage.getItem('userInfo');
            if (storedUser) {
              userId = JSON.parse(storedUser).ID_NguoiDung;
            }
          }
          if (userId) {
            setIsProcessing(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(
                `${API_BASE_URL}/api/zalopay/order-status/${storedTransId}?userId=${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              const data = await response.json();
              console.log('📱 AppState check result:', data);

              if (data.return_code === 1) {
                const pointsAdded = data.points_added || 0;
                const pointsMsg = pointsAdded ? `+${pointsAdded} điểm` : '';
                Alert.alert('Thanh toán thành công! 🎉', pointsMsg || 'Điểm đã được cập nhật.');

                if (pointsAdded > 0) {
                  setUserInfo(prev => {
                    if (!prev) return prev;
                    const newPoints = (prev.diem_so || 0) + pointsAdded;
                    const updatedUser = { ...prev, diem_so: newPoints };
                    AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
                    return updatedUser;
                  });
                } else {
                  // Points already processed (points_added = 0), refresh from API to get latest
                  await loadUserData();
                }

                await AsyncStorage.removeItem('pending_zalopay_trans_id');
                setPendingTransId(null);
                await loadPointHistory();
              } else if (data.return_code === 3) {
                Alert.alert('Thanh toán thất bại', data.return_message || 'Giao dịch bị hủy.');
                await AsyncStorage.removeItem('pending_zalopay_trans_id');
                setPendingTransId(null);
              }
              // return_code = 2: still processing, user can manually check later
            } catch (error) {
              console.error('AppState check error:', error);
            } finally {
              setIsProcessing(false);
            }
          }
        } else {
          // No pending transaction, just refresh points from API
          await loadUserData();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [userInfo?.ID_NguoiDung, loadUserData, loadPointHistory]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadUserData(), loadPointHistory()]);
    setIsRefreshing(false);
  }, [loadUserData, loadPointHistory]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadUserData();
      setIsLoading(false);
    };
    loadData();
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      const checkPendingAndRefresh = async () => {
        if (!userInfo?.ID_NguoiDung) return;

        // 🔥 AUTO-CHECK: Kiểm tra có giao dịch pending không khi quay lại màn hình
        const storedTransId = await AsyncStorage.getItem('pending_zalopay_trans_id');
        if (storedTransId) {

          setIsProcessing(true);
          try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(
              `${API_BASE_URL}/api/zalopay/order-status/${storedTransId}?userId=${userInfo.ID_NguoiDung}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();



            if (data.return_code === 1) {
              const pointsAdded = data.points_added || 0;
              const pointsMsg = pointsAdded ? `+${pointsAdded} điểm` : '';
              Alert.alert("Thanh toán thành công! 🎉", pointsMsg || "Điểm đã được cập nhật.");

              // 🔥 CẬP NHẬT ĐIỂM TRỰC TIẾP VÀO STATE NGAY LẬP TỨC
              if (pointsAdded > 0) {
                setUserInfo(prev => {
                  if (!prev) return prev;
                  const newPoints = (prev.diem_so || 0) + pointsAdded;
                  const updatedUser = { ...prev, diem_so: newPoints };
                  AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
                  return updatedUser;
                });
              }

              await AsyncStorage.removeItem('pending_zalopay_trans_id');
              setPendingTransId(null);
              // Reload point history
              await loadPointHistory();
            } else if (data.return_code === 3) {
              Alert.alert("Thanh toán thất bại", data.return_message || "Giao dịch bị hủy.");
              await AsyncStorage.removeItem('pending_zalopay_trans_id');
              setPendingTransId(null);
            }
            // Nếu return_code = 2 (đang xử lý), không làm gì, để user tự bấm check
          } catch (error) {

          } finally {
            setIsProcessing(false);
          }
        }

        // Refresh data như bình thường
        refreshData();
      };

      checkPendingAndRefresh();
    }, [userInfo?.ID_NguoiDung, refreshData, loadUserData, loadPointHistory])
  );

  const handleZaloPay = async (points: number, amount: number) => {
    if (!userInfo?.ID_NguoiDung) return;
    setIsProcessing(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      // Gửi request tạo đơn hàng lên Backend
      const response = await fetch(`${API_BASE_URL}/api/zalopay/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userInfo.ID_NguoiDung,
          amount: amount,
          points: points,
          description: `Mua ${points} điểm`,
        }),
      });



      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();


      if (responseData.return_code === 1 && responseData.order_url) {
        // Save app_trans_id for manual status check
        if (responseData.app_trans_id) {
          setPendingTransId(responseData.app_trans_id);
          await AsyncStorage.setItem('pending_zalopay_trans_id', responseData.app_trans_id);
        }
        // Open ZaloPay Gateway
        const supported = await Linking.canOpenURL(responseData.order_url);
        if (supported) {
          await Linking.openURL(responseData.order_url);
        } else {
          Alert.alert("Lỗi", "Không thể mở trang thanh toán ZaloPay");
        }
      } else {
        Alert.alert("Giao dịch thất bại", `Chi tiết: ${responseData.return_message || JSON.stringify(responseData)}`);
      }
    } catch (error: any) {

      Alert.alert("Lỗi kết nối", error.message || "Không thể kết nối đến server");
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual check payment status (for Expo Go where deep link doesn't work)
  const checkPaymentStatus = async () => {
    // Check stored trans_id first
    let transId = pendingTransId;
    if (!transId) {
      transId = await AsyncStorage.getItem('pending_zalopay_trans_id');
    }

    if (!transId || !userInfo?.ID_NguoiDung) {
      Alert.alert("Thông báo", "Không có giao dịch nào đang chờ xử lý.");
      return;
    }

    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(
        `${API_BASE_URL}/api/zalopay/order-status/${transId}?userId=${userInfo.ID_NguoiDung}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();


      if (data.return_code === 1) {
        const pointsAdded = data.points_added || 0;
        const pointsMsg = pointsAdded ? `+${pointsAdded} điểm` : '';
        Alert.alert("Thanh toán thành công!", pointsMsg || "Điểm đã được cập nhật.");

        // 🔥 CẬP NHẬT ĐIỂM TRỰC TIẾP VÀO STATE NGAY LẬP TỨC
        if (pointsAdded > 0) {
          setUserInfo(prev => {
            if (!prev) return prev;
            const newPoints = (prev.diem_so || 0) + pointsAdded;
            const updatedUser = { ...prev, diem_so: newPoints };
            AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }

        await AsyncStorage.removeItem('pending_zalopay_trans_id');
        setPendingTransId(null);
        // Reload point history
        await loadPointHistory();
      } else if (data.return_code === 3) {
        Alert.alert("Thanh toán thất bại", data.return_message || "Giao dịch bị hủy.");
        await AsyncStorage.removeItem('pending_zalopay_trans_id');
        setPendingTransId(null);
      } else {
        Alert.alert("Đang xử lý", "Giao dịch đang được xử lý. Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.error("Check status error:", error);
      Alert.alert("Lỗi", "Không thể kiểm tra trạng thái giao dịch.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'dang_bai': return 'create-outline';
      case 'like': return 'heart-outline';
      case 'binh_luan': return 'chatbubble-outline';
      case 'nhan_like': return 'heart';
      case 'nhan_binh_luan': return 'chatbubble';
      case 'tang_diem': return 'gift-outline';
      default: return 'ellipse-outline';
    }
  };

  const getTransactionColor = (type: string, change: number) => {
    if (change > 0) return '#4CAF50';
    if (change < 0) return '#F44336';
    return '#FF9800';
  };

  const getTransactionText = (type: string) => {
    switch (type) {
      case 'dang_bai': return 'Đăng bài';
      case 'like': return 'Like bài đăng';
      case 'binh_luan': return 'Bình luận';
      case 'nhan_like': return 'Nhận like';
      case 'nhan_binh_luan': return 'Nhận bình luận';
      case 'tang_diem': return 'Điểm thưởng / Mua điểm';
      default: return 'Giao dịch khác';
    }
  };

  const PointPackage = ({ points, price, color, onPress }: { points: number, price: string, color: readonly [string, string, ...string[]], onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.packageContainer}>
      <LinearGradient
        colors={color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.packageCard}
      >
        <View style={styles.packageContent}>
          <View style={styles.packageLeft}>
            <Ionicons name="diamond-outline" size={28} color="#FFF" />
            <Text style={styles.packagePoints}>{points.toLocaleString()} Điểm</Text>
          </View>
          <View style={styles.packageRight}>
            <Text style={styles.packagePrice}>{price}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#791228" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} />}
      >
        {/* Header Gradient */}
        <LinearGradient
          colors={['#791228', '#a81b3b']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ví Của Bạn</Text>
            <View style={styles.balanceContainer}>
              <Ionicons name="star" size={32} color="#FFD700" />
              <Text style={styles.balanceText}>{userInfo?.diem_so?.toLocaleString() || 0}</Text>
            </View>
            <Text style={styles.balanceLabel}>Điểm hiện có</Text>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* Info Section */}
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Cách kiếm điểm</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>🎁 Đăng bài mới</Text>
              <Text style={[styles.infoPoints, { color: '#F44336' }]}>-20</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>❤️ Tương tác (Like/Comment)</Text>
              <Text style={[styles.infoPoints, { color: '#4CAF50' }]}>+2 ~ +5</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>🔥 Nhận tương tác</Text>
              <Text style={[styles.infoPoints, { color: '#4CAF50' }]}>+3 ~ +10</Text>
            </View>
          </View>

          {/* Buy Points Section */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Ionicons name="card-outline" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Mua thêm điểm (ZaloPay)</Text>
          </View>

          <PointPackage
            points={1000}
            price="20.000đ"
            color={['#4CAF50', '#2E7D32'] as const}
            onPress={() => handleZaloPay(1000, 20000)}
          />
          <PointPackage
            points={5000}
            price="90.000đ"
            color={['#2196F3', '#1565C0'] as const}
            onPress={() => handleZaloPay(5000, 90000)}
          />
          <PointPackage
            points={10000}
            price="150.000đ"
            color={['#9C27B0', '#6A1B9A'] as const}
            onPress={() => handleZaloPay(10000, 150000)}
          />

          {/* Manual Check Payment Button */}
          <TouchableOpacity
            onPress={checkPaymentStatus}
            style={styles.checkPaymentButton}
          >
            <Ionicons name="refresh-circle-outline" size={20} color="#0088FF" />
            <Text style={styles.checkPaymentText}>Kiểm tra thanh toán</Text>
          </TouchableOpacity>

          {/* Transaction History */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          </View>

          {pointHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#ddd" />
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {pointHistory.map((item) => (
                <View key={item.ID_LichSu} style={styles.historyItem}>
                  <View style={[styles.historyIconWrapper, { backgroundColor: getTransactionColor(item.loai_giao_dich, item.diem_thay_doi) + '20' }]}>
                    <Ionicons
                      name={getTransactionIcon(item.loai_giao_dich) as any}
                      size={20}
                      color={getTransactionColor(item.loai_giao_dich, item.diem_thay_doi)}
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>{getTransactionText(item.loai_giao_dich)}</Text>
                    <Text style={styles.historyTime}>{new Date(item.thoi_gian_tao).toLocaleString('vi-VN')}</Text>
                  </View>
                  <View style={styles.historyPoints}>
                    <Text style={[styles.pointsChange, { color: getTransactionColor(item.loai_giao_dich, item.diem_thay_doi) }]}>
                      {item.diem_thay_doi > 0 ? '+' : ''}{item.diem_thay_doi}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#0088FF" />
            <Text style={styles.processingText}>Đang kết nối ZaloPay...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  headerGradient: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 10,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 10,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceLabel: {
    color: '#rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  contentContainer: {
    padding: 20,
    marginTop: -20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#444',
  },
  infoPoints: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  packageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  packageCard: {
    borderRadius: 16,
    padding: 20,
  },
  packageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packagePoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  packageRight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  packagePrice: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  historyList: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  historyPoints: {
    alignItems: 'flex-end',
  },
  pointsChange: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  checkPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0088FF',
    backgroundColor: 'rgba(0, 136, 255, 0.05)',
  },
  checkPaymentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0088FF',
    fontWeight: '600',
  },
});

export default TichDiemScreen;
