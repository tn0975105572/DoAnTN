import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, Link, router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

const COLORS = {
  primary: '#7f001f',
  background: '#fffcef',
  white: '#FFFFFF',
  text: '#222222',
  textSecondary: '#777777',
  border: '#EEEEEE',
};

interface Friend {
  ID_NguoiDung: string;
  ho_ten: string;
  anh_dai_dien?: string;
}

const FriendListItem = ({ user }: { user: Friend }) => (
  <Link
    href={{ pathname: '/components/CaNhan/canhan', params: { userId: user.ID_NguoiDung } }}
    asChild
  >
    <TouchableOpacity style={styles.userCard}>
      {user.anh_dai_dien ? (
        <Image style={styles.avatar} source={{ uri: user.anh_dai_dien }} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <FontAwesome name="user" size={24} color="#ccc" />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.ho_ten}</Text>
      </View>
      <TouchableOpacity style={styles.moreButton}>
        <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  </Link>
);

const AllFriendsScreen = () => {
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!userId) {
      setError('Không có ID người dùng.');
      setIsLoading(false);
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/api/quanhebanbe/list/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Không thể tải danh sách bạn bè.');
      }
      const result = await response.json();
      setFriends(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) {
      return friends;
    }
    return friends.filter((friend) =>
      friend.ho_ten.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [friends, searchQuery]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: `Bạn bè`,
          headerBackTitle: '',
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.white },
        }}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{userName}</Text>
        <Text style={styles.friendCount}>{filteredFriends.length} bạn bè</Text>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm bạn bè"
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={filteredFriends}
        renderItem={({ item }) => <FriendListItem user={item} />}
        keyExtractor={(item) => item.ID_NguoiDung}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>Không tìm thấy bạn bè nào.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  errorText: { color: 'red', fontSize: 16 },
  header: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  friendCount: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 25,
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 16, color: COLORS.text },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  moreButton: {
    padding: 8,
  },
});

export default AllFriendsScreen;
