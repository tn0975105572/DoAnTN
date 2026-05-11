import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../../../services/notificationService';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

interface Notification {
  ID_ThongBao: string;
  ID_NguoiDung: string;
  ID_NguoiGui?: string;
  loai: string;
  noi_dung: string;
  lien_ket?: string;
  da_doc: number;
  thoi_gian_tao: string;
  nguoi_gui_ten?: string;
  nguoi_gui_avatar?: string;
}

const extractOrderIdFromLink = (link?: string) => {
  if (!link) {
    return '';
  }

  const match = String(link).match(/\/orders\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : '';
};

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Lấy User ID từ AsyncStorage
  const getUserId = async (): Promise<string> => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return user.ID_NguoiDung || '';
      }
      return '';
    } catch {
      return '';
    }
  };

  // Load thông báo
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const currentUserId = await getUserId();
      setUserId(currentUserId);

      if (!currentUserId) {
        setNotifications([]);
        return;
      }

      const response = await notificationService.getByUserId(currentUserId);
      
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh thông báo
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  // Đánh dấu đã đọc
  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (notification.da_doc === 0) {
        await notificationService.markAsRead(notification.ID_ThongBao);
        setNotifications((prev) =>
          prev.map((n) =>
            n.ID_ThongBao === notification.ID_ThongBao ? { ...n, da_doc: 1 } : n
          )
        );
      }
    } catch {
      // Keep navigation available even if marking as read fails.
    }

    const orderId = extractOrderIdFromLink(notification.lien_ket);
    if (orderId) {
      router.push({
        pathname: '/components/CaiDat/chitiethoadon',
        params: { orderId },
      });
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    await notificationService.markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, da_doc: 1 })));
  };

  // Xóa thông báo
  const handleDeleteNotification = async (notification: Notification) => {
    Alert.alert(
      'Xóa thông báo',
      'Bạn có chắc muốn xóa thông báo này?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await notificationService.delete(notification.ID_ThongBao);
              if (response.success) {
                // Xóa khỏi list local
                setNotifications((prev) =>
                  prev.filter((n) => n.ID_ThongBao !== notification.ID_ThongBao)
                );
              }
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa thông báo');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    void loadNotifications();

    // 🔔 Kết nối Socket.IO để nhận thông báo real-time
    let socket: ReturnType<typeof io> | null = null;

    const setupSocket = async () => {
      const currentUserId = await getUserId();
      const userToken = await AsyncStorage.getItem('userToken');
      if (!currentUserId || !userToken) return;

      try {
        socket = io(API_BASE_URL, {
          transports: ['websocket'],
          auth: { token: userToken },
        });

        socket.on('connect', () => {
          socket?.emit('user_login', { userId: currentUserId });
        });

        socket.on('notification', () => {
          void loadNotifications();
        });

        socket.on('disconnect', () => {
          // Disconnected
        });

      } catch {
        // Silent error
      }
    };

    void setupSocket();

    // Cleanup khi component unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [loadNotifications]);

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = notificationService.getIconByType(item.loai);
    const time = notificationService.formatTime(item.thoi_gian_tao);
    const orderId = extractOrderIdFromLink(item.lien_ket);
    const secondaryText =
      item.nguoi_gui_ten ||
      (orderId ? 'Chạm để xem chi tiết hóa đơn.' : '');

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          item.da_doc === 0 && styles.unreadItemContainer,
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item)}
        delayLongPress={500}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
          {item.da_doc === 0 && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.content}>
          <Text
            style={[styles.title, item.da_doc === 0 && styles.unreadTitle]}
            numberOfLines={1}
          >
            {item.noi_dung}
          </Text>
          {secondaryText ? (
            <Text style={styles.description} numberOfLines={2}>
              {secondaryText}
            </Text>
          ) : null}
        </View>
        <Text style={styles.time}>{time}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>Không có thông báo</Text>
      <Text style={styles.emptySubText}>
        Bạn sẽ nhận được thông báo khi có hoạt động mới
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thông báo</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9a0002" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity onPress={handleMarkAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.ID_ThongBao}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#9a0002']}
            tintColor="#9a0002"
          />
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#9a0002',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#7a0001',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  unreadItemContainer: {
    backgroundColor: '#fff5f5',
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#ffe5e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#fdd',
    position: 'relative',
  },
  icon: {
    fontSize: 22,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9a0002',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
    color: '#000',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 72,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
});

export default NotificationsScreen;
