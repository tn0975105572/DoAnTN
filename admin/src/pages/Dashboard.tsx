import { useState, useEffect } from 'react';
import { Users, FileText, Star, TrendingUp, Activity, Wifi, WifiOff, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { userAPI, postAPI, pointsAPI, likeAPI } from '../services/api';
import { SkeletonCard, SkeletonChart } from '../components/Skeleton';
import { healthCheck } from '../utils/apiTest';
import './Dashboard.css';

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalPoints: number;
  totalLikes: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalPoints: 0,
    totalLikes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Test API connection first
      const isHealthy = await healthCheck();
      setApiConnected(isHealthy);
      
      if (!isHealthy) {
        return;
      }
      
      // Load 4 APIs thật từ backend
      const [usersRes, postsRes, pointsRes, likesRes] = await Promise.all([
        userAPI.getAll(),
        postAPI.getAllWithDetails(),
        pointsAPI.getOverallStats(),
        likeAPI.getAll(),
      ]);

      // Tính tổng điểm từ stats array
      const totalPointsCalc = pointsRes.data.reduce((sum: number, stat: any) => {
        return sum + parseInt(stat.tong_diem_thay_doi || 0);
      }, 0);

      setStats({
        totalUsers: usersRes.data.total || usersRes.data.length || 0,
        totalPosts: postsRes.data.total || postsRes.data.length || 0,
        totalPoints: totalPointsCalc,
        totalLikes: likesRes.data.length || 0,
      });

      // Get recent point history
      const historyRes = await pointsAPI.getHistory();
      setRecentActivities(historyRes.data.slice(0, 10));

    } catch (error) {
      console.error('Error loading dashboard:', error);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: Users,
      color: '#2196F3',
      bgColor: '#E3F2FD',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Tổng bài đăng',
      value: stats.totalPosts,
      icon: FileText,
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Tổng điểm',
      value: stats.totalPoints.toLocaleString(),
      icon: Star,
      color: '#FF9800',
      bgColor: '#FFF3E0',
      change: '+25%',
      changeType: 'positive'
    },
    {
      title: 'Tổng lượt thích',
      value: stats.totalLikes,
      icon: Heart,
      color: '#E91E63',
      bgColor: '#FCE4EC',
      change: '+25%',
      changeType: 'positive'
    },
  ];

  if (loading) {
    return (
      <div className="dashboard">
        <h2 className="page-title">Dashboard</h2>
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <div className="recent-activity">
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="page-title">Dashboard</h2>
        <div className="header-actions">
          {/* API Status Indicator */}
          <div className="api-status">
            {apiConnected === true && (
              <motion.div
                className="status-indicator connected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                title="API Connected"
              >
                <Wifi size={16} />
              </motion.div>
            )}
            {apiConnected === false && (
              <motion.div
                className="status-indicator disconnected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                title="API Disconnected"
              >
                <WifiOff size={16} />
              </motion.div>
            )}
          </div>
          
          <motion.button
            className="refresh-btn"
            onClick={loadDashboardData}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Activity size={20} />
            Làm mới
          </motion.button>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={index}
              className="stat-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}
            >
              <div className="stat-icon" style={{ backgroundColor: card.bgColor }}>
                <Icon size={32} color={card.color} />
              </div>
              <div className="stat-info">
                <h3>{card.title}</h3>
                <p className="stat-value">{card.value}</p>
                <div className={`stat-change ${card.changeType}`}>
                  <TrendingUp size={14} />
                  {card.change}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="recent-activity"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="activity-header">
          <h3>Hoạt động gần đây</h3>
          <span className="activity-count">{recentActivities.length} hoạt động</span>
        </div>
        <div className="activity-list">
          {recentActivities.length === 0 ? (
            <div className="no-data">
              <Activity size={48} color="var(--text-muted)" />
              <p>Chưa có hoạt động nào</p>
            </div>
          ) : (
            recentActivities.map((activity, index) => (
              <motion.div
                key={index}
                className="activity-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
              >
                <div className="activity-icon">
                  <Star size={16} color="#FF9800" />
                </div>
                <div className="activity-content">
                  <p className="activity-description">
                    {activity.mo_ta || activity.loai_giao_dich}
                  </p>
                  <span className="activity-points" style={{
                    color: activity.diem_thay_doi > 0 ? '#4CAF50' : '#F44336'
                  }}>
                    {activity.diem_thay_doi > 0 ? '+' : ''}{activity.diem_thay_doi} điểm
                  </span>
                </div>
                <span className="activity-time">
                  {new Date(activity.thoi_gian_tao).toLocaleString('vi-VN')}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;


