// src/pages/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login, loading } = useAuth();
  const [error,   setError]   = useState('');
  const [signing, setSigning] = useState(false);

  const handleSignIn = async () => {
    setError('');
    setSigning(true);
    try {
      await login();
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const isLoading = loading || signing;

  return (
    <div className="login">
      <div className="login__bg" aria-hidden="true">
        <div className="login__bg-grid" />
        <div className="login__bg-blob login__bg-blob--1" />
        <div className="login__bg-blob login__bg-blob--2" />
      </div>

      <div className="login__card">
        {/* Logo */}
        <div className="login__logo">
          <div className="login__logo-icon">
            <BookOpen size={32} strokeWidth={2} />
          </div>
          <div>
            <h1 className="login__logo-title">VNRVJIET</h1>
            <p className="login__logo-sub">Academic Repository</p>
          </div>
        </div>

        {/* Body */}
        <div className="login__body">
          <h2 className="login__heading">Student Login</h2>
          <p className="login__desc">
            Sign in with your <strong>@vnrvjiet.in</strong> Google account to access
            previous papers and subject resources.
          </p>

          {error && (
            <div className="login__error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            className="login__google-btn"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 size={20} className="login__spinner" /> Signing in…</>
            ) : (
              <>
                <svg className="login__google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="login__domain-note">
            Only <code>@vnrvjiet.in</code> accounts are permitted.
          </p>
        </div>

        {/* Footer — admin login link */}
        <div className="login__footer">
          <Link to="/admin-login" className="login__admin-link">
            <Shield size={13} />
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
