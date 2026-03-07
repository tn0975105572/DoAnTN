import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../constants';
import './Register.css';

const STEPS = ['Tài khoản', 'Thông tin', 'Hoàn tất'];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  // Step 2
  const [universities, setUniversities] = useState([]);
  const [uniLoading, setUniLoading] = useState(false);
  const [provinces, setProvinces] = useState([]);
  // Địa chỉ hiện tại (vi_tri)
  const [districts, setDistricts] = useState([]);
  const [selectedUni, setSelectedUni] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [address, setAddress] = useState('');
  // Quê quán riêng biệt
  const [queQuan, setQueQuan] = useState('');

  // Step 3
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Danh sách đại học fallback (top trường VN)
  const UNI_FALLBACK = [
    'Đại học Quốc gia Hà Nội', 'Đại học Quốc gia TP. Hồ Chí Minh',
    'Đại học Bách khoa Hà Nội', 'Đại học Bách khoa TP. Hồ Chí Minh',
    'Đại học Kinh tế Quốc dân', 'Đại học Kinh tế TP. Hồ Chí Minh',
    'Đại học Y Hà Nội', 'Đại học Y Dược TP. Hồ Chí Minh',
    'Trường Đại học Ngoại thương', 'Đại học Sư phạm Hà Nội',
    'Đại học Sư phạm TP. Hồ Chí Minh', 'Đại học Luật Hà Nội',
    'Đại học Luật TP. Hồ Chí Minh', 'Đại học Ngoại ngữ - ĐHQG Hà Nội',
    'Học viện Ngân hàng', 'Học viện Tài chính',
    'Đại học Thương mại', 'Đại học Xây dựng Hà Nội',
    'Đại học Giao thông Vận tải', 'Đại học Điện lực',
    'Đại học FPT', 'Đại học Tôn Đức Thắng',
    'Đại học Công nghệ TP. Hồ Chí Minh (HUTECH)', 'Đại học Văn Lang',
    'Đại học Nguyễn Tất Thành', 'Đại học Duy Tân',
    'Đại học Đà Nẵng', 'Đại học Huế', 'Đại học Cần Thơ',
    'Đại học Vinh', 'Đại học Quy Nhơn', 'Đại học Nha Trang',
    'Đại học Thái Nguyên', 'Đại học Hải Phòng',
    'Học viện Công nghệ Bưu chính Viễn thông',
    'Học viện Kỹ thuật Quân sự', 'Trường Sĩ quan Lục quân 2',
    'Khác',
  ];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setUniLoading(true);
      try {
        // Thử API đại học công khai
        const uniRes = await fetch('https://api.phanmemviet.net/don-vi-hanh-chinh/truong-dai-hoc')
          .catch(() => null);
        if (uniRes?.ok) {
          const data = await uniRes.json();
          // API trả về [{id, ten}] hoặc mảng tên
          const list = Array.isArray(data)
            ? data.map(u => (typeof u === 'string' ? u : u.ten || u.name || u.tenTruong || u))
            : UNI_FALLBACK;
          setUniversities(list.filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')));
        } else {
          setUniversities(UNI_FALLBACK);
        }
      } catch {
        setUniversities(UNI_FALLBACK);
      } finally {
        setUniLoading(false);
      }

      try {
        // Provinces API
        const provRes = await fetch('https://provinces.open-api.vn/api/p/');
        setProvinces(await provRes.json());
      } catch (err) {
        console.error('Load provinces error:', err);
      }
    };
    loadData();
  }, []);

  // Province change → load districts
  const handleProvinceChange = async (code) => {
    setSelectedProvince(code);
    setSelectedDistrict('');
    setDistricts([]);
    if (!code) return;

    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      const data = await res.json();
      setDistricts(data.districts || []);
    } catch (err) {
      console.error('Load districts error:', err);
    }
  };

  // Avatar file
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Validation
  const validateStep1 = () => {
    if (!name.trim() || !email.trim() || !username.trim() || !password) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setMessage({ type: 'error', text: 'Email không hợp lệ.' });
      return false;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải ít nhất 6 ký tự.' });
      return false;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedUni) {
      setMessage({ type: 'error', text: 'Vui lòng chọn trường đại học.' });
      return false;
    }
    if (!queQuan) {
      setMessage({ type: 'error', text: 'Vui lòng chọn quê quán.' });
      return false;
    }
    if (!selectedProvince) {
      setMessage({ type: 'error', text: 'Vui lòng chọn tỉnh/thành phố hiện tại.' });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setMessage(null);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    setMessage(null);
    if (step > 1) setStep(step - 1);
  };

  // Submit
  const handleRegister = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setMessage(null);

    try {
      // Upload avatar
      let avatarUrl = 'https://i.pravatar.cc/150?img=45';
      if (avatar) {
        const formData = new FormData();
        formData.append('avatar', avatar);
        try {
          const uploadRes = await axios.post(`${API_BASE_URL}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          avatarUrl = uploadRes.data.imageUrl;
        } catch (e) {
          setMessage({ type: 'error', text: 'Không thể tải ảnh lên. Đang dùng ảnh mặc định.' });
        }
      }

      // Build vi_tri (địa chỉ trường/hiện tại)
      const provName = provinces.find(p => p.code.toString() === selectedProvince)?.name || '';
      const distName = districts.find(d => d.name === selectedDistrict)?.name || '';
      const fullViTri = [address, distName, provName].filter(Boolean).join(', ');

      // Register
      const res = await axios.post(`${API_BASE_URL}/nguoidung/create`, {
        ten_dang_nhap: username.trim(),
        mat_khau: password,
        email: email.trim(),
        ho_ten: name.trim(),
        truong_hoc: selectedUni,
        vi_tri: fullViTri,
        que_quan: queQuan,   // Tỉnh/thành quê quán riêng biệt
        anh_dai_dien: avatarUrl,
        da_xac_thuc: 0,
      });

      if (res.data) {
        // Auto login
        try {
          const loginRes = await axios.post(`${API_BASE_URL}/nguoidung/login`, {
            email: email.trim(),
            mat_khau: password,
          });

          if (loginRes.data.token) {
            const loggedUser = loginRes.data.user;
            localStorage.setItem('token', loginRes.data.token);
            localStorage.setItem('user', JSON.stringify(loggedUser));
            localStorage.setItem('userId', loggedUser.ID_NguoiDung || '');
            setMessage({ type: 'success', text: 'Đăng ký thành công! Đang chuyển hướng...' });
            setTimeout(() => navigate('/'), 1500);
            return;
          }
        } catch (e) {
          // Login failed, redirect to login page
        }

        setMessage({ type: 'success', text: 'Đăng ký thành công! Vui lòng đăng nhập.' });
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Đã có lỗi xảy ra khi đăng ký.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* ===== LEFT: BRANDING ===== */}
      <div className="register-branding">
        <div className="register-brand-logo">OLODO</div>
        <div className="register-brand-tagline">TẠO TÀI KHOẢN MỚI</div>
        <div className="register-brand-cards">
          <div className="register-brand-card"></div>
          <div className="register-brand-card"></div>
          <div className="register-brand-card"></div>
        </div>
      </div>

      {/* ===== RIGHT: FORM ===== */}
      <div className="register-form-panel">
        <div className="register-card">
          {/* Stepper */}
          <div className="register-stepper">
            {STEPS.map((label, idx) => {
              const num = idx + 1;
              const isActive = num === step;
              const isCompleted = num < step;
              return (
                <React.Fragment key={num}>
                  <div className={`register-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="register-step-circle">
                      {isCompleted ? <i className="fas fa-check"></i> : num}
                    </div>
                    <span className="register-step-label">{label}</span>
                  </div>
                  {num < STEPS.length && (
                    <div className={`register-step-line ${isCompleted ? 'completed' : ''}`}></div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Message */}
          {message && (
            <div className={`register-message ${message.type}`}>
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {message.text}
            </div>
          )}

          {/* ===== STEP 1: Account ===== */}
          {step === 1 && (
            <>
              <h2 className="register-title">Thông tin tài khoản</h2>
              <p className="register-subtitle">Nhập thông tin cơ bản để tạo tài khoản</p>

              <div className="register-fields" key="step1">
                <div className="register-input-group">
                  <i className="fas fa-user register-input-icon"></i>
                  <input className="register-input" placeholder="Họ và tên" value={name}
                    onChange={e => setName(e.target.value)} disabled={isLoading} />
                </div>
                <div className="register-input-group">
                  <i className="fas fa-envelope register-input-icon"></i>
                  <input className="register-input" placeholder="Email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={isLoading} />
                </div>
                <div className="register-input-group">
                  <i className="fas fa-at register-input-icon"></i>
                  <input className="register-input" placeholder="Tên đăng nhập" value={username}
                    onChange={e => setUsername(e.target.value)} autoComplete="username" disabled={isLoading} />
                </div>
                <div className="register-input-group">
                  <i className="fas fa-lock register-input-icon"></i>
                  <input className="register-input" placeholder="Mật khẩu" type={showPw ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                  <button type="button" className="register-eye-btn" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                    <i className={`fas ${showPw ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  </button>
                </div>
                <div className="register-input-group">
                  <i className="fas fa-shield-alt register-input-icon"></i>
                  <input className="register-input" placeholder="Xác nhận mật khẩu" type={showCpw ? 'text' : 'password'}
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} />
                  <button type="button" className="register-eye-btn" onClick={() => setShowCpw(!showCpw)} tabIndex={-1}>
                    <i className={`fas ${showCpw ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== STEP 2: Trường học + Quê quán + Địa chỉ ===== */}
          {step === 2 && (
            <>
              <h2 className="register-title">Thông tin vị trí</h2>
              <p className="register-subtitle">Cho chúng tôi biết thêm về bạn</p>

              <div className="register-fields" key="step2">

                {/* Trường đại học */}
                <div className="register-input-group">
                  <i className="fas fa-graduation-cap register-input-icon"></i>
                  <select className="register-select" value={selectedUni}
                    onChange={e => setSelectedUni(e.target.value)}
                    disabled={isLoading || uniLoading}>
                    <option value="">{uniLoading ? 'Đang tải danh sách trường...' : '-- Chọn trường đại học --'}</option>
                    {universities.map((u, i) => (
                      <option key={i} value={typeof u === 'string' ? u : u.name}>
                        {typeof u === 'string' ? u : u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quê quán (tỉnh/thành) */}
                <div className="register-input-group">
                  <i className="fas fa-house-user register-input-icon"></i>
                  <select className="register-select" value={queQuan}
                    onChange={e => setQueQuan(e.target.value)} disabled={isLoading || !provinces.length}>
                    <option value="">{provinces.length ? '-- Quê quán (Tỉnh/Thành phố) --' : 'Đang tải...'}</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Địa chỉ hiện tại: Tỉnh → Quận → Số nhà */}
                <div className="register-input-group">
                  <i className="fas fa-map-marker-alt register-input-icon"></i>
                  <select className="register-select" value={selectedProvince}
                    onChange={e => handleProvinceChange(e.target.value)} disabled={isLoading || !provinces.length}>
                    <option value="">{provinces.length ? '-- Địa chỉ hiện tại: Tỉnh/TP --' : 'Đang tải...'}</option>
                    {provinces.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {districts.length > 0 && (
                  <div className="register-input-group">
                    <i className="fas fa-building register-input-icon"></i>
                    <select className="register-select" value={selectedDistrict}
                      onChange={e => setSelectedDistrict(e.target.value)} disabled={isLoading}>
                      <option value="">-- Quận/Huyện --</option>
                      {districts.map(d => (
                        <option key={d.code} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="register-input-group">
                  <i className="fas fa-home register-input-icon"></i>
                  <input className="register-input" placeholder="Địa chỉ cụ thể (số nhà, đường…)"
                    value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} />
                </div>

              </div>
            </>
          )}

          {/* ===== STEP 3: Avatar ===== */}
          {step === 3 && (
            <>
              <h2 className="register-title">Ảnh đại diện</h2>
              <p className="register-subtitle">Thêm ảnh đại diện để hoàn tất đăng ký</p>

              <div className="register-fields" key="step3">
                <div className="register-avatar-section">
                  <label className="register-avatar-picker" htmlFor="avatar-input">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" />
                    ) : (
                      <i className="fas fa-camera"></i>
                    )}
                  </label>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                    disabled={isLoading}
                  />
                  <span className="register-avatar-hint">
                    {avatarPreview ? 'Nhấn để đổi ảnh' : 'Nhấn để chọn ảnh'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="register-nav-buttons">
            {step > 1 && (
              <button className="register-back-btn" onClick={handlePrev} disabled={isLoading}>
                <i className="fas fa-arrow-left"></i> Quay lại
              </button>
            )}
            {step < 3 ? (
              <button className="register-next-btn" onClick={handleNext} disabled={isLoading}
                style={step === 1 ? { flex: 1 } : {}}>
                Tiếp tục <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button className="register-submit-btn" onClick={handleRegister} disabled={isLoading}>
                {isLoading ? (
                  <><i className="fas fa-spinner fa-spin"></i> ĐANG XỬ LÝ...</>
                ) : (
                  <><i className="fas fa-user-plus"></i> ĐĂNG KÝ</>
                )}
              </button>
            )}
          </div>

          {/* Login link */}
          <div className="register-login-link">
            <Link to="/login">Đã có tài khoản? Đăng nhập ngay!</Link>
          </div>

          {/* Social */}
          <div className="register-divider">
            <div className="register-divider-line"></div>
            <span className="register-divider-text">Hoặc đăng ký với</span>
            <div className="register-divider-line"></div>
          </div>

          <div className="register-social-buttons">
            <button className="register-social-btn google" title="Google">
              <i className="fab fa-google"></i>
            </button>
            <button className="register-social-btn facebook" title="Facebook">
              <i className="fab fa-facebook-f"></i>
            </button>
            <button className="register-social-btn zalo" title="Zalo">
              <i className="fas fa-phone-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
