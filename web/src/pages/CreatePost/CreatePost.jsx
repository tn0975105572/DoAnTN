import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CheckCircle2,
    Crosshair,
    ImagePlus,
    Loader2,
    MapPin,
    Sparkles,
    Trash2,
    Wallet,
} from 'lucide-react';
import { API_BASE_URL } from '../../constants';
import './CreatePost.css';

const INITIAL_FORM = {
    ID_LoaiBaiDang: '',
    ID_DanhMuc: '',
    tieu_de: '',
    mo_ta: '',
    gia: '',
    vi_tri: '',
    trang_thai: 'dang_ban',
};

const POST_STATUSES = [
    { value: 'dang_ban', label: 'Đang bán' },
    { value: 'da_ban', label: 'Đã bán' },
    { value: 'da_trao_doi', label: 'Đã trao đổi' },
    { value: 'da_tang', label: 'Đã tặng' },
];

const getBackendOrigin = () => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        return 'http://localhost:3000';
    }
};

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

export default function CreatePost() {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [types, setTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [feedback, setFeedback] = useState(null);

    const userId = useMemo(() => localStorage.getItem('userId') || '', []);
    const token = useMemo(() => localStorage.getItem('token') || '', []);
    const backendOrigin = useMemo(() => getBackendOrigin(), []);

    const apiFetch = useCallback(async (path, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
        }

        return data;
    }, [token]);

    const syncUserInfo = useCallback(async () => {
        if (!userId) return null;
        const response = await apiFetch(`/nguoidung/get/${userId}`);
        const nextUser = response?.user || response;
        if (nextUser) {
            setUserInfo(nextUser);
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    localStorage.setItem('user', JSON.stringify({ ...parsed, ...nextUser }));
                } catch {
                    localStorage.setItem('user', JSON.stringify(nextUser));
                }
            }
        }
        return nextUser;
    }, [apiFetch, userId]);

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }

        let cancelled = false;

        const loadData = async () => {
            setLoading(true);
            try {
                const [typeRows, categoryRows] = await Promise.all([
                    apiFetch('/loaibaidang/getAll'),
                    apiFetch('/danhmuc/getAll'),
                    syncUserInfo(),
                ]);

                if (cancelled) return;

                const mappedTypes = Array.isArray(typeRows) ? typeRows : [];
                const mappedCategories = Array.isArray(categoryRows) ? categoryRows : [];

                setTypes(mappedTypes);
                setCategories(mappedCategories);
                setForm((current) => ({
                    ...current,
                    ID_LoaiBaiDang: current.ID_LoaiBaiDang || mappedTypes[0]?.ID_LoaiBaiDang || '',
                    ID_DanhMuc: current.ID_DanhMuc || mappedCategories[0]?.ID_DanhMuc || '',
                }));
            } catch (error) {
                console.error('Load create-post data failed', error);
                if (!cancelled) {
                    setFeedback({ type: 'error', text: error.message || 'Không thể tải dữ liệu tạo bài đăng.' });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, [apiFetch, navigate, syncUserInfo, userId]);

    const imagePreviews = useMemo(
        () => selectedFiles.map((file) => ({
            key: `${file.name}-${file.size}-${file.lastModified}`,
            file,
            previewUrl: URL.createObjectURL(file),
        })),
        [selectedFiles],
    );

    const canAffordPost = Number(userInfo?.diem_so || 0) >= 20;

    useEffect(() => () => {
        imagePreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }, [imagePreviews]);

    const handleChange = (field) => (event) => {
        setForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));
    };

    const handleChooseFiles = (event) => {
        const nextFiles = Array.from(event.target.files || []);
        if (!nextFiles.length) return;

        setSelectedFiles((current) => {
            const existingKeys = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const unique = nextFiles.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
            return [...current, ...unique];
        });

        event.target.value = '';
    };

    const handleRemoveFile = (fileToRemove) => {
        setSelectedFiles((current) =>
            current.filter(
                (file) =>
                    !(
                        file.name === fileToRemove.name &&
                        file.size === fileToRemove.size &&
                        file.lastModified === fileToRemove.lastModified
                    ),
            ),
        );
    };

    const uploadImageFile = useCallback(async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${backendOrigin}/api/upload`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.error || data?.message || `Upload failed (${response.status})`);
        }

        return data?.imageUrl || '';
    }, [backendOrigin]);

    const handleUseCurrentLocation = async () => {
        if (!navigator.geolocation) {
            setFeedback({ type: 'error', text: 'Trình duyệt hiện tại không hỗ trợ định vị.' });
            return;
        }

        setGeoLoading(true);
        setFeedback(null);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                });
            });

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            let nextLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=vi`,
                );
                const data = await response.json().catch(() => null);
                if (response.ok && data) {
                    nextLocation =
                        data.display_name ||
                        [
                            data.address?.road,
                            data.address?.suburb,
                            data.address?.city || data.address?.town || data.address?.state,
                            data.address?.country,
                        ]
                            .filter(Boolean)
                            .join(', ') ||
                        nextLocation;
                }
            } catch {
                // fallback to lat/lng string
            }

            setForm((current) => ({
                ...current,
                vi_tri: nextLocation,
            }));
            setFeedback({ type: 'success', text: 'Đã điền vị trí hiện tại.' });
        } catch (error) {
            console.error('Get current location failed', error);
            setFeedback({ type: 'error', text: 'Không thể lấy vị trí hiện tại. Hãy kiểm tra quyền định vị.' });
        } finally {
            setGeoLoading(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!userId) {
            navigate('/login');
            return;
        }

        if (!form.tieu_de.trim() || !form.ID_LoaiBaiDang || !form.ID_DanhMuc) {
            setFeedback({ type: 'error', text: 'Bạn cần nhập tiêu đề, loại bài đăng và danh mục.' });
            return;
        }

        if (!canAffordPost) {
            setFeedback({ type: 'error', text: 'Bạn chưa đủ 20 điểm để đăng bài.' });
            return;
        }

        setSubmitting(true);
        setFeedback(null);

        try {
            const timestamp = new Date().toISOString();
            const payload = {
                ID_NguoiDung: userId,
                ID_LoaiBaiDang: form.ID_LoaiBaiDang,
                ID_DanhMuc: form.ID_DanhMuc,
                tieu_de: form.tieu_de.trim(),
                mo_ta: form.mo_ta.trim(),
                gia: form.gia ? Number(form.gia) : null,
                vi_tri: form.vi_tri.trim(),
                trang_thai: form.trang_thai,
                thoi_gian_tao: timestamp,
                thoi_gian_cap_nhat: timestamp,
            };

            const created = await apiFetch('/baidang/create', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const createdPostId = created?.ID_BaiDang || created?.id;
            const uploadedFileUrls = [];
            const failedUploads = [];

            if (createdPostId && selectedFiles.length) {
                for (const file of selectedFiles) {
                    try {
                        const imageUrl = await uploadImageFile(file);
                        if (imageUrl) {
                            uploadedFileUrls.push(imageUrl);
                        }
                    } catch (uploadError) {
                        console.error('Upload image failed', uploadError);
                        failedUploads.push(file.name);
                    }
                }
            }

            if (createdPostId && uploadedFileUrls.length) {
                await Promise.all(
                    uploadedFileUrls.map((link) =>
                        apiFetch('/baidang_anh/create', {
                            method: 'POST',
                            body: JSON.stringify({
                                ID_BaiDang: createdPostId,
                                LinkAnh: link,
                            }),
                        }),
                    ),
                );
            }

            await syncUserInfo();
            setFeedback({
                type: 'success',
                text: failedUploads.length
                    ? `Bài đăng đã tạo nhưng có ${failedUploads.length} ảnh upload lỗi: ${failedUploads.join(', ')}`
                    : (created?.message || 'Đăng bài thành công.'),
            });
            setForm(INITIAL_FORM);
            setSelectedFiles([]);
            window.setTimeout(() => navigate('/profile'), 1200);
        } catch (error) {
            console.error('Create post failed', error);
            setFeedback({ type: 'error', text: error.message || 'Không thể đăng bài.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-post-page">
            <div className="cp-shell">
                <section className="cp-hero">
                    <div className="cp-hero-copy">
                        <button type="button" className="cp-back" onClick={() => navigate(-1)}>
                            <ArrowLeft size={16} />
                            Quay lại
                        </button>
                        <span className="cp-eyebrow">Dang bai moi</span>
                        <h1>Đăng bài mới lên chợ sinh viên</h1>
                        <p>
                            Tạo bài đăng từ web với đầy đủ loại bài, danh mục, giá, vị trí và ảnh minh họa.
                            Hệ thống sẽ trừ 20 điểm khi đăng thành công.
                        </p>
                    </div>

                    <div className="cp-hero-card">
                        <div className="cp-hero-item">
                            <span className="cp-hero-icon"><Wallet size={18} /></span>
                            <div>
                                <strong>{formatNumber(userInfo?.diem_so || 0)} điểm</strong>
                                <span>Số điểm hiện tại</span>
                            </div>
                        </div>
                        <div className="cp-hero-item">
                            <span className="cp-hero-icon"><Sparkles size={18} /></span>
                            <div>
                                <strong>20 điểm</strong>
                                <span>Chi phí cho mỗi bài đăng</span>
                            </div>
                        </div>
                        <div className="cp-hero-item">
                            <span className="cp-hero-icon"><ImagePlus size={18} /></span>
                            <div>
                                <strong>{selectedFiles.length}</strong>
                                <span>Tổng ảnh đang chuẩn bị</span>
                            </div>
                        </div>
                    </div>
                </section>

                {feedback?.text && (
                    <div className={`cp-feedback ${feedback.type}`}>
                        {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
                        <span>{feedback.text}</span>
                    </div>
                )}

                <div className="cp-layout">
                    <aside className="cp-sidebar">
                        <div className="cp-card">
                            <h2>Điều kiện nghiệp vụ</h2>
                            <ul className="cp-rule-list">
                                <li>Người dùng phải đăng nhập để đăng bài.</li>
                                <li>Mỗi bài đăng thành công sẽ bị trừ 20 điểm.</li>
                                <li>Loại bài đăng và danh mục là bắt buộc.</li>
                                <li>Ảnh bài đăng chỉ được chọn trực tiếp từ máy.</li>
                            </ul>
                        </div>

                        <div className={`cp-card cp-card-accent${canAffordPost ? '' : ' is-warning'}`}>
                            <h2>Trạng thái điểm</h2>
                            <p>
                                {canAffordPost
                                    ? 'Bạn đang đủ điểm để đăng bài mới.'
                                    : 'Bạn chưa đủ 20 điểm để đăng bài. Backend sẽ từ chối nếu tiếp tục gửi.'}
                            </p>
                        </div>
                    </aside>

                    <main className="cp-main">
                        <form className="cp-form" onSubmit={handleSubmit}>
                            <div className="cp-card">
                                <h2>Nội dung chính</h2>
                                <div className="cp-field-grid">
                                    <label className="cp-field cp-field-full">
                                        <span>Tiêu đề bài đăng</span>
                                        <input
                                            type="text"
                                            value={form.tieu_de}
                                            onChange={handleChange('tieu_de')}
                                            placeholder="Ví dụ: MacBook Air M1 còn đẹp, full phụ kiện"
                                            maxLength={255}
                                        />
                                    </label>

                                    <label className="cp-field">
                                        <span>Loại bài đăng</span>
                                        <select value={form.ID_LoaiBaiDang} onChange={handleChange('ID_LoaiBaiDang')}>
                                            <option value="">Chọn loại bài đăng</option>
                                            {types.map((item) => (
                                                <option key={item.ID_LoaiBaiDang} value={item.ID_LoaiBaiDang}>
                                                    {item.ten || item.Ten || item.ID_LoaiBaiDang}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="cp-field">
                                        <span>Danh mục</span>
                                        <select value={form.ID_DanhMuc} onChange={handleChange('ID_DanhMuc')}>
                                            <option value="">Chọn danh mục</option>
                                            {categories.map((item) => (
                                                <option key={item.ID_DanhMuc} value={item.ID_DanhMuc}>
                                                    {item.ten || item.Ten || item.ID_DanhMuc}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="cp-field">
                                        <span>Giá</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={form.gia}
                                            onChange={handleChange('gia')}
                                            placeholder="Ví dụ: 1500000"
                                        />
                                    </label>

                                    <label className="cp-field">
                                        <span>Trạng thái sau khi tạo</span>
                                        <select value={form.trang_thai} onChange={handleChange('trang_thai')}>
                                            {POST_STATUSES.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="cp-field cp-field-full">
                                        <span>Vị trí</span>
                                        <div className="cp-input-icon">
                                            <MapPin size={16} />
                                            <input
                                                type="text"
                                                value={form.vi_tri}
                                                onChange={handleChange('vi_tri')}
                                                placeholder="Ví dụ: KTX khu A, ĐHQG TP.HCM"
                                            />
                                            <button
                                                type="button"
                                                className="cp-location-btn"
                                                onClick={handleUseCurrentLocation}
                                                disabled={geoLoading}
                                                title="Lấy vị trí hiện tại"
                                            >
                                                {geoLoading ? <Loader2 size={16} className="spin" /> : <Crosshair size={16} />}
                                            </button>
                                        </div>
                                    </label>

                                    <label className="cp-field cp-field-full">
                                        <span>Mô tả</span>
                                        <textarea
                                            value={form.mo_ta}
                                            onChange={handleChange('mo_ta')}
                                            rows={6}
                                            placeholder="Mô tả tình trạng sản phẩm, điểm mạnh, phụ kiện đi kèm, cách giao dịch..."
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="cp-card">
                                <h2>Ảnh minh họa</h2>
                                <p className="cp-helper">
                                    Chọn ảnh trực tiếp từ máy để hệ thống upload tự động lên server trước khi gắn vào bài đăng.
                                </p>
                                <label className="cp-upload-box">
                                    <input type="file" accept="image/*" multiple onChange={handleChooseFiles} />
                                    <span className="cp-upload-icon"><ImagePlus size={20} /></span>
                                    <strong>Chọn ảnh từ máy</strong>
                                    <small>Hỗ trợ chọn nhiều ảnh cùng lúc</small>
                                </label>

                                {imagePreviews.length > 0 && (
                                    <div className="cp-preview-grid">
                                        {imagePreviews.map((item) => (
                                            <div key={item.key} className="cp-preview-card">
                                                <img src={item.previewUrl} alt={item.file.name} />
                                                <button
                                                    type="button"
                                                    className="cp-preview-remove"
                                                    onClick={() => handleRemoveFile(item.file)}
                                                    title="Xóa ảnh"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <span>{item.file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="cp-submit-bar">
                                <button type="button" className="cp-btn cp-btn-ghost" onClick={() => navigate('/profile')}>
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="cp-btn cp-btn-primary"
                                    disabled={loading || submitting || !types.length || !categories.length}
                                >
                                    {submitting ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                                    Đăng bài
                                </button>
                            </div>
                        </form>
                    </main>
                </div>
            </div>
        </div>
    );
}
