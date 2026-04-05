import OnboardingTour from '../components/OnboardingTour';
import RecentlyViewed from '../components/RecentlyViewed';
import BottomNav from '../components/BottomNav';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CommandPalette from '../components/CommandPalette';
import { fetchAnnouncements, fetchSavedItems } from '../api/apiClient';
import { X, Megaphone } from 'lucide-react';
import '../effects.css';
import { initEffects, initTilt, initMagnetic, initCounters, initKinetic } from '../hooks/useEffects';

const TYPE_STYLES = {
  info:    { bg: '#3b82f618', border: '#3b82f640', color: '#60a5fa' },
  warning: { bg: '#f59e0b18', border: '#f59e0b40', color: '#fbbf24' },
  success: { bg: '#22c55e18', border: '#22c55e40', color: '#4ade80' },
  danger:  { bg: '#ef444418', border: '#ef444440', color: '#f87171' },
};

export default function MainLayout() {
  const location = useLocation();
  const layoutRef = useRef(null);
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
    return () => { cleanCursor(); cleanTilt(); cleanMagnetic(); cleanCounters(); };
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
    const root = layoutRef.current;
    if (!root) return undefined;

    let rafId = null;
    const updateScrollVars = () => {
      rafId = null;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, scrollY / maxScroll);
      root.style.setProperty('--scroll-y', `${scrollY.toFixed(1)}px`);
      root.style.setProperty('--scroll-p', progress.toFixed(4));
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(updateScrollVars);
    };

    updateScrollVars();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const root = layoutRef.current;
    if (!root) return undefined;
    const main = root.querySelector('.layout__main');
    if (!main) return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -8% 0px',
    });

    const selectors = [
      '.layout__main > *',
      '.layout__main section',
      '.layout__main .reg-card',
      '.layout__main .file-card',
      '.layout__main .event-card',
      '.layout__main .dash-widget',
      '.layout__main .home-role-card',
      '.layout__main .smart-reminder',
      '.layout__main .digest-card',
      '.layout__main .analytics-card',
      '.layout__main .subject-item',
      '.layout__main .subject-folder',
      '.layout__main .history-item',
      '.layout__main .search-hit-card',
      '.layout__main .hub-saved-card',
      '.layout__main .hub-feed-item',
      '.layout__main .hub-reminder-item',
      '.layout__main .exam-item',
    ].join(', ');

    const bindReveal = () => {
      main.querySelectorAll(selectors).forEach((el) => {
        if (el.classList.contains('reveal-blur')) return;
        el.classList.add('reveal-blur');
        observer.observe(el);
      });
    };

    bindReveal();
    const mutObserver = new MutationObserver(bindReveal);
    mutObserver.observe(main, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutObserver.disconnect();
    };
  }, [location.pathname]);

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
    <div className="layout" ref={layoutRef}>

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

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
