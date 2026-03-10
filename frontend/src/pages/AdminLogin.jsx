// src/pages/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider, firebaseSignOut } from '../auth/firebase';
import { isAdminEmail } from '../auth/adminWhitelist';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [step,     setStep]     = useState(''); // status message shown to user

  // Already fully authenticated as admin → go to panel
  if (isAuthenticated && isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleAdminSignIn = async () => {
    setError('');
    setStep('');
    setLoading(true);

    try {
      // ── Step 1: Google popup ───────────────────────────────
      setStep('Opening Google sign-in…');
      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      const email = user.email?.toLowerCase().trim();

      // ── Step 2: Frontend whitelist check ──────────────────
      setStep('Checking admin permissions…');
      if (!isAdminEmail(email)) {
        await firebaseSignOut();
        setError(
          `"${user.email}" is not on the admin whitelist.\n\n` +
          `To add yourself, open:\nsrc/auth/adminWhitelist.js\nand add your email to the ADMIN_WHITELIST array.`
        );
        setLoading(false);
        setStep('');
        return;
      }

      // ── Step 3: Firebase verified — let AuthProvider handle the rest ──
      // AuthProvider's onAuthStateChanged fires automatically after signInWithPopup.
      // It will call loginToBackend. If that fails (backend down / domain issue),
      // we catch it here and show a clear message.
      setStep('Verifying with server…');

      // Wait up to 8 seconds for AuthProvider to update
      const startTime = Date.now();
      await new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          // Check if auth state has resolved
          if (auth.currentUser) {
            clearInterval(interval);
            resolve();
          }
          if (Date.now() - startTime > 8000) {
            clearInterval(interval);
            reject(new Error('timeout'));
          }
        }, 200);
      });

      // Navigate — AuthProvider will redirect back to /admin-login if role isn't admin
      setStep('Redirecting to admin panel…');
      navigate('/admin', { replace: true });

    } catch (err) {
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        setError('Sign-in cancelled. Please try again.');
      } else if (err.message === 'timeout') {
        // Backend is down — still navigate, AdminRoute will handle the rest
        // OR show a helpful error
        setError(
          'Could not reach the backend server.\n\n' +
          'Make sure your backend is running:\n' +
          '  cd your-backend-folder\n' +
          '  npm run dev\n\n' +
          'It should be running on http://localhost:5000'
        );
        await firebaseSignOut().catch(() => {});
      } else {
        setError(err.message || 'Sign-in failed. Please try again.');
        await firebaseSignOut().catch(() => {});
      }
      setStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__bg" aria-hidden="true">
        <div className="admin-login__bg-grid" />
        <div className="admin-login__bg-blob" />
      </div>

      <div className="admin-login__card">
        <Link to="/login" className="admin-login__back">
          <ArrowLeft size={14} /> Student Login
        </Link>

        <div className="admin-login__header">
          <div className="admin-login__shield">
            <Shield size={36} strokeWidth={1.5} />
          </div>
          <h1 className="admin-login__title">Admin Portal</h1>
          <p className="admin-login__subtitle">VNRVJIET Academic Repository</p>
        </div>

        <div className="admin-login__body">
          <p className="admin-login__desc">
            Restricted to authorised administrators only.
            Sign in with your admin Google account.
          </p>

          {/* Step indicator */}
          {step && !error && (
            <div className="admin-login__step">
              <Loader2 size={14} className="spin" />
              {step}
            </div>
          )}

          {/* Error box */}
          {error && (
            <div className="admin-login__error" role="alert">
              <AlertCircle size={16} className="admin-login__error-icon" />
              <pre className="admin-login__error-text">{error}</pre>
            </div>
          )}

          {/* Checklist — what needs to be true */}
          {!loading && !error && (
            <div className="admin-login__checklist">
              <div className="admin-login__check">
                <CheckCircle size={13} className="admin-login__check-icon" />
                Backend running on port 5000
              </div>
              <div className="admin-login__check">
                <CheckCircle size={13} className="admin-login__check-icon" />
                ADMIN_EMAILS set in backend .env
              </div>
              <div className="admin-login__check">
                <CheckCircle size={13} className="admin-login__check-icon" />
                Email in adminWhitelist.js
              </div>
            </div>
          )}

          <button
            className="admin-login__btn"
            onClick={handleAdminSignIn}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={20} className="spin" /> {step || 'Signing in…'}</>
            ) : (
              <>
                <svg className="admin-login__google-icon" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="admin-login__hint">
            <Shield size={12} /> Access restricted to whitelisted emails only.
          </div>
        </div>
      </div>
    </div>
  );
}
