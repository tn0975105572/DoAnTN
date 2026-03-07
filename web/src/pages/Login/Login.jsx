import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import io from "socket.io-client";
import axios from "axios";
import { API_BASE_URL } from "../../constants";
import "./Login.css";

const QR_EXPIRE_SECONDS = 5 * 60; // 5 phút, khớp với backend

export default function Login() {
  const navigate = useNavigate();

  // Tab state: 'form' or 'qr'
  const [activeTab, setActiveTab] = useState("form");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text: '' }

  // QR state
  const [qrSessionId, setQrSessionId] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrCountdown, setQrCountdown] = useState(QR_EXPIRE_SECONDS);

  // Refs để cleanup
  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // ===== FORM LOGIN =====
  const handleFormLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Vui lòng nhập email và mật khẩu." });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/nguoidung/login`, {
        email: email.trim(),
        mat_khau: password,
      });

      if (res.data.token) {
        const user = res.data.user;
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(user));
        // Lưu userId riêng để dễ lấy ở các component khác
        localStorage.setItem("userId", user.ID_NguoiDung);
        setMessage({
          type: "success",
          text: `Chào mừng trở lại, ${user.ho_ten || "bạn"}! 👋`,
        });
        setTimeout(() => navigate("/"), 1200);
      } else {
        setMessage({ type: "error", text: "Đăng nhập thất bại. Vui lòng thử lại." });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.request ? "Không thể kết nối đến server. Vui lòng kiểm tra backend." : "Email hoặc mật khẩu không đúng.");
      setMessage({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ===== Cleanup helpers =====
  const cleanupQR = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
  }, []);

  // ===== QR LOGIN =====
  const generateQR = useCallback(async () => {
    // Dọn dẹp session cũ
    cleanupQR();
    setQrLoading(true);
    setQrError("");
    setQrCountdown(QR_EXPIRE_SECONDS);
    try {
      const res = await axios.post(`${API_BASE_URL}/qrlogin/generate`);
      const { sessionId, expiresAt } = res.data;
      setQrSessionId(sessionId);
      setQrValue(sessionId);

      // Tính countdown chính xác từ expiresAt backend trả về
      const expireTime = expiresAt || Date.now() + QR_EXPIRE_SECONDS * 1000;

      // Countdown timer
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.round((expireTime - Date.now()) / 1000));
        setQrCountdown(remaining);
        if (remaining === 0) {
          cleanupQR();
          setQrValue("");
          setQrError("Mã QR đã hết hạn. Nhấn 'Làm mới' để tạo mã mới.");
        }
      }, 1000);

      // Socket.io listener
      const socket = io(API_BASE_URL.replace("/api", ""));
      socketRef.current = socket;
      socket.emit("join-qr-session", sessionId);

      socket.on("qr-authenticated", (data) => {
        cleanupQR();
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userId", data.user?.ID_NguoiDung || "");
        navigate("/");
      });

      // Polling fallback mỗi 3s
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${API_BASE_URL}/qrlogin/status/${sessionId}`);
          if (statusRes.data.status === "authenticated") {
            cleanupQR();
            const user = statusRes.data.user;
            localStorage.setItem("token", statusRes.data.token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userId", user?.ID_NguoiDung || "");
            navigate("/");
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);

    } catch (err) {
      setQrError("Không thể tạo mã QR. Vui lòng thử lại.");
    } finally {
      setQrLoading(false);
    }
  }, [navigate, cleanupQR]);

  useEffect(() => {
    if (activeTab === "qr") {
      generateQR();
    } else {
      // Dọn dẹp khi chuyển sang tab khác
      cleanupQR();
    }
    return () => cleanupQR();
  }, [activeTab, generateQR, cleanupQR]);

  return (
    <div className="login-page">
      {/* ===== LEFT: BRANDING ===== */}
      <div className="login-branding">
        <div className="brand-logo">OLODO</div>
        <div className="brand-tagline">SHOPPING THÔNG MINH</div>
        <div className="brand-decoration">
          <div className="brand-card"></div>
          <div className="brand-card"></div>
          <div className="brand-card"></div>
        </div>
      </div>

      {/* ===== RIGHT: FORM ===== */}
      <div className="login-form-panel">
        <div className="login-card">
          {/* Tab Switcher */}
          <div className="login-tabs">
            <button
              className={`login-tab ${activeTab === "form" ? "active" : ""}`}
              onClick={() => setActiveTab("form")}
            >
              <i className="fas fa-envelope"></i>
              Đăng nhập
            </button>
            <button
              className={`login-tab ${activeTab === "qr" ? "active" : ""}`}
              onClick={() => setActiveTab("qr")}
            >
              <i className="fas fa-qrcode"></i>
              Quét mã QR
            </button>
          </div>

          {/* Toast message */}
          {message && (
            <div className={`login-message ${message.type}`}>
              <i
                className={`fas ${message.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}`}
              ></i>
              {message.text}
            </div>
          )}

          {/* ===== TAB: FORM ===== */}
          {activeTab === "form" && (
            <>
              <h2 className="login-title">Đăng nhập</h2>
              <p className="login-subtitle">
                Chào mừng trở lại! Nhập thông tin của bạn.
              </p>

              <form onSubmit={handleFormLogin}>
                <div className="login-input-group">
                  <i className="fas fa-user login-input-icon"></i>
                  <input
                    type="email"
                    className="login-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>

                <div className="login-input-group">
                  <i className="fas fa-lock login-input-icon"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="login-input"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i
                      className={`fas ${showPassword ? "fa-eye" : "fa-eye-slash"}`}
                    ></i>
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> ĐANG ĐĂNG
                      NHẬP...
                    </>
                  ) : (
                    "ĐĂNG NHẬP"
                  )}
                </button>
              </form>

              <div className="login-links">
                <button
                  className="login-link"
                  onClick={() =>
                    setMessage({
                      type: "error",
                      text: "Chức năng đang phát triển.",
                    })
                  }
                >
                  Quên mật khẩu?
                </button>
                <Link to="/register" className="login-link">
                  Tạo tài khoản mới
                </Link>
              </div>

              <div className="login-divider">
                <div className="login-divider-line"></div>
                <span className="login-divider-text">Hoặc đăng nhập với</span>
                <div className="login-divider-line"></div>
              </div>

              <div className="login-social-buttons">
                <button className="login-social-btn google" title="Google">
                  <i className="fab fa-google"></i>
                </button>
                <button className="login-social-btn facebook" title="Facebook">
                  <i className="fab fa-facebook-f"></i>
                </button>
                <button className="login-social-btn zalo" title="Zalo">
                  <i className="fas fa-phone-alt"></i>
                </button>
              </div>
            </>
          )}

          {/* ===== TAB: QR ===== */}
          {activeTab === "qr" && (
            <div className="login-qr-section">
              <h2 className="login-qr-title">Đăng nhập bằng QR</h2>
              <p className="login-qr-desc">
                Quét mã QR bằng ứng dụng <strong>OLODO</strong> trên điện thoại
                để đăng nhập ngay.
              </p>

              <div className="login-qr-container">
                {qrLoading ? (
                  <div className="login-qr-loading">
                    <i className="fas fa-spinner fa-spin"></i>&nbsp; Đang tạo mã...
                  </div>
                ) : qrError ? (
                  <div className="login-qr-error">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{qrError}</span>
                    <button className="login-qr-retry-btn" onClick={generateQR}>
                      <i className="fas fa-redo"></i> Làm mới mã QR
                    </button>
                  </div>
                ) : (
                  qrValue && (() => {
                    const isExpired = qrCountdown === 0;
                    const isWarning = qrCountdown <= 60 && !isExpired;
                    // blur tăng dần: 0 → 8px khi còn 60s trở xuống
                    const blurPx = isExpired ? 10 : isWarning ? ((60 - qrCountdown) / 60) * 8 : 0;
                    const countdownFmt = `${String(Math.floor(qrCountdown / 60)).padStart(2, "0")}:${String(qrCountdown % 60).padStart(2, "0")}`;
                    return (
                      <div className="login-qr-wrap">
                        {/* Ảnh QR — mờ dần khi gần hết */}
                        <QRCodeSVG value={qrValue} size={220}
                          style={{ filter: `blur(${blurPx}px)`, transition: "filter 1s ease", display: "block" }}
                        />

                        {/* Badge countdown — luôn hiện góc dưới phải */}
                        {!isExpired && (
                          <div className={`login-qr-badge${isWarning ? " warning" : ""}`}>
                            <i className="fas fa-clock"></i> {countdownFmt}
                          </div>
                        )}

                        {/* Overlay khi hết hạn */}
                        {isExpired && (
                          <div className="login-qr-expired-overlay">
                            <i className="fas fa-lock"></i>
                            <span>Mã đã hết hạn</span>
                            <button className="login-qr-retry-btn" onClick={generateQR}>
                              <i className="fas fa-redo"></i> Tạo mã mới
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              <ul className="login-qr-steps">
                <li>
                  <span className="login-qr-step-num">1</span>
                  Mở ứng dụng <strong>OLODO</strong> trên điện thoại
                </li>
                <li>
                  <span className="login-qr-step-num">2</span>
                  Vào mục <strong>Cài đặt</strong> → <strong>Quét mã QR</strong>
                </li>
                <li>
                  <span className="login-qr-step-num">3</span>
                  Hướng camera vào mã QR trên màn hình
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
