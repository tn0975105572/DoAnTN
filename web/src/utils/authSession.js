import { useCallback, useEffect, useState } from 'react';

export const AUTH_SESSION_EVENT = 'olodo:auth-session-changed';

const hasWindow = () => typeof window !== 'undefined';

const safeGetItem = (key) => {
    if (!hasWindow()) return '';
    return window.localStorage.getItem(key) || '';
};

const safeParseUser = () => {
    const rawUser = safeGetItem('user');
    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch {
        return null;
    }
};

export const readAuthSession = () => ({
    token: safeGetItem('token'),
    userId: safeGetItem('userId'),
    user: safeParseUser(),
});

export const notifyAuthSessionChanged = () => {
    if (!hasWindow()) return;
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
};

export const setAuthSession = ({ token = '', user = null }) => {
    if (!hasWindow()) return;

    if (token) {
        window.localStorage.setItem('token', token);
    } else {
        window.localStorage.removeItem('token');
    }

    if (user) {
        window.localStorage.setItem('user', JSON.stringify(user));
        const resolvedUserId = user.ID_NguoiDung || user.id || '';
        if (resolvedUserId) {
            window.localStorage.setItem('userId', String(resolvedUserId));
        } else {
            window.localStorage.removeItem('userId');
        }
    } else {
        window.localStorage.removeItem('user');
        window.localStorage.removeItem('userId');
    }

    notifyAuthSessionChanged();
};

export const updateStoredUser = (user) => {
    if (!hasWindow()) return;

    if (!user) {
        window.localStorage.removeItem('user');
        notifyAuthSessionChanged();
        return;
    }

    window.localStorage.setItem('user', JSON.stringify(user));
    const resolvedUserId = user.ID_NguoiDung || user.id || safeGetItem('userId');
    if (resolvedUserId) {
        window.localStorage.setItem('userId', String(resolvedUserId));
    }
    notifyAuthSessionChanged();
};

export const clearAuthSession = (extraKeys = []) => {
    if (!hasWindow()) return;

    ['token', 'user', 'userId', ...extraKeys].forEach((key) => {
        window.localStorage.removeItem(key);
    });

    notifyAuthSessionChanged();
};

export const useAuthSession = () => {
    const [session, setSession] = useState(() => readAuthSession());

    const syncSession = useCallback(() => {
        setSession(readAuthSession());
    }, []);

    useEffect(() => {
        if (!hasWindow()) return undefined;

        syncSession();
        window.addEventListener('storage', syncSession);
        window.addEventListener('focus', syncSession);
        window.addEventListener(AUTH_SESSION_EVENT, syncSession);

        return () => {
            window.removeEventListener('storage', syncSession);
            window.removeEventListener('focus', syncSession);
            window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
        };
    }, [syncSession]);

    return session;
};
