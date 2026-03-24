import RecentlyViewed from '../components/RecentlyViewed';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { fetchPublicStats } from '../api/apiClient';
import { ArrowRight, BookOpen, GraduationCap, Layers, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = [
  {
    id:     'R25',
    year:   '2025',
    heading:'Regulation 25',
    desc:   'Current regulation for 2025, 2026 & 2027 admitted batches',
    accent: 'reg--purple',
    note:   'Archive',
    emoji:  '📘',
  },
  {
    id:     'R22',
    year:   '2022',
    heading:'Regulation 22',
    desc:   'Regulation for 2022, 2023 & 2024 admitted batches',
    accent: 'reg--blue',
    note:   'Active',
    emoji:  '📗',
  },
  {
    id:     'R19',
    year:   '2019',
    heading:'Regulation 19',
    desc:   'Regulation for 2019–2021 admitted batches',
    accent: 'reg--teal',
    note:   'Legacy',
    emoji:  '📙',
  },
];

// Simple online user tracker using localStorage heartbeat
function useOnlineCount() {
  const [count, setCount] = useState(1);
  const keyRef = useRef(`ev_user_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const key = keyRef.current;
    const heartbeat = () => {
      localStorage.setItem(key, Date.now().toString());
    };
    heartbeat();
    const interval = setInterval(() => {
      heartbeat();
      // Count active users (heartbeat within last 2 minutes)
      const now = Date.now();
      let active = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ev_user_')) {
          const ts = parseInt(localStorage.getItem(k) || '0', 10);
          if (now - ts < 120000) active++;
        }
      }
      setCount(Math.max(1, active));
    }, 15000);

    return () => {
      clearInterval(interval);
      localStorage.removeItem(key);
    };
  }, []);

  return count;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const firstName = backendUser?.name?.split(' ')[0] || 'there';
  const [stats, setStats] = useState(null);
  const onlineCount = useOnlineCount();

  useEffect(() => {
    fetchPublicStats().then(d => setStats(d)).catch(() => {});
  }, []);

  return (
    <div className="dashboard">

      {/* ── Hero banner ──────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero__glow" aria-hidden="true" />
        <div className="dash-hero__glow dash-hero__glow--2" aria-hidden="true" />

        <div className="dash-hero__content">
          <GraduationCap size={36} className="dash-hero__icon" />
          <h1 className="dash-hero__title">
            Hello, <span className="dash-hero__name">{firstName}</span>{' '}
            <span className="dash-hero__wave">👋</span>
          </h1>
          <p className="dash-hero__sub">
            Access previous exam papers and subject resources.
            Select your regulation to get started.
          </p>

          {/* Online users — visible to admin only */}
          {isAdmin && (
            <div className="dash-hero__online">
              <span className="online-badge">
                <span className="online-badge__dot" />
                {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online now
              </span>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="dash-hero__stat-row">
          <div className="dash-hero__stat">
            <BookOpen size={15} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>
                {stats ? stats.approvedFiles ?? 0 : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Papers</div>
            </div>
          </div>
          <div className="dash-hero__stat">
            <Layers size={15} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>
                {stats ? stats.totalFolders ?? 0 : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Subjects</div>
            </div>
          </div>
          <div className="dash-hero__stat">
            <GraduationCap size={15} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>
                {stats ? stats.totalUsers ?? 0 : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Students</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Regulation picker ─────────────────────────────── */}
      <section className="dash-section">
        <h2 className="dash-section-title">Choose your Regulation</h2>

        <div className="reg-grid">
          {REGULATIONS.map((reg) => (
            <button
              key={reg.id}
              className={`reg-card ${reg.accent}`}
              onClick={() => navigate(`/r/${reg.id}`)}
            >
              <span className="reg-card__note">{reg.note}</span>
              <span className="reg-card__watermark" aria-hidden="true">{reg.year}</span>
              <div className="reg-card__body">
                <span className="reg-card__emoji" aria-hidden="true">{reg.emoji}</span>
                <div className="reg-card__id">{reg.id}</div>
                <h3 className="reg-card__heading">{reg.heading}</h3>
                <p className="reg-card__desc">{reg.desc}</p>
              </div>
              <span className="reg-card__cta">
                Browse <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <RecentlyViewed />
    </div>
  );
}
