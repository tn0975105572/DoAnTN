import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';

// --- Tái sử dụng các hằng số và interfaces từ HomeScreen ---
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const API_URLS = {
  GET_POST_BY_ID: `${API_BASE_URL}/api/baidang/getById/`,
  GET_POST_IMAGE_BY_ID: `${API_BASE_URL}/api/baidang_anh/getById/`,
  GET_USER_INFO: `${API_BASE_URL}/api/nguoidung/get/`,
  LIKE_BY_POST: `${API_BASE_URL}/api/likebaidang/getLikesByPostId/`,
  COMMENT_BY_POST: `${API_BASE_URL}/api/binhluanbaidang/getByID_BaiDang/`,
  LIKE_CREATE: `${API_BASE_URL}/api/likebaidang/create`,
  LIKE_DELETE: `${API_BASE_URL}/api/likebaidang/delete/`,
};

const COLORS = {
  primary: '#7f001f',
  background: '#fffcef',
  white: '#FFFFFF',
  text: '#222222',
  textSecondary: '#777777',
};

// Interface cho bài đăng đã được "hydrate" (làm đầy đủ dữ liệu)
interface HydratedPost {
  ID_BaiDang: string;
  ID_NguoiDung: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  description: string;
  price: string;
  location: string;
  time: string;
  imageUrls: string[];
  liked: boolean;
  likeCount: number;
  commentCount: number;
  userLikeId?: string;
}

// --- Component Header cho màn hình ---
const ScreenHeader = ({ authorName }: { authorName: string }) => {
  const router = useRouter();
  return (
    <View className="flex-row items-center p-4 bg-white border-b border-[#EEEEEE]">
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <Text className="text-lg font-bold text-center flex-1 ml-[-24px]">{authorName}</Text>
    </View>
  );
};

