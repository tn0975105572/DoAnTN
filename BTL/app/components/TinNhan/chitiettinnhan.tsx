import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Alert,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Import các bộ icon
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- ĐỊNH NGHĨA DỮ LIỆU ---

const PRIMARY_COLOR = '#7f001f'; // Màu chính của app

// --- COMPONENT CON: HEADER ---
const ChatHeader = ({ user, onBack, onAvatarPress }) => (
  <View style={styles.headerContainer}>
    <TouchableOpacity style={styles.headerButton} onPress={onBack}>
      <Ionicons name="arrow-back" size={26} color="#fff" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
      <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
    </TouchableOpacity>
    <View style={styles.headerTextContainer}>
      <Text style={styles.headerName}>{user.name}</Text>
      <Text style={styles.headerStatus}>{user.online ? 'Online' : 'Offline'}</Text>
    </View>
    <View style={styles.headerRightIcons}>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="videocam" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
);

// --- COMPONENT CON: THÔNG BÁO THU HỒI ---
const RecallNotification = ({ messageId, isMyMessage }) => (
  <View
    style={[
      styles.recallContainer,
      isMyMessage ? styles.myRecallContainer : styles.otherRecallContainer,
    ]}
  >
    <View style={styles.recallBubble}>
      <Ionicons name="return-up-back" size={16} color="#4CAF50" />
      <Text style={styles.recallText}>
        {isMyMessage ? 'Bạn đã thu hồi một tin nhắn' : 'Tin nhắn đã được thu hồi'}
      </Text>
    </View>
  </View>
);

