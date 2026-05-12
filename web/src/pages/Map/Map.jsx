import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle as LeafletCircle,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import {
  MapPin,
  Search,
  Circle,
  Navigation,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import './Map.css';
import 'leaflet/dist/leaflet.css';

const DEFAULT_RADIUS_KM = 5;
const DEFAULT_MAP_CENTER = { lat: 16.047079, lng: 108.20623 };
const DEFAULT_MAP_ZOOM = 6;
const LOCATION_MAP_ZOOM = 13;
const POST_FOCUS_ZOOM = 15;
const GRAPH_HOPPER_KEY = import.meta.env.VITE_GRAPHHOPPER_KEY || '';
const FALLBACK_IMAGE = 'https://via.placeholder.com/400x300?text=No+Image';
const MAX_RADIUS_KM = 100;
const POSTS_PAGE_SIZE = 500;

const getBackendOrigin = () => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
};

const normalizeAssetUrl = (raw, backendOrigin) => {
  if (!raw || typeof raw !== 'string') return '';

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      if (url.pathname.startsWith('/uploads/')) {
        return `${backendOrigin}${url.pathname}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  const cleaned = raw.replace(/^\/+/, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('uploads/')) return `${backendOrigin}/${cleaned}`;
  return `${backendOrigin}/uploads/${cleaned}`;
};

const normalizeLocationLabel = (value) =>
  String(value || '').replace(/\s+/g, ' ').trim();

const isValidLocation = (value) =>
  value &&
  Number.isFinite(Number(value.lat)) &&
  Number.isFinite(Number(value.lng)) &&
  Number(value.lat) >= -90 &&
  Number(value.lat) <= 90 &&
  Number(value.lng) >= -180 &&
  Number(value.lng) <= 180;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.includes('|')) return value.split('|');
  return value ? [value] : [];
};

const getPostImageUrls = (post, backendOrigin) => {
  const rawImages = [
    ...toArray(post?.DanhSachAnh),
    ...toArray(post?.imageUrls),
    post?.LinkAnh,
    post?.anh_bai_dang,
    post?.image,
    post?.img,
  ];

  return Array.from(
    new Set(rawImages.map((item) => normalizeAssetUrl(item, backendOrigin)).filter(Boolean)),
  );
};

const escapeHtmlAttr = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const createPostMarkerIcon = (post) =>
  L.divIcon({
    className: 'map-photo-marker-shell',
    html: `
      <div class="map-photo-marker">
        <img src="${escapeHtmlAttr(post.primaryImage || FALLBACK_IMAGE)}" alt="" />
        <span class="map-photo-marker-pin"></span>
      </div>
    `,
    iconSize: [58, 70],
    iconAnchor: [29, 64],
    popupAnchor: [0, -58],
  });

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundDistanceKm(distanceKm) {
  return Math.round(distanceKm * 10) / 10;
}

function parseLocation(viTri) {
  if (!viTri) return null;
  const parts = String(viTri).split('|');
  if (parts.length === 2) {
    const coords = parts[1].split(',');
    if (coords.length === 2) {
      const lat = Number.parseFloat(coords[0].trim());
      const lng = Number.parseFloat(coords[1].trim());
      const location = {
        lat,
        lng,
        address: normalizeLocationLabel(parts[0]),
      };
      if (isValidLocation(location)) {
        return location;
      }
    }
  }
  return null;
}

async function fetchAllMapPosts() {
  const allPosts = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(POSTS_PAGE_SIZE),
      status: 'all',
    });
    const res = await fetch(`${API_BASE_URL}/baidang/getAllWithDetails?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Không thể tải danh sách bài đăng.');
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;

    const pagePosts = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.posts)
        ? data.posts
        : [];

    allPosts.push(...pagePosts);
    totalPages = Number(data?.totalPages) || (pagePosts.length === POSTS_PAGE_SIZE ? page + 1 : page);
    page += 1;
  } while (page <= totalPages);

  return allPosts;
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchScore(post, normalizedKeyword, keywordTokens) {
  if (!normalizedKeyword) return 0;

  const title = normalizeSearchText(post.tieu_de || '');
  const desc = normalizeSearchText(post.mo_ta || '');
  const address = normalizeSearchText(post.location?.address || '');
  const haystack = `${title} ${desc} ${address}`.trim();

  if (!haystack) return -1;
  if (!keywordTokens.every((token) => haystack.includes(token))) return -1;

  let score = 10;

  if (title.includes(normalizedKeyword)) score += 120;
  if (address.includes(normalizedKeyword)) score += 80;
  if (desc.includes(normalizedKeyword)) score += 40;

  keywordTokens.forEach((token) => {
    if (title.startsWith(token)) score += 24;
    else if (title.includes(token)) score += 16;

    if (address.includes(token)) score += 10;
    if (desc.includes(token)) score += 6;
  });

  return score;
}

