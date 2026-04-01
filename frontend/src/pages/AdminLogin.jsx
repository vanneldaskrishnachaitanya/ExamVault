// src/pages/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider, firebaseSignOut } from '../auth/firebase';
import { isAdminEmail } from '../auth/adminWhitelist';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState('');

  if (isAuthenticated && isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleAdminSignIn = async () => {
    setError('');
    setStep('');
    setLoading(true);

    try {
      setStep('Opening Google sign-in…');
      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      const email = user.email?.toLowerCase().trim();

      setStep('Verifying administrator credentials…');
      if (!isAdminEmail(email)) {
        await firebaseSignOut();
        setError(`Access denied. "${user.email}" does not have administrator privileges.`);
        setLoading(false);
        setStep('');
        return;
      }

      setStep('Establishing secure session…');

      const startTime = Date.now();
      await new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (auth.currentUser) { clearInterval(interval); resolve(); }
          if (Date.now() - startTime > 8000) { clearInterval(interval); reject(new Error('timeout')); }
        }, 200);
      });

      setStep('Redirecting to admin panel…');
      navigate('/admin', { replace: true });

    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.message === 'timeout') {
        setError('Server is temporarily unavailable. Please try again in a moment.');
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
    <div className="admin-login-page">
      <div className="admin-login-page__bg" aria-hidden="true">
        <div className="admin-login-page__grid" />
        <div className="admin-login-page__blob admin-login-page__blob--1" />
        <div className="admin-login-page__blob admin-login-page__blob--2" />
      </div>

      <div className="admin-login-card">
        <Link to="/login" className="admin-login-card__student-link">
          <ArrowLeft size={14} /> Student Login
        </Link>

        <div className="admin-login-card__header">
          <div className="admin-login-card__icon">
            <Shield size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="admin-login-card__title">Admin Portal</h1>
            <p className="admin-login-card__sub">VNRVJIET Academic Repository</p>
          </div>
        </div>

        <div className="admin-login-card__form">
          <p className="admin-login__desc">
            This portal is exclusively for authorised admins only.
            Unauthorised access attempts are logged and monitored.
          </p>

          {step && !error && (
            <div className="admin-login__step">
              <Loader2 size={14} className="spin" />
              {step}
            </div>
          )}

          {error && (
            <div className="admin-login-card__error" role="alert">
              <AlertCircle size={16} className="admin-login__error-icon" />
              <p className="admin-login__error-text">{error}</p>
            </div>
          )}

          <button
            className="admin-login-card__submit"
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

          <div className="admin-login-card__note">
            <Shield size={12} /> For authorised VNRVJIET administrators only.
          </div>
        </div>
      </div>
    </div>
  );
}