// --- COMPONENT CON: HIỂN THỊ MEDIA ---
const MediaMessage = ({ item, isMyMessage, onPress, onLongPress }) => {
  const { width } = Dimensions.get('window');
  const maxWidth = width * 0.5; // Điều chỉnh về 50% chiều rộng màn hình để ảnh rộng gần bằng nửa khung hình
  const maxHeight = 300; // Tăng từ 200 lên 300 để ảnh cao hơn

  const getMediaType = (uri) => {
    if (!uri) return 'image';
    const extension = uri.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const mediaUri =
    item.mediaUri ||
    (item.file_dinh_kem
      ? `${Constants.expoConfig?.extra?.url_uploads}/${item.file_dinh_kem}`
      : null);

  const mediaType = getMediaType(mediaUri);

  return (
    <TouchableOpacity
      style={[
        styles.mediaContainer,
        isMyMessage ? styles.myMediaContainer : styles.otherMediaContainer,
      ]}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.mediaBubble, isMyMessage ? styles.myMediaBubble : styles.otherMediaBubble]}
      >
        {mediaType === 'image' ? (
          <Image
            source={{ uri: mediaUri }}
            style={[styles.mediaImage, { maxWidth, maxHeight }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.videoContainer, { maxWidth, maxHeight }]}>
            <Image source={{ uri: mediaUri }} style={styles.videoThumbnail} resizeMode="cover" />
            <View style={styles.playButton}>
              <Ionicons name="play" size={30} color="#fff" />
            </View>
          </View>
        )}
        {item.text && item.text.trim() && (
          <Text
            style={[styles.mediaText, isMyMessage ? styles.myMediaText : styles.otherMediaText]}
          >
            {item.text}
          </Text>
        )}
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: TIN NHẮN CHIA SẺ BÀI ĐĂNG ---
const PostShareMessage = ({ item, isMyMessage, onMessagePress }) => {
  // Extract post info from message text
  const lines = item.text.split('\n');
  const postTitle = lines
    .find((line) => line.includes('📱 Bài đăng:'))
    ?.replace('📱 Bài đăng:', '')
    .trim();

  return (
    <TouchableOpacity
      style={[
        styles.messageItemContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
      onLongPress={() => onMessagePress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubbleBase,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          styles.postShareBubble,
        ]}
      >
        {/* Post share card with image */}
        <TouchableOpacity
          style={styles.postShareCard}
          onPress={() => {
            // Navigate to post detail using postId from message
            if (item.postId) {
              router.push({
                pathname: '/components/BaiDang/chitietbaidang',
                params: { postId: item.postId },
              });
            }
          }}
          activeOpacity={0.8}
        >
          {/* Post image */}
          {item.postImage && (
            <Image
              source={{ uri: item.postImage }}
              style={styles.postShareCardImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.postShareCardContent}>
            <View style={styles.postShareCardText}>
              <Text style={[styles.postShareCardTitle, { color: isMyMessage ? '#fff' : '#333' }]}>
                {postTitle || 'Bài đăng từ OLODO'}
              </Text>
              <Text
                style={[styles.postShareCardSubtitle, { color: isMyMessage ? '#f0f0f0' : '#666' }]}
              >
                Ấn để xem chi tiết
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={isMyMessage ? '#fff' : '#999'} />
          </View>
        </TouchableOpacity>
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: MỘT TIN NHẮN ---
const MessageItem = ({ item, currentUserId, onMessagePress, onImagePress, recalledMessages }) => {
  const isMyMessage = item.senderId === currentUserId || item.senderId === 'me';
  const isRecalled = recalledMessages.has(item.id) || item.da_xoa_gui === 1;

  // Nếu tin nhắn đã bị thu hồi (từ recalledMessages hoặc da_xoa_gui = 1), hiển thị thông báo thu hồi
  if (isRecalled) {
    return <RecallNotification messageId={item.id} isMyMessage={isMyMessage} />;
  }

  // Nếu là tin nhắn vị trí
  if (item.location) {
    return <LocationMessage item={item} isMyMessage={isMyMessage} />;
  }

  // Nếu là tin nhắn media (ảnh/video)
  if (item.mediaUri || item.file_dinh_kem) {
    return (
      <MediaMessage
        item={item}
        isMyMessage={isMyMessage}
        onPress={() => onImagePress(item)}
        onLongPress={() => onMessagePress(item)}
      />
    );
  }

  // Kiểm tra nếu là tin nhắn chia sẻ bài đăng
  if (
    item.isPostShare ||
    (item.text &&
      item.text.includes('📱 Bài đăng:') &&
      item.text.includes('🔗 Xem chi tiết bài đăng này'))
  ) {
    return (
      <PostShareMessage item={item} isMyMessage={isMyMessage} onMessagePress={onMessagePress} />
    );
  }

  // Tin nhắn text thông thường
  const containerStyle = [
    styles.messageItemContainer,
    isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
  ];

  const bubbleStyle = [
    styles.bubbleBase,
    isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
  ];

  const textStyle = isMyMessage ? styles.myMessageText : styles.otherMessageText;
  const timeStyle = isMyMessage ? styles.myTimestamp : styles.otherTimestamp;

  return (
    <TouchableOpacity
      style={containerStyle}
      onLongPress={() => onMessagePress(item)}
      activeOpacity={0.7}
    >
      <View style={bubbleStyle}>
        <Text style={textStyle}>{item.text}</Text>
      </View>
      <Text style={[styles.timestamp, timeStyle]}>{item.timestamp}</Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: HIỂN THỊ NHIỀU ẢNH ---
const ImagePreviewRow = ({ images, onRemoveImage, onRemoveAll }) => {
  if (images.length === 0) return null;

  return (
    <View style={styles.imagePreviewRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
        {images.map((uri, index) => (
          <View key={index} style={styles.imagePreviewItem}>
            <Image source={{ uri }} style={styles.imagePreviewThumbnail} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => onRemoveImage(index)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <TouchableOpacity style={styles.removeAllButton} onPress={onRemoveAll}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// --- COMPONENT CON: IMAGE VIEWER ---
const ImageViewer = ({ visible, imageUri, onClose, onDownload, onShare }) => {
  if (!visible || !imageUri) return null;

  console.log('🖼️ ImageViewer rendering with URI:', imageUri);

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerOverlay}>
        {/* Header với các nút action - Đặt ở trên cùng */}
        <View style={styles.imageViewerTopBar}>
          <TouchableOpacity style={styles.imageViewerCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Ảnh chính */}
        <View style={styles.imageViewerContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.imageViewerImage}
            resizeMode="contain"
            onError={(error) => {
              console.log('❌ Image load error:', error);
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully');
            }}
          />
        </View>

        {/* Bottom action bar */}
        <View style={styles.imageViewerBottomBar}>
          <TouchableOpacity style={styles.imageViewerActionButton} onPress={onDownload}>
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={styles.imageViewerActionText}>Tải xuống</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageViewerActionButton} onPress={onShare}>
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.imageViewerActionText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- COMPONENT CON: FORM CHIA SẺ BÀI ĐĂNG ---
const PostShareForm = ({ postData, onSend, onCancel, inputText, setInputText }) => {
  if (!postData) return null;

  return (
    <View style={styles.postShareFormContainer}>
      {/* Header */}
      <View style={styles.postShareHeader}>
        <Text style={styles.postShareTitle}>Chia sẻ bài đăng</Text>
        <TouchableOpacity style={styles.postShareCloseButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Post Preview */}
      <TouchableOpacity
        style={styles.postPreviewContainer}
        onPress={() => {
          // Navigate to post detail
          router.push({
            pathname: '/components/BaiDang/chitietbaidang',
            params: { postId: postData.postId },
          });
          // Close the share form
          onCancel();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.postPreviewContent}>
          {postData.postImage && (
            <Image source={{ uri: postData.postImage }} style={styles.postPreviewImage} />
          )}
          <View style={styles.postPreviewText}>
            <Text style={styles.postPreviewTitle} numberOfLines={2}>
              {postData.postTitle}
            </Text>
            <Text style={styles.postPreviewLabel}>Bài đăng từ OLODO - Ấn để xem chi tiết</Text>
          </View>
          <View style={styles.postPreviewArrow}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Input Section */}
      <View style={styles.postShareInputContainer}>
        <TextInput
          style={styles.postShareTextInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Viết tin nhắn của bạn..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <Text style={styles.postShareCharCount}>{inputText.length}/500</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.postShareActions}>
        <TouchableOpacity style={styles.postShareCancelButton} onPress={onCancel}>
          <Text style={styles.postShareCancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.postShareSendButton,
            inputText.trim().length === 0 && styles.postShareSendButtonDisabled,
          ]}
          onPress={onSend}
          disabled={inputText.trim().length === 0}
        >
          <Ionicons name="send" size={20} color="#fff" />
          <Text style={styles.postShareSendText}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- COMPONENT CON: TIN NHẮN VỊ TRÍ ---
const LocationMessage = ({ item, isMyMessage }) => {
  const handleOpenMap = () => {
    if (item.location) {
      const url = `https://www.google.com/maps?q=${item.location.latitude},${item.location.longitude}`;
      Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageItemContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
      onPress={handleOpenMap}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.bubbleBase,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          styles.locationBubble,
        ]}
      >
        <View style={styles.locationIcon}>
          <Ionicons name="location" size={40} color={isMyMessage ? '#fff' : PRIMARY_COLOR} />
        </View>
        <Text style={[styles.locationText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
          📍 Vị trí của tôi
        </Text>
        <Text style={[styles.locationSubtext, isMyMessage ? { color: '#f0f0f0' } : { color: '#666' }]}>
          Nhấn để xem trên bản đồ
        </Text>
      </View>
      <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
        {item.timestamp}
      </Text>
    </TouchableOpacity>
  );
};

// --- COMPONENT CON: KHUNG NHẬP LIỆU ---
const InputBar = ({ onSend, inputText, setInputText, onImagePress, onLocationPress }) => {
  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity style={styles.inputIconButton} onPress={onImagePress}>
        <Ionicons name="image" size={24} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.inputIconButton} onPress={onLocationPress}>
        <Ionicons name="location" size={24} color="#555" />
      </TouchableOpacity>

      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Write your message"
        placeholderTextColor="#999"
        multiline
      />
      <TouchableOpacity style={styles.inputIconButton} onPress={onSend}>
        <Ionicons name="paper-plane" size={24} color={PRIMARY_COLOR} />
      </TouchableOpacity>
    </View>
  );
};

// --- COMPONENT CHÍNH: MÀN HÌNH CHAT ---
const ChatDetailScreen = () => {
  const params = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userToken, setUserToken] = useState<string | null>(null);
  const [otherUser] = useState({
    id: (params.userId as string) || 'unknown',
    name: (params.userName as string) || 'Unknown User',
    avatar: (params.userAvatar as string) || 'https://i.pravatar.cc/150?img=1',
    online: true,
  });
  const [hasExistingConversation] = useState(params.hasExistingConversation === 'true');
  const [isTyping, setIsTyping] = useState(false); // Để hiển thị typing indicator nếu cần
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [recalledMessages] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string>('');
  const [showPostShareForm, setShowPostShareForm] = useState(false);
  const [sharePostData, setSharePostData] = useState<any>(null);
  const [shareFormInput, setShareFormInput] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const [userInfoStr, token] = await Promise.all([
          AsyncStorage.getItem('userInfo'),
          AsyncStorage.getItem('userToken'),
        ]);
        if (!token) {
          return;
        }

        if (!userInfoStr) {
          return;
        }

        const user = JSON.parse(userInfoStr);
        if (!user.ID_NguoiDung) {
          return;
        }

        // Validate token trước khi set
        if (token && token.length > 10) {
          setCurrentUserId(user.ID_NguoiDung.toString());
          setUserToken(token);
        } else {
        }

        // Nếu có conversation cũ, load tin nhắn
        if (hasExistingConversation) {
          await loadExistingMessages(user.ID_NguoiDung.toString(), otherUser.id);
        }

        // Kiểm tra nếu có chia sẻ bài đăng
        if (params.sharePost === 'true') {
          setSharePostData({
            postId: params.postId,
            postTitle: params.postTitle,
            postImage: params.postImage,
          });
          setShowPostShareForm(true);
        }
      } catch { }
    };
    getCurrentUser();
  }, [
    hasExistingConversation,
    otherUser.id,
    params.sharePost,
    params.postId,
    params.postTitle,
    params.postImage,
  ]);

  // Kết nối Socket.IO khi component mount
  useEffect(() => {
    if (!userToken || !currentUserId) {
      return; // Không kết nối nếu chưa có token hoặc userId
    }

    // Validate token format
    if (typeof userToken !== 'string' || userToken.length < 10) {
      return;
    }

    // Validate JWT token format (basic check)
    const tokenParts = userToken.split('.');
    if (tokenParts.length !== 3) {
      return;
    }

    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';
    const socketUrl = apiUrl.replace('/api', ''); // Giả sử socket ở cùng base URL, loại bỏ /api nếu có

    // Test token với server bằng cách gọi API profile hoặc một endpoint đơn giản
    const testTokenValidity = async () => {
      try {
        // Thử gọi một API endpoint đơn giản để test token
        const response = await fetch(`${apiUrl}/api/tinnhan/conversations/${currentUserId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          return false;
        }

        if (response && response.ok && response.status !== 0) {
          return true;
        }

        return true;
      } catch {
        return true;
      }
    };

    // Disconnect existing connection if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Kết nối socket trực tiếp (skip token validation nếu cần)
    const connectSocket = () => {
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 3, // Giảm số lần retry
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 10000,
        auth: {
          token: userToken,
          userId: currentUserId,
          timestamp: Date.now(), // Thêm timestamp để debug
        },
      });

      socketRef.current.on('connect', () => {
        // Emit user_login để đăng ký user với socket server
        socketRef.current.emit('user_login', { userId: currentUserId });
      });

      socketRef.current.on('connect_error', (error) => {
        // Hiển thị thông báo lỗi cho user nếu cần
        if (error.message.includes('Authentication error')) {
          // Có thể redirect về login nếu authentication fail
          // router.replace('/components/CaiDat/dangnhap');
        }
      });

      socketRef.current.on('error', (data) => { });

      socketRef.current.on('disconnect', (reason) => { });

      socketRef.current.on('new_message', (data) => {
        if (data.type === 'private' && data.message.ID_NguoiGui === otherUser.id) {
          // Chỉ hiển thị tin nhắn nếu da_xoa_gui = 0 (chưa bị xóa)
          if (data.message.da_xoa_gui === 0) {
            // Phân biệt tin nhắn ảnh qua file_dinh_kem (theo API docs)
            const isImageMessage = !!(
              data.message.file_dinh_kem && data.message.file_dinh_kem.trim()
            );

            // Extract location from message
            let location: any = null;
            const messageText = data.message.noi_dung || '';
            if (messageText.includes('📍 Vị trí GPS:')) {
              const match = messageText.match(/maps\?q=([-\d.]+),([-\d.]+)/);
              if (match) {
                location = {
                  latitude: parseFloat(match[1]),
                  longitude: parseFloat(match[2]),
                };
              }
            }

            // Extract postId and postImage if it's a shared post message
            let postId = null;
            let postImage = null;
            if (messageText.includes('📱 Bài đăng:')) {
              postId = null;
              postImage = null;
            }

            const newMessage = {
              id: data.message.ID_TinNhan,
              text: messageText,
              senderId: data.message.ID_NguoiGui,
              timestamp: new Date(data.message.thoi_gian_gui).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              file_dinh_kem: data.message.file_dinh_kem,
              loai_tin_nhan: isImageMessage ? 'image' : 'text',
              mediaUri: null,
              da_xoa_gui: data.message.da_xoa_gui || 0,
              postId: postId,
              postImage: postImage,
              location: location, // Add location data
            };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      });

      // Lắng nghe tin nhắn bị thu hồi
      socketRef.current.on('message_recalled', (data) => {
        if (data.chatType === 'private' && data.chatId === otherUser.id) {
          // Cập nhật tin nhắn trong state để đánh dấu da_xoa_gui = 1
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === data.messageId ? { ...msg, da_xoa_gui: 1 } : msg,
            ),
          );
        }
      });

      socketRef.current.on('message_sent', (data) => {
        console.log('✅ Socket message_sent response:', data);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id.startsWith('temp_') ? { ...msg, id: data.messageId } : msg,
          ),
        );
      });

      // Lắng nghe lỗi từ socket
      socketRef.current.on('send_message_error', (error) => {
        console.error('❌ Socket send_message_error:', error);
      });

      // Lắng nghe typing_start và typing_stop
      socketRef.current.on('typing_start', (data) => {
        if (
          data.chatType === 'private' &&
          data.chatId === otherUser.id &&
          data.userId === otherUser.id
        ) {
          setIsTyping(true);
        }
      });

      socketRef.current.on('typing_stop', (data) => {
        if (
          data.chatType === 'private' &&
          data.chatId === otherUser.id &&
          data.userId === otherUser.id
        ) {
          setIsTyping(false);
        }
      });
    };

    testTokenValidity()
      .then((isValid) => {
        if (!isValid) {
        }
        connectSocket();
      })
      .catch(() => {
        connectSocket();
      });

    return () => {
      // Disconnect socket khi unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userToken, currentUserId, otherUser.id]);

  // Join chat khi có currentUserId
  useEffect(() => {
    if (currentUserId && socketRef.current?.connected) {
      socketRef.current.emit('join_chat', {
        userId: currentUserId,
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
  }, [currentUserId, otherUser.id, userToken]);

  // Mark as read khi vào chat hoặc khi có tin nhắn mới (tùy logic)
  useEffect(() => {
    if (currentUserId && socketRef.current?.connected && messages.length > 0) {
      socketRef.current.emit('mark_read', {
        userId: currentUserId,
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
  }, [messages, currentUserId, otherUser.id, userToken]);

  // Xử lý typing khi nhập text
  useEffect(() => {
    const handleTyping = () => {
      if (inputText.trim().length > 0 && socketRef.current?.connected) {
        socketRef.current.emit('typing_start', {
          userId: currentUserId,
          chatType: 'private',
          chatId: otherUser.id,
        });

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current.emit('typing_stop', {
            userId: currentUserId,
            chatType: 'private',
            chatId: otherUser.id,
          });
        }, 3000);
      }
    };

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', handleTyping);
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('typing_stop', {
          userId: currentUserId,
          chatType: 'private',
          chatId: otherUser.id,
        });
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText, currentUserId, otherUser.id, userToken]);

  const loadExistingMessages = async (currentUserId: string, otherUserId: string) => {
    try {
      // Kiểm tra API URL
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        console.error('API URL không được cấu hình');
        return;
      }

      // Gọi API để lấy tin nhắn cũ
      const response = await fetch(
        `${apiUrl}/api/tinnhan/private/${currentUserId}/${otherUserId}?limit=50&offset=0`,
      );

      if (response && response.ok && response.status !== 0) {
        const data = await response.json();
        if (data.success && data.data) {
          const formattedMessages = data.data.map((msg: any) => {
            // Phân biệt tin nhắn ảnh qua file_dinh_kem (theo API docs)
            const isImageMessage = !!(msg.file_dinh_kem && msg.file_dinh_kem.trim());
            let filename = msg.file_dinh_kem || null;
            let text = msg.noi_dung || '';

            // Xử lý backward compatibility với tin nhắn cũ có format [Ảnh: filename]
            if (!isImageMessage && msg.noi_dung && msg.noi_dung.includes('[Ảnh:')) {
              const match = msg.noi_dung.match(/\[Ảnh: ([^\]]+)\]/);
              if (match) {
                filename = match[1];
                text = msg.noi_dung.replace(/\[Ảnh: [^\]]+\]/, '').trim();
              }
            }

            // Extract location from message
            let location: any = null;
            if (text && text.includes('📍 Vị trí GPS:')) {
              const match = text.match(/maps\?q=([-\d.]+),([-\d.]+)/);
              if (match) {
                location = {
                  latitude: parseFloat(match[1]),
                  longitude: parseFloat(match[2]),
                };
              }
            }

            // Extract postId and postImage if it's a shared post message
            let postId = null;
            let postImage = null;
            if (text && text.includes('📱 Bài đăng:')) {
              postId = null;
              postImage = null;
            }

            return {
              id: msg.ID_TinNhan,
              text: text,
              senderId: msg.ID_NguoiGui === currentUserId ? 'me' : otherUserId,
              timestamp: new Date(msg.thoi_gian_gui).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              file_dinh_kem: filename,
              loai_tin_nhan: isImageMessage ? 'image' : 'text',
              mediaUri: null,
              da_xoa_gui: msg.da_xoa_gui || 0,
              postId: postId,
              postImage: postImage,
              location: location, // Add location data
            };
          });

          // Lọc ra những tin nhắn có da_xoa_gui = 0 (chưa bị xóa)
          const visibleMessages = formattedMessages.filter((msg: any) => msg.da_xoa_gui === 0);
          const sortedMessages = visibleMessages.reverse();

          setMessages(sortedMessages);

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }
      }
    } catch { }
  };

  const handleGoBack = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_chat', {
        chatType: 'private',
        chatId: otherUser.id,
      });
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tinnhan');
    }
  };

  // Xử lý khi ấn vào tin nhắn (long press - options)
  const handleMessagePress = (message) => {
    setSelectedMessage(message);
    setShowMessageOptions(true);
  };

  // Xử lý khi ấn vào ảnh (quick press - xem ảnh)
  const handleImagePress = (message) => {
    console.log('🖼️ handleImagePress called with:', message);

    // Kiểm tra xem có phải là ảnh không
    const isImageMessage = !!(message.file_dinh_kem || message.mediaUri);

    if (isImageMessage) {
      // Tạo URL đầy đủ cho ảnh
      let imageUri = message.mediaUri;

      // Nếu không có mediaUri nhưng có file_dinh_kem, tạo URL từ server
      if (!imageUri && message.file_dinh_kem) {
        const url_uploads = Constants.expoConfig?.extra?.url_uploads;
        if (url_uploads) {
          imageUri = `${url_uploads}/${message.file_dinh_kem}`;
        }
      }

      console.log('🖼️ Final imageUri:', imageUri);

      if (imageUri) {
        setCurrentImageUri(imageUri);
        setShowImageViewer(true);
      } else {
        console.log('❌ No valid imageUri found');
      }
    } else {
      console.log('❌ Not an image message');
    }
  };

  // Xử lý tải xuống ảnh
  const handleDownloadImage = async () => {
    if (!currentImageUri) return;

    try {
      console.log('📥 Starting download for:', currentImageUri);

      // Tạo tên file
      const timestamp = Date.now();
      const fileName = `chat_image_${timestamp}.jpg`;

      if (Platform.OS === 'web') {
        // Web platform - sử dụng browser download
        const response = await fetch(currentImageUri);
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Alert.alert('✅ Thành công', 'Ảnh đã được tải xuống vào thư mục Downloads');
      } else {
        // Mobile platforms - hiển thị hướng dẫn
        Alert.alert(
          '📱 Tải xuống ảnh',
          'Để lưu ảnh vào thiết bị:\n\n' +
          '• Chụp màn hình để lưu ảnh\n' +
          '• Hoặc sử dụng nút "Chia sẻ" để lưu vào thư viện ảnh\n' +
          '• Hoặc ấn giữ vào ảnh và chọn "Lưu ảnh"',
          [
            {
              text: 'Chia sẻ để lưu',
              onPress: () => handleShareImage(),
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      Alert.alert('❌ Lỗi', 'Không thể tải xuống ảnh. Vui lòng thử lại sau.');
    }
  };

  // Xử lý chia sẻ ảnh
  const handleShareImage = async () => {
    if (!currentImageUri) return;

    try {
      console.log('📤 Starting share for:', currentImageUri);

      if (Platform.OS === 'web') {
        // Web platform
        if (navigator.share) {
          // Sử dụng Web Share API
          await navigator.share({
            title: 'Chia sẻ ảnh từ chat',
            text: 'Ảnh từ cuộc trò chuyện',
            url: currentImageUri,
          });
        } else if (navigator.clipboard) {
          // Fallback: copy link vào clipboard
          await navigator.clipboard.writeText(currentImageUri);
          Alert.alert('✅ Thành công', 'Link ảnh đã được sao chép vào clipboard');
        } else {
          // Fallback cuối cùng: hiển thị link để user copy thủ công
          Alert.alert(
            'Chia sẻ ảnh',
            `Link ảnh:\n${currentImageUri}\n\nBạn có thể copy link này để chia sẻ.`,
          );
        }
      } else {
        // Mobile platforms - hiển thị hướng dẫn
        Alert.alert(
          '📱 Chia sẻ ảnh',
          'Để chia sẻ ảnh:\n\n' +
          '• Chụp màn hình và chia sẻ\n' +
          '• Ấn giữ vào ảnh và chọn "Chia sẻ"\n' +
          '• Hoặc copy link ảnh để chia sẻ',
          [
            {
              text: 'Copy link',
              onPress: () => {
                // Copy link vào clipboard nếu có sẵn
                Alert.alert('Link ảnh', currentImageUri);
              },
            },
            {
              text: 'OK',
              style: 'cancel',
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Share error:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ ảnh. Vui lòng thử lại sau.');
    }
  };

  // Đóng ImageViewer
  const handleCloseImageViewer = () => {
    console.log('🖼️ Closing ImageViewer');
    setShowImageViewer(false);
    setCurrentImageUri('');
  };

  // Xử lý gửi tin nhắn chia sẻ bài đăng
  const handleSendPostShare = async () => {
    if (!shareFormInput.trim() || !sharePostData) return;

    try {
      // Tạo 2 tin nhắn riêng biệt
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let textMessage: any = null;

      // Tin nhắn 1: Text message (nếu có)
      if (shareFormInput.trim()) {
        textMessage = {
          id: 'temp_text_' + Date.now(),
          text: shareFormInput.trim(),
          senderId: currentUserId,
          timestamp: timestamp,
        };
        setMessages((prev) => [...prev, textMessage]);
      }

      // Tin nhắn 2: Post share message
      const postShareMessage = {
        id: 'temp_post_' + Date.now(),
        text: `📱 Bài đăng: ${sharePostData.postTitle}\n🔗 Xem chi tiết bài đăng này`,
        senderId: currentUserId,
        timestamp: timestamp,
        postId: sharePostData.postId,
        postImage: sharePostData.postImage,
        isPostShare: true, // Flag để nhận diện tin nhắn chia sẻ bài đăng
      };

      setMessages((prev) => [...prev, postShareMessage]);
      setInputText(''); // Clear main input
      setShareFormInput(''); // Clear share form input
      setShowPostShareForm(false);
      setSharePostData(null);

      // Cuộn xuống dưới
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Gửi tin nhắn qua socket hoặc API
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;

      // Gửi tin nhắn text (nếu có)
      if (shareFormInput.trim() && apiUrl) {
        const textResponse = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: shareFormInput.trim(),
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (textResponse && textResponse.ok && textResponse.status !== 0) {
          const textData = await textResponse.json();
          // Cập nhật tin nhắn text với ID thật
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              textMessage && msg.id === textMessage.id
                ? { ...msg, id: textData.data?.ID_TinNhan || msg.id }
                : msg,
            ),
          );
        }
      }

      // Gửi tin nhắn chia sẻ bài đăng
      if (apiUrl) {
        const postResponse = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: `📱 Bài đăng: ${sharePostData.postTitle}\n🔗 Xem chi tiết bài đăng này`,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (postResponse && postResponse.ok && postResponse.status !== 0) {
          const postData = await postResponse.json();
          // Cập nhật tin nhắn post share với ID thật
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === postShareMessage.id
                ? { ...msg, id: postData.data?.ID_TinNhan || msg.id }
                : msg,
            ),
          );
        }
      }

      Alert.alert('✅ Thành công', 'Đã chia sẻ bài đăng!');
    } catch (error) {
      console.error('❌ Error sharing post:', error);
      Alert.alert('❌ Lỗi', 'Không thể chia sẻ bài đăng. Vui lòng thử lại.');
    }
  };

  // Đóng form chia sẻ bài đăng
  const handleCancelPostShare = () => {
    setShowPostShareForm(false);
    setSharePostData(null);
    setShareFormInput('');
  };

  const handleForwardMessage = () => {
    Alert.alert('Chuyển tiếp', 'Chức năng chuyển tiếp sẽ được phát triển sau');
    setShowMessageOptions(false);
  };

  // Xử lý thu hồi tin nhắn (tin nhắn của mình)
  const handleRecallMessage = async () => {
    if (!selectedMessage || !userToken) {
      return;
    }

    Alert.alert('Thu hồi tin nhắn', 'Bạn có chắc chắn muốn thu hồi tin nhắn này?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: async () => {
          try {
            // Gọi API xóa tin nhắn (thu hồi)
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
              Alert.alert('Lỗi', 'API URL không được cấu hình');
              return;
            }

            const response = await fetch(`${apiUrl}/api/tinnhan/delete/${selectedMessage.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                userId: currentUserId,
              }),
            });

            if (response && response.ok && response.status !== 0) {
              // Cập nhật tin nhắn trong state để đánh dấu da_xoa_gui = 1
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === selectedMessage.id ? { ...msg, da_xoa_gui: 1 } : msg,
                ),
              );

              // Thông báo qua socket nếu có
              if (socketRef.current?.connected) {
                socketRef.current.emit('message_recalled', {
                  messageId: selectedMessage.id,
                  chatType: 'private',
                  chatId: otherUser.id,
                  userId: currentUserId,
                });
              }

              Alert.alert('Thành công', 'Tin nhắn đã được thu hồi');
            } else {
              Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
            }
          } catch {
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi thu hồi tin nhắn');
          }

          setShowMessageOptions(false);
          setSelectedMessage(null);
        },
      },
    ]);
  };

  const handleHideMessage = async () => {
    if (!selectedMessage || !userToken) {
      return;
    }

    Alert.alert('Ẩn tin nhắn', 'Bạn có chắc chắn muốn ẩn tin nhắn này?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Ẩn',
        style: 'destructive',
        onPress: async () => {
          try {
            const apiUrl = Constants.expoConfig?.extra?.apiUrl;
            if (!apiUrl) {
              Alert.alert('Lỗi', 'API URL không được cấu hình');
              return;
            }

            const response = await fetch(`${apiUrl}/api/tinnhan/hide/${selectedMessage.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
              },
              body: JSON.stringify({
                userId: currentUserId,
                hidden: true,
              }),
            });

            if (response && response.ok && response.status !== 0) {
              // Xóa tin nhắn khỏi state
              setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== selectedMessage.id),
              );

              // Thông báo qua socket nếu có
              if (socketRef.current?.connected) {
                socketRef.current.emit('message_hidden', {
                  messageId: selectedMessage.id,
                  chatType: 'private',
                  chatId: otherUser.id,
                  userId: currentUserId,
                });
              }

              Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
            } else {
              // Fallback: ẩn local nếu API không có
              setMessages((prevMessages) =>
                prevMessages.filter((msg) => msg.id !== selectedMessage.id),
              );
              Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
            }
          } catch {
            // Fallback: ẩn local nếu có lỗi
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== selectedMessage.id),
            );
            Alert.alert('Thành công', 'Tin nhắn đã được ẩn');
          }

          setShowMessageOptions(false);
          setSelectedMessage(null);
        },
      },
    ]);
  };

  // Chọn nhiều ảnh từ thư viện
  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 9, // Tối đa 9 ảnh
        allowsEditing: false, // Không crop
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setSelectedImages((prev) => [...prev, ...newImages].slice(0, 9)); // Giới hạn tối đa 9 ảnh
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  // Xóa ảnh preview theo index
  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Xóa tất cả ảnh
  const removeAllImages = () => {
    setSelectedImages([]);
  };

  // Chia sẻ vị trí
  const handleShareLocation = async () => {
    try {
      // Xin quyền truy cập location
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập vị trí',
          'Vui lòng cấp quyền truy cập vị trí để chia sẻ'
        );
        return;
      }

      // Hiển thị loading
      Alert.alert('📍 Đang lấy vị trí...', 'Vui lòng đợi');

      // Lấy vị trí hiện tại
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Tạo tin nhắn tạm với vị trí
      const tempMessage = {
        id: 'temp_location_' + Date.now(),
        text: '',
        senderId: currentUserId,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: {
          latitude,
          longitude,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Cuộn xuống
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Gửi vị trí qua socket hoặc API
      const locationText = `📍 Vị trí GPS: https://www.google.com/maps?q=${latitude},${longitude}`;

      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: locationText,
          loai_tin_nhan: 'text',
          file_dinh_kem: null,
          tin_nhan_phu_thuoc: null,
        });
      } else {
        // Fallback: gửi qua HTTP API
        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (!apiUrl) return;

        const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: locationText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (response && response.ok) {
          const data = await response.json();
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempMessage.id
                ? { ...msg, id: data.data?.ID_TinNhan || tempMessage.id }
                : msg
            )
          );
        }
      }

      Alert.alert('✅ Thành công', 'Đã chia sẻ vị trí của bạn');
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng kiểm tra GPS và thử lại.');
    }
  };

  // Hàm gửi ảnh qua HTTP API (fallback)
  const sendImageViaHTTP = async (messageData: any, tempMessage: any) => {
    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) return;

      console.log('🌐 Sending via HTTP API:', messageData);

      const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(messageData),
      });

      if (response && response.ok && response.status !== 0) {
        const data = await response.json();
        console.log('✅ HTTP API response:', data);

        // Cập nhật tin nhắn tạm với ID thật
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessage.id
              ? {
                ...msg,
                id: data.data?.ID_TinNhan || msg.id,
                file_dinh_kem: messageData.file_dinh_kem,
                loai_tin_nhan: messageData.file_dinh_kem ? 'image' : 'text',
              }
              : msg,
          ),
        );
      } else {
        console.error('❌ HTTP API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ HTTP API error:', error);
    }
  };

  // Gửi nhiều ảnh
  const sendMultipleImages = async (imageUris: string[], caption: string) => {
    if (!currentUserId || imageUris.length === 0) return;

    if (!userToken) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
      return;
    }

    // Tạo tin nhắn tạm thời cho mỗi ảnh
    const tempMessages = imageUris.map((uri, index) => ({
      id: `temp_${Date.now()}_${index}`,
      text: index === 0 && caption.trim() ? caption.trim() : '', // Chỉ hiển thị caption nếu có
      mediaUri: uri,
      mediaType: 'image',
      senderId: currentUserId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    setMessages((prev) => [...prev, ...tempMessages]);

    // Cuộn xuống dưới
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Upload từng ảnh
      const apiUrl = Constants.expoConfig?.extra?.apiUrl;
      if (!apiUrl) {
        throw new Error('API URL không được cấu hình');
      }

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        const formData = new FormData();

        const fileExtension = uri.split('.').pop() || 'jpg';
        const fileName = `image_${Date.now()}_${i}.${fileExtension}`;

        // Đảm bảo format FormData đúng cho React Native - sử dụng field 'avatar' như API hiện có
        formData.append('avatar', {
          uri: uri,
          type: `image/${fileExtension}`,
          name: fileName,
        } as any);

        console.log('Uploading file:', fileName, 'URI:', uri);

        // Upload file với timeout - sử dụng API upload hiện có
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${userToken}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response ok:', uploadResponse.ok);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed with response:', errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadData = await uploadResponse.json();
        console.log('Upload successful:', uploadData);

        // Lấy filename từ response API upload hiện có
        let uploadedFileName = uploadData.imageUrl || uploadData.filename || uploadData.fileName;

        if (!uploadedFileName) {
          console.error('Upload response:', uploadData);
          throw new Error('Upload response missing filename');
        }

        // Nếu là full URL, chỉ lấy filename
        if (uploadedFileName.includes('/')) {
          uploadedFileName = uploadedFileName.split('/').pop();
        }

        console.log('Final filename for database:', uploadedFileName);

        // Gửi tin nhắn - theo format API documentation
        const messageData = {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: i === 0 && caption.trim() ? caption.trim() : '', // Chuỗi rỗng, không null
          loai_tin_nhan: 'text', // Mặc định text (theo API docs)
          file_dinh_kem: uploadedFileName, // Filename để phân biệt tin nhắn ảnh
          tin_nhan_phu_thuoc: null, // Thêm field này theo API docs
        };

        // Gửi qua socket hoặc API
        if (socketRef.current?.connected) {
          console.log('📤 Sending via Socket.IO:', messageData);
          socketRef.current.emit('send_message', messageData);

          // Thêm timeout để kiểm tra response
          setTimeout(() => {
            console.log('⏰ Socket timeout - trying HTTP fallback');
            // Fallback HTTP nếu socket không response
            sendImageViaHTTP(messageData, tempMessages[i]);
          }, 5000);
        } else {
          const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify(messageData),
          });

          if (response && response.ok && response.status !== 0) {
            const data = await response.json();

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempMessages[i].id
                  ? {
                    ...msg,
                    id: data.data?.ID_TinNhan || msg.id,
                    file_dinh_kem: uploadedFileName,
                    loai_tin_nhan: uploadedFileName ? 'image' : 'text',
                  }
                  : msg,
              ),
            );
          }
        }
      }

      // Xóa ảnh đã chọn
      setSelectedImages([]);
    } catch (error) {
      console.error('Error sending images:', error);

      // Xóa tin nhắn tạm nếu có lỗi
      setMessages((prev) => prev.filter((msg) => !tempMessages.some((temp) => temp.id === msg.id)));

      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = error instanceof Error ? error.message : 'Không thể gửi ảnh';
      Alert.alert('Lỗi gửi ảnh', errorMessage, [
        {
          text: 'Thử lại',
          onPress: () => sendMultipleImages(imageUris, caption),
        },
        {
          text: 'Hủy',
          style: 'cancel',
        },
      ]);
    }
  };

  const handleSend = async () => {
    const trimmedText = inputText.trim();
    if ((trimmedText.length === 0 && selectedImages.length === 0) || !currentUserId) {
      return;
    }

    // Nếu có ảnh, gửi ảnh trước
    if (selectedImages.length > 0) {
      await sendMultipleImages(selectedImages, trimmedText);
      setInputText('');
      return;
    }

    // Gửi tin nhắn text thông thường
    // Tạo tin nhắn tạm thời (optimistic update)
    const tempMessage = {
      id: 'temp_' + Date.now(),
      text: trimmedText,
      senderId: currentUserId,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, tempMessage]);
    setInputText('');

    // Cuộn xuống dưới ngay lập tức sau khi thêm tin tạm
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Thử gửi qua socket trước
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          ID_NguoiGui: currentUserId,
          ID_NguoiNhan: otherUser.id,
          noi_dung: trimmedText,
          loai_tin_nhan: 'text',
          file_dinh_kem: null,
          tin_nhan_phu_thuoc: null,
        });
      } else {
        // Fallback: gửi qua HTTP API nếu socket không kết nối
        const apiUrl = Constants.expoConfig?.extra?.apiUrl;
        if (!apiUrl) {
          console.error('API URL không được cấu hình');
          return;
        }

        const response = await fetch(`${apiUrl}/api/tinnhan/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            ID_NguoiGui: currentUserId,
            ID_NguoiNhan: otherUser.id,
            noi_dung: trimmedText,
            loai_tin_nhan: 'text',
            file_dinh_kem: null,
            tin_nhan_phu_thuoc: null,
          }),
        });

        if (response && response.ok && response.status !== 0) {
          const data = await response.json();
          // Cập nhật tin nhắn tạm với ID thật từ server
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === tempMessage.id
                ? { ...msg, id: data.data?.ID_TinNhan || tempMessage.id }
                : msg,
            ),
          );
        } else {
          // Có thể hiển thị thông báo lỗi cho user
        }
      }
    } catch {
      // Silent error handling
    }
  };

  // Cuộn xuống dưới khi messages thay đổi
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_COLOR} />
      {/* SafeAreaView màu đỏ cho vùng tai thỏ */}
      <SafeAreaView style={styles.safeAreaTop} />

      {/* Container chính */}
      <View style={styles.screenContainer}>
        {/* 1. Header */}
        <ChatHeader
          user={otherUser}
          onBack={handleGoBack}
          onAvatarPress={() =>
            router.push({
              pathname: '/components/CaNhan/canhan',
              params: { userId: otherUser.id },
            })
          }
        />

        {/* 2. Container trắng bo góc chứa tin nhắn và input */}
        <KeyboardAvoidingView
          style={styles.chatAreaContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* 2.1. Danh sách tin nhắn */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                currentUserId={currentUserId}
                onMessagePress={handleMessagePress}
                onImagePress={handleImagePress}
                recalledMessages={recalledMessages}
              />
            )}
            keyExtractor={(item, index) => `${item.id}_${index}`}
            style={styles.messageList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
          {/* Hiển thị typing indicator nếu người kia đang typing */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>{otherUser.name} is typing...</Text>
            </View>
          )}

          {/* Hiển thị preview ảnh ở hàng riêng */}
          <ImagePreviewRow
            images={selectedImages}
            onRemoveImage={removeSelectedImage}
            onRemoveAll={removeAllImages}
          />

          {/* 2.2. Khung nhập liệu */}
          <InputBar
            onSend={handleSend}
            inputText={inputText}
            setInputText={setInputText}
            onImagePress={handleSelectImages}
            onLocationPress={handleShareLocation}
          />
        </KeyboardAvoidingView>

        {/* Modal hiển thị options cho tin nhắn */}
        <Modal
          visible={showMessageOptions}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMessageOptions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMessageOptions(false)}
          >
            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.optionButton} onPress={handleForwardMessage}>
                <Ionicons name="arrow-forward" size={24} color="#007AFF" />
                <Text style={styles.optionText}>Chuyển tiếp</Text>
              </TouchableOpacity>

              {/* Hiển thị option khác nhau tùy theo tin nhắn của ai */}
              {selectedMessage &&
                (selectedMessage.senderId === currentUserId || selectedMessage.senderId === 'me') ? (
                // Tin nhắn của mình - Thu hồi
                <TouchableOpacity style={styles.optionButton} onPress={handleRecallMessage}>
                  <Ionicons name="return-up-back" size={24} color="#FF9500" />
                  <Text style={[styles.optionText, { color: '#FF9500' }]}>Thu hồi</Text>
                </TouchableOpacity>
              ) : (
                // Tin nhắn của người khác - Ẩn
                <TouchableOpacity style={styles.optionButton} onPress={handleHideMessage}>
                  <Ionicons name="eye-off" size={24} color="#8E8E93" />
                  <Text style={[styles.optionText, { color: '#8E8E93' }]}>Ẩn tin nhắn</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ImageViewer Modal */}
        <ImageViewer
          visible={showImageViewer}
          imageUri={currentImageUri}
          onClose={handleCloseImageViewer}
          onDownload={handleDownloadImage}
          onShare={handleShareImage}
        />

        {/* Post Share Form Modal */}
        <Modal
          visible={showPostShareForm}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancelPostShare}
        >
          <View style={styles.postShareModalOverlay}>
            <PostShareForm
              postData={sharePostData}
              onSend={handleSendPostShare}
              onCancel={handleCancelPostShare}
              inputText={shareFormInput}
              setInputText={setShareFormInput}
            />
          </View>
        </Modal>
      </View>
    </>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  safeAreaTop: {
    flex: 0,
    backgroundColor: PRIMARY_COLOR,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR, // Nền đỏ cho cả màn hình
  },
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: PRIMARY_COLOR, // Nền đỏ
  },
  headerButton: {
    padding: 5,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerStatus: {
    color: '#f0f0f0',
    fontSize: 13,
  },
  headerRightIcons: {
    flexDirection: 'row',
  },
  // Khu vực chat (trắng, bo góc)
  chatAreaContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden', // Cắt bỏ phần con bên ngoài góc bo
  },
  // Danh sách tin nhắn
  messageList: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20, // Padding trên cho tin nhắn đầu tiên
  },
  // Tin nhắn
  messageItemContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubbleBase: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: PRIMARY_COLOR,
  },
  otherMessageBubble: {
    backgroundColor: '#f1f1f1',
  },
  myMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#000',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 5,
  },
  myTimestamp: {
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    alignSelf: 'flex-start',
  },
  // Khung nhập liệu
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputIconButton: {
    padding: 5,
    marginHorizontal: 5,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120, // Cho phép nhập nhiều dòng
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginHorizontal: 5,
  },
  // Typing indicator
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#000',
  },
  // Recall notification styles
  recallContainer: {
    marginVertical: 4,
    alignItems: 'center',
  },
  myRecallContainer: {
    alignSelf: 'flex-end',
  },
  otherRecallContainer: {
    alignSelf: 'flex-start',
  },
  recallBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  recallText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  // Media message styles
  mediaContainer: {
    marginVertical: 4,
    maxWidth: '90%',
  },
  myMediaContainer: {
    alignSelf: 'flex-end',
  },
  otherMediaContainer: {
    alignSelf: 'flex-start',
  },
  mediaBubble: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  myMediaBubble: {
    backgroundColor: PRIMARY_COLOR,
  },
  otherMediaBubble: {
    backgroundColor: '#f1f1f1',
  },
  mediaImage: {
    width: 500,
    height: 600,
    borderRadius: 18,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: 300,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaText: {
    padding: 12,
    fontSize: 16,
  },
  myMediaText: {
    color: '#fff',
  },
  otherMediaText: {
    color: '#000',
  },
  // Disabled button style
  disabledButton: {
    opacity: 0.5,
  },
  // Multiple images preview styles
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  imageScrollView: {
    flex: 1,
  },
  imagePreviewItem: {
    position: 'relative',
    marginRight: 10,
  },
  imagePreviewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAllButton: {
    padding: 8,
    marginLeft: 10,
  },
  // ImageViewer styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  imageViewerTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    paddingTop: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 10,
  },
  imageViewerCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80, // Để tránh bị che bởi top bar
    paddingBottom: 100, // Để tránh bị che bởi bottom bar
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  imageViewerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  imageViewerActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Post Share Form Styles
  postShareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  postShareFormContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  postShareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postShareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  postShareCloseButton: {
    padding: 5,
  },
  postPreviewContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  postPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  postPreviewText: {
    flex: 1,
  },
  postPreviewArrow: {
    padding: 5,
  },
  postPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  postPreviewLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  postShareInputContainer: {
    marginBottom: 20,
  },
  postShareTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  postShareCharCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  postShareActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postShareCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  postShareCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  postShareSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: PRIMARY_COLOR,
  },
  postShareSendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  postShareSendText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Post Share Message Styles
  postShareBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postShareCard: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  postShareCardImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  postShareCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postShareIcon: {
    marginRight: 12,
  },
  postShareCardText: {
    flex: 1,
  },
  postShareCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  postShareCardSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  // Location Message Styles
  locationBubble: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    minWidth: 200,
    alignItems: 'center',
  },
  locationIcon: {
    marginBottom: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default ChatDetailScreen;
