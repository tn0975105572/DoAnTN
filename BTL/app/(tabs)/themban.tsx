import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { normalizeBackendMediaUrl } from '../../utils/mediaUrl';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const SOCKET_URL = API_BASE_URL;

const COLORS = {
  primary: '#7f001f',
  background: '#fffcef',
  white: '#FFFFFF',
  text: '#222222',
  textSecondary: '#777777',
  border: '#EEEEEE',
  lightGray: '#F5F5F5',
  danger: '#FF6B6B',
};

const AddFriendHeader = ({ onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={COLORS.text} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Thêm bạn bè</Text>
  </View>
);

const RequestListItem = ({ user, onAccept, onDecline }) => (
  <View style={styles.userCard}>
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } })}
      activeOpacity={0.8}
    >
      <Image
        style={styles.avatar}
        source={{ uri: normalizeBackendMediaUrl(user.anh_dai_dien) || `https://i.pravatar.cc/150?u=${user.ID_NguoiDung}` }}
      />
    </TouchableOpacity>
    <View style={styles.userInfo}>
      <Text style={styles.userName} numberOfLines={1}>
        {user.ho_ten}
      </Text>
      <Text style={styles.userMutual}>Lời mời kết bạn</Text>
      {user.truong_hoc && (
        <Text style={styles.userDetail} numberOfLines={1}>
          {user.truong_hoc}
        </Text>
      )}
      {user.que_quan && (
        <Text style={styles.userDetail} numberOfLines={1}>
          {user.que_quan}
        </Text>
      )}
    </View>
    <View style={styles.buttonContainer}>
      <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
        <Text style={styles.declineButtonText}>Từ chối</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
        <Text style={styles.acceptButtonText}>Đồng ý</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const SentRequestListItem = ({ user, onCancel }) => (
  <View style={styles.userCard}>
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } })}
      activeOpacity={0.8}
    >
      <Image
        style={styles.avatar}
        source={{ uri: normalizeBackendMediaUrl(user.anh_dai_dien) || `https://i.pravatar.cc/150?u=${user.ID_NguoiDung}` }}
      />
    </TouchableOpacity>
    <View style={styles.userInfo}>
      <Text style={styles.userName} numberOfLines={1}>
        {user.ho_ten}
      </Text>
      <Text style={styles.userMutual}>Đã gửi lời mời</Text>
      {user.truong_hoc && (
        <Text style={styles.userDetail} numberOfLines={1}>
          {user.truong_hoc}
        </Text>
      )}
      {user.que_quan && (
        <Text style={styles.userDetail} numberOfLines={1}>
          {user.que_quan}
        </Text>
      )}
    </View>
    <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
      <Text style={styles.cancelButtonText}>Hủy</Text>
    </TouchableOpacity>
  </View>
);

const SuggestionListItem = ({ user, onAdd }) => {
  const status = user.trang_thai_quan_he || null;
  let buttonContent;
  if (status === 'dang_cho') {
    buttonContent = (
      <View style={[styles.addButton, styles.sentButton]}>
        <Ionicons name="checkmark" size={16} color="#666666" />
        <Text style={styles.sentButtonText}> Đã gửi</Text>
      </View>
    );
  } else if (status === 'da_dong_y') {
    buttonContent = (
      <View style={[styles.addButton, styles.friendButton]}>
        <Ionicons name="people" size={16} color={COLORS.text} />
        <Text style={styles.friendButtonText}> Bạn bè</Text>
      </View>
    );
  } else {
    buttonContent = (
      <TouchableOpacity style={styles.addButton} onPress={onAdd}>
        <Ionicons name="person-add" size={16} color={COLORS.white} />
        <Text style={styles.addButtonText}> Kết bạn</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.userCard}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } })}
        activeOpacity={0.8}
      >
        <Image
          style={styles.avatar}
          source={{ uri: normalizeBackendMediaUrl(user.anh_dai_dien) || `https://i.pravatar.cc/150?u=${user.ID_NguoiDung}` }}
        />
      </TouchableOpacity>
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {user.ho_ten}
        </Text>
        {user.so_nguoi_chung > 0 && (
          <Text style={styles.userMutual}>{user.so_nguoi_chung} bạn chung</Text>
        )}
        {user.truong_hoc && (
          <Text style={styles.userDetail} numberOfLines={1}>
            {user.truong_hoc}
          </Text>
        )}
        {user.que_quan && (
          <Text style={styles.userDetail} numberOfLines={1}>
            {user.que_quan}
          </Text>
        )}
      </View>
      {buttonContent}
    </View>
  );
};


