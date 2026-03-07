import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';
import axios from 'axios';
import './QRLoginModal.css';

const QRLoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [sessionId, setSessionId] = useState('');
    const [qrValue, setQrValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            generateQR();
        }
        return () => {
            // Cleanup socket connection if needed
        };
    }, [isOpen]);

    const generateQR = async () => {
        setLoading(true);
        setError('');
        try {
            // Replace with your actual backend URL
            const response = await axios.post('http://localhost:3000/api/qrlogin/generate');
            const { sessionId } = response.data;
            setSessionId(sessionId);
            setQrValue(sessionId); // In a real app, you might want to encode more info or a full URL

            // Setup Socket.io to listen for authentication
            const socket = io('http://localhost:3000');
            socket.emit('join-qr-session', sessionId);

            socket.on('qr-authenticated', (data) => {
                console.log('QR Auth Success:', data);
                onLoginSuccess(data);
                socket.disconnect();
                onClose();
            });

            // Fallback: Polling status
            const interval = setInterval(async () => {
                try {
                    const statusRes = await axios.get(`http://localhost:3000/api/qrlogin/status/${sessionId}`);
                    if (statusRes.data.status === 'authenticated') {
                        clearInterval(interval);
                        onLoginSuccess(statusRes.data);
                        socket.disconnect();
                        onClose();
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);

            // Clear interval on cleanup
            return () => clearInterval(interval);

        } catch (err) {
            setError('Không thể tạo mã QR. Vui lòng thử lại.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="qr-modal-overlay">
            <div className="qr-modal-content">
                <button className="qr-close-btn" onClick={onClose}>&times;</button>
                <h2>Đăng nhập bằng mã QR</h2>
                <p>Mở ứng dụng trên điện thoại và quét mã này để đăng nhập nhanh.</p>

                <div className="qr-container">
                    {loading ? (
                        <div className="qr-loading">Đang tải...</div>
                    ) : error ? (
                        <div className="qr-error">{error}</div>
                    ) : (
                        qrValue && <QRCodeSVG value={qrValue} size={256} className="qr-code" />
                    )}
                </div>

                <div className="qr-instructions">
                    <ol>
                        <li>Mở ứng dụng <strong>OLODO</strong> trên điện thoại.</li>
                        <li>Đi đến mục <strong>Cài đặt</strong>.</li>
                        <li>Chọn <strong>Quét mã QR đăng nhập</strong>.</li>
                        <li>Hướng camera vào mã QR trên màn hình này.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default QRLoginModal;
