import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, AntDesign, FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import PostMenu from '../BaiDang/PostMenu';
import { normalizeBackendMediaUrl } from '../../../utils/mediaUrl';
import { extractLikeRecords, findUserLike } from '../../../utils/likeUtils';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

interface BaiDangCanHanProps {
  userData: {
    ID_NguoiDung: string;
    ho_ten: string;
    anh_dai_dien?: string;
  };
}

interface BaiDang {
  ID_BaiDang: string;
  tieu_de: string;
  mo_ta: string;
  thoi_gian_tao: string;
  gia?: string;
  vi_tri?: string;
  ID_DanhMuc?: string;
  ID_LoaiBaiDang?: string;
  SoLuongLike: number;
  SoLuongBinhLuan: number;
  SoLuongAnh: number;
  TenNguoiDung: string;
  anh_dai_dien: string;
  TenLoaiBaiDang: string;
  TenDanhMuc: string;
  DanhSachAnh?: string[];
  images?: string[];
  da_thich?: boolean;
  userLikeId?: string;
}

const PostDescription: React.FC<{ content: string }> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View className="px-4 mt-1">
      <Text className="text-base" numberOfLines={isExpanded ? undefined : 3}>
        {content}
      </Text>
      <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} className="mt-1">
        <Text className="text-[#7f001f] font-medium">
          {isExpanded ? 'Thu gọn' : 'Xem thêm'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const BaiDangCanHan: React.FC<BaiDangCanHanProps> = ({ userData }) => {
  const [baiDang, setBaiDang] = useState<BaiDang[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const activeProfileIdRef = useRef<string>('');

  // Load persisted like states from AsyncStorage
  const loadPersistedLikeStates = useCallback(async () => {
    try {
      const persistedLikes = await AsyncStorage.getItem('persisted_likes');
      return persistedLikes ? JSON.parse(persistedLikes) : {};
    } catch (error) {
      console.error('Error loading persisted likes:', error);
      return {};
    }
  }, []);

  // Save like states to AsyncStorage
  const saveLikeStates = useCallback(
    async (likeStates: Record<string, { da_thich: boolean; userLikeId?: string }>) => {
      try {
        await AsyncStorage.setItem('persisted_likes', JSON.stringify(likeStates));
      } catch (error) {
        console.error('Error saving like states:', error);
      }
    },
    [],
  );

  // Clear persisted like states (call when user logs out)
  // const clearPersistedLikeStates = useCallback(async () => {
  //   try {
  //     await AsyncStorage.removeItem('persisted_likes');
  //   } catch (error) {
  //     console.error('Error clearing persisted likes:', error);
  //   }
  // }, []);

  const fetchBaiDang = useCallback(async () => {
    const targetUserId = String(userData.ID_NguoiDung || '').trim();

    if (!targetUserId) {
      setBaiDang([]);
      setError('Không tìm thấy người dùng để tải bài đăng.');
      setIsLoading(false);
      return;
    }

    activeProfileIdRef.current = targetUserId;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoString ? JSON.parse(userInfoString) : null;

      if (!token) {
        throw new Error('Không tìm thấy token');
      }

      // Load persisted like states first
      const persistedLikes = await loadPersistedLikeStates();

      const baiDangApiUrl = `${API_BASE_URL}/api/baidang/getByUserId/${targetUserId}`;

      const response = await fetch(baiDangApiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Lỗi khi tải bài đăng: ${response.status}`);
      }

      const data = await response.json();
      const rawPosts = Array.isArray(data.data) ? data.data : [];
      const ownerPosts = rawPosts.filter(
        (item: any) => String(item?.ID_NguoiDung || '').trim() === targetUserId,
      );

      // Process images and fetch like status for each post
      const processedData = await Promise.all(
        ownerPosts.map(async (item: any) => {
          // Validate ID_BaiDang
          if (!item.ID_BaiDang) {
            return null;
          }

          const processedImages =
            item.DanhSachAnh?.map((img: string) => {
              return normalizeBackendMediaUrl(img);
            }) || [];

          // Fetch like status for current user
          let da_thich = false;
          let userLikeId = null;

          // Check persisted state first
          const persistedState = persistedLikes[item.ID_BaiDang];
          if (persistedState) {
            da_thich = persistedState.da_thich;
            userLikeId = persistedState.userLikeId;
          }

          if (userInfo && !persistedState) {
            try {
              const apiUrl = `${API_BASE_URL}/api/likebaidang/getByPostId/${item.ID_BaiDang}`;

              const likeResponse = await fetch(apiUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (likeResponse.ok) {
                const likesPayload = await likeResponse.json();
                const likes = extractLikeRecords(likesPayload);

                // Find if current user has liked this post
                const userLike = findUserLike(likesPayload, userInfo.ID_NguoiDung);

                if (userLike) {
                  da_thich = true;
                  userLikeId = userLike.ID_Like;
                }
              }
            } catch (likeError) {
              console.warn('Error fetching like status:', likeError);
            }
          }

          return {
            ...item,
            images: processedImages,
            da_thich,
            userLikeId,
          };
        }),
      );

      // Filter out null items (posts without ID_BaiDang)
      const validData = processedData.filter((item) => item !== null);

      if (activeProfileIdRef.current === targetUserId) {
        setBaiDang(validData);
      }
    } catch (err: any) {
      if (activeProfileIdRef.current === targetUserId) {
        setError(err.message);
      }
    } finally {
      if (activeProfileIdRef.current === targetUserId) {
        setIsLoading(false);
      }
    }
  }, [userData.ID_NguoiDung, loadPersistedLikeStates]);

  // Refresh like status for a specific post
  const refreshLikeStatus = useCallback(async (postId: string) => {
    try {
      if (!postId) {
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoString ? JSON.parse(userInfoString) : null;

      if (!token || !userInfo) {
        return;
      }

      const apiUrl = `${API_BASE_URL}/api/likebaidang/getByPostId/${postId}`;

      const likeResponse = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (likeResponse.ok) {
        const likesPayload = await likeResponse.json();
        const likes = extractLikeRecords(likesPayload);

        const userLike = findUserLike(likesPayload, userInfo.ID_NguoiDung);

        setBaiDang((prev) =>
          prev.map((post) =>
            post.ID_BaiDang === postId
              ? {
                ...post,
                da_thich: !!userLike,
                userLikeId: userLike?.ID_Like || null,
                SoLuongLike: likes.length,
              }
              : post,
          ),
        );
      }
    } catch (error) {
      console.error('Error refreshing like status:', error);
    }
  }, []);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
        if (userInfo?.ID_NguoiDung) {
          setCurrentUserId(String(userInfo.ID_NguoiDung));
        }
      } catch (error) {
        console.error('Error loading current user:', error);
      }
    };

    setBaiDang([]);
    setError(null);
    setIsLoading(true);
    loadCurrentUser();
    fetchBaiDang();
  }, [userData.ID_NguoiDung, fetchBaiDang]);

  // Refresh like status when component mounts or user changes
  useEffect(() => {
    if (baiDang.length > 0) {
      baiDang.forEach((post, index) => {
        if (!post.ID_BaiDang) {
          return;
        }
        refreshLikeStatus(post.ID_BaiDang);
      });
    }
  }, [baiDang, refreshLikeStatus]);

  // Clear persisted likes when user changes (optional - uncomment if needed)
  // useEffect(() => {
  //   clearPersistedLikeStates();
  // }, [userData.ID_NguoiDung, clearPersistedLikeStates]);

  // Export clearPersistedLikeStates for use in logout flow
  // clearPersistedLikeStates();

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    return postDate.toLocaleDateString('vi-VN');
  };

  // Optimized handleLike with optimistic updates like home.tsx
  const handleLike = useCallback(
    async (baiDangId: string) => {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = userInfoString ? JSON.parse(userInfoString) : null;

      if (!token || !userInfo) {
        Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Vui lòng đăng nhập lại.' });
        return;
      }

      // Find the post to update
      const postIndex = baiDang.findIndex((bd) => bd.ID_BaiDang === baiDangId);
      if (postIndex === -1) return;

      const postToUpdate = { ...baiDang[postIndex] };
      const isCurrentlyLiked = postToUpdate.da_thich || false;

      // Store original data for rollback
      const originalBaiDang = [...baiDang];

      // Optimistic update
      const updatedPost = {
        ...postToUpdate,
        da_thich: !isCurrentlyLiked,
        SoLuongLike: isCurrentlyLiked ? postToUpdate.SoLuongLike - 1 : postToUpdate.SoLuongLike + 1,
      };

      setBaiDang((prev) => {
        const newBaiDang = [...prev];
        newBaiDang[postIndex] = updatedPost;
        return newBaiDang;
      });

      // Save to AsyncStorage immediately for persistence
      const currentLikeStates = await loadPersistedLikeStates();
      currentLikeStates[baiDangId] = {
        da_thich: !isCurrentlyLiked,
        userLikeId: !isCurrentlyLiked ? undefined : updatedPost.userLikeId,
      };
      await saveLikeStates(currentLikeStates);

      try {
        if (isCurrentlyLiked) {
          // Unlike - find and delete like
          let likeIdToDelete = postToUpdate.userLikeId;
          if (!likeIdToDelete) {
            const likeController = new AbortController();
            const likeTimeoutId = setTimeout(() => likeController.abort(), 5000);

            const apiUrl = `${API_BASE_URL}/api/likebaidang/getByPostId/${baiDangId}`;

            const likeResponse = await fetch(apiUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              signal: likeController.signal,
            });

            clearTimeout(likeTimeoutId);
            const likesPayload = likeResponse.ok ? await likeResponse.json() : [];
            const userLike = findUserLike(likesPayload, userInfo.ID_NguoiDung);
            likeIdToDelete = userLike?.ID_Like;
          }

          if (!likeIdToDelete) throw new Error('Không tìm thấy ID_Like để xóa');

          const deleteController = new AbortController();
          const deleteTimeoutId = setTimeout(() => deleteController.abort(), 5000);

          await fetch(`${API_BASE_URL}/api/likebaidang/delete/${likeIdToDelete}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: deleteController.signal,
          });

          clearTimeout(deleteTimeoutId);

          // Update AsyncStorage after successful unlike
          const currentLikeStates = await loadPersistedLikeStates();
          delete currentLikeStates[baiDangId];
          await saveLikeStates(currentLikeStates);
        } else {
          // Like - create new like
          const createController = new AbortController();
          const createTimeoutId = setTimeout(() => createController.abort(), 5000);

          const likePayload = {
            ID_BaiDang: baiDangId,
            ID_NguoiDung: userInfo.ID_NguoiDung,
          };

          try {
            const response = await fetch(`${API_BASE_URL}/api/likebaidang/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(likePayload),
              signal: createController.signal,
            });

            clearTimeout(createTimeoutId);

            if (!response.ok) {
              const errorText = await response.text();

              // Check if it's a duplicate entry error
              if (response.status === 500 && errorText.includes('ER_DUP_ENTRY')) {
                // Fetch the existing like to get the ID
                try {
                  const apiUrl = `${API_BASE_URL}/api/likebaidang/getByPostId/${baiDangId}`;

                  const likeResponse = await fetch(apiUrl, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  });

                  if (likeResponse.ok) {
                    const likesPayload = await likeResponse.json();

                    const userLike = findUserLike(likesPayload, userInfo.ID_NguoiDung);

                    if (userLike) {
                      setBaiDang((prev) => {
                        const newBaiDang = [...prev];
                        newBaiDang[postIndex] = {
                          ...newBaiDang[postIndex],
                          da_thich: true,
                          userLikeId: userLike.ID_Like,
                        };
                        return newBaiDang;
                      });
                      return; // Success, exit function
                    }
                  }
                } catch (fetchError) {
                  console.error('Error fetching existing like:', fetchError);
                }

                // If we can't find the existing like, just update the UI
                setBaiDang((prev) => {
                  const newBaiDang = [...prev];
                  newBaiDang[postIndex] = {
                    ...newBaiDang[postIndex],
                    da_thich: true,
                  };
                  return newBaiDang;
                });
                return;
              }

              // Try alternative endpoint if main one fails
              const altResponse = await fetch(`${API_BASE_URL}/api/likebaidang`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(likePayload),
              });

              if (!altResponse.ok) {
                throw new Error(`Tạo like thất bại: ${response.status} - ${errorText}`);
              }

              const altData = await altResponse.json();

              const likeId = altData.ID_Like || altData.id || altData.ID || altData.data?.ID_Like;
              setBaiDang((prev) => {
                const newBaiDang = [...prev];
                newBaiDang[postIndex] = {
                  ...newBaiDang[postIndex],
                  userLikeId: likeId,
                };
                return newBaiDang;
              });
              return;
            }

            const newLikeData = await response.json();

            // Extract like ID from response (handle different response formats)
            const likeId =
              newLikeData.ID_Like ||
              newLikeData.id ||
              newLikeData.ID ||
              newLikeData.data?.ID_Like ||
              newLikeData.data?.id;

            setBaiDang((prev) => {
              const newBaiDang = [...prev];
              const finalPost = newBaiDang[postIndex];
              newBaiDang[postIndex] = {
                ...finalPost,
                userLikeId: likeId,
              };
              return newBaiDang;
            });

            // Update AsyncStorage after successful like
            const currentLikeStates = await loadPersistedLikeStates();
            currentLikeStates[baiDangId] = {
              da_thich: true,
              userLikeId: likeId,
            };
            await saveLikeStates(currentLikeStates);
          } catch (fetchError) {
            clearTimeout(createTimeoutId);
            console.error('Fetch error:', fetchError);
            throw fetchError;
          }
        }
      } catch {
        Toast.show({ type: 'error', text1: 'Thao tác thất bại' });
        setBaiDang(originalBaiDang);
      }
    },
    [baiDang, loadPersistedLikeStates, saveLikeStates],
  );

  // Handle comment navigation
  const handleComment = useCallback((postId: string) => {
    try {
      if (!postId) {
        Toast.show({ type: 'error', text1: 'Không tìm thấy ID bài đăng' });
        return;
      }

      router.push({
        pathname: '/components/BaiDang/binhluanbaidang',
        params: { postId: String(postId) },
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Lỗi điều hướng' });
    }
  }, []);

  // Handle like count navigation
  const handleLikeCount = useCallback((postId: string) => {
    try {
      if (!postId) {
        Toast.show({ type: 'error', text1: 'Không tìm thấy ID bài đăng' });
        return;
      }

      router.push({
        pathname: '/components/BaiDang/danhsachlike',
        params: { postId: String(postId) },
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Lỗi điều hướng' });
    }
  }, []);

  const handleMessageSeller = useCallback(
    (post: BaiDang) => {
      try {
        if (!post?.ID_BaiDang || !userData?.ID_NguoiDung) {
          Toast.show({ type: 'error', text1: 'Không tìm thấy thông tin bài đăng' });
          return;
        }

        router.push({
          pathname: '/components/TinNhan/chitiettinnhan',
          params: {
            userId: userData.ID_NguoiDung,
            userName: userData.ho_ten,
            userAvatar: userData.anh_dai_dien || '',
            hasExistingConversation: 'false',
            sharePost: 'true',
            postId: post.ID_BaiDang,
            postTitle: post.tieu_de || 'Bài đăng',
            postImage: post.images?.[0] || '',
          },
        });
      } catch {
        Toast.show({ type: 'error', text1: 'Lỗi điều hướng' });
      }
    },
    [userData],
  );

  // Handle post deletion
  const handlePostDelete = useCallback((deletedPostId: string) => {
    setBaiDang((prev) => prev.filter((post) => post.ID_BaiDang !== deletedPostId));
  }, []);

  // Handle delete all posts
  const handleDeleteAllPosts = useCallback(() => {
    setBaiDang([]);
  }, []);

  if (isLoading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="large" color="#7f001f" />
        <Text className="mt-2 text-gray-600">Đang tải bài đăng...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-red-600">{error}</Text>
      </View>
    );
  }

  if (baiDang.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-gray-500">Chưa có bài đăng nào</Text>
      </View>
    );
  }

  return (
    <View className="mt-4 pb-10">
      {baiDang.map((baiDangItem, index) => {
        // Validate ID_BaiDang
        if (!baiDangItem.ID_BaiDang) {
          return null;
        }

        const isOwnProfilePost = String(currentUserId) === String(userData.ID_NguoiDung);

        return (
          <View key={baiDangItem.ID_BaiDang} className="mb-6">
            <View className="flex-row items-center px-4">
              <Image
                source={{ uri: normalizeBackendMediaUrl(userData.anh_dai_dien) || 'https://via.placeholder.com/150.png' }}
                className="w-10 h-10 rounded-full"
              />
              <View className="ml-3">
                <Text className="font-bold">
                  {userData.ho_ten} <Text className="font-normal">đã đăng một bài viết.</Text>
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatTimeAgo(baiDangItem.thoi_gian_tao)} ·{' '}
                  <FontAwesome5 name="globe-asia" size={12} />
                </Text>
              </View>
              <PostMenu
                postId={baiDangItem.ID_BaiDang}
                authorId={userData.ID_NguoiDung}
                currentUserId={currentUserId}
                postData={{
                  tieu_de: baiDangItem.tieu_de || '',
                  mo_ta: baiDangItem.mo_ta || '',
                  gia: baiDangItem.gia || '',
                  vi_tri: baiDangItem.vi_tri || '',
                  ID_DanhMuc: baiDangItem.ID_DanhMuc || '',
                  ID_LoaiBaiDang: baiDangItem.ID_LoaiBaiDang || '',
                  images: baiDangItem.images || [],
                }}
                onDelete={() => handlePostDelete(baiDangItem.ID_BaiDang)}
                onDeleteAll={handleDeleteAllPosts}
              />
            </View>

            <Text className="px-4 mt-2 text-base font-semibold">{baiDangItem.tieu_de}</Text>
            {baiDangItem.mo_ta && baiDangItem.mo_ta.length > 150 ? (
              <PostDescription content={baiDangItem.mo_ta} />
            ) : (
              <Text className="px-4 mt-1 text-base">{baiDangItem.mo_ta}</Text>
            )}

            {/* Hiển thị giá tiền nếu có */}
            {baiDangItem.gia && baiDangItem.gia !== '0' && (
              <View className="px-4 mt-2">
                <Text className="text-lg font-bold text-[#7f001f]">
                  {parseInt(baiDangItem.gia).toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>
            )}

            {baiDangItem.images && baiDangItem.images.length > 0 && (
              <TouchableOpacity
                className="w-full mt-3 h-64 relative overflow-hidden rounded-lg"
                onPress={() => {
                  try {
                    router.push({
                      pathname: '/components/BaiDang/chitietbaidang',
                      params: { postId: baiDangItem.ID_BaiDang },
                    });
                  } catch {
                    // Handle navigation error silently
                  }
                }}
                activeOpacity={0.8}
              >
                {baiDangItem.images.length === 1 ? (
                  <Image
                    source={{ uri: baiDangItem.images[0] }}
                    className="w-full h-full"
                    resizeMode="cover"
                    loadingIndicatorSource={{
                      uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                    }}
                    fadeDuration={300}
                  />
                ) : baiDangItem.images.length === 2 ? (
                  <View className="flex-row h-full">
                    <Image
                      source={{ uri: baiDangItem.images[0] }}
                      className="w-1/2 h-full rounded-l-lg"
                      resizeMode="cover"
                      loadingIndicatorSource={{
                        uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                      }}
                      fadeDuration={300}
                    />
                    <Image
                      source={{ uri: baiDangItem.images[1] }}
                      className="w-1/2 h-full rounded-r-lg"
                      resizeMode="cover"
                      loadingIndicatorSource={{
                        uri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
                      }}
                      fadeDuration={300}
                    />
                  </View>
                ) : baiDangItem.images.length === 3 ? (
                  <View className="w-full h-full">
                    <Image
                      source={{ uri: baiDangItem.images[0] }}
                      className="w-full h-2/3 rounded-t-lg"
                      resizeMode="cover"
                    />
                    <View className="flex-row w-full h-1/3">
                      <Image
                        source={{ uri: baiDangItem.images[1] }}
                        className="w-1/2 h-full"
                        resizeMode="cover"
                      />
                      <Image
                        source={{ uri: baiDangItem.images[2] }}
                        className="w-1/2 h-full rounded-br-lg"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ) : baiDangItem.images.length === 4 ? (
                  <View className="flex-row w-full h-full">
                    <View className="w-1/2 h-full flex-col">
                      <Image
                        source={{ uri: baiDangItem.images[0] }}
                        className="w-full h-1/2 rounded-tl-lg"
                        resizeMode="cover"
                      />
                      <Image
                        source={{ uri: baiDangItem.images[2] }}
                        className="w-full h-1/2 rounded-bl-lg"
                        resizeMode="cover"
                      />
                    </View>
                    <View className="w-1/2 h-full flex-col">
                      <Image
                        source={{ uri: baiDangItem.images[1] }}
                        className="w-full h-1/2 rounded-tr-lg"
                        resizeMode="cover"
                      />
                      <Image
                        source={{ uri: baiDangItem.images[3] }}
                        className="w-full h-1/2 rounded-br-lg"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ) : (
                  <View className="w-full h-full relative">
                    <View className="flex-row w-full h-full">
                      <View className="w-1/2 h-full flex-col">
                        <Image
                          source={{ uri: baiDangItem.images[0] }}
                          className="w-full h-1/2 rounded-tl-lg"
                          resizeMode="cover"
                        />
                        <Image
                          source={{ uri: baiDangItem.images[2] }}
                          className="w-full h-1/2 rounded-bl-lg"
                          resizeMode="cover"
                        />
                      </View>
                      <View className="w-1/2 h-full flex-col">
                        <Image
                          source={{ uri: baiDangItem.images[1] }}
                          className="w-full h-1/2 rounded-tr-lg"
                          resizeMode="cover"
                        />
                        <Image
                          source={{ uri: baiDangItem.images[3] }}
                          className="w-full h-1/2 rounded-br-lg"
                          resizeMode="cover"
                        />
                      </View>
                    </View>
                    {baiDangItem.images.length > 4 && (
                      <View className="absolute bottom-2 right-2 bg-black/60 rounded-full px-3 py-1 items-center justify-center min-w-[40px]">
                        <Text className="text-white font-bold text-base">
                          +{baiDangItem.images.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            )}

            <View className="flex-row items-center justify-between px-4 mt-3">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => handleLikeCount(baiDangItem.ID_BaiDang)}
                disabled={baiDangItem.SoLuongLike === 0}
              >
                {baiDangItem.SoLuongLike > 0 && (
                  <View className="p-1 bg-[#7f001f] rounded-full mr-2">
                    <AntDesign name="like1" size={10} color="white" />
                  </View>
                )}
                <Text className={`text-gray-600 ${baiDangItem.SoLuongLike > 0 ? 'underline' : ''}`}>
                  {baiDangItem.SoLuongLike > 0
                    ? `${baiDangItem.SoLuongLike} người`
                    : 'Chưa có ai thích'}
                </Text>
              </TouchableOpacity>
              <Text className="text-gray-600">{baiDangItem.SoLuongBinhLuan} bình luận</Text>
            </View>

            <View className="flex-row pt-1 mx-4 mt-3 border-t border-gray-200">
              <TouchableOpacity
                className="flex-row items-center justify-center flex-1 py-2"
                onPress={() => handleLike(baiDangItem.ID_BaiDang)}
                style={{
                  backgroundColor: baiDangItem.da_thich ? '#f8f0f0' : 'transparent',
                  borderRadius: 8,
                  marginHorizontal: 4,
                }}
              >
                <AntDesign
                  name={baiDangItem.da_thich ? 'like1' : 'like2'}
                  size={20}
                  color={baiDangItem.da_thich ? '#7f001f' : 'gray'}
                />
                <Text
                  className={`ml-2 font-semibold ${baiDangItem.da_thich ? 'text-[#7f001f]' : 'text-gray-600'}`}
                >
                  {baiDangItem.da_thich ? 'Đã thích' : 'Thích'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-center flex-1 py-2"
                onPress={() => handleComment(baiDangItem.ID_BaiDang)}
              >
                <MaterialCommunityIcons name="comment-outline" size={20} color="gray" />
                <Text className="ml-2 font-semibold text-gray-600">Bình luận</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-center flex-1 py-2">
                <MaterialCommunityIcons name="share-outline" size={20} color="gray" />
                <Text className="ml-2 font-semibold text-gray-600">Chia sẻ</Text>
              </TouchableOpacity>
              {!isOwnProfilePost && (
                <TouchableOpacity
                  className="flex-row items-center justify-center flex-1 py-2"
                  onPress={() => handleMessageSeller(baiDangItem)}
                >
                  <Ionicons name="chatbox-outline" size={20} color="#7f001f" />
                  <Text className="ml-2 font-semibold text-[#7f001f]">Nhắn tin</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default BaiDangCanHan;
