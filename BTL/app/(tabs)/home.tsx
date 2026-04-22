import React, { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { io } from 'socket.io-client';
import { normalizeBackendMediaUrl } from '../../utils/mediaUrl';
import { extractLikeRecords, findUserLike } from '../../utils/likeUtils';
import FeedPost, { HydratedPost } from '../components/FeedPost';
import Chatbot from '../components/Home/Chatbot';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const API_URLS = {
  RECOMMENDATIONS: `${API_BASE_URL}/api/recommendations/`,
  GET_POST_BY_ID: `${API_BASE_URL}/api/baidang/getById/`,
  GET_POST_IMAGE_BY_ID: `${API_BASE_URL}/api/baidang_anh/getById/`,
  GET_USER_INFO: `${API_BASE_URL}/api/nguoidung/get/`,
  LIKE_BY_POST: `${API_BASE_URL}/api/likebaidang/getLikesByPostId/`,
  COMMENT_COUNT_BY_POST: `${API_BASE_URL}/api/binhluanbaidang/getCommentCountByPost/`,
  LIKE_CREATE: `${API_BASE_URL}/api/likebaidang/create`,
  LIKE_DELETE: `${API_BASE_URL}/api/likebaidang/delete/`,
};

const COLORS = {
  primary: '#7f001f',
  background: '#fffcef',
  white: '#FFFFFF',
  text: '#222222',
  textSecondary: '#777777',
  border: '#EEEEEE',
  lightGray: '#F5F5F5',
};

interface Recommendation {
  ID_BaiDang: string;
  Score: number;
  isFriendPost: boolean;
  hasLiked: boolean;
  hasCommented: boolean;
}

interface PostDetail {
  ID_BaiDang: string;
  ID_NguoiDung: string;
  tieu_de: string;
  mo_ta: string;
  gia: string;
  vi_tri: string;
  thoi_gian_tao: string;
}

interface PostImage {
  ID_BaiDang: string;
  LinkAnh: string;
  ID: string;
}

interface UserProfile {
  ID_NguoiDung: string | number;
  ho_ten?: string;
  anh_dai_dien?: string;
  email?: string;
}

interface Like {
  ID_Like: string;
  ID_NguoiDung: string;
  ID_BaiDang: string;
}

const getDefaultAvatar = (userId?: string | number) =>
  `https://i.pravatar.cc/150?u=${String(userId || 'olodo-user')}`;

// HydratedPost interface moved to ../components/FeedPost.tsx

interface PeopleYouMayKnow {
  type: 'people_you_may_know';
}

type FeedItem = HydratedPost | PeopleYouMayKnow;

const MOCK_PEOPLE_YOU_MAY_KNOW: FeedItem = { type: 'people_you_may_know' };

const AppHeader = () => {
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notification count
  const loadUnreadCount = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        const userId = user.ID_NguoiDung;
        if (userId) {
          const response = await fetch(`${API_BASE_URL}/api/thongbao/unread/${userId}`);
          const data = await response.json();
          if (data.success) {
            setUnreadCount(data.unread_count || 0);
          }
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  useEffect(() => {
    void loadUnreadCount();

    let isMounted = true;
    let socket: ReturnType<typeof io> | null = null;

    // 🔔 Kết nối Socket.IO để cập nhật badge ngay lập tức
    const setupSocket = async () => {
      const userInfo = await AsyncStorage.getItem('userInfo');
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userInfo || !userToken || !isMounted) {
        return;
      }

      const user = JSON.parse(userInfo);
      const userId = user.ID_NguoiDung;
      if (userId) {
        try {
          socket = io(API_BASE_URL, {
            transports: ['websocket'],
            auth: { token: userToken },
          });

          socket.on('connect', () => {
            socket?.emit('user_login', { userId });
          });

          socket.on('notification', () => {
            void loadUnreadCount();
          });
        } catch {
          // Silent error
        }
      }
    };

    void setupSocket();

    // Fallback: Reload every 30 seconds nếu socket fail
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      isMounted = false;
      socket?.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <View className="flex-row justify-between items-center px-4 py-2 bg-white border-b border-[#EEEEEE]">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Text className="text-[45px] text-[#7f001f] leading-[45px] font-[Oughter]">OLODO</Text>
      <View className="flex-row">
        <TouchableOpacity onPress={() => router.push('/components/Home/timkiem')}>
          <Ionicons name="search" size={24} color={COLORS.text} style={{ marginLeft: 20 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('tinnhan')}>
          <View>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={24}
              color={COLORS.text}
              style={{ marginLeft: 20 }}
            />
            <View className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-[#7f001f] border border-white" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            router.push('/components/Home/thongbao');
            loadUnreadCount(); // Refresh sau khi vào thông báo
          }}
        >
          <View style={{ marginLeft: 20 }}>
            <FontAwesome name="bell-o" size={24} color={COLORS.text} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                right: -6,
                top: -4,
                backgroundColor: '#ff0000',
                borderRadius: 10,
                minWidth: 18,
                height: 18,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 4,
              }}>
                <Text style={{
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TabSelector = ({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => (
  <View className="flex-row px-4 py-2 bg-white">
    <TouchableOpacity
      className={`px-5 py-2 rounded-full mr-2 ${activeTab === 'news' ? 'bg-[#7f001f]' : 'bg-[#F5F5F5]'
        }`}
      onPress={() => setActiveTab('news')}
    >
      <Text
        className={`font-bold text-sm ${activeTab === 'news' ? 'text-white' : 'text-[#777777]'}`}
      >
        News
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      className={`px-5 py-2 rounded-full mr-2 ${activeTab === 'popular' ? 'bg-[#7f001f]' : 'bg-[#F5F5F5]'
        }`}
      onPress={() => setActiveTab('popular')}
    >
      <Text
        className={`font-bold text-sm ${activeTab === 'popular' ? 'text-white' : 'text-[#777777]'}`}
      >
        Popular Posts
      </Text>
    </TouchableOpacity>
  </View>
);

const CreatePost = ({ currentUser }: { currentUser: UserProfile | null }) => {
  const avatarUri =
    normalizeBackendMediaUrl(currentUser?.anh_dai_dien) ||
    getDefaultAvatar(currentUser?.ID_NguoiDung);

  return (
    <View className="p-4 bg-white border-b-8 border-[#fffcef]">
      <View className="flex-row items-center">
        <Image className="w-10 h-10 rounded-full" source={{ uri: avatarUri }} />
        <View className="ml-3">
          <Text className="text-base font-bold text-[#222]">What&apos;s Going On?</Text>
          <Text className="text-sm text-[#777] mt-1">Type Something Here...</Text>
        </View>
      </View>
      <View className="h-[1px] bg-[#EEEEEE] my-3" />
      <View className="flex-row justify-between">
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="image-outline" size={20} color="#4CAF50" />
          <Text className="ml-2 text-xs text-[#777] font-medium">Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <FontAwesome5 name="user-tag" size={20} color="#1E88E5" />
          <Text className="ml-2 text-xs text-[#777] font-medium">Tag People</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color="#FFC107" />
          <Text className="ml-2 text-xs text-[#777] font-medium">Feeling</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <MaterialCommunityIcons name="video-outline" size={20} color="#E63946" />
          <Text className="ml-2 text-xs text-[#777] font-medium">Live</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Stories = ({ currentUser }: { currentUser: UserProfile | null }) => {
  const currentUserAvatar =
    normalizeBackendMediaUrl(currentUser?.anh_dai_dien) ||
    getDefaultAvatar(currentUser?.ID_NguoiDung);

  return (
    <View className="bg-white pb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 15 }}
      >
        <TouchableOpacity className="w-24 h-40 rounded-lg mr-3">
          <ImageBackground
            source={{ uri: currentUserAvatar }}
            className="w-full h-full justify-end rounded-lg overflow-hidden"
            imageStyle={{ borderRadius: 10, opacity: 0.82 }}
          >
            <View
              className="absolute inset-0"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.18)' }}
            />
            <View className="items-center pb-4">
              <TouchableOpacity
                className="w-8 h-8 rounded-full bg-white justify-center items-center mb-2"
                onPress={() => router.push('/components/Home/TaoTin')}
              >
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <Text className="text-white font-bold text-xs">Add Story</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
        {[
          {
            name: 'Alexfin',
            img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80',
          },
          {
            name: 'Harinax',
            img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80',
          },
          { name: 'Sonix', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80' },
        ].map((story) => (
          <TouchableOpacity className="w-24 h-40 rounded-lg mr-3" key={story.name}>
            <ImageBackground
              source={{ uri: story.img }}
              className="w-full h-full justify-between p-2 rounded-lg overflow-hidden"
              imageStyle={{ borderRadius: 10 }}
            >
              <Image
                className="w-8 h-8 rounded-full border-2 border-[#7f001f]"
                source={{ uri: story.img }}
              />
              <Text className="text-white font-bold text-xs">{story.name}</Text>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const PeopleMayKnow = () => (
  <View className="bg-white pt-4 pb-2">
    <Text className="text-lg font-bold mb-4 ml-4 text-[#222]">People you may know</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 15 }}
    >
      {[
        { name: 'Cooper George', mutual: 2 },
        { name: 'Terry Bator', mutual: 2 },
        { name: 'Skylar Affhoff', mutual: 5 },
      ].map((person) => (
        <View
          key={person.name}
          className="w-40 border border-[#EEE] rounded-lg p-3 items-center mr-3 bg-white"
          style={Platform.OS === 'ios' ? { shadowOpacity: 0.1, shadowRadius: 1 } : { elevation: 1 }}
        >
          <Image
            className="w-20 h-20 rounded-full mb-3"
            source={{ uri: `https://i.pravatar.cc/150?u=${person.name}` }}
          />
          <Text className="font-bold text-sm text-[#222] text-center">{person.name}</Text>
          <Text className="text-xs text-[#777] mb-3 text-center">
            {person.mutual} Mutual friends
          </Text>
          <TouchableOpacity className="bg-[#7f001f] py-2 rounded w-full mb-2 items-center">
            <Text className="text-white font-bold text-sm">Add Friend</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-[#F5F5F5] py-2 rounded w-full items-center">
            <Text className="text-[#222] font-bold text-sm">Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  </View>
);

// FeedPost component has been moved to ../components/FeedPost.tsx

const POSTS_PER_CHUNK = 5;
const INITIAL_LOAD_COUNT = 8;
const USER_CACHE_SIZE = 50;

// Enhanced caching system
const userInfoCache = new Map();
const postDetailCache = new Map();
const imageUrlCache = new Map();
const pendingRequests = new Map();

// Debounce helper để tránh load quá thường xuyên
let loadMoreTimeout: ReturnType<typeof setTimeout> | null = null;

const HomeScreen = () => {
  const [activeTab, setActiveTab] = useState('news');
  const [token, setToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [canPress, setCanPress] = useState(true);
  const isFocused = useIsFocused();

  const [allRecommendations, setAllRecommendations] = useState<Recommendation[]>([]);
  const [feedData, setFeedData] = useState<FeedItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportReasonModal, setShowReportReasonModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<HydratedPost | null>(null);

  // Report Options
  const reportOptions = [
    {
      id: 2,
      icon: 'time-outline',
      title: `Tạm ẩn ${selectedPost?.authorName || 'người dùng'} trong 30 ngày`,
      description: `Tạm thời không nhìn thấy bài viết nữa.`,
    },
    {
      id: 3,
      icon: 'eye-off-outline',
      title: `Ẩn tất cả từ ${selectedPost?.authorName || 'người dùng'}`,
      description: `Không nhìn thấy bài viết từ người này nữa. Họ sẽ không nhận được thông báo là bạn đã bỏ theo dõi.`,
    },
    {
      id: 4,
      icon: 'time-outline',
      title: 'Tạm ẩn kiểu bài viết dạng này trong 30 ngày',
      description: 'Tạm thời không nhìn thấy bài viết nữa.',
    },
    {
      id: 5,
      icon: 'person-remove-outline',
      title: 'Bỏ theo dõi ',
      description: 'Không nhìn thấy bài viết từ nhóm này.',
    },
    {
      id: 6,
      icon: 'document-text-outline',
      title: 'Báo cáo bài viết',
      description: `Chúng tôi sẽ không cho ${selectedPost?.authorName || 'người dùng'} biết đã báo cáo.`,
    },
    {
      id: 7,
      icon: 'person-outline',
      title: `Chặn trang cá nhân của ${selectedPost?.authorName || 'người dùng'}`,
      description: 'Các bạn sẽ không thể nhìn liên lạc với nhau.',
    },
  ];

  const reportReasons = [
    {
      id: 1,
      icon: 'shield-outline',
      title: 'Vấn đề liên quan đến người dưới 18 tuổi',
      description: 'Nếu bạn nhìn thấy ai đó đang gặp nguy hiểm, đừng chần chừ mà hãy tìm ngay sự giúp đỡ trước khi báo cáo với Facebook.',
    },
    {
      id: 2,
      icon: 'alert-circle-outline',
      title: 'Bắt nạt, quấy rối hoặc làm ma/lạm dụng/ngược đãi',
      description: '',
    },
    {
      id: 3,
      icon: 'heart-dislike-outline',
      title: 'Tự tử hoặc tự hại bản thân',
      description: '',
    },
    {
      id: 4,
      icon: 'warning-outline',
      title: 'Nội dung mang tính bạo lực, thù ghét hoặc gây phiền toái',
      description: '',
    },
    {
      id: 5,
      icon: 'cart-outline',
      title: 'Bán hoặc quảng cáo mặt hàng bị hạn chế',
      description: '',
    },
    {
      id: 6,
      icon: 'eye-off-outline',
      title: 'Nói dung người lớn',
      description: '',
    },
    {
      id: 7,
      icon: 'information-circle-outline',
      title: 'Thông tin sai sự thật, lừa đảo hoặc gian lận',
      description: '',
    },
    {
      id: 8,
      icon: 'shield-checkmark-outline',
      title: 'Quyền sở hữu trí tuệ',
      description: '',
    },
    {
      id: 9,
      icon: 'close-circle-outline',
      title: 'Tôi không muốn xem nội dung này',
      description: '',
    },
  ];

  const handleReportOption = useCallback(async (optionId: number) => {
    console.log('Selected option:', optionId, 'for post:', selectedPost?.ID_BaiDang);
    setShowReportModal(false);

    if (!selectedPost || !token || !userId) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Thiếu thông tin' });
      setSelectedPost(null);
      return;
    }

    try {
      switch (optionId) {
        case 2:
          // Tạm ẩn người dùng 30 ngày
          Toast.show({ type: 'success', text1: `Đã tạm ẩn ${selectedPost?.authorName} trong 30 ngày` });
          setSelectedPost(null);
          break;
        case 3:
          // Ẩn tất cả bài viết từ người dùng
          Toast.show({ type: 'success', text1: `Đã ẩn tất cả bài viết từ ${selectedPost?.authorName}` });
          setSelectedPost(null);
          break;
        case 4:
          // Tạm ẩn nhóm 30 ngày
          Toast.show({ type: 'success', text1: 'Đã tạm ẩn nhóm trong 30 ngày' });
          setSelectedPost(null);
          break;
        case 5:
          // Bỏ theo dõi nhóm
          Toast.show({ type: 'success', text1: 'Đã bỏ theo dõi nhóm' });
          setSelectedPost(null);
          break;
        case 6:
          // Mở modal chọn lý do báo cáo
          setShowReportReasonModal(true);
          // Không setSelectedPost(null) vì cần giữ post để gửi báo cáo
          break;
        case 7:
          // Chặn người dùng
          Toast.show({ type: 'success', text1: `Đã chặn ${selectedPost?.authorName}` });
          setSelectedPost(null);
          break;
      }
    } catch (error) {
      console.error('Error reporting:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi báo cáo',
        text2: 'Vui lòng thử lại sau'
      });
      setSelectedPost(null);
    }
  }, [selectedPost, token, userId]);

  // Handle khi chọn lý do báo cáo cụ thể
  const handleSelectReportReason = useCallback(async (reasonId: number, reasonTitle: string) => {
    setShowReportReasonModal(false);

    if (!selectedPost || !token || !userId) {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Thiếu thông tin' });
      setSelectedPost(null);
      return;
    }

    try {
      const reportData = {
        ID_BaoCao: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ID_NguoiBaoCao: userId,
        doi_tuong_bao_cao_id: selectedPost.ID_BaiDang,
        loai: 'bai_dang',
        ly_do: reasonTitle,
        trang_thai: 'dang_xu_ly',
      };

      const response = await fetch(`${API_BASE_URL}/api/baocao/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Đã báo cáo bài viết',
          text2: 'Chúng tôi sẽ xem xét báo cáo của bạn'
        });
      } else {
        throw new Error('Báo cáo thất bại');
      }
    } catch (error) {
      console.error('Error reporting:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi báo cáo',
        text2: 'Vui lòng thử lại sau'
      });
    }

    setSelectedPost(null);
  }, [selectedPost, token, userId]);

  // Enhanced fetchUserInfo with better error handling and retry logic
  const fetchUserInfo = useCallback(async (id: string, token: string): Promise<UserProfile> => {
    // Check cache first
    if (userInfoCache.has(id)) {
      return userInfoCache.get(id)!;
    }

    // Check if request is already pending
    const requestKey = `user_${id}`;
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey)!;
    }

    const url = `${API_URLS.GET_USER_INFO}${id}`;
    const requestPromise = (async () => {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // Tăng timeout

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Kiểm tra status 0 (network error)
          if (response.status === 0) {
            throw new Error('Network Error: Không thể kết nối đến máy chủ');
          }

          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const data = await response.json();
          const user = data.user || {};

          const userProfile: UserProfile = {
            ID_NguoiDung: user.ID_NguoiDung || id,
            ho_ten: user.ho_ten || 'Người dùng OLODO',
            anh_dai_dien: normalizeBackendMediaUrl(user.anh_dai_dien) || `https://i.pravatar.cc/50?u=${id}`,
            email: user.email,
          };

          // Cache result with LRU eviction
          if (userInfoCache.size >= USER_CACHE_SIZE) {
            const firstKey = userInfoCache.keys().next().value;
            userInfoCache.delete(firstKey);
          }
          userInfoCache.set(id, userProfile);

          return userProfile;
        } catch (error: any) {
          retryCount++;
          console.warn(
            `❌ Fetch user info attempt ${retryCount}/${maxRetries} failed:`,
            error.message,
          );

          if (retryCount >= maxRetries) {
            // Fallback profile after all retries failed
            const fallbackProfile: UserProfile = {
              ID_NguoiDung: id,
              ho_ten: 'Người dùng OLODO',
              anh_dai_dien: `https://i.pravatar.cc/50?u=${id}`,
            };

            userInfoCache.set(id, fallbackProfile);
            return fallbackProfile;
          }

          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }
    })();

    // Store pending request
    pendingRequests.set(requestKey, requestPromise);
    return requestPromise as Promise<UserProfile>;
  }, []);

  // Optimized hydratePostChunk with enhanced caching and batching
  const hydratePostChunk = useCallback(
    async (chunk: Recommendation[]) => {
      if (!token) return [];

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Process all posts in parallel for maximum speed
      const results = await Promise.allSettled(
        chunk.map(async (reco) => {
          try {
            // Check cache first
            const cacheKey = `post_${reco.ID_BaiDang}`;
            if (postDetailCache.has(cacheKey)) {
              return postDetailCache.get(cacheKey);
            }

            // Create timeout controllers with optimized timeouts
            const controllers = [
              new AbortController(),
              new AbortController(),
              new AbortController(),
              new AbortController(),
            ];

            const timeouts = controllers.map((controller, i) =>
              setTimeout(() => controller.abort(), i < 2 ? 6000 : 4000),
            );

            // Execute all 4 requests in parallel
            const [postDetailRes, postImageRes, likeRes, commentRes] = await Promise.allSettled([
              fetch(`${API_URLS.GET_POST_BY_ID}${reco.ID_BaiDang}`, {
                headers,
                signal: controllers[0].signal,
              }),
              fetch(`${API_URLS.GET_POST_IMAGE_BY_ID}${reco.ID_BaiDang}`, {
                headers,
                signal: controllers[1].signal,
              }),
              fetch(`${API_URLS.LIKE_BY_POST}${reco.ID_BaiDang}`, {
                headers,
                signal: controllers[2].signal,
              }),
              fetch(`${API_URLS.COMMENT_COUNT_BY_POST}${reco.ID_BaiDang}`, {
                headers,
                signal: controllers[3].signal,
              }),
            ]);

            // Clear all timeouts
            timeouts.forEach(clearTimeout);

            // Process results with fallbacks
            const postDetail: PostDetail =
              postDetailRes.status === 'fulfilled' && postDetailRes.value.ok
                ? await postDetailRes.value.json()
                : {};

            if (!postDetail.ID_BaiDang) return null;

            const postImages: PostImage[] =
              postImageRes.status === 'fulfilled' && postImageRes.value.ok
                ? await postImageRes.value.json()
                : [];

            if (postImages.length === 0) return null;

            const likesPayload =
              likeRes.status === 'fulfilled' && likeRes.value.ok ? await likeRes.value.json() : [];
            const likesData = extractLikeRecords(likesPayload);

            const commentCountRaw =
              commentRes.status === 'fulfilled' && commentRes.value.ok
                ? await commentRes.value.json()
                : { count: 0 };
            const commentCount: number = commentCountRaw?.count ?? 0;

            const authorProfile = await fetchUserInfo(postDetail.ID_NguoiDung, token);
            const userLike = findUserLike(likesPayload, userId) as Like | undefined;

            // Memoized price formatting
            const rawPrice = parseFloat(postDetail.gia) || 0;
            const formattedPrice = rawPrice.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            });

            // Optimized image URL processing with caching
            const imageCacheKey = `images_${reco.ID_BaiDang}`;
            let limitedImageUrls;

            if (imageUrlCache.has(imageCacheKey)) {
              limitedImageUrls = imageUrlCache.get(imageCacheKey);
            } else {
              limitedImageUrls = postImages.slice(0, 5).map((img) => {
                const linkAnh = img.LinkAnh;
                return normalizeBackendMediaUrl(linkAnh);
              });

              // Cache processed image URLs
              imageUrlCache.set(imageCacheKey, limitedImageUrls);
            }

            const hydratedPost = {
              type: 'post' as const,
              ID_BaiDang: postDetail.ID_BaiDang,
              ID_NguoiDung: postDetail.ID_NguoiDung,
              authorName: authorProfile.ho_ten || 'Người dùng OLODO',
              authorAvatar: normalizeBackendMediaUrl(authorProfile.anh_dai_dien) || 'https://i.pravatar.cc/50',
              title: postDetail.tieu_de,
              description: postDetail.mo_ta || '',
              price: formattedPrice,
              location: postDetail.vi_tri,
              time: new Date(postDetail.thoi_gian_tao).toLocaleDateString('vi-VN'),
              imageUrls: limitedImageUrls,
              liked: !!userLike,
              likeCount: likesData.length,
              commentCount: commentCount,
              userLikeId: userLike?.ID_Like,
            };

            // Cache the complete hydrated post
            postDetailCache.set(cacheKey, hydratedPost);
            return hydratedPost;
          } catch (error) {
            console.warn(`Error hydrating post ${reco.ID_BaiDang}:`, error);
            return null;
          }
        }),
      );

      // Filter successful results
      return results
        .filter((result) => result.status === 'fulfilled' && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<HydratedPost>).value);
    },
    [token, userId, fetchUserInfo],
  );

  // Optimized fetchInitialData with better error handling and retry logic
  const fetchInitialData = useCallback(
    async (isRefresh = false) => {
      if (!token || !userId) return;

      if (isRefresh) {
        setIsRefreshing(true);
        setHasError(false);
        // Clear caches on refresh
        userInfoCache.clear();
        postDetailCache.clear();
        imageUrlCache.clear();
        pendingRequests.clear();
        // Reset states
        setCurrentPage(0);
        setFeedData([]);
        setAllRecommendations([]);
      } else {
        setIsLoading(true);
        setHasError(false);
      }

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Create timeout controller for recommendations
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // Tăng timeout

          const recoResponse = await fetch(`${API_URLS.RECOMMENDATIONS}${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Kiểm tra status 0 (network error)
          if (recoResponse.status === 0) {
            throw new Error('Network Error: Không thể kết nối đến máy chủ');
          }

          if (!recoResponse.ok) {
            throw new Error(`Failed to fetch recommendations: ${recoResponse.status}`);
          }

          const recommendations: Recommendation[] = await recoResponse.json();
          setAllRecommendations(recommendations);

          if (recommendations.length > 0) {
            // Load initial chunk with optimized processing
            const firstChunk = recommendations.slice(0, INITIAL_LOAD_COUNT);
            const initialPosts = await hydratePostChunk(firstChunk);

            // Create feed with unique posts
            const finalFeed: FeedItem[] = [];
            initialPosts.forEach((post, index) => {
              finalFeed.push(post);
              if (index === 0) finalFeed.push(MOCK_PEOPLE_YOU_MAY_KNOW);
            });

            setFeedData(finalFeed);
            setCurrentPage(1);

            // Preload next chunk in background for better UX
            if (recommendations.length > INITIAL_LOAD_COUNT) {
              setTimeout(() => {
                const nextChunk = recommendations.slice(
                  INITIAL_LOAD_COUNT,
                  INITIAL_LOAD_COUNT + POSTS_PER_CHUNK,
                );
                hydratePostChunk(nextChunk).then((preloadedPosts) => {
                  // Cache preloaded posts for instant loading
                  preloadedPosts.forEach((post) => {
                    const cacheKey = `post_${post.ID_BaiDang}`;
                    postDetailCache.set(cacheKey, post);
                  });
                });
              }, 2000);
            }
          } else {
            setFeedData([MOCK_PEOPLE_YOU_MAY_KNOW]);
          }

          // Success - break out of retry loop
          break;
        } catch (error: any) {
          retryCount++;
          console.warn(
            `❌ Fetch initial data attempt ${retryCount}/${maxRetries} failed:`,
            error.message,
          );

          if (retryCount >= maxRetries) {
            console.error('❌ All retry attempts failed for fetchInitialData');
            setHasError(true);
            Toast.show({
              type: 'error',
              text1: 'Lỗi tải dữ liệu',
              text2: 'Vui lòng kiểm tra kết nối mạng và thử lại',
            });

            // Show cached data if available
            if (feedData.length > 0 && !isRefresh) {
              Toast.show({ type: 'info', text1: 'Hiển thị dữ liệu đã lưu' });
            } else {
              // Show empty state with retry option
              setFeedData([MOCK_PEOPLE_YOU_MAY_KNOW]);
            }
            break;
          }

          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [token, userId, hydratePostChunk, feedData.length],
  );

  // Optimized handleLoadMore with smart caching and throttling
  const handleLoadMore = useCallback(async () => {
    const now = Date.now();

    // More restrictive conditions to prevent frequent loading
    if (
      isLoadingMore ||
      isRefreshing ||
      currentPage * POSTS_PER_CHUNK >= allRecommendations.length ||
      feedData.length === 0 ||
      now - lastLoadTime < 1500 // Reduced throttle time for better UX
    ) {
      return;
    }

    const remainingPosts = allRecommendations.length - currentPage * POSTS_PER_CHUNK;
    if (remainingPosts <= 0) return;

    setLastLoadTime(now);
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const start = currentPage * POSTS_PER_CHUNK;
      const end = start + POSTS_PER_CHUNK;

      const nextChunk = allRecommendations.slice(start, end);

      // Check cache first for instant loading
      const cachedPosts: HydratedPost[] = [];
      const uncachedIds: string[] = [];

      nextChunk.forEach((reco) => {
        const cacheKey = `post_${reco.ID_BaiDang}`;
        if (postDetailCache.has(cacheKey)) {
          cachedPosts.push(postDetailCache.get(cacheKey)!);
        } else {
          uncachedIds.push(reco.ID_BaiDang);
        }
      });

      // Only fetch uncached posts
      let newPosts = [...cachedPosts];
      if (uncachedIds.length > 0) {
        const uncachedChunk = nextChunk.filter((reco) => uncachedIds.includes(reco.ID_BaiDang));
        const fetchedPosts = await hydratePostChunk(uncachedChunk);
        newPosts.push(...fetchedPosts);
      }

      if (newPosts.length > 0) {
        setFeedData((prevData) => {
          const existingPostIds = new Set(
            prevData
              .filter((item) => item.type === 'post')
              .map((item) => (item as HydratedPost).ID_BaiDang),
          );

          const uniqueNewPosts = newPosts.filter((post) => !existingPostIds.has(post.ID_BaiDang));
          return [...prevData, ...uniqueNewPosts];
        });
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more:', error);
      Toast.show({ type: 'error', text1: 'Lỗi tải thêm dữ liệu' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    isRefreshing,
    currentPage,
    allRecommendations,
    hydratePostChunk,
    feedData.length,
    lastLoadTime,
  ]);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const [tokenResult, userInfoResult] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('userInfo'),
        ]);
        setToken(tokenResult || '');
        const userInfo = userInfoResult ? JSON.parse(userInfoResult) : {};
        const currentUserId = userInfo.ID_NguoiDung ? String(userInfo.ID_NguoiDung) : '';
        setUserId(currentUserId);
        if (currentUserId) {
          setCurrentUserProfile({
            ID_NguoiDung: currentUserId,
            ho_ten: userInfo.ho_ten || 'Người dùng OLODO',
            anh_dai_dien:
              normalizeBackendMediaUrl(userInfo.anh_dai_dien) || getDefaultAvatar(currentUserId),
            email: userInfo.email,
          });
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      }
    };
    void loadAuthData();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncCurrentUserProfile = async () => {
      if (!isFocused || !token || !userId) {
        return;
      }

      try {
        const latestProfile = await fetchUserInfo(userId, token);
        if (!isMounted) {
          return;
        }

        const normalizedAvatar =
          normalizeBackendMediaUrl(latestProfile.anh_dai_dien) || getDefaultAvatar(userId);

        setCurrentUserProfile({
          ID_NguoiDung: String(latestProfile.ID_NguoiDung || userId),
          ho_ten: latestProfile.ho_ten || 'Người dùng OLODO',
          anh_dai_dien: normalizedAvatar,
          email: latestProfile.email,
        });

        const storedUserInfo = await AsyncStorage.getItem('userInfo');
        if (!storedUserInfo || !isMounted) {
          return;
        }

        const parsedStoredUser = JSON.parse(storedUserInfo);
        await AsyncStorage.setItem(
          'userInfo',
          JSON.stringify({
            ...parsedStoredUser,
            ho_ten: latestProfile.ho_ten || parsedStoredUser.ho_ten,
            anh_dai_dien: latestProfile.anh_dai_dien || parsedStoredUser.anh_dai_dien,
            email: latestProfile.email || parsedStoredUser.email,
          }),
        );
      } catch (error) {
        console.error('Error syncing current user profile:', error);
      }
    };

    void syncCurrentUserProfile();

    return () => {
      isMounted = false;
    };
  }, [fetchUserInfo, isFocused, token, userId]);

  useEffect(() => {
    let mounted = true;
    if (isFocused && token && userId && allRecommendations.length === 0 && mounted) {
      fetchInitialData();
    }
    return () => {
      mounted = false;
    };
  }, [isFocused, token, userId, allRecommendations.length, fetchInitialData]);

  // Optimized handleLike with debouncing
  const handleLike = useCallback(
    async (postId: string) => {
      if (!token || !userId) {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng đăng nhập lại.' });
        return;
      }

      const originalFeedData = [...feedData];
      const postIndex = feedData.findIndex(
        (item) => item.type === 'post' && item.ID_BaiDang === postId,
      );
      if (postIndex === -1) return;

      const postToUpdate = { ...feedData[postIndex] } as HydratedPost;
      const isCurrentlyLiked = postToUpdate.liked;

      // Optimistic update
      const updatedPost = {
        ...postToUpdate,
        liked: !isCurrentlyLiked,
        likeCount: isCurrentlyLiked ? postToUpdate.likeCount - 1 : postToUpdate.likeCount + 1,
      };

      setFeedData((prev) => {
        const newFeed = [...prev];
        newFeed[postIndex] = updatedPost;
        return newFeed;
      });

      try {
        if (isCurrentlyLiked) {
          let likeIdToDelete = postToUpdate.userLikeId;
          if (!likeIdToDelete) {
            const likeController = new AbortController();
            const likeTimeoutId = setTimeout(() => likeController.abort(), 5000);

            const likeResponse = await fetch(`${API_URLS.LIKE_BY_POST}${postId}`, {
              headers: { Authorization: `Bearer ${token}` },
              signal: likeController.signal,
            });

            clearTimeout(likeTimeoutId);
            const likesPayload = likeResponse.ok ? await likeResponse.json() : [];
            const userLike = findUserLike(likesPayload, userId) as Like | undefined;
            likeIdToDelete = userLike?.ID_Like;
          }

          if (!likeIdToDelete) throw new Error('Không tìm thấy ID_Like để xóa');

          const deleteController = new AbortController();
          const deleteTimeoutId = setTimeout(() => deleteController.abort(), 5000);

          await fetch(`${API_URLS.LIKE_DELETE}${likeIdToDelete}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            signal: deleteController.signal,
          });

          clearTimeout(deleteTimeoutId);
        } else {
          const createController = new AbortController();
          const createTimeoutId = setTimeout(() => createController.abort(), 5000);

          const response = await fetch(API_URLS.LIKE_CREATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ID_BaiDang: postId, ID_NguoiDung: userId }),
            signal: createController.signal,
          });

          clearTimeout(createTimeoutId);
          if (!response.ok) throw new Error('Tạo like thất bại');

          const newLikeData = await response.json();
          setFeedData((prev) => {
            const newFeed = [...prev];
            const finalPost = newFeed[postIndex] as HydratedPost;
            newFeed[postIndex] = { ...finalPost, userLikeId: newLikeData.ID_Like };
            return newFeed;
          });
        }
      } catch (error) {
        console.error('❌ Lỗi khi like/unlike:', error);
        Toast.show({ type: 'error', text1: 'Thao tác thất bại' });
        setFeedData(originalFeedData);
      }
    },
    [token, userId, feedData],
  );

  // Handle report modal
  const handleOpenReportModal = useCallback((post: HydratedPost) => {
    setSelectedPost(post);
    setShowReportModal(true);
  }, []);

  // Memoized render function for better performance
  const renderFeedItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      switch (item.type) {
        case 'people_you_may_know':
          return <PeopleMayKnow />;
        case 'post':
          return <FeedPost post={item} onLike={handleLike} canPress={canPress} onReport={handleOpenReportModal} />;
        default:
          return null;
      }
    },
    [handleLike, canPress, handleOpenReportModal],
  );

  // Memoized key extractor với timestamp để đảm bảo unique
  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item.type === 'post') {
      return `${item.type}-${item.ID_BaiDang}-${index}`;
    }
    return `${item.type}-${index}`;
  }, []);

  // Memoized header for better performance
  const ListHeader = useCallback(
    () => (
      <>
        <AppHeader />
        <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
        <CreatePost currentUser={currentUserProfile} />
        <Stories currentUser={currentUserProfile} />
        <Text className="text-lg font-bold text-[#222] px-4 pt-4 pb-2">
          {activeTab === 'news' ? 'News Feed' : 'Popular Posts'}
        </Text>
      </>
    ),
    [activeTab, currentUserProfile, setActiveTab],
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={COLORS.primary} />;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#fffcef]">
        <ListHeader />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-[#777] mt-4 text-center">Đang tải dữ liệu...</Text>
          <Text className="text-[#777] mt-2 text-center text-xs">Vui lòng đợi trong giây lát</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state with retry button
  if (hasError && feedData.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-[#fffcef]">
        <ListHeader />
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.textSecondary} />
          <Text className="text-[#222] text-lg font-bold mt-4 text-center">
            Không thể tải dữ liệu
          </Text>
          <Text className="text-[#777] mt-2 text-center">
            Vui lòng kiểm tra kết nối mạng và thử lại
          </Text>
          <TouchableOpacity
            className="bg-[#7f001f] px-6 py-3 rounded-full mt-6"
            onPress={() => fetchInitialData(true)}
          >
            <Text className="text-white font-bold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fffcef]">
      <FlatList
        data={feedData}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={() => {
          // Optimized debounce for better performance
          if (loadMoreTimeout) clearTimeout(loadMoreTimeout);
          loadMoreTimeout = setTimeout(() => {
            handleLoadMore();
          }, 300); // Reduced debounce time
        }}
        onEndReachedThreshold={0.2} // Increased threshold for earlier loading
        refreshing={isRefreshing}
        onRefresh={() => fetchInitialData(true)}
        onScrollBeginDrag={() => setCanPress(false)}
        onScrollEndDrag={() => setCanPress(true)}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={3} // Reduced for better performance
        updateCellsBatchingPeriod={100} // Faster updates
        initialNumToRender={6} // Optimized initial render
        windowSize={8} // Reduced window size
        getItemLayout={undefined}
        disableVirtualization={false}
      />

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReportModal(false);
          setSelectedPost(null);
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => {
            setShowReportModal(false);
            setSelectedPost(null);
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingBottom: 30,
              maxHeight: '80%',
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#ccc',
                borderRadius: 2,
                alignSelf: 'center',
                marginVertical: 12,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {reportOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 16,
                    borderBottomWidth: 0.5,
                    borderBottomColor: '#e0e0e0',
                    alignItems: 'flex-start',
                  }}
                  onPress={() => handleReportOption(option.id)}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={option.icon as any} size={24} color="#000" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '500',
                        color: '#000',
                        marginBottom: 4,
                      }}
                    >
                      {option.title}
                    </Text>
                    {option.description ? (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#666',
                          lineHeight: 18,
                        }}
                      >
                        {option.description}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Reason Modal - Chi tiết lý do */}
      <Modal
        visible={showReportReasonModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowReportReasonModal(false);
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => {
            setShowReportReasonModal(false);
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 30,
              maxHeight: '85%',
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: '#e0e0e0',
              }}
            >
              <TouchableOpacity
                onPress={() => setShowReportReasonModal(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#000',
                }}
              >
                Báo cáo
              </Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Title and Description */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#000',
                  marginBottom: 8,
                }}
              >
                Tại sao bạn báo cáo bài viết này?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: '#666',
                  lineHeight: 20,
                }}
              >
                Nếu bạn nhìn thấy ai đó đang gặp nguy hiểm, đừng chần chừ mà hãy tìm ngay sự giúp đỡ trước khi báo cáo với Facebook.
              </Text>
            </View>

            {/* Reasons List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ paddingHorizontal: 20 }}
            >
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 16,
                    borderBottomWidth: 0.5,
                    borderBottomColor: '#e0e0e0',
                    alignItems: 'center',
                  }}
                  onPress={() => handleSelectReportReason(reason.id, reason.title)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        color: '#000',
                        marginBottom: reason.description ? 4 : 0,
                      }}
                    >
                      {reason.title}
                    </Text>
                    {reason.description ? (
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#666',
                          lineHeight: 18,
                        }}
                      >
                        {reason.description}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Chatbot Component */}
      <Chatbot />
    </SafeAreaView>
  );
};

export default HomeScreen;
