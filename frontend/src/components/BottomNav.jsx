import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Code, Calendar, User, Shield, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { to: '/coding',    icon: <Code size={20} />,            label: 'Coding' },
    { to: '/events',     icon: <Calendar size={20} />,        label: 'Events' },
    { to: '/syllabus',  icon: <BookOpen size={20} />,        label: 'Syllabus' },
    { to: '/timetable', icon: <Clock size={20} />,          label: 'Timetable' },
    { to: '/feedback', icon: <MessageSquare size={20} />, label: 'Feedback' },
    { to: '/profile',   icon: <User size={20} />,            label: 'Profile' },
    ...(isAdmin ? [{ to: '/admin', icon: <Shield size={20} />, label: 'Admin' }] : []),
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {links.map(l => (
        <NavLink
          key={l.to}
          to={l.to}
          className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
        >
          {l.icon}
          <span className="bottom-nav__label">{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
