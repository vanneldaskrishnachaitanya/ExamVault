// src/layouts/MainLayout.jsx
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

/**
 * MainLayout
 * ──────────
 * Shell shared by all authenticated pages.
 * Renders <Navbar> at the top and the active page via <Outlet>.
 */
export default function MainLayout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  );
}
