import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronDown, LayoutDashboard, Shield, Bell, Sun, Moon,
  Check, Trash2, Search, Download, MessageSquare, Clock2,
  Menu, X, BookMarked, Clock, LogOut, User, Palette,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications, markAllNotificationsRead, deleteNotification, fetchBookmarks, fetchSavedItems } from '../api/apiClient';
import { getSavedItems } from '../utils/featureStorage';
import ConfirmDialog from './ConfirmDialog';

const THEME_LABELS = {
  system: 'System Auto',
  dark: 'Midnight',
  light: 'Daylight',
  aurora: 'Aurora',
  forest: 'Forest',
  sunset: 'Sunset',
};

export default function Navbar({
  theme,
  themePref,
  setThemePref,
  toggleTheme,
  themeOptions = ['system', 'dark', 'light'],
}) {
  const { backendUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pinned, setPinned] = useState([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const dropdownRef  = useRef(null);
  const dropdownBtn  = useRef(null);
  const notifPanelRef = useRef(null);
  const notifBtnRef   = useRef(null);
  const themePanelRef = useRef(null);
  const themeBtnRef   = useRef(null);
  // NOTE: no refs for drawer — we handle it purely via state + overlay click

  // Load notifications
  useEffect(() => {
    if (!backendUser) return;
    const load = async () => {
      try {
        const d = await fetchNotifications();
        setNotifications(d.notifications || []);
        setUnread(d.unreadCount || 0);
      } catch {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [backendUser]);

  // Close dropdown + notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        dropdownBtn.current &&
        !dropdownBtn.current.contains(e.target)
      ) setDropdownOpen(false);

      if (
        notifPanelRef.current &&
        !notifPanelRef.current.contains(e.target) &&
        notifBtnRef.current &&
        !notifBtnRef.current.contains(e.target)
      ) setNotifOpen(false);

      if (
        themePanelRef.current &&
        !themePanelRef.current.contains(e.target) &&
        themeBtnRef.current &&
        !themeBtnRef.current.contains(e.target)
      ) setThemeMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [navigate]);

  // Prevent background scroll while the mobile drawer is open
  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  // Keyboard shortcut: / → search
  useEffect(() => {
    const h = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        navigate('/search');
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [navigate]);

  // Load pins for mobile drawer
  useEffect(() => {
    if (!drawerOpen || !backendUser) return;
    const loadPins = async () => {
      setLoadingPins(true);
      try {
        const [bmRes, savedRes] = await Promise.all([
          fetchBookmarks().catch(() => ({ bookmarks: [] })),
          fetchSavedItems().catch(() => ({ savedItems: [] }))
        ]);
        
        const bookmarkPins = (bmRes.bookmarks || []).map(b => ({
          type: 'subject',
          title: b.subject,
          subtitle: `${b.regulation} · ${b.branch}`,
          href: `/r/${b.regulation}/${b.branch}/${encodeURIComponent(b.subject)}`,
          id: `bookmark:${b.regulation}:${b.branch}:${b.subject}`,
        }));
        
        const localPins = (savedRes.savedItems || []).map(item => ({
          type: item.type,
          id: `${item.type}:${item.itemId}`,
          title: item.title,
          subtitle: item.subtitle,
          href: item.href,
        }));
        
        setPinned([...localPins, ...bookmarkPins].slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPins(false);
      }
    };
    loadPins();
  }, [drawerOpen, backendUser]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(n => n.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch {}
  };

  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const item = notifications.find(x => x._id === id);
      setNotifications(n => n.filter(x => x._id !== id));
      if (item && !item.read) setUnread(p => Math.max(0, p - 1));
    } catch {}
  };

  const go = (to) => { setDrawerOpen(false); navigate(to); };

  const initials = backendUser?.name
    ? backendUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
      <svg style={{ display: 'none' }}>
        <filter
          id="glass-distortion"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          filterUnits="objectBoundingBox"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.01"
            numOctaves="1"
            seed="5"
            result="turbulence"
          />

          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>

          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />

          <feSpecularLighting
            in="softMap"
            surfaceScale="5"
            specularConstant="1.45"
            specularExponent="100"
            lighting-color="white"
            result="specLight"
          >
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>

          <feComposite
            in="specLight"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1"
            k4="0"
            result="litImage"
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="softMap"
            scale={420}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="liquidGlass-wrapper navbar__liquid-glass">
          <div className="liquidGlass-effect" />
          <div className="liquidGlass-tint" />
          <div className="liquidGlass-shine" />
          <div className="liquidGlass-text">
            <div className="navbar__inner">

              {/* ── Hamburger (mobile only) ── */}
              <button
                className="navbar__hamburger"
                onClick={() => setDrawerOpen(prev => !prev)}
                aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={drawerOpen}
              >
                {drawerOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Brand */}
              <Link to="/dashboard" className="navbar__brand">
                <div className="navbar__brand-icon">
                  <BookOpen size={18} strokeWidth={2.5} />
                </div>
                <span className="navbar__brand-wordmark">
                  VNR<span className="navbar__brand-accent">VJIET</span>
                </span>
              </Link>

              {/* Desktop nav links */}
              <div className="navbar__links">
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/dashboard" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><LayoutDashboard size={15} /> Repository</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/coding" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><BookOpen size={15} /> Coding</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/events" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><Clock2 size={15} /> Events</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/syllabus" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><BookMarked size={15} /> Syllabus</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/timetable" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><Clock size={15} /> Timetable</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            <div className="button-wrap navbar__link-wrap">
              <NavLink to="/feedback" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                <span><MessageSquare size={15} /> Feedback</span>
              </NavLink>
              <div className="button-shadow" />
            </div>
            {isAdmin && (
              <div className="button-wrap navbar__link-wrap">
                <NavLink to="/admin" className={({ isActive }) => 'navbar__link navbar__link--admin' + (isActive ? ' navbar__link--active' : '')}>
                  <span><Shield size={15} /> Admin</span>
                </NavLink>
                <div className="button-shadow" />
              </div>
            )}
              </div>

              {/* Right side icons */}
              <div className="navbar__right">

            <button className="navbar__icon-btn" onClick={() => navigate('/search')} title="Search (/)">
              <Search size={17} />
            </button>

            <div className="navbar__theme-wrap">
              <button ref={themeBtnRef} className="navbar__icon-btn" onClick={() => setThemeMenuOpen(p => !p)} title="Theme presets">
                <Palette size={17} />
              </button>
              {themeMenuOpen && (
                <div className="navbar__theme-menu" ref={themePanelRef}>
                  <div className="navbar__theme-menu-head">Theme presets</div>
                  {themeOptions.map(option => (
                    <button
                      key={option}
                      className={`navbar__theme-option${themePref === option ? ' navbar__theme-option--active' : ''}`}
                      onClick={() => { setThemePref(option); setThemeMenuOpen(false); }}
                    >
                      <span>{THEME_LABELS[option] || option}</span>
                      {themePref === option && <Check size={12} />}
                    </button>
                  ))}
                  <button className="navbar__theme-option navbar__theme-option--cycle" onClick={() => { toggleTheme(); setThemeMenuOpen(false); }}>
                    <Moon size={12} /> Cycle preset
                  </button>
                </div>
              )}
            </div>

            {/* Notification bell */}
            <div className="navbar__notif-wrap">
              <button
                ref={notifBtnRef}
                className="navbar__icon-btn"
                onClick={() => setNotifOpen(p => !p)}
                title="Notifications"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="navbar__notif-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </button>

              {notifOpen && (
                <div className="navbar__notif-dropdown" ref={notifPanelRef}>
                  <div className="navbar__notif-header">
                    <span>Notifications</span>
                    {unread > 0 && (
                      <button className="navbar__notif-read-all" onClick={handleMarkAllRead}>
                        <Check size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="navbar__notif-list">
                    {notifications.length === 0 ? (
                      <div className="navbar__notif-empty">
                        <Bell size={24} />
                        <p>No notifications yet</p>
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n._id}
                        className={`navbar__notif-item${n.read ? '' : ' navbar__notif-item--unread'}`}
                        onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}
                      >
                        <div className="navbar__notif-item-content">
                          <p className="navbar__notif-title">{n.title}</p>
                          <p className="navbar__notif-msg">{n.message}</p>
                          <p className="navbar__notif-time">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button className="navbar__notif-delete" onClick={e => handleDeleteNotif(n._id, e)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

              {/* Avatar dropdown — profile + downloads + signout */}
              <div className="navbar__user">
              <button
                ref={dropdownBtn}
                className="navbar__avatar-btn"
                onClick={() => setDropdownOpen(p => !p)}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
              >
                {backendUser?.avatarUrl ? (
                  <img src={backendUser.avatarUrl} alt={backendUser.name} className="navbar__avatar-img" referrerPolicy="no-referrer" />
                ) : (
                  <span className="navbar__avatar-initials">{initials}</span>
                )}
                <ChevronDown size={13} className={'navbar__chevron' + (dropdownOpen ? ' navbar__chevron--open' : '')} />
              </button>

              {dropdownOpen && (
                <div className="navbar__dropdown" ref={dropdownRef} role="menu">
                  <div className="navbar__dropdown-info">
                    <div className="navbar__dropdown-avatar">
                      {backendUser?.avatarUrl ? <img src={backendUser.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{initials}</span>}
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
                  <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/profile'); }} role="menuitem">
                    <User size={14} /> My Profile
                  </button>
                  <button className="navbar__dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/downloads'); }} role="menuitem">
                    <Download size={14} /> Download History
                  </button>
                  <div className="navbar__dropdown-divider" />
                  <button
                    className="navbar__dropdown-item navbar__dropdown-item--danger"
                    onClick={() => { setDropdownOpen(false); setSignOutOpen(true); }}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <ConfirmDialog
        open={signOutOpen}
        title="Sign out of ExamVault?"
        message="You will need to sign back in to access your account."
        icon={<LogOut size={22} />}
        confirmLabel="Sign Out"
        confirmTone="danger"
        confirmIcon={<LogOut size={14} />}
        onConfirm={handleLogout}
        onCancel={() => setSignOutOpen(false)}
      />

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="nav-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-in drawer ── */}
      <aside className={`nav-drawer${drawerOpen ? ' nav-drawer--open' : ''}`} aria-label="Mobile menu">

        {/* Header */}
        <div className="nav-drawer__header">
          <div className="nav-drawer__avatar">
            {backendUser?.avatarUrl
              ? <img src={backendUser.avatarUrl} alt={backendUser.name} referrerPolicy="no-referrer" />
              : <span>{initials}</span>}
          </div>
          <div className="nav-drawer__user-info">
            <p className="nav-drawer__name">{backendUser?.name || 'User'}</p>
            <span className={`nav-drawer__role nav-drawer__role--${backendUser?.role}`}>
              {backendUser?.role === 'admin' ? '⚡ Admin' : '🎓 Student'}
            </span>
          </div>
          <button className="nav-drawer__close" onClick={() => setDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Pinned Items (Mobile Only) */}
        <div className="nav-drawer__pinned">
          <p className="nav-drawer__section-label">Pinned Items</p>
          {loadingPins ? (
            <div className="nav-drawer__pinned-empty">Loading pins...</div>
          ) : pinned.length === 0 ? (
            <div className="nav-drawer__pinned-empty">Pin files to see them here</div>
          ) : (
            <div className="nav-drawer__pinned-list">
              {pinned.map(item => (
                <button
                  key={item.id}
                  className="nav-drawer__item nav-drawer__item--pin"
                  onClick={() => {
                    setDrawerOpen(false);
                    if (item.href && /^https?:\/\//i.test(item.href)) {
                      window.open(item.href, '_blank', 'noopener,noreferrer');
                    } else {
                      navigate(item.href || '/dashboard');
                    }
                  }}
                >
                  <BookMarked size={14} className="nav-drawer__pin-icon" />
                  <div className="nav-drawer__pin-text">
                    <span className="nav-drawer__pin-title">{item.title}</span>
                    <span className="nav-drawer__pin-sub">{item.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav items — only what's NOT in the bottom nav */}
        <nav className="nav-drawer__body">
          <p className="nav-drawer__section-label">Pages</p>
          <button className="nav-drawer__item" onClick={() => go('/syllabus')}>
            <BookMarked size={16} /> Syllabus
          </button>
          <button className="nav-drawer__item" onClick={() => go('/timetable')}>
            <Clock size={16} /> Timetable
          </button>
          <button className="nav-drawer__item" onClick={() => go('/feedback')}>
            <MessageSquare size={16} /> Feedback
          </button>
          <button className="nav-drawer__item" onClick={() => go('/downloads')}>
            <Download size={16} /> Download History
          </button>
          {isAdmin && (
            <>
              <p className="nav-drawer__section-label" style={{ marginTop: '1rem' }}>Admin</p>
              <button className="nav-drawer__item nav-drawer__item--admin" onClick={() => go('/admin')}>
                <Shield size={16} /> Admin Panel
              </button>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
