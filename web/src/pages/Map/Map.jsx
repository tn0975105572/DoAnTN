import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle as LeafletCircle,
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

function parseLocation(viTri) {
  if (!viTri) return null;
  const parts = viTri.split('|');
  if (parts.length === 2) {
    const coords = parts[1].split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0].trim());
      const lng = parseFloat(coords[1].trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng, address: parts[0] };
      }
    }
  }
  return null;
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

export default function MapPage() {
  const navigate = useNavigate();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Đang lấy vị trí của bạn...');
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS_KM));
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);

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

  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoadingPosts(true);
      setPostsError('');
      try {
        const res = await fetch(`${API_BASE_URL}/baidang/getAll`);
        if (!res.ok) {
          throw new Error('Không thể tải danh sách bài đăng.');
        }
        const data = await res.json();
        const rawPosts = Array.isArray(data) ? data : data.data || data.posts || [];

        const mapped = rawPosts
          .map((p) => {
            const loc = parseLocation(p.vi_tri);
            if (!loc) return null;
            return {
              ...p,
              location: loc,
            };
          })
          .filter(Boolean);

        setPosts(mapped);
      } catch (error) {
        console.error('Error fetching posts for map page', error);
        setPostsError('Có lỗi khi tải bài đăng. Vui lòng thử lại sau.');
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, []);

  const normalizedKeyword = useMemo(() => normalizeSearchText(keyword), [keyword]);
  const keywordTokens = useMemo(
    () => normalizedKeyword.split(' ').filter(Boolean),
    [normalizedKeyword],
  );

  const safeRadius = useMemo(() => {
    const radiusKm = parseFloat(radius);
    return Number.isNaN(radiusKm) || radiusKm <= 0 ? DEFAULT_RADIUS_KM : radiusKm;
  }, [radius]);

  const filteredPosts = useMemo(() => {
    return posts
      .map((post) => {
        const distanceKm = currentLocation
          ? haversine(
              currentLocation.lat,
              currentLocation.lng,
              post.location.lat,
              post.location.lng,
            )
          : null;

        const searchScore = getSearchScore(post, normalizedKeyword, keywordTokens);

        return {
          ...post,
          distanceKm,
          searchScore,
        };
      })
      .filter((post) => {
        if (currentLocation && post.distanceKm > safeRadius) return false;
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
      })
      .slice(0, 100);
  }, [posts, currentLocation, safeRadius, normalizedKeyword, keywordTokens]);

  const handleResetRadius = () => {
    setRadius(String(DEFAULT_RADIUS_KM));
  };

  const handleClearKeyword = () => {
    setKeyword('');
  };

  const handleViewPost = (postId) => {
    navigate(`/post/${postId}/comments`);
  };

  const handleFocusPostOnMap = (post) => {
    if (!post?.location) return;

    setMapCenter({
      lat: post.location.lat,
      lng: post.location.lng,
    });
    setMapZoom(POST_FOCUS_ZOOM);
  };

  const resultsSummary = useMemo(() => {
    if (loadingPosts) {
      return (
        <span className="map-loading">
          <Loader2 size={16} className="spin" />
          Đang tải bài đăng trên bản đồ...
        </span>
      );
    }

    if (currentLocation) {
      return (
        <span>
          Tìm thấy <strong>{filteredPosts.length}</strong> bài đăng phù hợp trong bán kính{' '}
          <strong>{safeRadius}km</strong> quanh vị trí hiện tại
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
  }, [currentLocation, filteredPosts.length, loadingPosts, normalizedKeyword, safeRadius]);

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
                  max="100"
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

              {filteredPosts.map((post) => (
                <Marker
                  key={post.ID_BaiDang || post.id}
                  position={[post.location.lat, post.location.lng]}
                  eventHandlers={{
                    click: () => handleViewPost(post.ID_BaiDang || post.id),
                  }}
                >
                  <Popup>
                    <div className="map-popup">
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
              {filteredPosts.map((post) => (
                <div
                  key={post.ID_BaiDang || post.id}
                  className="map-post-item"
                >
                  <button
                    type="button"
                    className="map-post-item-main"
                    onClick={() => handleViewPost(post.ID_BaiDang || post.id)}
                  >
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
                  </button>

                  <button
                    type="button"
                    className="map-focus-btn"
                    onClick={() => handleFocusPostOnMap(post)}
                  >
                    Xem trên bản đồ
                  </button>
                </div>
              ))}
              {!loadingPosts && filteredPosts.length === 0 && (
                <div className="map-empty">
                  <p>Không có bài đăng nào khớp với bộ lọc hiện tại.</p>
                  <p>
                    Hãy thử đổi từ khóa, tăng bán kính hoặc bấm định vị để xem bài đăng quanh bạn.
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
