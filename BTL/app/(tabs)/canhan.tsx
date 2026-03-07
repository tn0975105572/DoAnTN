import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
  FontAwesome,
} from '@expo/vector-icons';
import BaiDangCanHan from '../components/CaNhan/baidangcanhan';
import { useFocusEffect, Link, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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

const FriendItem = ({ id, name, image }: { id: string; name: string; image?: string }) => (
  <Link
    href={{
      pathname: '/components/CaNhan/canhan',
      params: { userId: id },
    }}
    asChild
  >
    <TouchableOpacity className="w-1/3 p-1">
      <View className="overflow-hidden border border-gray-200 rounded-lg">
        {image ? (
          <Image source={{ uri: image }} className="w-full h-28" />
        ) : (
          <View className="items-center justify-center w-full h-28 bg-gray-200">
            <FontAwesome name="user" size={40} color="#ccc" />
          </View>
        )}
        <Text className="p-2 text-sm font-semibold" numberOfLines={1}>
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  </Link>
);

const ProfileDetailItem = ({ icon, text }: { icon: React.ReactNode; text: string | undefined }) => {
  if (!text) return null;
  return (
    <View className="flex-row items-center mb-4">
      {icon}
      <Text className="ml-4 text-base text-gray-800">{text}</Text>
    </View>
  );
};

const FullProfileScreen = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);

      const token = await AsyncStorage.getItem('userToken');
      const userInfoString = await AsyncStorage.getItem('userInfo');

      if (!token || !userInfoString) {
        throw new Error('Không tìm thấy token hoặc thông tin người dùng. Vui lòng đăng nhập lại.');
      }

      const currentUser = JSON.parse(userInfoString);
      const userId = currentUser.ID_NguoiDung;

      if (!userId) {
        throw new Error('ID người dùng không hợp lệ.');
      }

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [userResponse, friendsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/nguoidung/get/${userId}`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/api/quanhebanbe/list/${userId}`, { headers: authHeaders }),
      ]);

      if (!userResponse.ok) {
        throw new Error(`Lỗi khi tải thông tin người dùng. Mã lỗi: ${userResponse.status}`);
      }

      if (!friendsResponse.ok) {
        throw new Error(`Lỗi khi tải danh sách bạn bè. Mã lỗi: ${friendsResponse.status}`);
      }

      const userDataResult = await userResponse.json();
      const friendsDataResult = await friendsResponse.json();

      setUserData(userDataResult.user);
      setFriends(friendsDataResult.data);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" color="#7f001f" />
        <Text className="mt-2 text-gray-600">Đang tải trang cá nhân...</Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View className="items-center justify-center flex-1 p-5">
        <Text className="text-lg text-red-600">{error || 'Không thể hiển thị thông tin.'}</Text>
        <TouchableOpacity onPress={fetchData} className="px-4 py-2 mt-4 bg-blue-500 rounded-md">
          <Text className="text-white">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="mb-20">
        <Image
          source={{
            uri:
              userData.anh_bia ||
              'https://scontent.fhan3-3.fna.fbcdn.net/v/t39.30808-6/473590815_1662778177990915_5060424421094548483_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=111&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeHD9z-cUu1tjuu06ErCDgFL5umk2tH-Vsrm6aTa0f5WyncRk5v9XwANSXLsGUWVG1sEmpO8COybETFbiVvqFpph&_nc_ohc=cPkn4_o07AMQ7kNvwGbiyQL&_nc_oc=AdkWOAGoNFlsquc59gKtOqY-sGDl041GJrRrXWJWh0maQ0Vfur2zjQQYbN5_oWejqzk&_nc_zt=23&_nc_ht=scontent.fhan3-3.fna&_nc_gid=93oJAhMQ3XGWDO7uhuQcOQ&oh=00_AfbyFHjX7DFQM6U7hvLMcxI3YPwd8TnEHR3nP167LYu3rg&oe=68DAFFE4',
          }}
          className="w-full h-56 rounded-b-lg bg-gray-200"
        />
        <View className="absolute p-1 bg-white rounded-full shadow-lg top-36 left-1/2 -ml-20">
          <Image
            source={{ uri: userData.anh_dai_dien || 'https://via.placeholder.com/150.png' }}
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
        <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-blue-600 p-2.5 rounded-lg mr-1.5">
          <Ionicons name="add-circle" size={24} color="white" />
          <Text className="ml-1.5 text-base font-semibold text-white">Thêm vào tin</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-200 p-2.5 rounded-lg ml-1.5">
          <MaterialIcons name="edit" size={20} color="black" />
          <Text className="ml-1.5 text-base font-semibold text-black">Chỉnh sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center justify-center p-2.5 ml-3 bg-gray-200 rounded-lg">
          <MaterialCommunityIcons name="dots-horizontal" size={20} color="black" />
        </TouchableOpacity>
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

      <View className="px-5 mt-5">
        <Text className="mb-4 text-xl font-bold">Chi tiết</Text>
        <ProfileDetailItem
          icon={<FontAwesome5 name="briefcase" size={22} color="#8A8D9F" className="w-8" />}
          text={userData.truong_hoc}
        />
        <ProfileDetailItem
          icon={<FontAwesome5 name="home" size={22} color="#8A8D9F" className="w-8" />}
          text={`Sống tại ${userData.que_quan}`}
        />
        <ProfileDetailItem
          icon={<FontAwesome5 name="heart" size={22} color="#8A8D9F" className="w-8" />}
          text={userData.tinh_trang_hon_nhan || 'Độc thân'}
        />
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
            <FriendItem id={item.ID_NguoiDung} name={item.ho_ten} image={item.anh_dai_dien} />
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

      <View className="px-5">
        <Text className="text-xl font-bold">Bài viết</Text>
        <View className="flex-row items-center mt-4">
          <Image
            source={{ uri: userData.anh_dai_dien || 'https://via.placeholder.com/150.png' }}
            className="w-10 h-10 rounded-full"
          />
          <Text className="ml-3 text-lg text-gray-500">Bạn đang nghĩ gì?</Text>
          <View className="items-end flex-1">
            <Ionicons name="images" size={24} color="green" />
          </View>
        </View>
        <View className="flex-row pt-2 mt-4 border-t border-gray-200">
          <TouchableOpacity className="flex-row items-center justify-center flex-1 py-2">
            <Ionicons name="videocam" size={22} color="red" />
            <Text
              className="ml-2 font-semibold text-gray-600"
              onPress={() => router.push('/components/CaNhan/taobaidang')}
            >
              Bài Đăng Mới
            </Text>
          </TouchableOpacity>
          <View className="w-px bg-gray-200" />
          <TouchableOpacity className="flex-row items-center justify-center flex-1 py-2">
            <MaterialCommunityIcons name="video" size={22} color="red" />
            <Text className="ml-2 font-semibold text-gray-600">Phát trực tiếp</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="w-full h-2 mt-4 bg-gray-200" />

      <BaiDangCanHan userData={userData} />
    </ScrollView>
  );
};

export default FullProfileScreen;
