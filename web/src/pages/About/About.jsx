import './About.css';

const About = () => {
    return (
        <div className="about-page">
            <h1 className="page-title">Giới thiệu</h1>

            <div className="about-content">
                <section className="about-section">
                    <h2>Về chúng tôi</h2>
                    <p>
                        Chúng tôi là đội ngũ đam mê công nghệ, với sứ mệnh mang đến những
                        sản phẩm và dịch vụ tốt nhất cho khách hàng.
                    </p>
                </section>

                <section className="about-section">
                    <h2>Tầm nhìn</h2>
                    <p>
                        Trở thành công ty công nghệ hàng đầu, tiên phong trong việc
                        ứng dụng các giải pháp đổi mới sáng tạo.
                    </p>
                </section>

                <section className="about-section">
                    <h2>Giá trị cốt lõi</h2>
                    <ul className="values-list">
                        <li>🎯 Chất lượng là ưu tiên hàng đầu</li>
                        <li>🤝 Hợp tác và đồng hành</li>
                        <li>💪 Không ngừng cải tiến</li>
                        <li>❤️ Tận tâm với khách hàng</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default About;
