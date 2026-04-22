import Constants from 'expo-constants';

const LOCAL_HOST_REGEX = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;
const PRIVATE_IP_REGEX =
  /^(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})$/;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

export const getBackendOrigin = () => {
  const rawApiUrl = String(Constants.expoConfig?.extra?.apiUrl || '').trim();
  if (!rawApiUrl) {
    return '';
  }

  try {
    const normalizedApiUrl = /^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `http://${rawApiUrl}`;
    const parsed = new URL(normalizedApiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return rawApiUrl.replace(/\/api\/?$/i, '');
  }
};

const buildUploadsUrl = (origin: string, rawPath: string, uploadsSubPath = '') => {
  const cleanedPath = rawPath.replace(/^\/+/, '');
  if (cleanedPath.startsWith('uploads/')) {
    return `${origin}/${cleanedPath}`;
  }

  if (cleanedPath.includes('/')) {
    return `${origin}/uploads/${cleanedPath}`;
  }

  const subPath = trimSlashes(uploadsSubPath || '');
  const folderPrefix = subPath ? `${subPath}/` : '';
  return `${origin}/uploads/${folderPrefix}${cleanedPath}`;
};

const shouldRewriteLocalBackendUrl = (hostname: string) =>
  LOCAL_HOST_REGEX.test(hostname) ||
  PRIVATE_IP_REGEX.test(hostname) ||
  hostname.endsWith('.local');

const DEFAULT_PROFILE_COVER_URL =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80';

export const getDefaultProfileCoverUrl = () => DEFAULT_PROFILE_COVER_URL;

export const getDefaultProfileAvatarUrl = (seed: string | number = 'olodo-user') =>
  `https://i.pravatar.cc/150?u=${encodeURIComponent(String(seed))}`;

export const normalizeBackendMediaUrl = (rawUrl: unknown, uploadsSubPath = ''): string => {
  if (typeof rawUrl !== 'string') {
    return '';
  }

  const value = rawUrl.trim();
  if (!value) {
    return '';
  }

  if (
    value.startsWith('data:') ||
    value.startsWith('file:') ||
    value.startsWith('content:')
  ) {
    return value;
  }

  const backendOrigin = getBackendOrigin();

  if (value.startsWith('/uploads/')) {
    return backendOrigin ? `${backendOrigin}${value}` : value;
  }

  if (!/^https?:\/\//i.test(value)) {
    return backendOrigin ? buildUploadsUrl(backendOrigin, value, uploadsSubPath) : value;
  }

  try {
    const parsed = new URL(value);
    if (!parsed.pathname.startsWith('/uploads/')) {
      return value;
    }

    if (!shouldRewriteLocalBackendUrl(parsed.hostname)) {
      return value;
    }

    return backendOrigin ? `${backendOrigin}${parsed.pathname}${parsed.search}` : value;
  } catch {
    return value;
  }
};
