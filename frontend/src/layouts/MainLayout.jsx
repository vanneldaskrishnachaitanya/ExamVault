import OnboardingTour from '../components/OnboardingTour';
import RecentlyViewed from '../components/RecentlyViewed';
import BottomNav from '../components/BottomNav';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommandPalette from '../components/CommandPalette';
import { fetchAnnouncements, fetchSavedItems } from '../api/apiClient';
import { X, Megaphone } from 'lucide-react';
import '../effects.css';
import { initEffects, initTilt, initMagnetic, initCounters, initKinetic, initStarfield } from '../hooks/useEffects';

const TYPE_STYLES = {
  info:    { bg: '#3b82f618', border: '#3b82f640', color: '#60a5fa' },
  warning: { bg: '#f59e0b18', border: '#f59e0b40', color: '#fbbf24' },
  success: { bg: '#22c55e18', border: '#22c55e40', color: '#4ade80' },
  danger:  { bg: '#ef444418', border: '#ef444440', color: '#f87171' },
};

export default function MainLayout() {
  const location = useLocation();
  const themeOptions = ['dark', 'light', 'aurora', 'forest', 'sunset'];
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ev-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [announcements, setAnnouncements] = useState([]);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem('ev-tour-done'));
  const [dismissed, setDismissed] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  // ── Init all effects once ──────────────────────────────────
  useEffect(() => {
    const cleanCursor   = initEffects();
    const cleanTilt     = initTilt();
    const cleanMagnetic = initMagnetic();
    const cleanCounters = initCounters();
    const cleanStars    = initStarfield();
    return () => { cleanCursor(); cleanTilt(); cleanMagnetic(); cleanCounters(); cleanStars(); };
  }, []);

  // ── Re-run kinetic on every route change ──────────────────
  useEffect(() => {
    const timer = setTimeout(initKinetic, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Always start new route at top (prevents opening pages at mid-scroll)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ev-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => themeOptions[(themeOptions.indexOf(t) + 1) % themeOptions.length] || 'dark');

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
    const onKeyDown = (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
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

  // Keep saved items persistent per user by hydrating local cache from backend.
  useEffect(() => {
    fetchSavedItems()
      .then(d => {
        const normalized = (d.savedItems || []).map(item => ({
          type: item.type,
          id: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          href: item.href,
          meta: item.meta || {},
          savedAt: item.createdAt,
        }));
        localStorage.setItem('ev-saved-items-v1', JSON.stringify(normalized));
        window.dispatchEvent(new Event('ev:saved-changed'));
      })
      .catch(() => {});
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a._id));

  return (
    <div className="layout">
      <div className="cosmos-scene" aria-hidden="true">
        <div className="cosmos-nebula cosmos-nebula--one" />
        <div className="cosmos-nebula cosmos-nebula--two" />
        <div className="cosmos-galaxy" />
        <div className="cosmos-supernova" />

        <div className="cosmos-planet cosmos-planet--main" />
        <div className="cosmos-planet cosmos-planet--minor" />

        <div className="cosmos-satellite">
          <span className="cosmos-satellite__core" />
          <span className="cosmos-satellite__wing cosmos-satellite__wing--left" />
          <span className="cosmos-satellite__wing cosmos-satellite__wing--right" />
          <span className="cosmos-satellite__dish" />
        </div>

        <div className="cosmos-asteroids">
          <span className="cosmos-asteroid" />
          <span className="cosmos-asteroid" />
          <span className="cosmos-asteroid" />
          <span className="cosmos-asteroid" />
          <span className="cosmos-asteroid" />
        </div>
      </div>

      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        setTheme={setTheme}
        themeOptions={themeOptions}
      />

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

      <section className="space-end" aria-label="Space horizon footer">
        <div className="space-end__brand">ExamVault</div>
        <div className="space-end__horizon" />
        <div className="space-end__flare" />
        <p className="space-end__copy">VNRVJIET Academic Repository</p>
      </section>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
