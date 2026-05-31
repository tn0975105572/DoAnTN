import {
    BarChart3,
    Bot,
    CheckCircle2,
    Database,
    GraduationCap,
    MapPin,
    MessageCircle,
    Rocket,
    Server,
    ShieldCheck,
    Smartphone,
    Users,
    Wallet,
    Zap,
} from 'lucide-react';
import './About.css';

const CORE_FEATURES = [
    {
        icon: Users,
        title: 'Chợ sinh viên',
        text: 'Đăng bài mua bán, trao đổi, tặng đồ và quản lý trạng thái giao dịch trong một hệ sinh thái riêng cho sinh viên.',
    },
    {
        icon: MessageCircle,
        title: 'Chat thời gian thực',
        text: 'Trao đổi trực tiếp giữa người mua và người bán qua Socket.IO, hỗ trợ hội thoại riêng và nhóm.',
    },
    {
        icon: Wallet,
        title: 'Điểm thưởng và ZaloPay',
        text: 'Nạp tiền nhận điểm, tích điểm từ tương tác, dùng điểm để đăng bài hoặc mua gói đẩy xu hướng.',
    },
    {
        icon: MapPin,
        title: 'Bản đồ giao dịch',
        text: 'Tìm sản phẩm theo vị trí, hiển thị khu vực giao dịch thuận tiện cho sinh viên.',
    },
    {
        icon: Bot,
        title: 'AI Advisor',
        text: 'Trợ lý gợi ý nội dung, hỗ trợ người dùng ra quyết định và tăng chất lượng trải nghiệm.',
    },
    {
        icon: BarChart3,
        title: 'Admin dashboard',
        text: 'Quản trị người dùng, bài đăng, điểm thưởng, đơn hàng và số liệu vận hành hệ thống.',
    },
];

const TECH_STACK = [
    { icon: Smartphone, label: 'React Web', detail: 'Vite, Router, UI feed' },
    { icon: Smartphone, label: 'Expo Mobile', detail: 'React Native, Expo Router' },
    { icon: Server, label: 'Node.js API', detail: 'Express, JWT, Socket.IO' },
    { icon: Database, label: 'MySQL', detail: 'Schema giao dịch và điểm' },
    { icon: ShieldCheck, label: 'Bảo mật', detail: 'Token, phân quyền, kiểm soát chủ bài' },
    { icon: Zap, label: 'Engagement loop', detail: 'Like, comment, video, đẩy bài' },
];

const METRICS = [
    ['Web', 'Ứng dụng người dùng'],
    ['Mobile', 'Ứng dụng sinh viên'],
    ['Admin', 'Bảng điều khiển'],
    ['Realtime', 'Chat và thông báo'],
];

const About = () => {
    return (
        <div className="graduate-page">
            <section className="graduate-hero">
                <div className="graduate-hero-copy">
                    <span className="graduate-kicker">
                        <GraduationCap size={18} />
                        Sản phẩm tốt nghiệp đại học
                    </span>
                    <h1>OLODO - Chợ sinh viên thông minh</h1>
                    <p>
                        Nền tảng mua bán, trao đổi và tặng đồ dành cho sinh viên, kết hợp điểm thưởng,
                        ZaloPay, gợi ý cá nhân hóa, chat realtime và dashboard quản trị.
                    </p>

                    <div className="graduate-author">
                        <div>
                            <span>Thực hiện bởi</span>
                            <strong>Nguyễn Duy Tuấn</strong>
                        </div>
                        <div>
                            <span>Mã sinh viên</span>
                            <strong>10122390</strong>
                        </div>
                    </div>
                </div>

                <div className="graduate-product-visual" aria-label="OLODO product preview">
                    <div className="product-phone">
                        <div className="phone-topbar">
                            <img src="/123.png" alt="OLODO" />
                            <span>OLODO</span>
                        </div>
                        <div className="phone-search" />
                        <div className="phone-card large">
                            <span className="phone-tag">Đang xu hướng</span>
                            <strong>MacBook Air M1 sinh viên</strong>
                            <small>12.500.000 đ</small>
                        </div>
                        <div className="phone-grid">
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>
                    </div>

                    <div className="product-panel">
                        <div className="panel-line strong" />
                        <div className="panel-line" />
                        <div className="panel-stat">
                            <Rocket size={18} />
                            <div>
                                <strong>User Engagement Loop</strong>
                                <span>Tương tác, tích điểm, đẩy bài, quay lại ứng dụng.</span>
                            </div>
                        </div>
                        <div className="panel-checks">
                            <span><CheckCircle2 size={14} /> Cá nhân hóa feed</span>
                            <span><CheckCircle2 size={14} /> Trộn bài boost hợp lý</span>
                            <span><CheckCircle2 size={14} /> Quản trị tập trung</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="graduate-metrics">
                {METRICS.map(([value, label]) => (
                    <div key={value} className="graduate-metric">
                        <strong>{value}</strong>
                        <span>{label}</span>
                    </div>
                ))}
            </section>

            <section className="graduate-section">
                <div className="graduate-section-heading">
                    <span>Giá trị sản phẩm</span>
                    <h2>Giải quyết đúng bài toán của sinh viên</h2>
                    <p>
                        OLODO tập trung vào nhu cầu thực tế: mua bán đồ cũ nhanh, an toàn,
                        có tương tác cộng đồng và cơ chế điểm giúp người dùng quay lại thường xuyên.
                    </p>
                </div>

                <div className="feature-grid">
                    {CORE_FEATURES.map(({ icon: Icon, title, text }) => (
                        <article className="feature-card" key={title}>
                            <span className="feature-icon"><Icon size={22} /></span>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="graduate-section graduate-loop-section">
                <div className="graduate-section-heading compact">
                    <span>Luồng tương tác</span>
                    <h2>Điểm thưởng tạo động lực sử dụng</h2>
                </div>
                <div className="loop-flow">
                    <div>Tương tác</div>
                    <div>Tích điểm</div>
                    <div>Mua gói đẩy bài</div>
                    <div>Tăng hiển thị</div>
                    <div>Quay lại ứng dụng</div>
                </div>
            </section>

            <section className="graduate-section">
                <div className="graduate-section-heading">
                    <span>Kiến trúc triển khai</span>
                    <h2>Một sản phẩm đầy đủ web, mobile, backend và admin</h2>
                </div>

                <div className="tech-grid">
                    {TECH_STACK.map(({ icon: Icon, label, detail }) => (
                        <div className="tech-item" key={label}>
                            <Icon size={20} />
                            <div>
                                <strong>{label}</strong>
                                <span>{detail}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="graduate-final">
                <div>
                    <span>Đồ án tốt nghiệp</span>
                    <h2>OLODO chứng minh năng lực xây dựng sản phẩm thực tế</h2>
                    <p>
                        Sản phẩm không chỉ là giao diện demo, mà là một hệ thống có đăng nhập,
                        giao dịch, điểm thưởng, thanh toán, chat realtime, gợi ý bài đăng và quản trị vận hành.
                    </p>
                </div>
                <div className="final-signature">
                    <span>Sinh viên thực hiện</span>
                    <strong>Nguyễn Duy Tuấn</strong>
                    <small>10122390</small>
                </div>
            </section>
        </div>
    );
};

export default About;
