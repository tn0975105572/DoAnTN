import { useState } from 'react';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.');
        setFormData({ name: '', email: '', message: '' });
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="contact-page">
            <h1 className="page-title">Liên hệ</h1>

            <div className="contact-container">
                <div className="contact-info">
                    <h2>Thông tin liên hệ</h2>
                    <div className="info-item">
                        <span className="info-icon">📍</span>
                        <p>123 Đường ABC, Quận 1, TP.HCM</p>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">📞</span>
                        <p>0123 456 789</p>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">✉️</span>
                        <p>contact@myapp.com</p>
                    </div>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <h2>Gửi tin nhắn</h2>
                    <div className="form-group">
                        <input
                            type="text"
                            name="name"
                            placeholder="Họ và tên"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <textarea
                            name="message"
                            placeholder="Tin nhắn của bạn"
                            rows="5"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="submit-btn">Gửi tin nhắn</button>
                </form>
            </div>
        </div>
    );
};

export default Contact;
