import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart, Bell, MessageCircle, Menu, X, ShoppingBag, LogOut
} from 'lucide-react';
import ChatWidget from '../ChatWidget/ChatWidget';
import AiAdvisorWidget from '../AiAdvisorWidget/AiAdvisorWidget';
import { clearAuthSession, useAuthSession } from '../../utils/authSession';
import './Layout.css';

const LOGO_SRC = '/123.png';
const API_BASE = 'http://localhost:3000';
const DEFAULT_AVATAR = 'https://i.pravatar.cc/80?u=guest';

const normalizeUrl = (url) => {
  if (!url) return DEFAULT_AVATAR;
  return url.replace(/^http:\/\/(?!localhost)[\d.]+:(\d+)/, 'http://localhost:$1');
};

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
  }, [pathname]);
  return null;
}

const Layout = () => {
  const navigate = useNavigate();
  const { token, userId, user: storedUser } = useAuthSession();
  const [fetchedUser, setFetchedUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentUser = useMemo(() => {
    if (fetchedUser) return fetchedUser;
    if (!storedUser) return null;

    return {
      name: storedUser.ho_ten || storedUser.name || 'Bạn',
      avatar: normalizeUrl(storedUser.anh_dai_dien
        ? (storedUser.anh_dai_dien.startsWith('http') ? storedUser.anh_dai_dien : `${API_BASE}/uploads/${storedUser.anh_dai_dien}`)
        : DEFAULT_AVATAR)
    };
  }, [fetchedUser, storedUser]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!token || !userId) return;
      try {
        const res = await fetch(`${API_BASE}/api/nguoidung/get/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const u = data?.user || {};
          setFetchedUser({
            name: u.ho_ten || 'Bạn',
            avatar: normalizeUrl(
              u.anh_dai_dien
                ? (u.anh_dai_dien.startsWith('http') ? u.anh_dai_dien : `${API_BASE}/uploads/${u.anh_dai_dien}`)
                : DEFAULT_AVATAR
            )
          });
        }
      } catch {
        return undefined;
      }
    };

    fetchUserInfo();
  }, [token, userId]);

  const handleLogout = () => {
    clearAuthSession();
    setFetchedUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      <ScrollToTop />
      {/* ══════ HEADER ══════ */}
      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <Link to="/" className="logo" aria-label="Trang chủ OLODO">
            <img src={LOGO_SRC} alt="OLODO" className="logo-img" />
            <span className="logo-text">OLODO</span>
          </Link>

          {/* Nav Links */}
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
              Chợ Sinh Viên
            </Link>
            <Link to="/products" className="nav-link" onClick={() => setMenuOpen(false)}>
              Sản phẩm
            </Link>
            <Link to="/about" className="nav-link" onClick={() => setMenuOpen(false)}>
              Giới thiệu
            </Link>
            <Link to="/contact" className="nav-link" onClick={() => setMenuOpen(false)}>
              Liên hệ
            </Link>
            <Link to="/orders" className="nav-link" onClick={() => setMenuOpen(false)}>
              Hóa đơn
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="header-actions">
            <button className="header-icon-btn header-icon-badge" aria-label="Thông báo" onClick={() => navigate('/notifications')}>
              <Bell size={20} />
              <span className="badge-dot" />
            </button>

            {currentUser ? (
              <>
                <button className="header-icon-btn" aria-label="Bài đăng đã thích" onClick={() => navigate('/liked-posts')}>
                  <Heart size={20} />
                </button>
                <button className="header-icon-btn" aria-label="Tin nhắn" onClick={() => navigate('/messages')}>
                  <MessageCircle size={20} />
                </button>
                <div className="user-menu-group">
                  <button
                    type="button"
                    className="user-profile-trigger"
                    onClick={() => {
                      navigate('/profile');
                      setMenuOpen(false);
                    }}
                    aria-label="Mở trang cá nhân"
                  >
                    <div className="user-avatar-header">
                      <img src={currentUser.avatar || DEFAULT_AVATAR} alt={currentUser.name || 'User'} />
                    </div>
                    <span className="user-name-header">{currentUser.name}</span>
                  </button>
                  <button onClick={handleLogout} className="logout-btn" aria-label="Đăng xuất">
                    <LogOut size={16} />
                  </button>
                </div>
                <button className="btn-dang-tin" onClick={() => navigate('/create-post')}>
                  <ShoppingBag size={16} />
                  <span>Đăng tin</span>
                </button>
              </>
            ) : (
              <div className="auth-buttons">
                <button className="login-btn" onClick={() => navigate('/login')}>
                  Đăng nhập
                </button>
                <button className="btn-dang-tin" onClick={() => navigate('/register')}>
                  <ShoppingBag size={16} />
                  <span>Đăng ký</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ══════ FOOTER ══════ */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">OLODO</span>
            <p className="footer-desc">Chợ sinh viên trực tuyến — Mua bán dễ dàng, an toàn, nhanh chóng.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Về OLODO</h4>
              <Link to="/about">Giới thiệu</Link>
              <Link to="/contact">Liên hệ</Link>
            </div>
            <div className="footer-col">
              <h4>Hỗ trợ</h4>
              <a href="#">Trung tâm trợ giúp</a>
              <a href="#">An toàn giao dịch</a>
            </div>
          </div>
          <p className="footer-copy">&copy; 2026 OLODO. All rights reserved.</p>
        </div>
      </footer>

      <ChatWidget />
      <AiAdvisorWidget />
    </div>
  );
};

export default Layout;
