import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import FeedPost, { HydratedPost } from '../FeedPost';

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

interface Recommendation {
  ID_BaiDang: string;
  Score: number;
  isFriendPost: boolean;
  hasLiked: boolean;
  hasCommented: boolean;
}

export default function KetQuaTimKiemScreen() {
  const { query } = useLocalSearchParams<{ query: string }>();
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const userInfo = await AsyncStorage.getItem('userInfo');
        if (storedToken && userInfo) {
          setToken(storedToken);
          const user = JSON.parse(userInfo);
          setUserId(user.ID_NguoiDung);
        }
      } catch (error) {
        console.error('Error loading credentials:', error);
      }
    };
    loadCredentials();
  }, []);

  const fetchUserInfo = useCallback(
    async (userIdToFetch: string) => {
      try {
        const response = await fetch(`${API_URLS.GET_USER_INFO}${userIdToFetch}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return { ho_ten: 'Người dùng', anh_dai_dien: null };
        const data = await response.json();
        return data.user || { ho_ten: 'Người dùng', anh_dai_dien: null };
      } catch (error) {
        return { ho_ten: 'Người dùng', anh_dai_dien: null };
      }
    },
    [token],
  );

  const hydratePosts = useCallback(
    async (recommendations: Recommendation[]) => {
      if (!token || !userId) return [];

      const results = await Promise.allSettled(
        recommendations.map(async (reco) => {
          try {
            // 1. Get Post Details
            const postResponse = await fetch(`${API_URLS.GET_POST_BY_ID}${reco.ID_BaiDang}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!postResponse.ok) return null;
            const postDetail = await postResponse.json();

            const searchText = query?.toLowerCase() || '';
            const title = postDetail.tieu_de?.toLowerCase() || '';
            const description = postDetail.mo_ta?.toLowerCase() || '';
            
            if (!title.includes(searchText) && !description.includes(searchText)) {
              return null;
            }

            // 2. Get Author Info
            const authorProfile = await fetchUserInfo(postDetail.ID_NguoiDung);

            // 3. Get Images
            const imageResponse = await fetch(
              `${API_URLS.GET_POST_IMAGE_BY_ID}${reco.ID_BaiDang}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const postImages = imageResponse.ok ? await imageResponse.json() : [];
            
            const uploadBaseUrl = API_BASE_URL.replace('/api', '');
            const limitedImageUrls = postImages.slice(0, 5).map((img: any) => {
              const linkAnh = img.LinkAnh;
              if (linkAnh.startsWith('http://') || linkAnh.startsWith('https://')) {
                return linkAnh;
              }
              return `${uploadBaseUrl}/uploads/${linkAnh}`;
            });

 
            const [likesRes, commentsRes] = await Promise.all([
              fetch(`${API_URLS.LIKE_BY_POST}${reco.ID_BaiDang}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
              fetch(`${API_URLS.COMMENT_COUNT_BY_POST}${reco.ID_BaiDang}`, {
                headers: { Authorization: `Bearer ${token}` },
              }),
            ]);

            const likesRaw = likesRes.ok ? await likesRes.json() : [];
            const likes = Array.isArray(likesRaw) ? likesRaw : (likesRaw?.data ?? []);
            const commentCountRaw = commentsRes.ok ? await commentsRes.json() : { count: 0 };
            const commentCount: number = commentCountRaw?.count ?? 0;
            const userLike = likes.find((like: any) => like.ID_NguoiDung == userId);

            const formattedPrice = new Intl.NumberFormat('vi-VN').format(postDetail.gia || 0);

            return {
              type: 'post' as const,
              ID_BaiDang: postDetail.ID_BaiDang,
              ID_NguoiDung: postDetail.ID_NguoiDung,
              authorName: authorProfile.ho_ten || 'Người dùng OLODO',
              authorAvatar: authorProfile.anh_dai_dien || 'https://i.pravatar.cc/50',
              title: postDetail.tieu_de,
              description: postDetail.mo_ta || '',
              price: formattedPrice,
              location: postDetail.vi_tri,
              time: new Date(postDetail.thoi_gian_tao).toLocaleDateString('vi-VN'),
              imageUrls: limitedImageUrls,
              liked: !!userLike,
              likeCount: likes.length,
              commentCount: commentCount,
              userLikeId: userLike?.ID_Like,
            };
          } catch (error) {
            console.warn(`Error hydrating post ${reco.ID_BaiDang}:`, error);
            return null;
          }
        }),
      );

      return results
        .filter((result) => result.status === 'fulfilled' && result.value !== null)
        .map((result) => (result as PromiseFulfilledResult<HydratedPost>).value);
    },
    [token, userId, fetchUserInfo, query],
  );

  useEffect(() => {
    const searchPosts = async () => {
      if (!token || !userId) return;

      setIsLoading(true);
      try {
        // Fetch all recommendations
        const response = await fetch(`${API_URLS.RECOMMENDATIONS}${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const recommendations: Recommendation[] = await response.json();
          // Hydrate and filter
          const hydratedPosts = await hydratePosts(recommendations);
          setPosts(hydratedPosts);
        }
      } catch (error) {
        console.error('Error searching posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchPosts();
  }, [token, userId, query, hydratePosts]);

  const handleLike = async (postId: string) => {
    // Implement like logic if needed, or just pass a dummy function if FeedPost handles it internally via API but here we need to update state
    // For simplicity, we might skip full like implementation here or copy it from home.tsx
    console.log('Like pressed', postId);
  };

  const handleReport = (post: HydratedPost) => {
    console.log('Report pressed', post.ID_BaiDang);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kết quả cho "{query}"</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7f001f" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.ID_BaiDang}
          renderItem={({ item }) => (
            <FeedPost
              post={item}
              onLike={handleLike}
              canPress={true}
              onReport={handleReport}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy kết quả nào.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
