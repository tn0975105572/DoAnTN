const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const REVERSE_CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map();
const reverseCache = new Map();

function getCacheEntry(cache, key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setCacheEntry(cache, key, value, ttl) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttl,
    });
}

function buildPhotonDisplayName(properties = {}) {
    const segments = [
        properties.name,
        properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street,
        properties.district,
        properties.city,
        properties.state,
        properties.country,
    ].filter(Boolean);

    return segments.join(', ');
}

async function searchPlaces(req, res) {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
        return res.status(200).json({
            success: true,
            data: [],
        });
    }

    const cacheKey = query.toLowerCase();
    const cached = getCacheEntry(searchCache, cacheKey);
    if (cached) {
        return res.status(200).json({
            success: true,
            data: cached,
        });
    }

    try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
        const photonResponse = await fetch(photonUrl, {
            headers: {
                'User-Agent': 'OLODO/1.0 (meeting-location-search)',
                Accept: 'application/json',
            },
        });

        if (photonResponse.ok) {
            const payload = await photonResponse.json();
            const features = Array.isArray(payload?.features) ? payload.features : [];
            const normalized = features
                .map((feature, index) => {
                    const coordinates = feature?.geometry?.coordinates || [];
                    const properties = feature?.properties || {};
                    const lng = Number(coordinates[0]);
                    const lat = Number(coordinates[1]);

                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                        return null;
                    }

                    return {
                        place_id: properties.osm_id || `photon-${index}-${lat}-${lng}`,
                        lat: String(lat),
                        lon: String(lng),
                        name: properties.name || properties.street || properties.city || 'Địa điểm',
                        display_name: buildPhotonDisplayName(properties) || `${lat}, ${lng}`,
                    };
                })
                .filter(Boolean)
                .slice(0, 8);

            if (normalized.length > 0) {
                setCacheEntry(searchCache, cacheKey, normalized, SEARCH_CACHE_TTL_MS);
                return res.status(200).json({
                    success: true,
                    data: normalized,
                });
            }
        }

        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=vi&countrycodes=vn&q=${encodeURIComponent(query)}`;
        const nominatimResponse = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'OLODO/1.0 (meeting-location-search)',
                Accept: 'application/json',
            },
        });

        if (!nominatimResponse.ok) {
            throw new Error(`Search provider responded with ${nominatimResponse.status}`);
        }

        const nominatimData = await nominatimResponse.json();
        const normalized = Array.isArray(nominatimData) ? nominatimData : [];
        setCacheEntry(searchCache, cacheKey, normalized, SEARCH_CACHE_TTL_MS);

        return res.status(200).json({
            success: true,
            data: normalized,
        });
    } catch (error) {
        console.error('Map search failed:', error);
        return res.status(502).json({
            success: false,
            message: 'Không thể lấy gợi ý địa điểm lúc này.',
        });
    }
}

async function reversePlace(req, res) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu tọa độ hợp lệ.',
        });
    }

    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = getCacheEntry(reverseCache, cacheKey);
    if (cached) {
        return res.status(200).json({
            success: true,
            data: cached,
        });
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`,
            {
                headers: {
                    'User-Agent': 'OLODO/1.0 (meeting-location-reverse)',
                    Accept: 'application/json',
                },
            },
        );

        if (!response.ok) {
            throw new Error(`Reverse provider responded with ${response.status}`);
        }

        const payload = await response.json();
        setCacheEntry(reverseCache, cacheKey, payload, REVERSE_CACHE_TTL_MS);

        return res.status(200).json({
            success: true,
            data: payload,
        });
    } catch (error) {
        console.error('Map reverse lookup failed:', error);
        return res.status(502).json({
            success: false,
            message: 'Không thể lấy địa chỉ tại điểm vừa chọn.',
        });
    }
}

module.exports = {
    searchPlaces,
    reversePlace,
};
