import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Code, Calendar, User, Shield, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const links = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
    { to: '/coding',    icon: <Code size={20} />,            label: 'Coding' },
    { to: '/exams',     icon: <Calendar size={20} />,        label: 'Exams' },
    { to: '/syllabus',  icon: <BookOpen size={20} />,        label: 'Syllabus' },
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
