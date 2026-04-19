import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
  FontAwesome,
} from '@expo/vector-icons';
import BaiDangCanHan from './baidangcanhan';
import { normalizeBackendMediaUrl } from '../../../utils/mediaUrl';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

interface UserData {
  ID_NguoiDung: string;
  ho_ten: string;
  tieu_su?: string;
  anh_dai_dien?: string;
  anh_bia?: string;
  que_quan?: string;
  truong_hoc?: string;
  tinh_trang_hon_nhan?: string;
}
interface Friend {
  ID_NguoiDung: string;
  ho_ten: string;
  anh_dai_dien?: string;
}

const ProfileDetailItem = ({ icon, text }: { icon: React.ReactNode; text?: string }) => {
  if (!text) return null;
  return (
    <View className="flex-row items-center mb-4">
      {icon}
      <Text className="ml-4 text-base text-gray-800">{text}</Text>
    </View>
  );
};

const FriendItem = ({ name, image }: { name: string; image?: string }) => {
  return (
    <View className="overflow-hidden border border-gray-200 rounded-lg">
      {image ? (
        <Image source={{ uri: normalizeBackendMediaUrl(image) }} className="w-full h-28" />
      ) : (
        <View className="items-center justify-center w-full h-28 bg-gray-200">
          <FontAwesome name="user" size={40} color="#ccc" />
        </View>
      )}
      <Text className="p-2 text-sm font-semibold" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};

const FriendActionButton = ({
  icon,
  text,
  onPress,
  primary = false,
}: {
  icon: React.ReactNode;
  text: string;
  onPress?: () => void;
  primary?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    className={`flex-1 flex-row items-center justify-center p-2.5 rounded-lg ${primary ? 'bg-blue-600' : 'bg-gray-200'} mx-1`}
  >
    {icon}
    <Text className={`ml-1.5 text-base font-semibold ${primary ? 'text-white' : 'text-black'}`}>
      {text}
    </Text>
  </TouchableOpacity>
);

type FriendshipStatus = 'friends' | 'request_sent' | 'request_received' | 'not_friends' | null;

const UserProfileScreen = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>(null);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setError('Không có ID người dùng.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const currentUserId = userInfoString ? JSON.parse(userInfoString).ID_NguoiDung : null;
      if (userInfoString) {
        setLoggedInUserId(currentUserId);
      }

      const authHeaders = { Authorization: `Bearer ${token}` };

      // Fetch user data, their friends, and relationship status with the logged-in user
      const [userResponse, friendsResponse, loggedInUserFriends, sentRequests, receivedRequests] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/nguoidung/get/${userId}`, { headers: authHeaders }),
          fetch(`${API_BASE_URL}/api/quanhebanbe/list/${userId}`, { headers: authHeaders }),
          // Check relationship from the logged-in user's perspective
          currentUserId
            ? fetch(`${API_BASE_URL}/api/quanhebanbe/list/${currentUserId}`, {
              headers: authHeaders,
            })
            : Promise.resolve(null),
          currentUserId
            ? fetch(`${API_BASE_URL}/api/quanhebanbe/sent-requests/${currentUserId}`, {
              headers: authHeaders,
            })
            : Promise.resolve(null),
          currentUserId
            ? fetch(`${API_BASE_URL}/api/quanhebanbe/requests/${currentUserId}`, {
              headers: authHeaders,
            })
            : Promise.resolve(null),
        ]);

      if (
        !userResponse.ok ||
        !friendsResponse.ok ||
        (loggedInUserFriends && !loggedInUserFriends.ok) ||
        (sentRequests && !sentRequests.ok) ||
        (receivedRequests && !receivedRequests.ok)
      ) {
        let errorMessage = 'Lỗi khi tải dữ liệu.';
        if (!userResponse.ok) {
          // Simplified error check
          const errorData = await userResponse.json();
          errorMessage =
            errorData.message || `Lỗi tải thông tin người dùng: ${userResponse.status}`;
        } else {
          const errorData = await friendsResponse.json();
          errorMessage = errorData.message || `Lỗi tải danh sách bạn bè: ${friendsResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const userDataResult = await userResponse.json();
      const friendsDataResult = await friendsResponse.json();
      setUserData(userDataResult.user);
      setFriends(friendsDataResult.data || []);

      // Determine friendship status
      if (loggedInUserFriends && sentRequests && receivedRequests) {
        const loggedInFriendsData = (await loggedInUserFriends.json()).data || [];
        const sentRequestsData = (await sentRequests.json()).data || [];
        const receivedRequestsData = (await receivedRequests.json()).data || [];

        if (loggedInFriendsData.some((friend: Friend) => friend.ID_NguoiDung === userId)) {
          setFriendshipStatus('friends');
        } else if (sentRequestsData.some((req: Friend) => req.ID_NguoiDung === userId)) {
          setFriendshipStatus('request_sent');
        } else if (receivedRequestsData.some((req: Friend) => req.ID_NguoiDung === userId)) {
          setFriendshipStatus('request_received');
        } else {
          setFriendshipStatus('not_friends');
        }
      } else {
        setFriendshipStatus('not_friends');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const handleAddFriend = async () => {
    if (!loggedInUserId || !userId) return;
    setFriendshipStatus('request_sent'); // Optimistic update
    const token = await AsyncStorage.getItem('userToken');
    await fetch(`${API_BASE_URL}/api/quanhebanbe/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idNguoiGui: loggedInUserId, idNguoiNhan: userId }),
    });
    // No need to refetch, UI is updated optimistically
  };

  const handleCancelRequest = async () => {
    if (!loggedInUserId || !userId) return;
    setFriendshipStatus('not_friends'); // Optimistic update
    const token = await AsyncStorage.getItem('userToken');
    await fetch(`${API_BASE_URL}/api/quanhebanbe/cancel`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idNguoiGui: loggedInUserId, idNguoiNhan: userId }),
    });
  };

  const handleAcceptRequest = async () => {
    if (!loggedInUserId || !userId) return;
    setFriendshipStatus('friends'); // Optimistic update
    const token = await AsyncStorage.getItem('userToken');
    await fetch(`${API_BASE_URL}/api/quanhebanbe/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idNguoiNhan: loggedInUserId, idNguoiGui: userId }),
    });
  };

  const handleDeclineRequest = async () => {
    if (!loggedInUserId || !userId) return;
    setFriendshipStatus('not_friends'); // Optimistic update
    const token = await AsyncStorage.getItem('userToken');
    await fetch(`${API_BASE_URL}/api/quanhebanbe/unfriend`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idNguoiNhan: loggedInUserId, idNguoiGui: userId }),
    });
  };

  const handleUnfriend = () => {
    if (!loggedInUserId || !userId) return;
    setShowUnfriendModal(true);
  };

  const confirmUnfriend = async () => {
    setShowUnfriendModal(false);
    setFriendshipStatus(null);
    const token = await AsyncStorage.getItem('userToken');
    await fetch(`${API_BASE_URL}/api/quanhebanbe/unfriend`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ idNguoiNhan: loggedInUserId, idNguoiGui: userId }),
    });
  };

  const renderActionButtons = () => {
    switch (friendshipStatus) {
      case 'friends':
        return (
          <FriendActionButton
            icon={<FontAwesome5 name="user-check" size={18} color="white" />}
            text="Bạn bè"
            primary
            onPress={handleUnfriend}
          />
        );
      case 'request_sent':
        return (
          <FriendActionButton
            icon={<FontAwesome5 name="user-clock" size={18} color="black" />}
            text="Đã gửi lời mời"
            onPress={handleCancelRequest}
          />
        );
      case 'request_received':
        return (
          <>
            <FriendActionButton
              icon={<FontAwesome5 name="user-plus" size={18} color="white" />}
              text="Chấp nhận"
              onPress={handleAcceptRequest}
              primary
            />
            <FriendActionButton
              icon={<FontAwesome5 name="user-times" size={18} color="black" />}
              text="Từ chối"
              onPress={handleDeclineRequest}
            />
          </>
        );
      case 'not_friends':
        return (
          <FriendActionButton
            icon={<FontAwesome5 name="user-plus" size={18} color="white" />}
            text="Thêm bạn bè"
            onPress={handleAddFriend}
            primary
          />
        );
      default:
        return (
          <FriendActionButton
            icon={<FontAwesome5 name="user-plus" size={18} color="white" />}
            text="Thêm bạn bè"
            primary
            onPress={() => { }}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color="#7f001f" />
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View className="items-center justify-center flex-1 p-5">
        <Text className="text-lg text-red-600">{error || 'Không thể hiển thị thông tin.'}</Text>
      </View>
    );
  }

  const isMyProfile = loggedInUserId === userId;

  return (
    <>
      {/* ===== CUSTOM UNFRIEND MODAL ===== */}
      <Modal
        visible={showUnfriendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfriendModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            {/* Avatar */}
            <Image
              source={{ uri: normalizeBackendMediaUrl(userData?.anh_dai_dien) || 'https://via.placeholder.com/100.png' }}
              style={modalStyles.avatar}
            />
            {/* Title */}
            <Text style={modalStyles.title}>Hủy kết bạn?</Text>
            {/* Subtitle */}
            <Text style={modalStyles.subtitle}>
              {'Bạn có chắc muốn hủy kết bạn với '}
              <Text style={{ fontWeight: 'bold' }}>{userData?.ho_ten}</Text>
              {' không?\nHọ sẽ không còn xuất hiện trong danh sách bạn bè của bạn.'}
            </Text>
            {/* Buttons */}
            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnCancel]}
                onPress={() => setShowUnfriendModal(false)}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnCancelText}>Giữ lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnConfirm]}
                onPress={confirmUnfriend}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnConfirmText}>Hủy kết bạn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Stack.Screen
        options={{
          title: userData.ho_ten || 'Trang cá nhân',
          headerBackTitle: '',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <ScrollView className="flex-1 bg-white">
        <View className="mb-20">
          <Image
            source={{ uri: normalizeBackendMediaUrl(userData.anh_bia) || 'https://via.placeholder.com/600x250.png' }}
            className="w-full h-56 bg-gray-200 rounded-b-lg"
          />
          <View className="absolute p-1 bg-white rounded-full shadow-lg top-36 left-1/2 -ml-20">
            <Image
              source={{ uri: normalizeBackendMediaUrl(userData.anh_dai_dien) || 'https://via.placeholder.com/150.png' }}
              className="w-40 h-40 rounded-full bg-gray-300"
            />
          </View>
        </View>

        <View className="items-center px-5">
          <Text className="text-3xl font-bold">{userData.ho_ten}</Text>
          {userData.tieu_su && (
            <Text className="mt-2 text-base text-center text-gray-600">{userData.tieu_su}</Text>
          )}
        </View>

        <View className="flex-row justify-around px-5 mt-5">
          {isMyProfile ? (
            <>
              <FriendActionButton
                icon={<Ionicons name="add-circle" size={24} color="white" />}
                text="Thêm vào tin"
                primary
                onPress={() => { }}
              />
              <FriendActionButton
                icon={<MaterialIcons name="edit" size={20} color="black" />}
                text="Chỉnh sửa"
                onPress={() => { }}
              />
            </>
          ) : (
            <>
              {renderActionButtons()}
              <FriendActionButton
                icon={<MaterialCommunityIcons name="message-plus" size={20} color="black" />}
                text="Nhắn tin"
                onPress={() => { }}
              />
            </>
          )}
          <TouchableOpacity className="items-center justify-center p-2.5 ml-1.5 bg-gray-200 rounded-lg">
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="black" />
          </TouchableOpacity>
        </View>

        <View className="px-5 mt-6 border-t border-gray-200 pt-5">
          <Text className="mb-4 text-xl font-bold">Chi tiết</Text>
          <ProfileDetailItem
            icon={<FontAwesome5 name="briefcase" size={22} color="#8A8D9F" />}
            text={userData.truong_hoc}
          />
          <ProfileDetailItem
            icon={<FontAwesome5 name="home" size={22} color="#8A8D9F" />}
            text={`Sống tại ${userData.que_quan}`}
          />
          <ProfileDetailItem
            icon={<FontAwesome5 name="heart" size={22} color="#8A8D9F" />}
            text={userData.tinh_trang_hon_nhan || 'Độc thân'}
          />
        </View>

        <View className="mt-5 border-t border-b border-gray-300">
          <View className="flex-row justify-around px-4">
            <TouchableOpacity className="py-3 border-b-2 border-blue-600">
              <Text className="text-base font-semibold text-blue-600">Bài viết</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3">
              <Text className="text-base font-semibold text-gray-600">Ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3">
              <Text className="text-base font-semibold text-gray-600">Reels</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 mt-3">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold">Bạn bè</Text>
              <Text className="text-base text-gray-600">{friends.length} người bạn</Text>
            </View>
            <TouchableOpacity>
              <Text className="text-base text-blue-600">Tìm bạn bè</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={friends.slice(0, 6)}
            renderItem={({ item }) => (
              <Link
                href={
                  item.ID_NguoiDung === loggedInUserId
                    ? '/canhan'
                    : {
                      pathname: '/components/CaNhan/canhan',
                      params: { userId: item.ID_NguoiDung },
                    }
                }
                asChild
              >
                <TouchableOpacity className="w-1/3 p-1">
                  <FriendItem name={item.ho_ten} image={item.anh_dai_dien} />
                </TouchableOpacity>
              </Link>
            )}
            keyExtractor={(item) => item.ID_NguoiDung}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={{ marginTop: 12, marginHorizontal: -4 }}
          />
          <Link
            href={{
              pathname: '/components/CaNhan/danhsachban',
              params: { userId: userData.ID_NguoiDung, userName: userData.ho_ten },
            }}
            asChild
          >
            <TouchableOpacity className="items-center p-3 mt-3 bg-gray-200 rounded-lg">
              <Text className="text-base font-semibold text-black">Xem tất cả bạn bè</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View className="w-full h-2 my-5 bg-gray-200" />

        <BaiDangCanHan key={userData.ID_NguoiDung} userData={userData} />
      </ScrollView>
    </>
  );
};

export default UserProfileScreen;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#7f001f',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#f0f0f0',
  },
  btnCancelText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  btnConfirm: {
    backgroundColor: '#7f001f',
  },
  btnConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
