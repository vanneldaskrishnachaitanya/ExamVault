// src/auth/AuthProvider.jsx
import { createContext, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithEmailPassword, signInWithGoogle, firebaseSignOut } from './firebase';
import { isAdminEmail } from './adminWhitelist';
import axios from 'axios';

export const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://examvault-miqe.onrender.com';
const DEMO_FACULTY_EMAIL = import.meta.env.VITE_DEMO_FACULTY_EMAIL || 'faculty.demo@vnrvjiet.in';
const DEMO_FACULTY_PASSWORD = import.meta.env.VITE_DEMO_FACULTY_PASSWORD || 'Faculty@123';

/**
 * Try to sync with backend. Returns user profile on success.
 * For admin Gmail accounts (non @vnrvjiet.in), the backend may return 403
 * if ADMIN_EMAILS is not set — in that case we build a minimal profile
 * from the Firebase user object so login still works.
 */
const syncWithBackend = async (idToken, firebaseUser) => {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/auth/login`,
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
        'Cannot reach the backend server at ' + BASE_URL + '. ' +
        'Make sure it is running with: npm run dev'
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
    setLoading(true);
    try {
      const { user: fbUser, idToken: token } = await signInWithGoogle();
      const profile = await syncWithBackend(token, fbUser);
      setFirebaseUser(fbUser);
      setIdToken(token);
      setBackendUser(profile);
    } catch (err) {
      setError(err.message || 'Sign-in failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginDemoFaculty = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { user: fbUser, idToken: token } = await signInWithEmailPassword(
        DEMO_FACULTY_EMAIL,
        DEMO_FACULTY_PASSWORD
      );
      const profile = await syncWithBackend(token, fbUser);
      setFirebaseUser(fbUser);
      setIdToken(token);
      setBackendUser(profile);
      return profile;
    } catch (err) {
      setError(err.message || 'Demo faculty sign-in failed.');
      throw err;
    } finally {
      setLoading(false);
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
      isFaculty: backendUser?.role === 'faculty',
      isStaff: backendUser?.role === 'admin' || backendUser?.role === 'faculty',
      login,
      loginDemoFaculty,
      logout,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