function MapViewportController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;

    map.setView([center.lat, center.lng], zoom, {
      animate: true,
    });
  }, [center, map, zoom]);

  return null;
}

function RouteViewportController({ routeCoords }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords.length < 2) return;

    map.fitBounds(routeCoords, {
      padding: [42, 42],
      maxZoom: 15,
    });
  }, [map, routeCoords]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const backendOrigin = useMemo(() => getBackendOrigin(), []);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Đang lấy vị trí của bạn...');
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [postLocationStatus, setPostLocationStatus] = useState('');

  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS_KM));
  const [useRadiusFilter, setUseRadiusFilter] = useState(true);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeTargetId, setRouteTargetId] = useState('');
  const [loadingRouteId, setLoadingRouteId] = useState('');
  const [routeError, setRouteError] = useState('');

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('');
      setLocationError(
        'Trình duyệt không hỗ trợ định vị. Bạn vẫn có thể tìm theo từ khóa hoặc bật vị trí rồi thử lại.',
      );
      return;
    }

    setIsLocating(true);
    setLocationError('');
    setLocationStatus('Đang lấy vị trí của bạn...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nextLocation = { lat: latitude, lng: longitude };

        setCurrentLocation(nextLocation);
        setMapCenter(nextLocation);
        setMapZoom(LOCATION_MAP_ZOOM);
        setRouteCoords([]);
        setRouteInfo(null);
        setRouteTargetId('');
        setRouteError('');
        setLocationStatus('Đã cập nhật vị trí hiện tại và đưa bản đồ về gần bạn.');
        setLocationError('');
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error', err);
        setLocationStatus('');
        setIsLocating(false);

        if (err.code === 1) {
          setLocationError(
            'Bạn đã chặn quyền vị trí. Hãy cho phép định vị nếu muốn lọc bài đăng quanh bạn.',
          );
        } else if (err.code === 2) {
          setLocationError(
            'Thiết bị chưa xác định được vị trí hiện tại. Bạn có thể thử lại sau ít phút.',
          );
        } else if (err.code === 3) {
          setLocationError(
            'Lấy vị trí bị quá thời gian. Hãy bấm "Định vị bản đồ" để thử lại.',
          );
        } else {
          setLocationError(
            'Không thể lấy vị trí hiện tại. Bạn vẫn có thể tìm kiếm bài đăng trên toàn bộ bản đồ.',
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  const getRoute = useCallback(async (from, to) => {
    if (!GRAPH_HOPPER_KEY) {
      throw new Error('Thiếu VITE_GRAPHHOPPER_KEY trong web/.env.');
    }

    const params = new URLSearchParams();
    params.append('point', `${from.lat},${from.lng}`);
    params.append('point', `${to.lat},${to.lng}`);
    params.set('profile', 'car');
    params.set('points_encoded', 'false');
    params.set('key', GRAPH_HOPPER_KEY);

    const res = await fetch(`https://graphhopper.com/api/1/route?${params.toString()}`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.message || 'Không thể tìm đường đi bằng GraphHopper.');
    }

    const path = data?.paths?.[0];
    const coordinates = path?.points?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      throw new Error('GraphHopper không trả về tuyến đường phù hợp.');
    }

    return {
      coords: coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: path.distance ? path.distance / 1000 : null,
      timeMinutes: path.time ? path.time / 60000 : null,
    };
  }, []);

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      setLoadingPosts(true);
      setPostsError('');
      setPostLocationStatus('');
      try {
        const rawPosts = await fetchAllMapPosts();
        if (cancelled) return;

        const mapped = rawPosts
          .map((p) => {
            const parsedLocation = parseLocation(p.vi_tri);
            if (!isValidLocation(parsedLocation)) return null;
            const imageUrls = getPostImageUrls(p, backendOrigin);

            return {
              ...p,
              location: {
                lat: Number(parsedLocation.lat),
                lng: Number(parsedLocation.lng),
                address:
                  parsedLocation.address ||
                  normalizeLocationLabel(p.vi_tri).split('|')[0] ||
                  'Không rõ địa chỉ',
              },
              imageUrls,
              primaryImage: imageUrls[0] || FALLBACK_IMAGE,
            };
          })
          .filter(Boolean);

        setPosts(mapped);
        if (mapped.length === 0 && rawPosts.length > 0) {
          setPostsError(
            'Các bài đăng chưa có tọa độ theo định dạng mobile "địa chỉ|lat,lng", nên chưa thể lọc đúng theo bán kính.',
          );
        } else if (mapped.length < rawPosts.length) {
          setPostLocationStatus(
            `Đang hiển thị ${mapped.length}/${rawPosts.length} bài có tọa độ hợp lệ giống mobile.`,
          );
        } else {
          setPostLocationStatus('');
        }
      } catch (error) {
        console.error('Error fetching posts for map page', error);
        setPostsError('Có lỗi khi tải bài đăng. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) {
          setLoadingPosts(false);
        }
      }
    };

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, [backendOrigin]);

  const normalizedKeyword = useMemo(() => normalizeSearchText(keyword), [keyword]);
  const keywordTokens = useMemo(
    () => normalizedKeyword.split(' ').filter(Boolean),
    [normalizedKeyword],
  );

  const safeRadius = useMemo(() => {
    const radiusKm = parseFloat(radius);
    if (Number.isNaN(radiusKm) || radiusKm <= 0) return DEFAULT_RADIUS_KM;
    return Math.min(radiusKm, MAX_RADIUS_KM);
  }, [radius]);

  const filteredPosts = useMemo(() => {
    return posts
      .map((post) => {
        const exactDistanceKm = currentLocation
          ? haversine(currentLocation.lat, currentLocation.lng, post.location.lat, post.location.lng)
          : null;
        const distanceKm = exactDistanceKm == null ? null : roundDistanceKm(exactDistanceKm);

        const searchScore = getSearchScore(post, normalizedKeyword, keywordTokens);

        return {
          ...post,
          distanceKm,
          searchScore,
        };
      })
      .filter((post) => {
        if (useRadiusFilter && currentLocation && post.distanceKm > safeRadius) return false;
        if (!normalizedKeyword) return true;
        return post.searchScore >= 0;
      })
      .sort((a, b) => {
        if (normalizedKeyword && b.searchScore !== a.searchScore) {
          return b.searchScore - a.searchScore;
        }
        if (currentLocation && a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }

        const timeA = new Date(a.thoi_gian_tao || 0).getTime() || 0;
        const timeB = new Date(b.thoi_gian_tao || 0).getTime() || 0;
        return timeB - timeA;
      });
  }, [posts, currentLocation, safeRadius, normalizedKeyword, keywordTokens, useRadiusFilter]);

  const handleResetRadius = () => {
    setRadius(String(DEFAULT_RADIUS_KM));
    setUseRadiusFilter(true);
  };

  const handleClearKeyword = () => {
    setKeyword('');
  };

  const handleViewPost = (postId, post) => {
    if (!postId) return;

    navigate(`/post/${postId}`, {
      state: post
        ? {
            post: {
              id: postId,
              authorId: post.ID_NguoiDung || '',
              author: post.TenNguoiDung || 'Người dùng OLODO',
              avatar: normalizeAssetUrl(post.anh_dai_dien, backendOrigin),
              title: post.tieu_de || 'Bài đăng',
              desc: post.mo_ta || '',
              price: post.gia,
              location: post.vi_tri || post.location?.address || '',
              createdAt: post.thoi_gian_tao || '',
              category: post.TenDanhMuc || '',
              postTypeName: post.TenLoaiBaiDang || '',
              status: post.trang_thai || '',
              img: post.primaryImage,
              imageUrls: post.imageUrls?.length ? post.imageUrls : [post.primaryImage],
              likes: post.SoLuongLike || 0,
              comments: post.SoLuongBinhLuan || 0,
            },
          }
        : undefined,
    });
  };

  const handleFocusPostOnMap = (post) => {
    if (!post?.location) return;

    setMapCenter({
      lat: post.location.lat,
      lng: post.location.lng,
    });
    setMapZoom(POST_FOCUS_ZOOM);
  };

  const handleRouteToPost = async (post) => {
    const postId = post.ID_BaiDang || post.id;

    if (!currentLocation) {
      setRouteError('Bạn cần bấm Định vị bản đồ trước khi tìm đường.');
      return;
    }

    if (!post?.location) {
      setRouteError('Bài đăng này chưa có tọa độ hợp lệ để tìm đường.');
      return;
    }

    try {
      setLoadingRouteId(postId);
      setRouteError('');
      setRouteTargetId(postId);

      const nextRoute = await getRoute(currentLocation, post.location);
      setRouteCoords(nextRoute.coords);
      setRouteInfo({
        postTitle: post.tieu_de || 'bài đăng đã chọn',
        distanceKm: nextRoute.distanceKm,
        timeMinutes: nextRoute.timeMinutes,
      });
    } catch (error) {
      console.error('Error getting GraphHopper route', error);
      setRouteCoords([]);
      setRouteInfo(null);
      setRouteTargetId('');
      setRouteError(error.message || 'Không thể tìm tuyến đường tới bài đăng này.');
    } finally {
      setLoadingRouteId('');
    }
  };

  const handleClearRoute = () => {
    setRouteCoords([]);
    setRouteInfo(null);
    setRouteTargetId('');
    setRouteError('');
  };

  const routeSummary = useMemo(() => {
    if (!routeInfo) return '';

    const details = [];
    if (routeInfo.distanceKm != null) details.push(`${routeInfo.distanceKm.toFixed(1)} km`);
    if (routeInfo.timeMinutes != null) details.push(`~${Math.round(routeInfo.timeMinutes)} phút`);

    return `Tuyến đường tới ${routeInfo.postTitle}${details.length ? ` (${details.join(', ')})` : ''}`;
  }, [routeInfo]);

  const resultsSummary = useMemo(() => {
    if (loadingPosts) {
      return (
        <span className="map-loading">
          <Loader2 size={16} className="spin" />
          Đang tải bài đăng trên bản đồ...
        </span>
      );
    }

    if (currentLocation && useRadiusFilter) {
      return (
        <span>
          Tìm thấy <strong>{filteredPosts.length}</strong> bài đăng phù hợp trong bán kính{' '}
          <strong>{safeRadius}km</strong> quanh vị trí hiện tại. Tổng bài có tọa độ:{' '}
          <strong>{posts.length}</strong>
        </span>
      );
    }

    if (currentLocation && !useRadiusFilter) {
      return (
        <span>
          Đang hiển thị <strong>{filteredPosts.length}</strong> bài đăng có tọa độ trên toàn bản đồ
        </span>
      );
    }

    if (normalizedKeyword) {
      return (
        <span>
          Tìm thấy <strong>{filteredPosts.length}</strong> bài đăng khớp từ khóa trên toàn bộ bản đồ
        </span>
      );
    }

    return (
      <span>
        Đang hiển thị <strong>{filteredPosts.length}</strong> bài đăng có tọa độ. Bấm{' '}
        <strong>Định vị bản đồ</strong> để lọc quanh bạn.
      </span>
    );
  }, [currentLocation, filteredPosts.length, loadingPosts, normalizedKeyword, posts.length, safeRadius, useRadiusFilter]);

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1 className="map-title">Bản đồ bài đăng</h1>
          <p className="map-subtitle">
            Tìm bài đăng theo tiêu đề, mô tả hoặc địa chỉ. Tìm kiếm hỗ trợ cả khi bạn gõ không dấu.
          </p>
        </div>
        <button
          type="button"
          className="map-back-btn"
          onClick={() => navigate('/')}
        >
          Trang chủ
        </button>
      </div>

      <div className="map-layout">
        <div className="map-controls">
          <div className="map-input-group">
            <label htmlFor="keyword" className="map-label">
              Tìm kiếm bài đăng
            </label>
            <div className="map-input-wrap">
              <Search size={16} className="map-input-icon" />
              <input
                id="keyword"
                type="text"
                className={`map-input ${keyword ? 'has-trailing-action' : ''}`}
                placeholder="Nhập tiêu đề, mô tả hoặc địa chỉ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keyword && (
                <button
                  type="button"
                  className="map-input-action"
                  onClick={handleClearKeyword}
                  aria-label="Xóa từ khóa"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="map-helper-text">
              Ví dụ: `xe dap`, `phong tro quan 7`, `laptop dell`.
            </div>
          </div>

          <div className="map-input-row">
            <div className="map-input-group small">
              <label htmlFor="radius" className="map-label">
                Bán kính lọc (km)
              </label>
              <div className="map-input-wrap">
                <Circle size={16} className="map-input-icon" />
                <input
                  id="radius"
                  type="number"
                  min="1"
                  max={MAX_RADIUS_KM}
                  step="1"
                  className="map-input"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                />
              </div>
            </div>

            <div className="map-action-group">
              <button
                type="button"
                className="map-locate-btn"
                onClick={requestCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
                {isLocating ? 'Đang định vị...' : 'Định vị bản đồ'}
              </button>
              <button
                type="button"
                className="map-reset-btn"
                onClick={handleResetRadius}
              >
                Đặt lại {DEFAULT_RADIUS_KM}km
              </button>
              <button
                type="button"
                className="map-scope-btn"
                onClick={() => setUseRadiusFilter((current) => !current)}
                disabled={!currentLocation}
              >
                {useRadiusFilter ? 'Hiện tất cả' : 'Lọc quanh tôi'}
              </button>
            </div>

            <div className="map-status">
              <div className="map-status-row">
                <MapPin size={14} />
                <span>
                  {currentLocation
                    ? `Vị trí hiện tại: ${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`
                    : 'Chưa có vị trí hiện tại. Bản đồ đang ở chế độ toàn quốc.'}
                </span>
              </div>
              {locationStatus && (
                <div className="map-status-row status-ok">
                  <Navigation size={14} />
                  <span>{locationStatus}</span>
                </div>
              )}
              {locationError && (
                <div className="map-status-row status-error">
                  <AlertTriangle size={14} />
                  <span>{locationError}</span>
                </div>
              )}
              {postsError && (
                <div className="map-status-row status-error">
                  <AlertTriangle size={14} />
                  <span>{postsError}</span>
                </div>
              )}
              {postLocationStatus && (
                <div className="map-status-row status-ok">
                  <MapPin size={14} />
                  <span>{postLocationStatus}</span>
                </div>
              )}
              {currentLocation && (
                <div className="map-status-row status-scope">
                  <Circle size={14} />
                  <span>
                    {useRadiusFilter
                      ? `Đang lọc trong ${safeRadius}km quanh bạn.`
                      : 'Đang tắt lọc bán kính để hiện tất cả bài có tọa độ.'}
                  </span>
                </div>
              )}
              {routeSummary && (
                <div className="map-status-row status-route">
                  <Navigation size={14} />
                  <span>{routeSummary}</span>
                  <button
                    type="button"
                    className="map-route-clear-btn"
                    onClick={handleClearRoute}
                    aria-label="Xóa tuyến đường"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {routeError && (
                <div className="map-status-row status-error">
                  <AlertTriangle size={14} />
                  <span>{routeError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="map-results-summary">{resultsSummary}</div>
        </div>

        <div className="map-content">
          <div className="map-map-container">
            <div className="map-map-toolbar">
              <button
                type="button"
                className="map-map-locate-btn"
                onClick={requestCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
                <span>{isLocating ? 'Đang định vị...' : 'Về vị trí của tôi'}</span>
              </button>
            </div>
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={mapZoom}
              className="map-leaflet"
            >
              <MapViewportController center={mapCenter} zoom={mapZoom} />
              <RouteViewportController routeCoords={routeCoords} />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              {currentLocation && (
                <>
                  <Marker position={[currentLocation.lat, currentLocation.lng]}>
                    <Popup>Đây là vị trí hiện tại của bạn.</Popup>
                  </Marker>

                  <LeafletCircle
                    center={[currentLocation.lat, currentLocation.lng]}
                    radius={safeRadius * 1000}
                    pathOptions={{ color: '#7f001f', fillColor: '#7f001f', fillOpacity: 0.12 }}
                  />
                </>
              )}

              {routeCoords.length > 0 && (
                <Polyline
                  positions={routeCoords}
                  pathOptions={{
                    color: '#1976d2',
                    weight: 5,
                    opacity: 0.86,
                  }}
                />
              )}

              {filteredPosts.map((post) => (
                <Marker
                  key={post.ID_BaiDang || post.id}
                  position={[post.location.lat, post.location.lng]}
                  icon={createPostMarkerIcon(post)}
                  eventHandlers={{
                    click: () => handleViewPost(post.ID_BaiDang || post.id, post),
                  }}
                >
                  <Popup>
                    <div className="map-popup">
                      <img
                        className="map-popup-image"
                        src={post.primaryImage || FALLBACK_IMAGE}
                        alt={post.tieu_de || 'Bài đăng'}
                      />
                      <strong>{post.tieu_de || 'Không có tiêu đề'}</strong>
                      <br />
                      {post.mo_ta || 'Không có mô tả.'}
                      <br />
                      {post.distanceKm != null ? (
                        <span>{post.distanceKm.toFixed(1)} km</span>
                      ) : (
                        <span>{post.location.address || 'Không rõ địa chỉ'}</span>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className="map-posts-panel">
            <div className="map-posts-header">
              <h2>Bài đăng trong khu vực</h2>
              <span>{filteredPosts.length} kết quả</span>
            </div>
            <div className="map-posts-list">
              {filteredPosts.map((post) => {
                const postId = post.ID_BaiDang || post.id;
                const isRouteTarget = routeTargetId === postId;
                const isRouteLoading = loadingRouteId === postId;

                return (
                  <div
                    key={postId}
                    className={`map-post-item ${isRouteTarget ? 'is-route-target' : ''}`}
                  >
                    <button
                      type="button"
                      className="map-post-item-main"
                      onClick={() => handleViewPost(postId, post)}
                    >
                      <img
                        className="map-post-thumb"
                        src={post.primaryImage || FALLBACK_IMAGE}
                        alt={post.tieu_de || 'Bài đăng'}
                      />
                      <div className="map-post-copy">
                        <div className="map-post-main">
                          <h3 className="map-post-title">
                            {post.tieu_de || 'Không có tiêu đề'}
                          </h3>
                          <p className="map-post-desc">
                            {post.mo_ta || 'Không có mô tả.'}
                          </p>
                        </div>
                        <div className="map-post-meta">
                          {post.distanceKm != null && (
                            <span className="map-post-distance">
                              {post.distanceKm.toFixed(1)} km
                            </span>
                          )}
                          <span className="map-post-address">
                            {post.location?.address || 'Không rõ địa chỉ'}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="map-post-actions">
                      <button
                        type="button"
                        className="map-focus-btn"
                        onClick={() => handleFocusPostOnMap(post)}
                      >
                        Xem trên bản đồ
                      </button>
                      <button
                        type="button"
                        className="map-route-btn"
                        onClick={() => handleRouteToPost(post)}
                        disabled={isRouteLoading}
                      >
                        {isRouteLoading ? (
                          <>
                            <Loader2 size={13} className="spin" />
                            Đang tìm...
                          </>
                        ) : (
                          <>
                            <Navigation size={13} />
                            Chỉ đường
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
              {!loadingPosts && filteredPosts.length === 0 && (
                <div className="map-empty">
                  <p>Không có bài đăng nào khớp với bộ lọc hiện tại.</p>
                  <p>
                    Hãy thử đổi từ khóa, tăng bán kính hoặc bấm Hiện tất cả để xem toàn bộ bài có tọa độ.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
