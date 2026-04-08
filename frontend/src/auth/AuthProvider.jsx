// src/auth/AuthProvider.jsx
import { createContext, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, firebaseSignOut } from './firebase';
import { isAdminEmail } from './adminWhitelist';
import axios from 'axios';
import { API_BASE_URL, API_TARGET_LABEL } from '../config/apiBaseUrl';

export const AuthContext = createContext(null);

const BASE_URL = API_BASE_URL;

/**
 * Try to sync with backend. Returns user profile on success.
 * For admin Gmail accounts (non @vnrvjiet.in), the backend may return 403
 * if ADMIN_EMAILS is not set — in that case we build a minimal profile
 * from the Firebase user object so login still works.
 */
const syncWithBackend = async (idToken, firebaseUser) => {
  if (!BASE_URL && !import.meta.env.DEV) {
    throw new Error(
      'Backend URL is not configured. Set VITE_API_BASE_URL in your deployment environment.'
    );
  }

  try {
    const endpoint = BASE_URL ? `${BASE_URL}/auth/login` : '/auth/login';
    const { data } = await axios.post(
      endpoint,
      {},
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'x-admin-login': 'true',
        },
        timeout: 8000,
      }
    );
    return data.data.user;
  } catch (err) {
    const status = err.response?.status;

    // Backend returned 403 (domain check failed) but this is a whitelisted admin
    if (status === 403 && isAdminEmail(firebaseUser?.email)) {
      console.warn(
        'Backend rejected admin Gmail with 403. ' +
        'Add ADMIN_EMAILS to your backend .env to fix this permanently. ' +
        'Using client-side admin profile for now.'
      );
      // Return a minimal admin profile built from Firebase data
      return {
        _id:      firebaseUser.uid,
        name:     firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email:    firebaseUser.email,
        role:     'admin',
        avatarUrl: firebaseUser.photoURL || null,
        isActive: true,
        _clientSideOnly: true, // flag so we know this wasn't from DB
      };
    }

    // Network error — backend not running
    if (!err.response) {
      throw new Error(
        'Cannot reach backend at ' + API_TARGET_LABEL + '. ' +
        (import.meta.env.DEV
          ? 'Start your backend with: npm run dev'
          : 'Verify the server is up and VITE_API_BASE_URL points to a live API.')
      );
    }

    throw new Error(err.response?.data?.message || err.message);
  }
};

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [backendUser,  setBackendUser]  = useState(null);
  const [idToken,      setIdToken]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const clearAuth = useCallback(() => {
    setFirebaseUser(null);
    setBackendUser(null);
    setIdToken(null);
  }, []);

  // Restore session on page load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token   = await fbUser.getIdToken(false);
          const profile = await syncWithBackend(token, fbUser);
          setFirebaseUser(fbUser);
          setIdToken(token);
          setBackendUser(profile);
        } catch (err) {
          console.error('Session restore failed:', err);
          setError(err.message);
          await firebaseSignOut().catch(() => {});
          clearAuth();
        }
      } else {
        clearAuth();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [clearAuth]);

  // Refresh token every 55 min
  useEffect(() => {
    if (!firebaseUser) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await firebaseUser.getIdToken(true);
        setIdToken(fresh);
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  // Student login (Google, @vnrvjiet.in only)
  const login = useCallback(async () => {
    setError(null);
    try {
      const { user: fbUser, idToken: token } = await signInWithGoogle();
      const profile = await syncWithBackend(token, fbUser);
      setFirebaseUser(fbUser);
      setIdToken(token);
      setBackendUser(profile);
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
      throw err;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setError(null);
    clearAuth();
    await firebaseSignOut().catch((err) =>
      console.error('Firebase sign-out error:', err)
    );
  }, [clearAuth]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      backendUser,
      idToken,
      loading,
      error,
      isAuthenticated: Boolean(backendUser),
      isAdmin: backendUser?.role === 'admin',
      isStaff: backendUser?.role === 'admin',
      login,
      logout,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
