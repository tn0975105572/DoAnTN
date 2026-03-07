import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Star,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout = ({ children, onLogout }: LayoutProps) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'from-blue-500 to-purple-600' },
    { path: '/users', icon: Users, label: 'Người dùng', color: 'from-green-500 to-teal-600' },
    { path: '/posts', icon: FileText, label: 'Bài đăng', color: 'from-orange-500 to-red-600' },
    { path: '/points', icon: Star, label: 'Điểm số', color: 'from-yellow-500 to-orange-600' },
    { path: '/statistics', icon: BarChart3, label: 'Thống kê', color: 'from-purple-500 to-pink-600' },
  ];

  const handleLogout = () => {
    toast.success('Đăng xuất thành công!');
    onLogout();
  };

  const handleThemeToggle = () => {
    toggleTheme();
    toast.success(`Chuyển sang ${theme === 'light' ? 'dark' : 'light'} mode`);
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <motion.aside 
        className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ display: 'flex' }}
      >
        <div className="sidebar-header">
          <motion.div
            className="logo-container"
            initial={{ opacity: 1 }}
            animate={{ opacity: sidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="logo-icon">
              <Sparkles size={24} />
            </div>
            <div className="logo-text">
              <h2>Admin</h2>
              <span>Dashboard</span>
            </div>
          </motion.div>
          
          <motion.button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="toggle-btn"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {sidebarOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 180, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -180, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <motion.div
                  whileHover={{ x: 8 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <div className={`nav-icon ${isActive ? 'active' : ''}`}>
                      <Icon size={20} />
                    </div>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          className="nav-label"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <motion.div
                        className="nav-indicator"
                        layoutId="nav-indicator"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              </motion.div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <motion.button 
            onClick={handleLogout} 
            className="logout-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="logout-icon" style={{ color: '#ffffff' }}>
              <LogOut size={20} />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  className="logout-text"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: '#ffffff' }}
                >
                  Đăng xuất
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="main-content">
        <motion.header 
          className="header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-toggle">
            <Menu size={24} />
          </button>
          
          <div className="header-content">
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Quản lý hệ thống
            </motion.h1>
            
            <div className="header-actions">
              <motion.button
                className="theme-toggle-btn"
                onClick={handleThemeToggle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <AnimatePresence mode="wait">
                  {theme === 'light' ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Moon size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -180, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Sun size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              
              <motion.div 
                className="admin-profile"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="admin-avatar">
                  <span>A</span>
                </div>
                <div className="admin-info">
                  <span className="admin-name">Admin</span>
                  <span className="admin-role">Quản trị viên</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        <motion.main 
          className="content"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;


