import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle as LeafletCircle, Popup } from 'react-leaflet';
import {
  MapPin,
  Search,
  Circle,
  Navigation,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import './Map.css';
import 'leaflet/dist/leaflet.css';

const DEFAULT_RADIUS_KM = 5;

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

export default function MapPage() {
  const navigate = useNavigate();
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Đang lấy vị trí của bạn...');
  const [locationError, setLocationError] = useState('');

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS_KM));

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('');
      setLocationError('Trình duyệt không hỗ trợ định vị vị trí (Geolocation). Đang dùng vị trí mặc định (TP.HCM).');
      setCurrentLocation({ lat: 10.77, lng: 106.68 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setLocationStatus('Đã lấy được vị trí hiện tại.');
      },
      (err) => {
        console.error('Geolocation error', err);
        // Nếu người dùng từ chối hoặc hệ thống không cho phép, dùng vị trí mặc định
        setCurrentLocation({ lat: 10.77, lng: 106.68 });
        if (err.code === 1) {
          setLocationError(
            'Bạn đã chặn quyền vị trí, hệ thống đang dùng vị trí mặc định (TP.HCM).',
          );
        } else if (err.code === 2) {
          setLocationError(
            'Không thể xác định vị trí từ thiết bị, đang dùng vị trí mặc định (TP.HCM).',
          );
        } else if (err.code === 3) {
          setLocationError(
            'Lấy vị trí bị quá thời gian, đang dùng vị trí mặc định (TP.HCM).',
          );
        } else {
          setLocationError(
            'Không thể lấy vị trí hiện tại, đang dùng vị trí mặc định (TP.HCM).',
          );
        }
        setLocationStatus('');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, []);

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

  const filteredPosts = useMemo(() => {
    if (!currentLocation) return [];

    const radiusKm = parseFloat(radius);
    const safeRadius = Number.isNaN(radiusKm) || radiusKm <= 0 ? DEFAULT_RADIUS_KM : radiusKm;
    const keywordLower = keyword.trim().toLowerCase();

    return posts
      .map((post) => {
        const distanceKm = haversine(
          currentLocation.lat,
          currentLocation.lng,
          post.location.lat,
          post.location.lng,
        );
        return {
          ...post,
          distanceKm,
        };
      })
      .filter((post) => {
        if (post.distanceKm > safeRadius) return false;
        if (!keywordLower) return true;
        const text =
          `${post.tieu_de || ''} ${post.mo_ta || ''} ${post.location.address || ''}`.toLowerCase();
        return text.includes(keywordLower);
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 100);
  }, [posts, currentLocation, radius, keyword]);

  const handleResetRadius = () => {
    setRadius(String(DEFAULT_RADIUS_KM));
  };

  const handleViewPost = (postId) => {
    navigate(`/post/${postId}/comments`);
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1 className="map-title">Bản đồ bài đăng</h1>
          <p className="map-subtitle">
            Tìm bài đăng gần bạn theo từ khóa (ví dụ: &quot;xe đạp&quot;) và bán kính mong muốn.
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
              Từ khóa bài đăng
            </label>
            <div className="map-input-wrap">
              <Search size={16} className="map-input-icon" />
              <input
                id="keyword"
                type="text"
                className="map-input"
                placeholder="Ví dụ: xe đạp, laptop, phòng trọ..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="map-input-row">
            <div className="map-input-group small">
              <label htmlFor="radius" className="map-label">
                Bán kính (km)
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
                    ? `Vị trí hiện tại: ${currentLocation.lat.toFixed(
                        4,
                      )}, ${currentLocation.lng.toFixed(4)}`
                    : 'Đang xác định vị trí...'}
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

          <div className="map-results-summary">
            {loadingPosts ? (
              <span className="map-loading">
                <Loader2 size={16} className="spin" />
                Đang tải bài đăng gần bạn...
              </span>
            ) : (
              <span>
                Tìm thấy{' '}
                <strong>{filteredPosts.length}</strong>{' '}
                bài đăng phù hợp trong bán kính{' '}
                <strong>{radius || DEFAULT_RADIUS_KM}km</strong>
              </span>
            )}
          </div>
        </div>

        <div className="map-content">
          <div className="map-map-container">
            {currentLocation && (
              <MapContainer
                center={[currentLocation.lat, currentLocation.lng]}
                zoom={13}
                className="map-leaflet"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />

                <Marker position={[currentLocation.lat, currentLocation.lng]}>
                  <Popup>Vị trí hiện tại của bạn (hoặc mặc định).</Popup>
                </Marker>

                <LeafletCircle
                  center={[currentLocation.lat, currentLocation.lng]}
                  radius={(parseFloat(radius) || DEFAULT_RADIUS_KM) * 1000}
                  pathOptions={{ color: '#7f001f', fillColor: '#7f001f', fillOpacity: 0.12 }}
                />

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
                        <span>{post.distanceKm.toFixed(1)} km</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          <div className="map-posts-panel">
            <div className="map-posts-header">
              <h2>Bài đăng trong khu vực</h2>
              <span>{filteredPosts.length} kết quả</span>
            </div>
            <div className="map-posts-list">
              {filteredPosts.map((post) => (
                <button
                  type="button"
                  key={post.ID_BaiDang || post.id}
                  className="map-post-item"
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
                    <span className="map-post-distance">
                      {post.distanceKm.toFixed(1)} km
                    </span>
                    <span className="map-post-address">
                      {post.location?.address || 'Không rõ địa chỉ'}
                    </span>
                  </div>
                </button>
              ))}
              {!loadingPosts && filteredPosts.length === 0 && (
                <div className="map-empty">
                  <p>Không có bài đăng nào khớp với bộ lọc.</p>
                  <p>Hãy thử tăng bán kính hoặc dùng từ khóa khác.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

