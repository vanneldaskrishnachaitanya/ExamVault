import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronDown, LayoutDashboard,
  LogOut, Shield, Bell, Sun, Moon, Check,
  Trash2, Search, Download, Code, Calendar, Clock2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications, markAllNotificationsRead, deleteNotification } from '../api/apiClient';

export default function Navbar({ theme, toggleTheme }) {
  const { backendUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const menuRef   = useRef(null);
  const btnRef    = useRef(null);
  const notifRef  = useRef(null);
  const notifBtnRef = useRef(null);

  // Load notifications
  useEffect(() => {
    if (!backendUser) return;
    const load = async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data.notifications || []);
        setUnread(data.unreadCount || 0);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [backendUser]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target) && notifBtnRef.current && !notifBtnRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setOpen(false);
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
      setNotifications(n => n.filter(x => x._id !== id));
      setUnread(prev => Math.max(0, prev - (notifications.find(x => x._id === id)?.read ? 0 : 1)));
    } catch {}
  };

  const initials = backendUser?.name
    ? backendUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // Keyboard shortcut / → navigate to search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault(); navigate('/search');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar__inner">

        {/* Brand */}
        <Link to="/dashboard" className="navbar__brand">
          <div className="navbar__brand-icon">
            <BookOpen size={18} strokeWidth={2.5} />
          </div>
          <span className="navbar__brand-wordmark">
            VNR<span className="navbar__brand-accent">VJIET</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="navbar__links">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}
          >
            <LayoutDashboard size={15} /> Repository
          </NavLink>
          <NavLink to="/coding" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
            <Code size={15} /> Coding
          </NavLink>
          <NavLink to="/exams" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
            <Calendar size={15} /> Exams
          </NavLink>
          <NavLink to="/syllabus" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
            <BookOpen size={15} /> Syllabus
          </NavLink>
          <NavLink to="/timetable" className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
            <Clock2 size={15} /> Timetable
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => 'navbar__link navbar__link--admin' + (isActive ? ' navbar__link--active' : '')}
            >
              <Shield size={15} /> Admin
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="navbar__right">

          {/* Search */}
          <button className="navbar__icon-btn" onClick={() => navigate('/search')} title="Search files">
            <Search size={17} />
          </button>

          {/* Downloads */}
          <button className="navbar__icon-btn" onClick={() => navigate('/downloads')} title="Download history">
            <Download size={17} />
          </button>

          {/* Dark/Light toggle */}
          <button className="navbar__icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Notification bell */}
          <div className="navbar__notif-wrap">
            <button
              ref={notifBtnRef}
              className="navbar__icon-btn navbar__notif-btn"
              onClick={() => setNotifOpen(p => !p)}
              title="Notifications"
            >
              <Bell size={17} />
              {unread > 0 && <span className="navbar__notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            {notifOpen && (
              <div className="navbar__notif-dropdown" ref={notifRef}>
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
                  ) : (
                    notifications.map(n => (
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
                        <button
                          className="navbar__notif-delete"
                          onClick={(e) => handleDeleteNotif(n._id, e)}
                          title="Remove"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button className="navbar__signout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={15} />
            <span className="navbar__signout-label">Sign out</span>
          </button>

          {/* Avatar dropdown */}
          <div className="navbar__user">
            <button
              ref={btnRef}
              className="navbar__avatar-btn"
              onClick={() => setOpen(p => !p)}
              aria-expanded={open}
              aria-haspopup="menu"
            >
              {backendUser?.avatarUrl ? (
                <img src={backendUser.avatarUrl} alt={backendUser.name} className="navbar__avatar-img" />
              ) : (
                <span className="navbar__avatar-initials">{initials}</span>
              )}
              <ChevronDown size={13} className={'navbar__chevron' + (open ? ' navbar__chevron--open' : '')} />
            </button>

            {open && (
              <div className="navbar__dropdown" ref={menuRef} role="menu">
                <div className="navbar__dropdown-info">
                  <div className="navbar__dropdown-avatar">
                    {backendUser?.avatarUrl ? <img src={backendUser.avatarUrl} alt="" /> : <span>{initials}</span>}
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
                <button
                  className="navbar__dropdown-item"
                  onClick={() => { setOpen(false); navigate('/profile'); }}
                  role="menuitem"
                >
                  👤 My Profile
                </button>
                <div className="navbar__dropdown-divider" />
                <button
                  className="navbar__dropdown-item navbar__dropdown-item--danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
