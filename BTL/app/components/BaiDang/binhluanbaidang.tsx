import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeBackendMediaUrl } from '../../../utils/mediaUrl';

// --- API Config ---
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl;
const API_URL_GET_COMMENTS = `${API_BASE_URL}/api/binhluanbaidang/getCommentTreeByPost/`;
const API_URL_GET_USER = `${API_BASE_URL}/api/nguoidung/get/`;
const API_URL_CREATE_COMMENT = `${API_BASE_URL}/api/binhluanbaidang/create`;

// --- Hàm đệ quy để lấy tất cả ID_NguoiDung từ comment tree ---
const extractUserIds = (comments: any[], ids: Set<string> = new Set()) => {
  comments.forEach((comment) => {
    if (comment.ID_NguoiDung) ids.add(comment.ID_NguoiDung);
    if (comment.children?.length) extractUserIds(comment.children, ids);
  });
  return ids;
};

// --- Render một bình luận + replies (giữ nguyên) ---
const CommentItem = ({
  comment,
  userMap,
  onReply,
}: {
  comment: any;
  userMap: { [key: string]: any };
  onReply: (parentId: string) => void;
}) => {
  const user = userMap[comment.ID_NguoiDung] || {};
  const normalizedContent = comment.noi_dung ? comment.noi_dung.replace(/\s+/g, ' ').trim() : '';

  const timeString = new Date(comment.thoi_gian_binh_luan).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.commentContainer}>
      <View style={styles.commentRow}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/components/CaNhan/canhan',
              params: { userId: comment.ID_NguoiDung },
            })
          }
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: normalizeBackendMediaUrl(user.anh_dai_dien) || 'https://i.pravatar.cc/50' }}
            style={styles.avatar}
          />
        </TouchableOpacity>

        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">
              {user.ho_ten || 'Người dùng'}
            </Text>
            <Text style={styles.time}>{timeString}</Text>
          </View>

          <Text style={styles.commentText}>{normalizedContent}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => onReply(comment.ID_BinhLuan)}>
              <Text style={{ color: 'blue' }}>Trả lời</Text>
            </TouchableOpacity>
          </View>

          {comment.children?.length > 0 && (
            <View style={styles.repliesContainer}>
              {comment.children.map((reply: any) => (
                <CommentItem
                  key={reply.ID_BinhLuan}
                  comment={reply}
                  userMap={userMap}
                  onReply={onReply}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.likeButton}>
        <Ionicons name="heart-outline" size={20} color="#333" />
      </TouchableOpacity>
    </View>
  );
};

// --- Màn hình chính (sửa lại) ---
const CommentScreen = () => {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [comments, setComments] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [key: string]: any }>({});
  const userMapRef = useRef<{ [key: string]: any }>(userMap);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [parentCommentId, setParentCommentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // keep ref in sync so effect closures can read latest userMap without adding it to deps
  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  // Load thông tin người dùng từ AsyncStorage (an toàn, không show error ngay)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const userInfoRaw = await AsyncStorage.getItem('userInfo');
        if (!userInfoRaw) {
          return; // không set lỗi ở đây — chờ flow login hoặc gọi lại
        }
        const parsedUser = JSON.parse(userInfoRaw);
        if (mounted && parsedUser?.ID_NguoiDung) {
          setCurrentUserId(parsedUser.ID_NguoiDung);
          // lưu luôn vào userMap local để giảm fetch lần đầu
          setUserMap((prev) => ({ ...prev, [parsedUser.ID_NguoiDung]: parsedUser }));
        } else {
        }
      } catch (err) {
        console.error('Lỗi khi load userInfo từ AsyncStorage:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // helper: fetch user by id (returns fallback on error)
  const fetchUserById = async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`${API_URL_GET_USER}${id}`, { signal });
      if (!res.ok) {
        console.warn(`User API trả mã ${res.status} cho id=${id}`);
        return { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
      }
      const data = await res.json();
      // log để debug cấu trúc
      return data.user || data;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err; // propagate abort
      console.warn('Lỗi fetch user', id, err);
      return { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
    }
  };
  useEffect(() => {
    if (!postId || !currentUserId) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resComments = await fetch(`${API_URL_GET_COMMENTS}${postId}`, {
          signal: controller.signal,
        });
        if (!resComments.ok)
          throw new Error(`Không thể tải bình luận (status ${resComments.status})`);
        const dataComments = await resComments.json();
        if (!mounted) return;

        setComments(dataComments);

        // lấy tất cả user ids từ comment tree
        const userIds = extractUserIds(dataComments);
        userIds.add(currentUserId);

        // chọn những id chưa có trong userMap hiện tại (dùng ref để tránh dependency loop)
        const idsToFetch = Array.from(userIds).filter((id) => !userMapRef.current[id]);

        if (idsToFetch.length > 0) {
          const fetchedUsers = await Promise.all(
            idsToFetch.map((id) =>
              fetchUserById(id, controller.signal).catch((err) => {
                if (err.name === 'AbortError') throw err;
                console.warn('fetchUserById failed for', id, err);
                return { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
              }),
            ),
          );

          setUserMap((prev) => {
            const merged = { ...prev };
            fetchedUsers.forEach((u) => {
              if (u?.ID_NguoiDung) merged[u.ID_NguoiDung] = u;
            });
            return merged;
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Lỗi khi fetch comments/users:', err);
        if (mounted) setError(err.message || 'Lỗi khi tải bình luận');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [postId, currentUserId]); // intentionally not including userMap to avoid loops

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    if (!currentUserId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ID_BaiDang: postId,
        ID_NguoiDung: currentUserId,
        noi_dung: newComment.trim(),
        ID_BinhLuanCha: parentCommentId || null,
      };

      const res = await fetch(API_URL_CREATE_COMMENT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Không thể thêm bình luận.');

      // sau khi tạo, tải lại comment (và chỉ fetch các user còn thiếu)
      const resComments = await fetch(`${API_URL_GET_COMMENTS}${postId}`);
      if (!resComments.ok) throw new Error('Không thể tải được bình luận sau khi thêm.');
      const dataComments = await resComments.json();
      setComments(dataComments);

      // cập nhật userMap chỉ cho các user thiếu
      const userIds = extractUserIds(dataComments);
      userIds.add(currentUserId);
      const idsToFetch = Array.from(userIds).filter((id) => !userMapRef.current[id]);

      if (idsToFetch.length > 0) {
        const fetchedUsers = await Promise.all(
          idsToFetch.map((id) =>
            fetchUserById(id).catch((err) => {
              console.warn('fetchUserById failed for', id, err);
              return { ID_NguoiDung: id, ho_ten: 'Người dùng', anh_dai_dien: null };
            }),
          ),
        );
        setUserMap((prev) => {
          const merged = { ...prev };
          fetchedUsers.forEach((u) => {
            if (u?.ID_NguoiDung) merged[u.ID_NguoiDung] = u;
          });
          return merged;
        });
      }

      setNewComment('');
      setParentCommentId(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi khi gửi bình luận.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (parentId: string) => {
    setParentCommentId(parentId);
  };

  const renderContent = () => {
    if (isLoading)
      return <ActivityIndicator size="large" color="#7f001f" style={{ marginTop: 20 }} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (!comments || comments.length === 0)
      return <Text style={styles.errorText}>Chưa có bình luận nào.</Text>;

    return (
      <FlatList
        data={comments}
        keyExtractor={(item) => item.ID_BinhLuan}
        renderItem={({ item }) => (
          <CommentItem comment={item} userMap={userMap} onReply={handleReply} />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Text style={styles.header}>Bình luận</Text>
        {renderContent()}

        <View style={styles.inputBar}>
          <Ionicons name="happy-outline" size={24} color="#555" />
          <TextInput
            style={styles.input}
            placeholder={parentCommentId ? 'Trả lời bình luận...' : 'Thêm bình luận...'}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity onPress={handleSubmitComment} disabled={isSubmitting}>
            <Ionicons name="send-outline" size={24} color="#7f001f" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    marginBottom: 5,
  },
  commentRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  avatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
    flexShrink: 1,
    maxWidth: '60%',
  },
  time: {
    color: '#666',
    fontSize: 12,
    flexShrink: 0,
    textAlign: 'right',
    maxWidth: '40%',
  },
  commentText: {
    fontSize: 14,
    marginVertical: 4,
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', gap: 15, marginTop: 4 },
  reply: { color: '#666', fontSize: 12, fontWeight: '500' },
  likeButton: {
    position: 'absolute',
    right: 40,
    top: 5,
    alignItems: 'center',
    padding: 5,
  },
  repliesContainer: {
    marginLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    marginTop: 8,
    paddingLeft: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  errorText: { textAlign: 'center', marginTop: 20, color: '#666' },
});

export default CommentScreen;
