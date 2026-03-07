import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

const GRAPH_HOPPER_KEY = 'e27a7eaf-2b2f-4a1b-b0cb-610240d2e9f9';
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl as string;
const DEFAULT_RADIUS_KM = 5;

type Point = {
  lat: number;
  lng: number;
};

type Post = {
  ID_BaiDang: string;
  ID_NguoiDung: string;
  tieu_de: string;
  mo_ta: string;
  gia: string;
  vi_tri: string;
  distance?: number; // Khoảng cách từ vị trí hiện tại (km)
  coordinates?: Point; // Tọa độ đã parse từ vi_tri
  postImage?: string; // Ảnh đầu tiên của bài đăng
  authorAvatar?: string; // Ảnh đại diện người đăng
};

// Component custom marker với ảnh bài đăng và avatar overlay
const CustomPostMarker = ({
  postImage,
  authorAvatar,
}: {
  postImage?: string;
  authorAvatar?: string;
}) => {
  return (
    <View style={styles.customMarkerContainer}>
      {/* Ảnh bài đăng làm background */}
      {postImage ? (
        <Image source={{ uri: postImage }} style={styles.markerPostImage} />
      ) : (
        <View style={[styles.markerPostImage, styles.markerPlaceholder]}>
          <Ionicons name="image-outline" size={30} color="#ccc" />
        </View>
      )}
      {/* Avatar đè lên trên */}
      <View style={styles.markerAvatarContainer}>
        <Image
          source={{ uri: authorAvatar || 'https://i.pravatar.cc/50' }}
          style={styles.markerAvatar}
        />
      </View>
    </View>
  );
};

