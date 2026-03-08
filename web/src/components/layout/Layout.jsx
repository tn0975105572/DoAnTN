import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart, Bell, MessageCircle, User, Menu, X, ShoppingBag, LogOut
} from 'lucide-react';
import ChatWidget from '../ChatWidget/ChatWidget';
import './Layout.css';

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
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  return (
    <div className="app-layout">
      <ScrollToTop />
      {/* ══════ HEADER ══════ */}
      <header className="header">
        <div className="header-inner">
          {/* Logo */}
          <Link to="/" className="logo">OLODO</Link>

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
          </nav>

          {/* Right Actions */}
          <div className="header-actions">
            <button className="header-icon-btn header-icon-badge" aria-label="Thông báo" onClick={() => navigate('/notifications')}>
              <Bell size={20} />
              <span className="badge-dot" />
            </button>

            {currentUser ? (
              <>
                <button
                  type="button"
                  className="btn-profile"
                  onClick={() => {
                    navigate('/profile');
                    setMenuOpen(false);
                  }}
                  aria-label="Trang cá nhân"
                >
                  <User size={16} />
                  <span>Trang cá nhân</span>
                </button>
                <button className="header-icon-btn" aria-label="Yêu thích">
                  <Heart size={20} />
                </button>
                <button className="header-icon-btn" aria-label="Tin nhắn">
                  <MessageCircle size={20} />
                </button>
                <div className="user-menu-group">
                  <div className="user-avatar-header">
                    <span>{currentUser.ho_ten?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="user-name-header">{currentUser.ho_ten}</span>
                  <button onClick={handleLogout} className="logout-btn" aria-label="Đăng xuất">
                    <LogOut size={16} />
                  </button>
                </div>
                <button className="btn-dang-tin" onClick={() => navigate('/products')}>
                  <ShoppingBag size={16} />
                  <span>Đăng ký</span>
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

      {/* ══════ CHAT WIDGET ══════ */}
      <ChatWidget />
    </div>
  );
};

export default Layout;
