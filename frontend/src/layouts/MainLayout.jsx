import OnboardingTour from '../components/OnboardingTour';
import RecentlyViewed from '../components/RecentlyViewed';
import BottomNav from '../components/BottomNav';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import '../effects.css';
import { initEffects, initTilt, initMagnetic, initCounters, initKinetic } from '../hooks/useEffects';
import Navbar from '../components/Navbar';
import { fetchAnnouncements } from '../api/apiClient';
import { X, Megaphone } from 'lucide-react';

const TYPE_STYLES = {
  info:    { bg: '#3b82f618', border: '#3b82f640', color: '#60a5fa' },
  warning: { bg: '#f59e0b18', border: '#f59e0b40', color: '#fbbf24' },
  success: { bg: '#22c55e18', border: '#22c55e40', color: '#4ade80' },
  danger:  { bg: '#ef444418', border: '#ef444440', color: '#f87171' },
};

export default function MainLayout() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ev-theme');
    if (saved) return saved;
    // Detect system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [announcements, setAnnouncements] = useState([]);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem('ev-tour-done'));
  const [dismissed, setDismissed] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ev-theme', theme);
  }, [theme]);

  // ── Init all next-level effects ──────────────────────────
  useEffect(() => {
    const cleanCursor   = initEffects();
    const cleanTilt     = initTilt();
    const cleanMagnetic = initMagnetic();
    const cleanCounters = initCounters();

    // Kinetic runs after a short delay so DOM is ready
    const kTimer = setTimeout(initKinetic, 300);

    // Re-run kinetic on route changes (debounced)
    let kDebounce = null;
    const routeObs = new MutationObserver(() => {
      clearTimeout(kDebounce);
      kDebounce = setTimeout(initKinetic, 150);
    });
    routeObs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });

    return () => {
      cleanCursor();
      cleanTilt();
      cleanMagnetic();
      cleanCounters();
      clearTimeout(kTimer);
      routeObs.disconnect();
    };
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Listen for system theme changes (only if user hasn't manually set a preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('ev-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
  };

  // Load announcements
  useEffect(() => {
    fetchAnnouncements()
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a._id));

  return (
    <div className="layout">
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      {/* Announcement banners */}
      {showTour && <OnboardingTour onDone={() => { setShowTour(false); localStorage.setItem('ev-tour-done','1'); }} />}
      {visible.map(ann => {
        const s = TYPE_STYLES[ann.type] || TYPE_STYLES.info;
        return (
          <div
            key={ann._id}
            className="announcement-banner"
            style={{ background: s.bg, borderColor: s.border, color: s.color }}
          >
            <Megaphone size={15} />
            <strong>{ann.title}:</strong>
            <span>{ann.message}</span>
            <button
              className="announcement-banner__close"
              onClick={() => setDismissed(d => [...d, ann._id])}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      {showInstall && (
        <div className="pwa-banner">
          <span>📲 Install ExamVault as an app!</span>
          <button className="pwa-banner__install" onClick={handleInstall}>Install</button>
          <button className="pwa-banner__dismiss" onClick={() => setShowInstall(false)}>✕</button>
        </div>
      )}
      <BottomNav />
      <main className="layout__main" style={{paddingBottom: '5rem'}}>
        <Outlet />
      </main>
    </div>
  );
}
