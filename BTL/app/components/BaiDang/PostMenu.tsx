import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;

interface PostMenuProps {
  postId: string;
  authorId: string;
  currentUserId: string;
  postData?: {
    tieu_de: string;
    mo_ta: string;
    gia: string;
    vi_tri: string;
    ID_DanhMuc: string;
    ID_LoaiBaiDang: string;
    images: string[];
  };
  onDelete?: () => void;
  onEdit?: () => void;
  onDeleteAll?: () => void;
}

const PostMenu: React.FC<PostMenuProps> = ({
  postId,
  authorId,
  currentUserId,
  postData,
  onDelete,
  onEdit,
  onDeleteAll,
}) => {
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const isOwner = authorId === currentUserId;

  const handleEdit = () => {
    setIsMenuVisible(false);
    if (onEdit) {
      onEdit();
    } else {
      // Navigate to edit screen with post data
      router.push({
        pathname: '/components/BaiDang/chinhsuabaidang',
        params: {
          postId,
          mode: 'edit',
          postData: postData ? JSON.stringify(postData) : undefined,
        },
      });
    }
  };

  const handleDelete = () => {
    setIsMenuVisible(false);

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bài đăng này? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ],
    );
  };

  const confirmDelete = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Vui lòng đăng nhập lại',
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/baidang/delete/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Thành công',
          text2: 'Đã xóa bài đăng',
        });

        if (onDelete) {
          onDelete();
        }
      } else {
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: errorData.message || 'Không thể xóa bài đăng',
        });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Đã xảy ra lỗi khi xóa bài đăng',
      });
    }
  };

  const handleShare = () => {
    setIsMenuVisible(false);
    // TODO: Implement share functionality
    Toast.show({
      type: 'info',
      text1: 'Chia sẻ',
      text2: 'Tính năng chia sẻ đang được phát triển',
    });
  };

  const handleReport = () => {
    setIsMenuVisible(false);
    // TODO: Implement report functionality
    Toast.show({
      type: 'info',
      text1: 'Báo cáo',
      text2: 'Tính năng báo cáo đang được phát triển',
    });
  };

  const handleHide = () => {
    setIsMenuVisible(false);
    // TODO: Implement hide functionality
    Toast.show({
      type: 'info',
      text1: 'Ẩn bài đăng',
      text2: 'Tính năng ẩn bài đăng đang được phát triển',
    });
  };

  const handleDeleteAll = () => {
    setIsMenuVisible(false);

    Alert.alert(
      'Xác nhận xóa tất cả',
      'Bạn có chắc chắn muốn xóa TẤT CẢ bài đăng của mình? Hành động này không thể hoàn tác và sẽ xóa vĩnh viễn tất cả bài đăng cùng với ảnh liên quan.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: confirmDeleteAll,
        },
      ],
    );
  };

  const confirmDeleteAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: 'Vui lòng đăng nhập lại',
        });
        return;
      }

      // Show loading toast
      Toast.show({
        type: 'info',
        text1: 'Đang xóa...',
        text2: 'Vui lòng chờ trong giây lát',
      });

      const response = await fetch(`${API_BASE_URL}/api/baidang/deleteAllByUserId/${authorId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        Toast.show({
          type: 'success',
          text1: 'Thành công',
          text2: `Đã xóa ${result.deletedPosts} bài đăng và ${result.deletedImages} ảnh`,
        });

        if (onDeleteAll) {
          onDeleteAll();
        }
      } else {
        const errorData = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Lỗi',
          text2: errorData.message || 'Không thể xóa tất cả bài đăng',
        });
      }
    } catch (error) {
      console.error('Error deleting all posts:', error);
      Toast.show({
        type: 'error',
        text1: 'Lỗi',
        text2: 'Đã xảy ra lỗi khi xóa tất cả bài đăng',
      });
    }
  };

  const menuItems = [];

  if (isOwner) {
    menuItems.push(
      {
        icon: 'pencil',
        text: 'Chỉnh sửa',
        onPress: handleEdit,
        color: '#007AFF',
      },
      {
        icon: 'delete',
        text: 'Xóa bài đăng',
        onPress: handleDelete,
        color: '#FF3B30',
      },
      {
        icon: 'delete-sweep',
        text: 'Xóa tất cả bài đăng',
        onPress: handleDeleteAll,
        color: '#FF3B30',
      },
    );
  } else {
    menuItems.push(
      {
        icon: 'share',
        text: 'Chia sẻ',
        onPress: handleShare,
        color: '#007AFF',
      },
      {
        icon: 'flag',
        text: 'Báo cáo',
        onPress: handleReport,
        color: '#FF9500',
      },
      {
        icon: 'eye-off',
        text: 'Ẩn bài đăng',
        onPress: handleHide,
        color: '#8E8E93',
      },
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsMenuVisible(true)}
        className="p-2"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="dots-horizontal" size={24} color="gray" />
      </TouchableOpacity>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, index === menuItems.length - 1 && styles.lastMenuItem]}
                onPress={item.onPress}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={20}
                  color={item.color}
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, { color: item.color }]}>{item.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
    maxHeight: '50%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
  },
});

export default PostMenu;
