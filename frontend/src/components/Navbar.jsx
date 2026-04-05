import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronDown, LayoutDashboard, LogOut, Shield, Bell, Sun, Moon,
  Check, Trash2, Search, Download, MessageSquare, Code, Calendar, Clock2,
  Menu, X, BookMarked, Clock, User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchNotifications, markAllNotificationsRead, deleteNotification } from '../api/apiClient';

export default function Navbar({ theme, toggleTheme }) {
  const { backendUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open,       setOpen]       = useState(false);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,     setUnread]     = useState(0);
  const menuRef      = useRef(null);
  const btnRef       = useRef(null);
  const notifRef     = useRef(null);
  const notifBtnRef  = useRef(null);
  const hamburgerRef = useRef(null);
  const drawerRef    = useRef(null);

  useEffect(() => {
    if (!backendUser) return;
    const load = async () => {
      try { const d = await fetchNotifications(); setNotifications(d.notifications || []); setUnread(d.unreadCount || 0); } catch {}
    };
    load(); const iv = setInterval(load, 60000); return () => clearInterval(iv);
  }, [backendUser]);

  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target) && notifBtnRef.current && !notifBtnRef.current.contains(e.target)) setNotifOpen(false);
      if (drawerRef.current && !drawerRef.current.contains(e.target) && hamburgerRef.current && !hamburgerRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('Sign out?')) return;
    setOpen(false); setMenuOpen(false);
    try { await logout(); } catch {}
  };
  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead(); setNotifications(n => n.map(x => ({ ...x, read: true }))); setUnread(0); } catch {}
  };
  const handleDeleteNotif = async (id, e) => {
    e.stopPropagation();
    try { await deleteNotification(id); setNotifications(n => n.filter(x => x._id !== id)); setUnread(p => Math.max(0, p - (notifications.find(x => x._id === id)?.read ? 0 : 1))); } catch {}
  };

  const initials = backendUser?.name ? backendUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  useEffect(() => {
    const h = (e) => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) { e.preventDefault(); navigate('/search'); } };
    document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h);
  }, [navigate]);

  const go = (to) => { setMenuOpen(false); navigate(to); };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* Hamburger — mobile only */}
          <button ref={hamburgerRef} className="navbar__hamburger" onClick={() => setMenuOpen(p => !p)} aria-label="Open menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Brand */}
          <Link to="/dashboard" className="navbar__brand">
            <div className="navbar__brand-icon"><BookOpen size={18} strokeWidth={2.5} /></div>
            <span className="navbar__brand-wordmark">VNR<span className="navbar__brand-accent">VJIET</span></span>
          </Link>

          {/* Desktop nav links */}
          <div className="navbar__links">
            {[
              { to:'/dashboard', icon:<LayoutDashboard size={15}/>, label:'Repository' },
              { to:'/coding',    icon:<Code size={15}/>,            label:'Coding' },
              { to:'/events',    icon:<Calendar size={15}/>,        label:'Events' },
              { to:'/syllabus',  icon:<BookOpen size={15}/>,        label:'Syllabus' },
              { to:'/timetable', icon:<Clock2 size={15}/>,          label:'Timetable' },
              { to:'/feedback',  icon:<MessageSquare size={15}/>,   label:'Feedback' },
            ].map(l => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => 'navbar__link' + (isActive ? ' navbar__link--active' : '')}>
                {l.icon} {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => 'navbar__link navbar__link--admin' + (isActive ? ' navbar__link--active' : '')}>
                <Shield size={15} /> Admin
              </NavLink>
            )}
          </div>

          {/* Right */}
          <div className="navbar__right">
            <button className="navbar__icon-btn" onClick={() => navigate('/search')} title="Search"><Search size={17} /></button>
            <button className="navbar__icon-btn navbar__dl-btn" onClick={() => navigate('/downloads')} title="Downloads"><Download size={17} /></button>
            <button className="navbar__icon-btn" onClick={toggleTheme} title="Toggle theme">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>

            {/* Notifications */}
            <div className="navbar__notif-wrap">
              <button ref={notifBtnRef} className="navbar__icon-btn" onClick={() => setNotifOpen(p => !p)} title="Notifications">
                <Bell size={17} />
                {unread > 0 && <span className="navbar__notif-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>
              {notifOpen && (
                <div className="navbar__notif-dropdown" ref={notifRef}>
                  <div className="navbar__notif-header">
                    <span>Notifications</span>
                    {unread > 0 && <button className="navbar__notif-read-all" onClick={handleMarkAllRead}><Check size={12}/> Mark all read</button>}
                  </div>
                  <div className="navbar__notif-list">
                    {notifications.length === 0
                      ? <div className="navbar__notif-empty"><Bell size={24}/><p>No notifications yet</p></div>
                      : notifications.map(n => (
                        <div key={n._id} className={`navbar__notif-item${n.read ? '' : ' navbar__notif-item--unread'}`}
                          onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}>
                          <div className="navbar__notif-item-content">
                            <p className="navbar__notif-title">{n.title}</p>
                            <p className="navbar__notif-msg">{n.message}</p>
                            <p className="navbar__notif-time">{new Date(n.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                          </div>
                          <button className="navbar__notif-delete" onClick={e => handleDeleteNotif(n._id, e)}><Trash2 size={12}/></button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Avatar + dropdown (signout here) */}
            <div className="navbar__user">
              <button ref={btnRef} className="navbar__avatar-btn" onClick={() => setOpen(p => !p)}>
                {backendUser?.avatarUrl
                  ? <img src={backendUser.avatarUrl} alt={backendUser.name} className="navbar__avatar-img" />
                  : <span className="navbar__avatar-initials">{initials}</span>}
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
                  <button className="navbar__dropdown-item" onClick={() => { setOpen(false); navigate('/profile'); }} role="menuitem">
                    <User size={14} /> My Profile
                  </button>
                  <button className="navbar__dropdown-item" onClick={() => { setOpen(false); navigate('/downloads'); }} role="menuitem">
                    <Download size={14} /> Download History
                  </button>
                  <div className="navbar__dropdown-divider" />
                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout} role="menuitem">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      {menuOpen && <div className="nav-drawer-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Slide-in drawer */}
      <aside ref={drawerRef} className={`nav-drawer${menuOpen ? ' nav-drawer--open' : ''}`}>
        <div className="nav-drawer__header">
          <div className="nav-drawer__avatar">
            {backendUser?.avatarUrl ? <img src={backendUser.avatarUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div className="nav-drawer__user-info">
            <p className="nav-drawer__name">{backendUser?.name || 'User'}</p>
            <span className={`nav-drawer__role nav-drawer__role--${backendUser?.role}`}>
              {backendUser?.role === 'admin' ? '⚡ Admin' : '🎓 Student'}
            </span>
          </div>
          <button className="nav-drawer__close" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>

        <nav className="nav-drawer__body">
          <p className="nav-drawer__section-label">Main</p>
          {[
            { to:'/dashboard', icon:<LayoutDashboard size={16}/>, label:'Repository' },
            { to:'/coding',    icon:<Code size={16}/>,            label:'Coding' },
            { to:'/events',    icon:<Calendar size={16}/>,        label:'Events' },
          ].map(l => (
            <button key={l.to} className="nav-drawer__item" onClick={() => go(l.to)}>{l.icon} {l.label}</button>
          ))}

          <p className="nav-drawer__section-label" style={{marginTop:'1rem'}}>More</p>
          {[
            { to:'/syllabus',  icon:<BookMarked size={16}/>,     label:'Syllabus' },
            { to:'/timetable', icon:<Clock size={16}/>,           label:'Timetable' },
            { to:'/feedback',  icon:<MessageSquare size={16}/>,  label:'Feedback' },
            { to:'/downloads', icon:<Download size={16}/>,       label:'Download History' },
            { to:'/profile',   icon:<User size={16}/>,            label:'Profile' },
          ].map(l => (
            <button key={l.to} className="nav-drawer__item" onClick={() => go(l.to)}>{l.icon} {l.label}</button>
          ))}
          {isAdmin && (
            <button className="nav-drawer__item nav-drawer__item--admin" onClick={() => go('/admin')}>
              <Shield size={16} /> Admin Panel
            </button>
          )}
        </nav>

        <div className="nav-drawer__footer">
          <button className="nav-drawer__signout" onClick={handleLogout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
    </>
  );
}