export default function NearestByRoute() {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [status, setStatus] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearbyPosts, setNearbyPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostList, setShowPostList] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS_KM));
  const [currentRadius, setCurrentRadius] = useState(DEFAULT_RADIUS_KM);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady && Platform.OS === 'android') {
        setMapError('Google Play Services không khả dụng');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [mapReady]);

  // Tự động lấy vị trí khi component mount
  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= UTILS ================= */

  // Khoảng cách chim bay
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Parse vi_tri để lấy tọa độ
  const parseLocation = (viTri: string): Point | null => {
    if (!viTri) return null;

    // Format: "address|latitude,longitude" hoặc chỉ "address"
    const parts = viTri.split('|');
    if (parts.length === 2) {
      const coords = parts[1].split(',');
      if (coords.length === 2) {
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
    return null;
  };

  const getRoute = async (a: Point, b: Point) => {
    try {
      const url =
        `https://graphhopper.com/api/1/route` +
        `?point=${a.lat},${a.lng}` +
        `&point=${b.lat},${b.lng}` +
        `&profile=car` +
        `&points_encoded=false` +
        `&key=${GRAPH_HOPPER_KEY}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Không thể tìm đường đi');
      }
      const data = await res.json();
      if (!data.paths || !data.paths[0]) {
        throw new Error('Không tìm thấy đường đi');
      }
      return data.paths[0];
    } catch (error) {
      console.error('Error getting route:', error);
      throw error;
    }
  };

  /* ================= LOCATION ================= */

  const getCurrentLocation = async () => {
    try {
      setLocating(true);
      setStatus('Đang lấy vị trí...');

      // Yêu cầu quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần quyền truy cập vị trí để sử dụng tính năng này.');
        setLocating(false);
        setStatus('');
        return;
      }

      // Lấy vị trí hiện tại
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation: Point = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setCurrentLocation(newLocation);

      // Di chuyển map đến vị trí hiện tại
      mapRef.current?.animateToRegion(
        {
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );

      setStatus('Đã lấy vị trí thành công');

      // Tự động tìm bài đăng gần đó
      await fetchNearbyPosts(newLocation);
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng thử lại.');
      setStatus('Lỗi khi lấy vị trí');
    } finally {
      setLocating(false);
    }
  };

  /* ================= FETCH POSTS ================= */

  const fetchNearbyPosts = async (location: Point, radiusKm: number = currentRadius) => {
    if (!location) return;

    try {
      setLoadingPosts(true);
      setStatus('Đang tìm bài đăng gần đây...');
      setCurrentRadius(radiusKm);

      const token = await AsyncStorage.getItem('userToken');
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Thử lấy tất cả bài đăng (hoặc dùng endpoint recommendations)
      // Nếu không có endpoint getAll, có thể dùng recommendations
      let response;
      try {
        // Thử endpoint getAll trước
        response = await fetch(`${API_BASE_URL}/api/baidang/getAll`, { headers });
        if (!response.ok) {
          // Nếu không có getAll, thử dùng recommendations
          const userInfo = await AsyncStorage.getItem('userInfo');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            response = await fetch(`${API_BASE_URL}/api/recommendations/${user.ID_NguoiDung}`, {
              headers,
            });
          } else {
            throw new Error('Không có thông tin người dùng');
          }
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setStatus('Không thể tải bài đăng');
        setLoadingPosts(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Không thể tải bài đăng');
      }

      const data = await response.json();
      const posts: Post[] = Array.isArray(data) ? data : data.data || data.posts || [];

      // Parse và filter bài đăng có vị trí gần đó
      const postsWithLocation: Post[] = [];
      for (const post of posts) {
        const coords = parseLocation(post.vi_tri);
        if (!coords) continue;

        const distance = haversine(location.lat, location.lng, coords.lat, coords.lng);
        const distanceKm = Math.round(distance * 10) / 10; // Làm tròn 1 chữ số thập phân

        if (distanceKm > radiusKm) continue;

        postsWithLocation.push({
          ...post,
          coordinates: coords,
          distance: distanceKm,
        });
      }

      // Sắp xếp theo khoảng cách và giới hạn 50 bài đăng
      postsWithLocation.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      const limitedPosts = postsWithLocation.slice(0, 50);

      // Fetch thêm ảnh bài đăng và avatar người dùng
      const enrichedPosts = await Promise.all(
        limitedPosts.map(async (post) => {
          try {
            // Fetch ảnh bài đăng
            const imageRes = await fetch(
              `${API_BASE_URL}/api/baidang_anh/getById/${post.ID_BaiDang}`,
              {
                headers,
              },
            );
            let postImage = '';
            if (imageRes.ok) {
              const images = await imageRes.json();
              if (images && images.length > 0) {
                const linkAnh = images[0].LinkAnh;
                if (linkAnh.startsWith('http://') || linkAnh.startsWith('https://')) {
                  postImage = linkAnh;
                } else {
                  const baseUrl = API_BASE_URL.replace('/api', '');
                  postImage = `${baseUrl}/uploads/${linkAnh}`;
                }
              }
            }

            // Fetch thông tin người dùng
            const userRes = await fetch(`${API_BASE_URL}/api/nguoidung/get/${post.ID_NguoiDung}`, {
              headers,
            });
            let authorAvatar = 'https://i.pravatar.cc/50';
            if (userRes.ok) {
              const userData = await userRes.json();
              const user = userData.user || userData;

              if (user.anh_dai_dien) {
                // Nếu đã là full URL (có http/https), kiểm tra xem có localhost không
                if (
                  user.anh_dai_dien.startsWith('http://') ||
                  user.anh_dai_dien.startsWith('https://')
                ) {
                  // Nếu có localhost, thay thế bằng IP thực tế từ API_BASE_URL
                  if (
                    user.anh_dai_dien.includes('localhost') ||
                    user.anh_dai_dien.includes('127.0.0.1')
                  ) {
                    const baseUrl = API_BASE_URL.replace('/api', '');
                    const fileName =
                      user.anh_dai_dien.split('/uploads/')[1] || user.anh_dai_dien.split('/').pop();
                    authorAvatar = `${baseUrl}/uploads/${fileName}`;
                  } else {
                    authorAvatar = user.anh_dai_dien;
                  }
                } else {
                  // Nếu chỉ là tên file, thêm base URL
                  const baseUrl = API_BASE_URL.replace('/api', '');
                  authorAvatar = `${baseUrl}/uploads/${user.anh_dai_dien}`;
                }
              }
            }

            return {
              ...post,
              postImage,
              authorAvatar,
            };
          } catch (error) {
            console.error(`Error enriching post ${post.ID_BaiDang}:`, error);
            return {
              ...post,
              postImage: '',
              authorAvatar: 'https://i.pravatar.cc/50',
            };
          }
        }),
      );

      setNearbyPosts(enrichedPosts);
      setStatus(`Tìm thấy ${limitedPosts.length} bài đăng trong ${radiusKm}km`);

      // Fit map để hiển thị tất cả markers
      if (limitedPosts.length > 0 && mapRef.current) {
        const allCoords = [
          { latitude: location.lat, longitude: location.lng },
          ...limitedPosts
            .filter((p) => p.coordinates !== undefined)
            .map((p) => ({
              latitude: p.coordinates!.lat,
              longitude: p.coordinates!.lng,
            })),
        ];

        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching nearby posts:', error);
      setStatus('Lỗi khi tải bài đăng');
      Alert.alert('Lỗi', 'Không thể tải bài đăng. Vui lòng thử lại.');
    } finally {
      setLoadingPosts(false);
    }
  };

  /* ================= FIND ROUTE TO POST ================= */

  const findRouteToPost = async (post: Post) => {
    if (!currentLocation || !post.coordinates) {
      Alert.alert('Lỗi', 'Không có vị trí hiện tại hoặc vị trí bài đăng');
      return;
    }

    try {
      setLoadingRoute(true);
      setStatus('Đang tìm đường đi...');
      setRouteCoords([]);

      const path = await getRoute(currentLocation, post.coordinates);
      const distanceKm = path.distance / 1000;

      const coords = path.points.coordinates.map((c: number[]) => ({
        latitude: c[1],
        longitude: c[0],
      }));

      setRouteCoords(coords);

      // Fit map để hiển thị toàn bộ đường đi
      const allCoords = [
        { latitude: currentLocation.lat, longitude: currentLocation.lng },
        { latitude: post.coordinates.lat, longitude: post.coordinates.lng },
        ...coords,
      ];

      mapRef.current?.fitToCoordinates(allCoords, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });

      setStatus(`Đường đi: ${distanceKm.toFixed(1)}km`);
    } catch (error: any) {
      console.error('Error finding route:', error);
      Alert.alert('Lỗi', 'Không thể tìm đường đi. Vui lòng thử lại.');
      setStatus('Không thể tìm đường đi');
    } finally {
      setLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    setRouteCoords([]);
    setStatus('');
  };

  /* ================= SEARCH WITH RADIUS ================= */

  const handleSearchWithRadius = async () => {
    const radiusKm = parseFloat(radius);

    if (isNaN(radiusKm) || radiusKm <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập bán kính hợp lệ (số dương)');
      return;
    }

    if (radiusKm > 100) {
      Alert.alert('Lỗi', 'Bán kính tối đa là 100km');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Lỗi', 'Chưa có vị trí hiện tại. Vui lòng đợi...');
      return;
    }

    setShowForm(false);
    await fetchNearbyPosts(currentLocation, radiusKm);
  };

  /* ================= RENDER ================= */

  return (
    <View style={styles.container}>
      {mapError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Lỗi Google Play Services</Text>
          <Text style={styles.errorText}>Expo Go cần Google Play Services để hiển thị bản đồ.</Text>
          <Text style={styles.errorText}>Để sửa lỗi này, vui lòng build development build:</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>npx expo run:android</Text>
          </View>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              setMapError(null);
              setMapReady(false);
            }}
          >
            <Text style={styles.btnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: 10.77,
              longitude: 106.68,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onMapReady={() => {
              setMapReady(true);
              setMapError(null);
            }}
          >
            {/* Đường đi từ vị trí hiện tại đến bài đăng */}
            {routeCoords.length > 0 && (
              <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#1976d2" />
            )}

            {/* Marker vị trí hiện tại */}
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }}
                title="Vị trí của bạn"
                pinColor="green"
              />
            )}

            {/* Markers bài đăng gần đó */}
            {nearbyPosts.map((post) => {
              if (!post.coordinates) return null;
              return (
                <Marker
                  key={post.ID_BaiDang}
                  coordinate={{
                    latitude: post.coordinates.lat,
                    longitude: post.coordinates.lng,
                  }}
                  onPress={() => {
                    router.push({
                      pathname: '/components/BaiDang/chitietbaidang',
                      params: { postId: post.ID_BaiDang },
                    });
                  }}
                >
                  <CustomPostMarker postImage={post.postImage} authorAvatar={post.authorAvatar} />
                </Marker>
              );
            })}
          </MapView>

          {/* Nút định vị */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color="#1976d2" />
            ) : (
              <Ionicons name="locate" size={24} color="#1976d2" />
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Hiển thị số bài đăng trong bán kính */}
      {nearbyPosts.length > 0 && (
        <View style={styles.postsCountBadge}>
          <Text style={styles.postsCountText}>
            {nearbyPosts.length} bài đăng trong {currentRadius}km
          </Text>
        </View>
      )}

      {/* Hiển thị status */}
      {status && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      {/* Nút tìm kiếm */}
      <TouchableOpacity style={styles.searchButton} onPress={() => setShowForm((v) => !v)}>
        <Ionicons name="search" size={24} color="#1976d2" />
      </TouchableOpacity>

      {/* Nút hiển thị danh sách bài đăng */}
      {nearbyPosts.length > 0 && (
        <TouchableOpacity style={styles.postsListButton} onPress={() => setShowPostList((v) => !v)}>
          <Ionicons name="list" size={24} color="#1976d2" />
          {nearbyPosts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{nearbyPosts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Loading indicator khi đang tải bài đăng */}
      {loadingPosts && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Đang tìm bài đăng...</Text>
        </View>
      )}

      {/* Loading indicator khi đang tìm đường đi */}
      {loadingRoute && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Đang tìm đường đi...</Text>
        </View>
      )}

      {/* Danh sách bài đăng gần đó */}
      {showPostList && nearbyPosts.length > 0 && (
        <View style={styles.postsListContainer}>
          <View style={styles.postsListHeader}>
            <Text style={styles.postsListTitle}>Bài đăng gần đây ({nearbyPosts.length})</Text>
            <TouchableOpacity onPress={() => setShowPostList(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.postsListScroll}>
            {nearbyPosts.map((post) => (
              <TouchableOpacity
                key={post.ID_BaiDang}
                style={styles.postItem}
                onPress={() => {
                  setSelectedPost(post);
                  setShowPostList(false);
                  // Tìm đường đi đến bài đăng
                  findRouteToPost(post);
                }}
              >
                <Text style={styles.postItemTitle} numberOfLines={1}>
                  {post.tieu_de}
                </Text>
                <Text style={styles.postItemDescription} numberOfLines={2}>
                  {post.mo_ta}
                </Text>
                <View style={styles.postItemFooter}>
                  <Text style={styles.postItemPrice}>
                    {post.gia ? `${parseFloat(post.gia).toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                  </Text>
                  <Text style={styles.postItemDistance}>{post.distance}km</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Modal chi tiết bài đăng */}
      {selectedPost && (
        <View style={styles.postModal}>
          <View style={styles.postModalContent}>
            <View style={styles.postModalHeader}>
              <Text style={styles.postModalTitle}>{selectedPost.tieu_de}</Text>
              <TouchableOpacity onPress={() => setSelectedPost(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.postModalBody}>
              <Text style={styles.postModalDescription}>{selectedPost.mo_ta}</Text>
              <View style={styles.postModalInfo}>
                <Text style={styles.postModalInfoText}>
                  <Ionicons name="cash" size={16} color="#1976d2" />{' '}
                  {selectedPost.gia
                    ? `${parseFloat(selectedPost.gia).toLocaleString('vi-VN')}đ`
                    : 'Miễn phí'}
                </Text>
                <Text style={styles.postModalInfoText}>
                  <Ionicons name="location" size={16} color="#1976d2" /> {selectedPost.distance}km
                  từ bạn
                </Text>
                <Text style={styles.postModalInfoText}>
                  <Ionicons name="map" size={16} color="#1976d2" />{' '}
                  {selectedPost.vi_tri.split('|')[0]}
                </Text>
              </View>
              <View style={styles.postModalActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.routeButton]}
                  onPress={() => {
                    findRouteToPost(selectedPost);
                    setSelectedPost(null);
                  }}
                  disabled={loadingRoute}
                >
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.btnText}>Tìm đường đi</Text>
                </TouchableOpacity>
                {routeCoords.length > 0 && (
                  <TouchableOpacity
                    style={[styles.btn, styles.clearRouteButton]}
                    onPress={clearRoute}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.btnText}>Xóa đường đi</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Form tìm kiếm theo bán kính */}
      {showForm && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.title}>Tìm kiếm trong bán kính</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bán kính (km)</Text>
            <TextInput
              value={radius}
              onChangeText={setRadius}
              keyboardType="numeric"
              style={styles.input}
              placeholder="Nhập bán kính (km)"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>Bán kính hiện tại: {currentRadius}km</Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleSearchWithRadius}>
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.btnText}>🔍 Tìm kiếm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={() => {
              setRadius(String(DEFAULT_RADIUS_KM));
              handleSearchWithRadius();
            }}
          >
            <Text style={styles.secondaryBtnText}>Đặt lại mặc định ({DEFAULT_RADIUS_KM}km)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ================= STYLE ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  btn: {
    backgroundColor: '#1976d2',
    marginTop: 8,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  status: {
    marginTop: 6,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    color: '#1976d2',
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 15,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  searchButton: {
    position: 'absolute',
    bottom: 30,
    right: 15,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  postsListButton: {
    position: 'absolute',
    bottom: 170,
    right: 15,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 15,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  postsListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    maxHeight: '50%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  postsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postsListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  postsListScroll: {
    flex: 1,
  },
  postItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  postItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  postItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  postItemDistance: {
    fontSize: 14,
    color: '#666',
  },
  postModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  postModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxHeight: '70%',
    elevation: 10,
  },
  postModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  postModalBody: {
    padding: 15,
  },
  postModalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  postModalInfo: {
    gap: 10,
  },
  postModalInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  postModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  routeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearRouteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#d32f2f',
  },
  postsCountBadge: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    alignItems: 'center',
  },
  postsCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  statusBadge: {
    position: 'absolute',
    top: 100,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  customMarkerContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerPostImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  markerPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerAvatarContainer: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
  },
});
