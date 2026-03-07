import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Posts from './pages/Posts';
import Points from './pages/Points';
import Statistics from './pages/Statistics';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem('adminToken', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider>
      <Router>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/points" element={<Points />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </Layout>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
            },
            success: {
              iconTheme: {
                primary: 'var(--success-color)',
                secondary: 'var(--bg-primary)',
              },
            },
            error: {
              iconTheme: {
                primary: 'var(--danger-color)',
                secondary: 'var(--bg-primary)',
              },
            },
          }}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;


