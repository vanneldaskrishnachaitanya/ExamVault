// src/components/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronDown, LayoutDashboard,
  LogOut, Shield, Upload,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { backendUser, isAdmin, logout } = useAuth();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef   = useRef(null);
  const btnRef    = useRef(null);

  // ── Close dropdown on outside CLICK (not mousedown — avoids race condition)
  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    // Force navigation regardless of logout success
    navigate('/login', { replace: true });
  };

  const initials = backendUser?.name
    ? backendUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__inner">

        {/* ── Brand ──────────────────────────────────────── */}
        <Link to="/dashboard" className="navbar__brand">
          <div className="navbar__brand-icon">
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className="navbar__brand-wordmark">
            VNR<span className="navbar__brand-accent">VJIET</span>
          </span>
        </Link>

        {/* ── Nav links ─────────────────────────────────── */}
        <div className="navbar__links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              'navbar__link' + (isActive ? ' navbar__link--active' : '')
            }
          >
            <LayoutDashboard size={15} />
            Repository
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                'navbar__link navbar__link--admin' + (isActive ? ' navbar__link--active' : '')
              }
            >
              <Shield size={15} />
              Admin
            </NavLink>
          )}
        </div>

        {/* ── Right side ────────────────────────────────── */}
        <div className="navbar__right">

          {/* Always-visible sign out button — never hidden behind a menu */}
          <button
            className="navbar__signout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut size={15} />
            <span className="navbar__signout-label">Sign out</span>
          </button>

          {/* Avatar + dropdown for user info */}
          <div className="navbar__user">
            <button
              ref={btnRef}
              className="navbar__avatar-btn"
              onClick={() => setOpen((p) => !p)}
              aria-expanded={open}
              aria-haspopup="menu"
              title="Account info"
            >
              {backendUser?.avatarUrl ? (
                <img
                  src={backendUser.avatarUrl}
                  alt={backendUser.name}
                  className="navbar__avatar-img"
                />
              ) : (
                <span className="navbar__avatar-initials">{initials}</span>
              )}
              <ChevronDown
                size={13}
                className={'navbar__chevron' + (open ? ' navbar__chevron--open' : '')}
              />
            </button>

            {open && (
              <div className="navbar__dropdown" ref={menuRef} role="menu">

                {/* User info */}
                <div className="navbar__dropdown-info">
                  <div className="navbar__dropdown-avatar">
                    {backendUser?.avatarUrl
                      ? <img src={backendUser.avatarUrl} alt="" />
                      : <span>{initials}</span>}
                  </div>
                  <div className="navbar__dropdown-text">
                    <p className="navbar__dropdown-name">{backendUser?.name}</p>
                    <p className="navbar__dropdown-email">{backendUser?.email}</p>
                  </div>
                </div>

                <div className="navbar__dropdown-divider" />

                <span className={`navbar__role-pill navbar__role-pill--${backendUser?.role}`}>
                  {backendUser?.role === 'admin' ? '⚡ Admin' : '🎓 Student'}
                </span>

                <div className="navbar__dropdown-divider" />

                {/* Sign out inside dropdown too */}
                <button
                  className="navbar__dropdown-item navbar__dropdown-item--danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