const FriendListItem = ({ user }) => (
  <View style={styles.userCard}>
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } })}
      activeOpacity={0.8}
    >
      <Image
        style={styles.avatar}
        source={{ uri: normalizeBackendMediaUrl(user.anh_dai_dien) || `https://i.pravatar.cc/150?u=${user.ID_NguoiDung}` }}
      />
    </TouchableOpacity>
    <View style={styles.userInfo}>
      <Text style={styles.userName} numberOfLines={1}>{user.ho_ten}</Text>
      {user.truong_hoc ? (
        <Text style={styles.userDetail} numberOfLines={1}>{user.truong_hoc}</Text>
      ) : null}
      {user.que_quan ? (
        <Text style={styles.userDetail} numberOfLines={1}>{user.que_quan}</Text>
      ) : null}
    </View>
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
      onPress={() => router.push({ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } })}
    >
      <Text style={[styles.actionButtonText, { color: '#fff' }]}>Trang cá nhân</Text>
    </TouchableOpacity>
  </View>
);

const TabBar = ({ activeTab, onTabChange, tabCounts }) => {
  const tabs = [
    { key: 'suggestions', label: 'Gợi ý', icon: 'people-outline' },
    { key: 'requests', label: 'Lời mời', count: tabCounts.requests, icon: 'mail-outline' },
    { key: 'sent', label: 'Đã gửi', count: tabCounts.sent, icon: 'time-outline' },
    { key: 'friends', label: 'Bạn bè', count: tabCounts.friends, icon: 'heart-outline' },
  ];
  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabChange(tab.key)}
        >
          <Ionicons
            name={activeTab === tab.key ? tab.icon.replace('-outline', '') : tab.icon}
            size={20}
            color={activeTab === tab.key ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            {tab.label}
          </Text>
          {tab.count > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{tab.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const AddFriendScreen = () => {
  const [myUserId, setMyUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('suggestions');

  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]); // SỬA: Thêm state lưu danh sách bạn bè

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const socket = useRef(null);

  const tabCounts = {
    requests: requests.length,
    sent: sentRequests.length,
    friends: friends.length,
  };

  const fetchApi = async (url, options = {}, showError = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      const data = await response.json();
      if (!response.ok) {
        if (showError) console.warn(`❌ API Error ${response.status}: ${url}`, data.message);
        return { success: false, status: response.status, message: data.message || `Lỗi máy chủ` };
      }
      return { success: true, data: data.data || data || [] };
    } catch (error) {
      if (showError) console.error(`🌐 Network Error: ${url}`, error);
      return { success: false, message: 'Lỗi kết nối mạng.' };
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const storedUserInfo = await AsyncStorage.getItem('userInfo');
        if (storedUserInfo) {
          const userInfo = JSON.parse(storedUserInfo);
          if (userInfo?.ID_NguoiDung) {
            setMyUserId(userInfo.ID_NguoiDung);
          } else {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng.');
          }
        } else {
          Alert.alert('Lỗi', 'Vui lòng đăng nhập lại.');
        }
      } catch (error) {
        console.error('❌ Lỗi load user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const loadInitialData = useCallback(
    async (isRefresh = false) => {
      if (!myUserId) return;
      if (isRefresh) setRefreshing(true);
      else setIsLoading(true);

      try {
        const [suggestionsRes, requestsRes, sentRequestsRes, friendsRes] = await Promise.all([
          fetchApi(`/api/quanhebanbe/suggestions/${myUserId}`, {}, false),
          fetchApi(`/api/quanhebanbe/requests/${myUserId}`),
          fetchApi(`/api/quanhebanbe/sent-requests/${myUserId}`),
          fetchApi(`/api/quanhebanbe/list/${myUserId}`), // SỬA: Tải danh sách bạn bè
        ]);
        if (suggestionsRes.success) setSuggestions(suggestionsRes.data);
        if (requestsRes.success) setRequests(requestsRes.data);
        if (sentRequestsRes.success) setSentRequests(sentRequestsRes.data);
        if (friendsRes.success) setFriends(friendsRes.data); // SỬA: Cập nhật state bạn bè
      } catch (error) {
        console.error('❌ Lỗi load data:', error);
        Alert.alert('Lỗi', 'Không thể tải dữ liệu.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [myUserId],
  );

  useFocusEffect(
    useCallback(() => {
      if (myUserId) loadInitialData();
    }, [myUserId, loadInitialData]),
  );

  useEffect(() => {
    if (!myUserId) return;
    socket.current = io(SOCKET_URL, { transports: ['websocket'] });
    socket.current.on('connect', () => {
      console.log('✅ Socket connected:', socket.current.id);
      socket.current.emit('joinRoom', myUserId);
    });
    socket.current.on('new_friend_request', (data) => {
      console.log('🔔 Lời mời mới:', data);
      loadInitialData();
    });
    socket.current.on('relationship_updated', (data) => {
      console.log('🔄 Quan hệ cập nhật:', data);
      loadInitialData();
    });
    return () => {
      socket.current?.disconnect();
    };
  }, [myUserId, loadInitialData]);

  useEffect(() => {
    if (searchQuery.trim() === '' || !myUserId) {
      setSearchResults([]);
      return;
    }
    const searchDelay = setTimeout(async () => {
      setIsSearching(true);
      const searchData = await fetchApi(
        `/api/nguoidung/search?tuKhoa=${encodeURIComponent(searchQuery)}&idNguoiDungHienTai=${myUserId}`,
      );
      if (searchData.success) {
        const users = searchData.data || [];
        // SỬA: Làm giàu dữ liệu search với trạng thái quan hệ đúng
        const enrichedUsers = users.map((user) => {
          if (friends.some((friend) => friend.ID_NguoiDung === user.ID_NguoiDung)) {
            return { ...user, trang_thai_quan_he: 'da_dong_y' };
          }
          if (sentRequests.some((req) => req.ID_NguoiDung === user.ID_NguoiDung)) {
            return { ...user, trang_thai_quan_he: 'dang_cho' };
          }
          return { ...user, trang_thai_quan_he: null };
        });

        const resultsWithFriends = await Promise.all(
          enrichedUsers.map(async (user) => {
            const friendsCount = await fetchApi(
              `/api/quanhebanbe/friends-count/${myUserId}/${user.ID_NguoiDung}`,
              {},
              false,
            );
            return {
              ...user,
              so_nguoi_chung: friendsCount.success ? friendsCount.data?.count || 0 : 0,
            };
          }),
        );
        setSearchResults(resultsWithFriends);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(searchDelay);
  }, [searchQuery, myUserId, friends, sentRequests]); // SỬA: Thêm dependency

  const handleAccept = async (idNguoiGui, name) => {
    const data = await fetchApi(`/api/quanhebanbe/accept`, {
      method: 'PUT',
      body: JSON.stringify({ idNguoiNhan: myUserId, idNguoiGui }),
    });
    if (data.success) {
      Alert.alert('Đã đồng ý', `Bạn và ${name} đã trở thành bạn bè!`);
      loadInitialData(); // Tải lại toàn bộ để đồng bộ
    } else {
      Alert.alert('Lỗi', data.message || 'Không thể đồng ý kết bạn.');
    }
  };

  const handleDecline = (idNguoiGui, name) => {
    Alert.alert('Từ chối lời mời', `Bạn có chắc muốn từ chối lời mời từ ${name}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: async () => {
          const data = await fetchApi(`/api/quanhebanbe/unfriend`, {
            method: 'DELETE',
            body: JSON.stringify({ idNguoiGui, idNguoiNhan: myUserId }),
          });
          if (data.success) {
            Alert.alert('Đã từ chối', `Đã từ chối lời mời của ${name}.`);
            setRequests((prev) => prev.filter((user) => user.ID_NguoiDung !== idNguoiGui));
          } else {
            Alert.alert('Lỗi', data.message || 'Không thể từ chối.');
          }
        },
      },
    ]);
  };

  const handleCancelSent = (idNguoiNhan, name) => {
    Alert.alert('Hủy lời mời', `Bạn có chắc muốn hủy lời mời kết bạn với ${name}?`, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: 'destructive',
        onPress: async () => {
          const data = await fetchApi(`/api/quanhebanbe/cancel`, {
            method: 'DELETE',
            body: JSON.stringify({ idNguoiGui: myUserId, idNguoiNhan }),
          });
          if (data.success) {
            Alert.alert('Đã hủy', `Đã hủy lời mời kết bạn với ${name}.`);
            loadInitialData(); // Tải lại để đồng bộ
          } else {
            Alert.alert('Lỗi', data.message || 'Không thể hủy lời mời.');
          }
        },
      },
    ]);
  };

  // SỬA: Cập nhật hàm handleAddFriend
  const handleAddFriend = async (idNguoiNhan, name) => {
    const updateUserStatus = (users) =>
      users.map((user) =>
        user.ID_NguoiDung === idNguoiNhan ? { ...user, trang_thai_quan_he: 'dang_cho' } : user,
      );
    setSuggestions(updateUserStatus);
    setSearchResults(updateUserStatus);

    const data = await fetchApi(`/api/quanhebanbe/request`, {
      method: 'POST',
      body: JSON.stringify({ idNguoiGui: myUserId, idNguoiNhan }),
    });

    if (data.success) {
      Alert.alert('Đã gửi', `Đã gửi lời mời kết bạn đến ${name}.`);
      loadInitialData();
    } else if (data.status === 409) {
      console.log('Thông báo: Mối quan hệ đã tồn tại, làm mới giao diện.');
      loadInitialData();
    } else {
      Alert.alert('Lỗi', data.message || 'Gửi lời mời thất bại.');
      loadInitialData();
    }
  };

  const renderItem = ({ item }) => {
    switch (activeTab) {
      case 'requests':
        return (
          <RequestListItem
            user={item}
            onAccept={() => handleAccept(item.ID_NguoiDung, item.ho_ten)}
            onDecline={() => handleDecline(item.ID_NguoiDung, item.ho_ten)}
          />
        );
      case 'sent':
        return (
          <SentRequestListItem
            user={item}
            onCancel={() => handleCancelSent(item.ID_NguoiDung, item.ho_ten)}
          />
        );
      case 'friends':
        return <FriendListItem user={item} />;
      default:
        return (
          <SuggestionListItem
            user={item}
            onAdd={() => handleAddFriend(item.ID_NguoiDung, item.ho_ten)}
          />
        );
    }
  };

  const renderEmptyComponent = () => {
    let title = 'Không có gợi ý nào',
      subtitle = 'Tìm kiếm bạn bè mới!',
      icon = 'people-outline';
    if (activeTab === 'requests') {
      title = 'Không có lời mời kết bạn';
      subtitle = 'Chờ bạn bè gửi lời mời';
      icon = 'mail-outline';
    } else if (activeTab === 'sent') {
      title = 'Chưa gửi lời mời nào';
      subtitle = 'Gửi lời mời kết bạn ngay!';
      icon = 'time-outline';
    } else if (activeTab === 'friends') {
      title = 'Chưa có bạn bè nào';
      subtitle = 'Kết bạn với mọi người ngay!';
      icon = 'heart-outline';
    } else if (searchQuery.trim()) {
      title = 'Không tìm thấy ai';
      subtitle = 'Thử từ khóa khác';
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon} size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>
      </View>
    );
  };

  // SỬA: Hàm goBack chuẩn
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      console.log('Không thể quay lại màn hình trước.');
      router.replace('/home'); // Quay về trang chủ nếu không thể back
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AddFriendHeader onBack={handleGoBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayData =
    activeTab === 'suggestions'
      ? searchQuery.trim()
        ? searchResults
        : suggestions
      : activeTab === 'requests'
        ? requests
        : activeTab === 'sent'
          ? sentRequests
          : friends;

  return (
    <SafeAreaView style={styles.container}>
      <AddFriendHeader onBack={handleGoBack} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} tabCounts={tabCounts} />
      {activeTab === 'suggestions' && (
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm bạn bè"
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
      )}
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item) => item.ID_NguoiDung}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => loadInitialData(true)}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.0,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 5, marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  activeTabText: { color: COLORS.primary },
  inactiveTabText: { color: COLORS.textSecondary },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    margin: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 16, color: COLORS.text },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: COLORS.lightGray,
  },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  userMutual: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  userDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginLeft: 2 },
  sentButton: { backgroundColor: '#E0E0E0' },
  sentButtonText: { color: '#666666', fontWeight: '600', fontSize: 14, marginLeft: 2 },
  friendButton: { backgroundColor: '#F0F0F0', borderColor: '#DDD', borderWidth: 1 },
  friendButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 14, marginLeft: 2 },
  buttonContainer: { flexDirection: 'row', alignItems: 'center' },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  acceptButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  declineButton: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  declineButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 14 },
  cancelButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  cancelButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.textSecondary },
  listContent: { paddingBottom: 20 },
});

export default AddFriendScreen;
