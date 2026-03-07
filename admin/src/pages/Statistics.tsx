import { useState, useEffect } from 'react';
import { Users, FileText, Star, Heart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { userAPI, postAPI, pointsAPI, likeAPI } from '../services/api';
import './Statistics.css';

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalPoints: 0,
    totalLikes: 0,
  });
  const [postsByStatus, setPostsByStatus] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Load 4 APIs thật từ backend
      const [usersRes, postsRes, pointsRes, likesRes] = await Promise.all([
        userAPI.getAll(),
        postAPI.getAllWithDetails(),
        pointsAPI.getOverallStats(),
        likeAPI.getAll(),
      ]);

      const users = usersRes.data || [];
      const posts = postsRes.data || [];
      const likes = likesRes.data || [];

      // Calculate total points from stats array
      const totalPointsCalc = pointsRes.data.reduce((sum: number, stat: any) => {
        return sum + parseInt(stat.tong_diem_thay_doi || 0);
      }, 0);

      // Calculate stats với 4 API thật
      setStats({
        totalUsers: usersRes.data.total || users.length,
        totalPosts: postsRes.data.total || posts.length,
        totalPoints: totalPointsCalc,
        totalLikes: likes.length,
      });

      // Posts by status
      const statusCounts = {
        dang_ban: posts.filter((p: any) => p.trang_thai === 'dang_ban').length,
        da_ban: posts.filter((p: any) => p.trang_thai === 'da_ban').length,
        an: posts.filter((p: any) => p.trang_thai === 'an').length,
      };

      setPostsByStatus([
        { name: 'Đang bán', value: statusCounts.dang_ban, color: '#4CAF50' },
        { name: 'Đã bán', value: statusCounts.da_ban, color: '#FF9800' },
        { name: 'Ẩn', value: statusCounts.an, color: '#F44336' },
      ]);

      // User growth based on real data (last 6 months)
      const monthlyData = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthUsers = users.filter((user: any) => {
          const userDate = new Date(user.thoi_gian_tao);
          return userDate.getMonth() === date.getMonth() && 
                 userDate.getFullYear() === date.getFullYear();
        }).length;
        
        monthlyData.push({
          month: date.toLocaleDateString('vi-VN', { month: 'short' }),
          users: monthUsers,
        });
      }
      setUserGrowth(monthlyData);

    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <h2 className="page-title">Thống kê & Báo cáo</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E3F2FD' }}>
            <Users size={32} color="#2196F3" />
          </div>
          <div className="stat-info">
            <h3>Tổng người dùng</h3>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E8F5E9' }}>
            <FileText size={32} color="#4CAF50" />
          </div>
          <div className="stat-info">
            <h3>Tổng bài đăng</h3>
            <p className="stat-value">{stats.totalPosts}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FFF3E0' }}>
            <Star size={32} color="#FF9800" />
          </div>
          <div className="stat-info">
            <h3>Tổng điểm</h3>
            <p className="stat-value">{stats.totalPoints.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FCE4EC' }}>
            <Heart size={32} color="#E91E63" />
          </div>
          <div className="stat-info">
            <h3>Tổng lượt thích</h3>
            <p className="stat-value">{stats.totalLikes}</p>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Tăng trưởng người dùng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#791228" name="Người dùng" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Bài đăng theo trạng thái</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={postsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {postsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <h4>Tóm tắt hoạt động</h4>
          <ul>
            <li>Tổng số tài khoản: <strong>{stats.totalUsers}</strong></li>
            <li>Tổng số bài đăng: <strong>{stats.totalPosts}</strong></li>
            <li>Tổng điểm trong hệ thống: <strong>{stats.totalPoints.toLocaleString()}</strong></li>
            <li>Tổng lượt thích: <strong>{stats.totalLikes}</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Statistics;







