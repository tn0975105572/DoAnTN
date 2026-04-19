import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeBackendMediaUrl } from '../../../utils/mediaUrl';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

const COLORS = {
  primary: '#7f001f',
  background: '#fffcef',
  white: '#FFFFFF',
  text: '#222222',
  textSecondary: '#777777',
  border: '#EEEEEE',
  lightGray: '#F5F5F5',
  success: '#4CAF50',
};

interface User {
  ID_NguoiDung: string;
  ho_ten: string;
  email: string;
  anh_dai_dien?: string;
  que_quan?: string;
  truong_hoc?: string;
  so_nguoi_chung?: number;
  trang_thai_quan_he?: string;
}

interface SearchUsersProps {
  onClose: () => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ onClose }) => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);

  const fetchApi = async (url: string, options: any = {}, showError = true) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        timeout: 10000, // 10 seconds timeout
      });

      // Kiểm tra response status
      if (response.status === 0) {
        if (showError) console.warn(`❌ Network Error: No connection to ${url}`);
        return {
          success: false,
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
        };
      }

      const data = await response.json();
      if (!response.ok) {
        if (showError) console.warn(`❌ API Error ${response.status}: ${url}`, data.message);
        return { success: false, status: response.status, message: data.message || `Lỗi máy chủ` };
      }
      return { success: true, data: data.data || data || [] };
    } catch (error: any) {
      if (showError) {
        console.error(`🌐 Network Error: ${url}`, error);

        // Xử lý các loại lỗi khác nhau
        if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
          console.error('❌ Network request failed - Check internet connection');
        } else if (error.name === 'AbortError') {
          console.error('❌ Request timeout');
        }
      }

      return {
        success: false,
        message:
          error.name === 'TypeError'
            ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
            : 'Lỗi kết nối mạng.',
      };
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
            // Load danh sách bạn bè
            const friendsRes = await fetchApi(`/api/quanhebanbe/list/${userInfo.ID_NguoiDung}`);
            if (friendsRes.success) {
              setFriends(friendsRes.data);
            }
          }
        }
      } catch (error) {
        console.error('❌ Lỗi load user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

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
        // Làm giàu dữ liệu với trạng thái quan hệ
        const enrichedUsers = users.map((user: User) => {
          if (friends.some((friend) => friend.ID_NguoiDung === user.ID_NguoiDung)) {
            return { ...user, trang_thai_quan_he: 'da_dong_y' };
          }
          return { ...user, trang_thai_quan_he: null };
        });

        // Thêm số bạn chung
        const resultsWithFriends = await Promise.all(
          enrichedUsers.map(async (user: User) => {
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
  }, [searchQuery, myUserId, friends]);

  const handleStartChat = async (user: User) => {
    if (!myUserId) return;

    try {
      // Kiểm tra xem đã có conversation chưa
      const checkConversationRes = await fetchApi(
        `/api/tinnhan/private/${myUserId}/${user.ID_NguoiDung}?limit=1&offset=0`,
      );

      let hasExistingConversation = false;
      if (
        checkConversationRes.success &&
        checkConversationRes.data &&
        checkConversationRes.data.length > 0
      ) {
        hasExistingConversation = true;
      }

      // Chuyển đến màn hình chat chi tiết
      router.push({
        pathname: '/components/TinNhan/chitiettinnhan',
        params: {
          userId: user.ID_NguoiDung,
          userName: user.ho_ten,
          userAvatar: user.anh_dai_dien || '',
          hasExistingConversation: hasExistingConversation.toString(),
        },
      });
    } catch (error) {
      console.error('❌ Lỗi kiểm tra conversation:', error);
      // Fallback: chuyển đến chat mà không kiểm tra
      router.push({
        pathname: '/components/TinNhan/chitiettinnhan',
        params: {
          userId: user.ID_NguoiDung,
          userName: user.ho_ten,
          userAvatar: user.anh_dai_dien || '',
          hasExistingConversation: 'false',
        },
      });
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isFriend = item.trang_thai_quan_he === 'da_dong_y';

    return (
      <View style={[styles.userCard, isFriend && styles.friendCard]}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() =>
            router.push({
              pathname: '/components/CaNhan/canhan',
              params: { userId: item.ID_NguoiDung },
            })
          }
          activeOpacity={0.8}
        >
          <Image
            style={styles.avatar}
            source={{
              uri:
                normalizeBackendMediaUrl(item.anh_dai_dien) ||
                `https://i.pravatar.cc/150?u=${item.ID_NguoiDung}`,
            }}
          />
          {isFriend && (
            <View style={styles.friendBadge}>
              <Ionicons name="checkmark" size={12} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.userInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.ho_ten}
            </Text>
            {isFriend && (
              <View style={styles.friendLabel}>
                <Text style={styles.friendLabelText}>Bạn bè</Text>
              </View>
            )}
          </View>
          {item.so_nguoi_chung && item.so_nguoi_chung > 0 ? (
            <Text style={styles.userMutual}>{item.so_nguoi_chung} bạn chung</Text>
          ) : null}
          {item.truong_hoc ? (
            <Text style={styles.userDetail} numberOfLines={1}>
              {item.truong_hoc}
            </Text>
          ) : null}
          {item.que_quan ? (
            <Text style={styles.userDetail} numberOfLines={1}>
              {item.que_quan}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.chatButton, isFriend && styles.friendChatButton]}
          onPress={() => handleStartChat(item)}
        >
          <Ionicons
            name={isFriend ? 'chatbubble' : 'chatbubble-outline'}
            size={16}
            color={isFriend ? COLORS.white : COLORS.primary}
          />
          <Text style={[styles.chatButtonText, isFriend && styles.friendChatButtonText]}>
            {isFriend ? 'Nhắn tin' : 'Bắt đầu chat'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Không tìm thấy ai</Text>
          <Text style={styles.emptySubtitle}>Thử từ khóa khác</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>Tìm kiếm bạn bè</Text>
        <Text style={styles.emptySubtitle}>Nhập tên hoặc email để tìm kiếm</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm kiếm</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bạn bè để nhắn tin"
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {isSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>

      {/* Results */}
      <FlatList
        data={searchResults}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.ID_NguoiDung}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: COLORS.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  friendCard: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightGray,
  },
  friendBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  friendLabel: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  friendLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userMutual: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  chatButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  friendChatButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  friendChatButtonText: {
    color: COLORS.white,
  },
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
  listContent: {
    paddingBottom: 20,
  },
});

export default SearchUsers;