// --- Component chính của màn hình chi tiết ---
const PostDetailScreen = () => {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter(); // Khai báo router ở đây để dùng chung
  const [post, setPost] = useState<HydratedPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hàm fetchUserInfo (tương tự HomeScreen)
  const fetchUserInfo = async (id: string, token: string) => {
    try {
      const response = await fetch(`${API_URLS.GET_USER_INFO}${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!postId) {
        setError('Không tìm thấy ID bài đăng.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
        const currentUserId = userInfo.ID_NguoiDung ? String(userInfo.ID_NguoiDung) : '';

        if (!token) throw new Error('Yêu cầu đăng nhập.');

        // Load persisted like states from AsyncStorage
        let persistedLikeState = null;
        try {
          const persistedLikes = await AsyncStorage.getItem('persisted_likes');
          if (persistedLikes) {
            const likeStates = JSON.parse(persistedLikes);
            persistedLikeState = likeStates[postId];
          }
        } catch (error) {
          console.warn('Error loading persisted likes:', error);
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [postDetailRes, postImageRes, likeRes, commentRes] = await Promise.all([
          fetch(`${API_URLS.GET_POST_BY_ID}${postId}`, { headers }),
          fetch(`${API_URLS.GET_POST_IMAGE_BY_ID}${postId}`, { headers }),
          fetch(`${API_URLS.LIKE_BY_POST}${postId}`, { headers }),
          fetch(`${API_URLS.COMMENT_BY_POST}${postId}`, { headers }),
        ]);

        if (!postDetailRes.ok) throw new Error('Không thể tải chi tiết bài đăng.');

        const postDetail = await postDetailRes.json();
        const postImages = postImageRes.ok ? await postImageRes.json() : [];

        // Handle new like API response format
        let likes = [];
        let likeCount = 0;
        let userLike = null;
        let isLiked = false;
        let userLikeId = null;

        if (likeRes.ok) {
          const likeData = await likeRes.json();
          if (likeData.success && likeData.data) {
            likes = likeData.data;
            likeCount = likeData.total || likes.length;
            userLike = likes.find((like: any) => String(like.ID_NguoiDung) === currentUserId);

            // Use persisted state if available, otherwise use API data
            if (persistedLikeState) {
              isLiked = persistedLikeState.da_thich;
              userLikeId = persistedLikeState.userLikeId;
            } else {
              isLiked = !!userLike;
              userLikeId = userLike?.ID_Like;
            }
          }
        } else {
          // If API fails but we have persisted state, use it
          if (persistedLikeState) {
            isLiked = persistedLikeState.da_thich;
            userLikeId = persistedLikeState.userLikeId;
            likeCount = 1; // Assume at least 1 like if user liked it
          }
        }

        // Handle comment API response format
        let comments = [];
        let commentCount = 0;

        if (commentRes.ok) {
          const commentData = await commentRes.json();
          comments = Array.isArray(commentData) ? commentData : [];
          commentCount = comments.length;
        }

        const authorProfile = await fetchUserInfo(postDetail.ID_NguoiDung, token);

        const rawPrice = parseFloat(postDetail.gia) || 0;
        const formattedPrice = rawPrice.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

        const hydratedPost: HydratedPost = {
          ID_BaiDang: postDetail.ID_BaiDang,
          ID_NguoiDung: postDetail.ID_NguoiDung,
          authorName: authorProfile?.ho_ten || 'Người dùng OLODO',
          authorAvatar: authorProfile?.anh_dai_dien || 'https://i.pravatar.cc/50',
          title: postDetail.tieu_de,
          description: postDetail.mo_ta || '',
          price: formattedPrice,
          location: postDetail.vi_tri,
          time: new Date(postDetail.thoi_gian_tao).toLocaleDateString('vi-VN'),
          imageUrls: postImages.map((img: any) => {
            const linkAnh = img.LinkAnh;
            // If it's already a full URL (starts with http/https), use it directly
            if (linkAnh.startsWith('http://') || linkAnh.startsWith('https://')) {
              return linkAnh;
            }
            // Otherwise, construct the full URL
            const baseUrl = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.0.108:3000';
            const API_BASE_URL = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
            const uploadBaseUrl = API_BASE_URL.replace('/api', '');
            return `${uploadBaseUrl}/uploads/${linkAnh}`;
          }),
          liked: isLiked,
          likeCount: likeCount,
          commentCount: commentCount,
          userLikeId: userLikeId,
        };

        setPost(hydratedPost);
      } catch (e: any) {
        setError(e.message || 'Đã xảy ra lỗi khi tải dữ liệu.');
        console.error('Lỗi tải chi tiết bài đăng:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostDetails();
  }, [postId]);

  // --- SỬA: Thêm hàm xử lý Like ---
  const handleLike = async () => {
    if (!post) return;

    const originalPost = { ...post };
    const isCurrentlyLiked = post.liked;

    // Cập nhật UI ngay lập tức (Optimistic Update)
    const updatedPost = {
      ...post,
      liked: !isCurrentlyLiked,
      likeCount: isCurrentlyLiked ? post.likeCount - 1 : post.likeCount + 1,
    };
    setPost(updatedPost);

    // Save to AsyncStorage immediately for persistence
    try {
      const persistedLikes = await AsyncStorage.getItem('persisted_likes');
      const likeStates = persistedLikes ? JSON.parse(persistedLikes) : {};

      if (!isCurrentlyLiked) {
        // Like - save state
        likeStates[post.ID_BaiDang] = {
          da_thich: true,
          userLikeId: undefined, // Will be updated after API call
        };
      } else {
        // Unlike - remove state
        delete likeStates[post.ID_BaiDang];
      }

      await AsyncStorage.setItem('persisted_likes', JSON.stringify(likeStates));
    } catch (error) {
      console.warn('Error saving like state to AsyncStorage:', error);
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoStr ? JSON.parse(userInfoStr) : {};
      const userId = userInfo.ID_NguoiDung ? String(userInfo.ID_NguoiDung) : '';

      if (!token || !userId) throw new Error('Không tìm thấy thông tin người dùng.');

      if (isCurrentlyLiked) {
        // Unlike: Gửi request DELETE
        let likeIdToDelete = originalPost.userLikeId;

        if (!likeIdToDelete) {
          // Try to get like ID from API
          const likeResponse = await fetch(`${API_URLS.LIKE_BY_POST}${post.ID_BaiDang}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (likeResponse.ok) {
            const likeData = await likeResponse.json();
            if (likeData.success && likeData.data) {
              const userLike = likeData.data.find(
                (like: any) => String(like.ID_NguoiDung) === userId,
              );
              likeIdToDelete = userLike?.ID_Like;
            }
          }
        }

        if (!likeIdToDelete) throw new Error('Không tìm thấy ID_Like để xóa.');

        await fetch(`${API_URLS.LIKE_DELETE}${likeIdToDelete}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        // Update AsyncStorage after successful unlike
        try {
          const persistedLikes = await AsyncStorage.getItem('persisted_likes');
          const likeStates = persistedLikes ? JSON.parse(persistedLikes) : {};
          delete likeStates[post.ID_BaiDang];
          await AsyncStorage.setItem('persisted_likes', JSON.stringify(likeStates));
        } catch (error) {
          console.warn('Error updating AsyncStorage after unlike:', error);
        }
      } else {
        // Like: Gửi request POST
        const response = await fetch(API_URLS.LIKE_CREATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ID_BaiDang: post.ID_BaiDang, ID_NguoiDung: userId }),
        });
        if (!response.ok) throw new Error('Tạo like thất bại');
        const newLikeData = await response.json();

        // Cập nhật lại userLikeId cho lần unlike sau
        setPost((prev) => (prev ? { ...prev, userLikeId: newLikeData.ID_Like } : null));

        // Update AsyncStorage after successful like
        try {
          const persistedLikes = await AsyncStorage.getItem('persisted_likes');
          const likeStates = persistedLikes ? JSON.parse(persistedLikes) : {};
          likeStates[post.ID_BaiDang] = {
            da_thich: true,
            userLikeId: newLikeData.ID_Like,
          };
          await AsyncStorage.setItem('persisted_likes', JSON.stringify(likeStates));
        } catch (error) {
          console.warn('Error updating AsyncStorage after like:', error);
        }
      }
    } catch (error) {
      console.error('❌ Lỗi khi like/unlike:', error);
      Toast.show({ type: 'error', text1: 'Thao tác thất bại' });
      // Hoàn tác lại nếu có lỗi
      setPost(originalPost);

      // Revert AsyncStorage state
      try {
        const persistedLikes = await AsyncStorage.getItem('persisted_likes');
        const likeStates = persistedLikes ? JSON.parse(persistedLikes) : {};
        if (isCurrentlyLiked) {
          likeStates[post.ID_BaiDang] = {
            da_thich: true,
            userLikeId: originalPost.userLikeId,
          };
        } else {
          delete likeStates[post.ID_BaiDang];
        }
        await AsyncStorage.setItem('persisted_likes', JSON.stringify(likeStates));
      } catch (error) {
        console.warn('Error reverting AsyncStorage state:', error);
      }
    }
  };

  // --- SỬA: Hàm onShare được tách riêng ---
  const onShare = async () => {
    if (!post) return;
    try {
      const shareMessage = `Hãy xem bài đăng "${post.title}" của ${post.authorName} trên OLODO!`;
      await Share.share({ message: shareMessage });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Chia sẻ thất bại' });
      console.error('Lỗi khi chia sẻ:', error.message);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ScreenHeader authorName="Lỗi" />
        <Text className="text-center text-red-500">{error || 'Không thể hiển thị bài đăng.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScreenHeader authorName={post.authorName} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Phần thông tin tác giả */}
        <View className="flex-row items-center p-4">
          <Image className="w-12 h-12 rounded-full mr-4" source={{ uri: post.authorAvatar }} />
          <View className="flex-1">
            <Text className="text-base font-bold text-[#222]">{post.authorName}</Text>
            <Text className="text-xs text-[#777]">
              {post.time} | {post.location}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Phần nội dung bài đăng */}
        <View className="px-4 pb-4">
          <Text className="text-xl font-bold text-[#222] leading-7 mb-2">{post.title}</Text>
          <Text className="text-base text-[#777] leading-6 mb-3">{post.description}</Text>
          <Text className="text-xl font-bold text-red-600">{post.price} VNĐ</Text>
        </View>

        {/* --- PHẦN HIỂN THỊ HÌNH ẢNH --- */}
        <View>
          {post.imageUrls.map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              className="w-full my-1"
              style={{ aspectRatio: 1 }}
              resizeMode="cover"
            />
          ))}
        </View>

        {/* Phần thống kê like, comment */}
        <View className="flex-row px-4 py-3">
          <TouchableOpacity
            onPress={() => {
              if (post.likeCount > 0) {
                router.push({
                  pathname: '/components/BaiDang/danhsachlike',
                  params: { postId: post.ID_BaiDang },
                });
              }
            }}
            disabled={post.likeCount === 0}
          >
            <Text className={`text-sm text-[#777] mr-4 ${post.likeCount > 0 ? 'underline' : ''}`}>
              {post.likeCount} Likes
            </Text>
          </TouchableOpacity>
          <Text className="text-sm text-[#777]">{post.commentCount} Comments</Text>
        </View>

        {/* Dải phân cách */}
        <View className="h-[1px] bg-[#EEE] mx-4" />

        {/* --- SỬA: CÁC NÚT TƯƠNG TÁC ĐÃ ĐƯỢC GÁN ĐÚNG CHỨC NĂNG --- */}
        <View className="flex-row justify-around p-3">
          <TouchableOpacity className="flex-row items-center" onPress={handleLike}>
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={24}
              color={post.liked ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              className={`ml-2 text-base font-medium ${post.liked ? 'text-[#7f001f]' : 'text-[#777]'}`}
            >
              {post.liked ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center"
            onPress={() =>
              router.push({
                pathname: '/components/BaiDang/binhluanbaidang',
                params: { postId: post.ID_BaiDang },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.textSecondary} />
            <Text className="ml-2 text-base font-medium text-[#777]">Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => {
              // Navigate to chat with post sharing form
              router.push({
                pathname: '/components/TinNhan/chitiettinnhan',
                params: {
                  userId: post.ID_NguoiDung,
                  userName: post.authorName,
                  userAvatar: post.authorAvatar,
                  hasExistingConversation: 'false',
                  sharePost: 'true',
                  postId: post.ID_BaiDang,
                  postTitle: post.title,
                  postImage: post.imageUrls[0] || '',
                },
              });
            }}
          >
            <Ionicons name="chatbox-outline" size={24} color={COLORS.primary} />
            <Text className="ml-2 text-base font-medium text-[#7f001f]">Message</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center" onPress={onShare}>
            <Ionicons name="share-social-outline" size={24} color={COLORS.textSecondary} />
            <Text className="ml-2 text-base font-medium text-[#777]">Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PostDetailScreen;
