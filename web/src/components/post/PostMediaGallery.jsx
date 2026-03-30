import './PostMediaGallery.css';

const FALLBACK_IMAGE = 'https://via.placeholder.com/1200x800?text=No+Image';

const getLayoutKey = (count) => {
    if (count <= 1) return 'single';
    if (count === 2) return 'double';
    if (count === 3) return 'triple';
    if (count === 4) return 'quad';
    return 'mosaic';
};

export default function PostMediaGallery({
    images = [],
    title = 'Bài đăng',
    badge = '',
    className = '',
    onOpen,
    interactive = Boolean(onOpen),
    maxVisible = 5,
}) {
    const normalizedImages = Array.isArray(images) && images.length
        ? images.filter(Boolean)
        : [FALLBACK_IMAGE];
    const visibleImages = normalizedImages.slice(0, Math.max(1, maxVisible));
    const remainingCount = Math.max(0, normalizedImages.length - visibleImages.length);
    const layoutKey = getLayoutKey(visibleImages.length);
    const TileTag = interactive ? 'button' : 'div';
    const handleOpen = typeof onOpen === 'function' ? onOpen : undefined;

    return (
        <div className={`pmg ${className}`.trim()}>
            <div
                className={`pmg-grid pmg-grid-${layoutKey}${interactive ? ' is-clickable' : ''}`}
                aria-label={`${normalizedImages.length} ảnh của ${title}`}
            >
                {visibleImages.map((src, index) => {
                    const showMoreOverlay = remainingCount > 0 && index === visibleImages.length - 1;

                    return (
                        <TileTag
                            key={`${src}-${index}`}
                            type={interactive ? 'button' : undefined}
                            className={`pmg-tile pmg-tile-${index + 1}${showMoreOverlay ? ' has-more' : ''}`}
                            onClick={handleOpen}
                            aria-label={interactive ? `Mở chi tiết bài đăng ${title}` : undefined}
                        >
                            <img
                                src={src || FALLBACK_IMAGE}
                                alt={`${title} - ảnh ${index + 1}`}
                                className="pmg-image"
                                loading="lazy"
                            />
                            {showMoreOverlay && (
                                <div className="pmg-count-overlay">
                                    <strong>+{remainingCount}</strong>
                                </div>
                            )}
                        </TileTag>
                    );
                })}
            </div>

            {normalizedImages.length > 1 && (
                <span className="pmg-count-pill">
                    {normalizedImages.length} ảnh
                </span>
            )}

            {badge ? (
                <div className="pmg-badge">
                    <span>{badge}</span>
                </div>
            ) : null}
        </div>
    );
}
