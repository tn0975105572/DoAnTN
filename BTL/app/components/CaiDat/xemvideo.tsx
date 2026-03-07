import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const API_BASE_URL = Constants.expoConfig!.extra!.apiUrl as string;

interface UserInfo {
  ID_NguoiDung: string;
  ho_ten?: string;
  diem_so?: number;
  da_xac_thuc?: number; // 0 = chưa xác thực, 1 = đã xác thực
}

const XemVideoScreen = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [hasWatchedToday, setHasWatchedToday] = useState(false);
  const [isWatchingVideo, setIsWatchingVideo] = useState(false);
  const [watchTimer, setWatchTimer] = useState(0);

  // Video URLs thật - Sample videos miễn phí
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<Video>(null);

  const loadUserData = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');
      if (userJson) {
        const userData = JSON.parse(userJson);
        // Gọi API để lấy trạng thái xác thực mới nhất
        if (userData.ID_NguoiDung && token) {
          try {
            const res = await fetch(
              `${API_BASE_URL}/api/nguoidung/getById/${userData.ID_NguoiDung}?_t=${Date.now()}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  Pragma: 'no-cache',
                },
              }
            );
            if (res.ok) {
              const latestUser = await res.json();
              setUserInfo(latestUser);
              setIsVerified(latestUser.da_xac_thuc === 1);
              await AsyncStorage.setItem('userInfo', JSON.stringify(latestUser));
              return;
            }
          } catch (e) {
            console.error('Lỗi khi lấy thông tin người dùng mới nhất:', e);
          }
        }
        // Fallback: dùng cache nếu API fail
        setUserInfo(userData);
        setIsVerified(userData.da_xac_thuc === 1);
      }
    } catch (error) {
      console.error('Lỗi khi tải thông tin người dùng:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      setIsVideoLoading(true);
      // Giả lập gọi API lấy danh sách video
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Danh sách video từ server (giả lập)
      const fetchedVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
      ];

      setVideoUrls(fetchedVideos);
    } catch (error) {
      console.error('Lỗi khi tải danh sách video:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách video');
    } finally {
      setIsVideoLoading(false);
    }
  }, []);

  const checkTodayWatched = useCallback(async () => {
    try {
      const today = new Date().toDateString();
      const watchedToday = await AsyncStorage.getItem(`watched_video_${today}`);
      setHasWatchedToday(!!watchedToday);
    } catch (error) {
      console.error('Lỗi khi kiểm tra video đã xem:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    checkTodayWatched();
    fetchVideos();
  }, [loadUserData, checkTodayWatched, fetchVideos]);

  const startWatching = async () => {
    if (hasWatchedToday) {
      Alert.alert('Thông báo', 'Bạn đã xem video hôm nay rồi!');
      return;
    }

    setIsWatchingVideo(true);
    setWatchProgress(0);
    setWatchTimer(0);

    try {
      // Phát video thật
      if (videoRef.current) {
        await videoRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error playing video:', error);
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      // Cập nhật progress khi video đang phát
      const currentTime = status.positionMillis / 1000;
      const duration = status.durationMillis ? status.durationMillis / 1000 : 15;
      const progress = (currentTime / duration) * 100;

      setWatchTimer(Math.floor(currentTime));
      setWatchProgress(progress);

      // Nếu đã xem đủ 15 giây, dừng và cộng điểm
      if (currentTime >= 15) {
        videoRef.current?.pauseAsync();
        setIsWatchingVideo(false);
        awardPoints();
      }
    }

    if (status.didJustFinish) {
      setIsWatchingVideo(false);
      // Nếu video kết thúc sớm hơn 15s, vẫn cộng điểm
      if (watchTimer >= 15) {
        awardPoints();
      }
    }
  };

  const awardPoints = async () => {
    if (!userInfo?.ID_NguoiDung) return;

    setIsWatching(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      // Gọi API để cộng điểm
      const response = await fetch(`${API_BASE_URL}/api/lich_su_tich_diem/addPoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userInfo.ID_NguoiDung,
          pointChange: 100,
          transactionType: 'tang_diem',
          description: 'Xem video quảng cáo',
          referenceId: null,
        }),
      });

      if (response.ok) {
        await response.json();

        // Cập nhật điểm trong AsyncStorage
        const newPoints = (userInfo.diem_so || 0) + 100;
        const updatedUserInfo = { ...userInfo, diem_so: newPoints };
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        setUserInfo(updatedUserInfo);

        // Đánh dấu đã xem hôm nay
        const today = new Date().toDateString();
        await AsyncStorage.setItem(`watched_video_${today}`, 'true');
        setHasWatchedToday(true);

        Alert.alert(
          'Chúc mừng!',
          `Bạn đã nhận được 100 điểm!\n\nĐiểm hiện tại: ${newPoints} điểm`,
          [{ text: 'Tuyệt vời!', style: 'default' }]
        );
      } else {
        throw new Error('Không thể cộng điểm');
      }
    } catch (error) {
      console.error('Lỗi khi cộng điểm:', error);
      Alert.alert('Lỗi', 'Không thể cộng điểm. Vui lòng thử lại.');
    } finally {
      setIsWatching(false);
    }
  };

  const nextVideo = async () => {
    if (currentVideoIndex < videoUrls.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
      setWatchProgress(0);
      setWatchTimer(0);
      setIsWatchingVideo(false);
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.setPositionAsync(0);
      }
    }
  };

  const prevVideo = async () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
      setWatchProgress(0);
      setWatchTimer(0);
      setIsWatchingVideo(false);
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.setPositionAsync(0);
      }
    }
  };

  if (isLoading || isVideoLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#791228" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // Chặn tài khoản chưa xác thực
  if (!isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Xem Video Kiếm Điểm</Text>
        </View>
        <View style={styles.blockedContainer}>
          <View style={styles.blockedIconWrapper}>
            <Ionicons name="shield-checkmark-outline" size={80} color="#FF9800" />
          </View>
          <Text style={styles.blockedTitle}>Tài khoản chưa xác thực</Text>
          <Text style={styles.blockedDesc}>
            Bạn cần xác thực tài khoản bằng CCCD gắn chip trước khi có thể xem video tích điểm.
          </Text>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => router.push('/components/CaiDat/Xacminh/xacminh')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.verifyButtonText}>Xác thực ngay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xem Video Kiếm Điểm</Text>
        <View style={styles.pointsContainer}>
          <Ionicons name="star" size={20} color="#FFD700" />
          <Text style={styles.pointsText}>{userInfo?.diem_so || 0}</Text>
        </View>
      </View>

      {/* Thông tin */}
      <View style={styles.infoCard}>
        <View style={styles.infoItem}>
          <Ionicons name="play-circle" size={24} color="#4CAF50" />
          <Text style={styles.infoText}>Xem video 15 giây để nhận 100 điểm</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="time" size={24} color="#FF9800" />
          <Text style={styles.infoText}>Mỗi ngày chỉ được xem 1 lần</Text>
        </View>
        {hasWatchedToday && (
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.infoText}>Bạn đã xem video hôm nay</Text>
          </View>
        )}
      </View>

      {/* Video Player THẬT */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrls[currentVideoIndex] }}
          style={styles.videoPlayer}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          useNativeControls={false}
          volume={1.0}
        />
        {!isWatchingVideo && (
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={80} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.playText}>Nhấn Play để xem</Text>
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${watchProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {isWatchingVideo ? `${watchTimer}/15s` : `${Math.round(watchProgress)}%`}
          </Text>
        </View>

        {/* Video Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, currentVideoIndex === 0 && styles.disabledButton]}
            onPress={prevVideo}
            disabled={currentVideoIndex === 0 || isWatchingVideo}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, (hasWatchedToday || isWatchingVideo) && styles.disabledButton]}
            onPress={startWatching}
            disabled={hasWatchedToday || isWatchingVideo}
          >
            <Ionicons name={isWatchingVideo ? "pause" : "play"} size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, currentVideoIndex === videoUrls.length - 1 && styles.disabledButton]}
            onPress={nextVideo}
            disabled={currentVideoIndex === videoUrls.length - 1 || isWatchingVideo}
          >
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status */}
      {hasWatchedToday ? (
        <View style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.statusTitle}>Đã hoàn thành!</Text>
          <Text style={styles.statusText}>Bạn đã xem video và nhận điểm hôm nay</Text>
          <Text style={styles.statusSubText}>Quay lại vào ngày mai để xem video mới</Text>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Ionicons name="play-circle" size={48} color="#FF9800" />
          <Text style={styles.statusTitle}>Sẵn sàng kiếm điểm!</Text>
          <Text style={styles.statusText}>Nhấn play và xem video 15 giây</Text>
          <Text style={styles.statusSubText}>Bạn sẽ nhận được 100 điểm</Text>
        </View>
      )}

      {/* Loading overlay */}
      {isWatching && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#791228" />
          <Text style={styles.loadingText}>Đang cộng điểm...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#791228',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointsText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  videoContainer: {
    margin: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: 250,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  playText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  controlButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabledButton: {
    opacity: 0.3,
  },
  playButton: {
    padding: 16,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusSubText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Màn hình chặn chưa xác thực
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  blockedIconWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  blockedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  blockedDesc: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#791228',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginBottom: 12,
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  backButtonText: {
    color: '#888',
    fontSize: 15,
  },
});

export default XemVideoScreen;
