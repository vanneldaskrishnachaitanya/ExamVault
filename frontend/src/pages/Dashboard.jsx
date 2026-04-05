import QuoteBanner from '../components/QuoteBanner';
import DashboardHub from '../components/DashboardHub';
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

// Simple online user tracker using localStorage heartbeat with role & name
function useOnlineCount(name, role, userId) {
  const [onlineData, setOnlineData] = useState({ count: 1, users: [] });
  const keyRef = useRef(`ev_user_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const key = keyRef.current;
    const heartbeat = () => {
      const payload = JSON.stringify({ 
        ts: Date.now(), 
        name: name || 'Guest',
        role: role || 'student',
        userId: userId || 'anonymous'
      });
      localStorage.setItem(key, payload);
    };
    heartbeat();

    const refresh = () => {
      heartbeat();
      const now = Date.now();
      const active = [];

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ev_user_')) {
          try {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const item = JSON.parse(raw);
            if (item && item.ts && now - item.ts < 120000) {
              active.push({ 
                key: k, 
                name: item.name || 'Anonymous',
                role: item.role || 'student',
                userId: item.userId
              });
            }
          } catch {
            const ts = parseInt(localStorage.getItem(k) || '0', 10);
            if (now - ts < 120000) active.push({ key: k, name: 'Anonymous', role: 'student' });
          }
        }
      }

      const uniqueUsers = Array.from(new Map(active.map(u => [u.userId || u.key, u])).values());
      setOnlineData({ count: Math.max(1, uniqueUsers.length), users: uniqueUsers });
    };

    refresh();
    const interval = setInterval(refresh, 15000);

    return () => {
      clearInterval(interval);
      localStorage.removeItem(key);
      refresh();
    };
  }, [name, role, userId]);

  return onlineData;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const firstName = backendUser?.name?.split(' ')[0] || 'there';
  const [stats, setStats] = useState(null);
  const [showOnlineDetails, setShowOnlineDetails] = useState(false);
  const { count: onlineCount, users: onlineUsers } = useOnlineCount(firstName, backendUser?.role, backendUser?._id);
  const eyesRef = useRef(null);

  useEffect(() => {
    fetchPublicStats().then(d => setStats(d)).catch(() => {});
  }, []);

  const handleRegTiltMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (y - 0.5) * -20;
    const rotateY = (x - 0.5) * 20;

    card.style.setProperty('--rx', `${rotateX}deg`);
    card.style.setProperty('--ry', `${rotateY}deg`);
    card.style.setProperty('--mx', `${x * 100}%`);
    card.style.setProperty('--my', `${y * 100}%`);
  };

  const handleRegTiltLeave = (e) => {
    const card = e.currentTarget;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  useEffect(() => {
    const el = eyesRef.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 0.5)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 0.5)));
      el.style.setProperty('--look-x', nx.toFixed(3));
      el.style.setProperty('--look-y', ny.toFixed(3));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="dashboard">

      {/* ── Daily Quote Banner ───────────────────────────── */}
      <QuoteBanner />

      {/* ── Hero banner ──────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero__glow" aria-hidden="true" />
        <div className="dash-hero__glow dash-hero__glow--2" aria-hidden="true" />

        {/* Fun mascot eyes in the right-side empty space */}
        <div className="dash-eyes" ref={eyesRef} aria-hidden="true">
          <svg viewBox="0 0 220 120" className="dash-eyes__svg">
            <defs>
              <linearGradient id="eyeSkin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(245,166,35,0.24)" />
                <stop offset="100%" stopColor="rgba(79,142,247,0.18)" />
              </linearGradient>
            </defs>

            <ellipse cx="74" cy="58" rx="50" ry="34" fill="url(#eyeSkin)" stroke="rgba(245,166,35,0.35)" strokeWidth="1.5" />
            <ellipse cx="146" cy="58" rx="50" ry="34" fill="url(#eyeSkin)" stroke="rgba(79,142,247,0.35)" strokeWidth="1.5" />

            <ellipse cx="74" cy="58" rx="30" ry="23" fill="#f9fafb" />
            <ellipse cx="146" cy="58" rx="30" ry="23" fill="#f9fafb" />

            <circle className="dash-eyes__pupil dash-eyes__pupil--left" cx="74" cy="58" r="8.5" fill="#111827" />
            <circle className="dash-eyes__pupil dash-eyes__pupil--right" cx="146" cy="58" r="8.5" fill="#111827" />

            <circle className="dash-eyes__glint dash-eyes__glint--left" cx="71" cy="55" r="2.6" fill="#ffffff" />
            <circle className="dash-eyes__glint dash-eyes__glint--right" cx="143" cy="55" r="2.6" fill="#ffffff" />

            <path d="M20 34 Q74 8 128 34" fill="none" stroke="rgba(245,166,35,0.28)" strokeWidth="2" strokeLinecap="round" />
            <path d="M92 34 Q146 8 200 34" fill="none" stroke="rgba(79,142,247,0.28)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* SVG: twinkling constellation */}
        <svg aria-hidden="true" style={{position:'absolute',top:10,right:14,width:130,height:100,pointerEvents:'none',opacity:0.22}} viewBox="0 0 130 100">
          <circle cx="22"  cy="16" r="1.5" fill="var(--amber)"><animate attributeName="opacity" values="0.2;1;0.2" dur="2.4s" repeatCount="indefinite"/></circle>
          <circle cx="65"  cy="8"  r="1"   fill="var(--blue)"><animate attributeName="opacity" values="0.15;1;0.15" dur="3.1s" begin="0.5s" repeatCount="indefinite"/></circle>
          <circle cx="108" cy="26" r="2"   fill="var(--amber)"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" begin="1s" repeatCount="indefinite"/></circle>
          <circle cx="44"  cy="52" r="1.2" fill="var(--teal)"><animate attributeName="opacity" values="0.2;0.85;0.2" dur="4.2s" begin="0.3s" repeatCount="indefinite"/></circle>
          <circle cx="95"  cy="62" r="1.5" fill="var(--purple)"><animate attributeName="opacity" values="0.25;1;0.25" dur="2s" begin="1.5s" repeatCount="indefinite"/></circle>
          <circle cx="16"  cy="72" r="1"   fill="var(--blue)"><animate attributeName="opacity" values="0.15;0.9;0.15" dur="3.6s" begin="0.8s" repeatCount="indefinite"/></circle>
          <line x1="22" y1="16" x2="65"  y2="8"  stroke="var(--amber)"  strokeWidth="0.4" opacity="0.22"/>
          <line x1="65" y1="8"  x2="108" y2="26" stroke="var(--blue)"   strokeWidth="0.4" opacity="0.22"/>
          <line x1="44" y1="52" x2="95"  y2="62" stroke="var(--teal)"   strokeWidth="0.4" opacity="0.18"/>
          <line x1="16" y1="72" x2="44"  y2="52" stroke="var(--purple)" strokeWidth="0.4" opacity="0.18"/>
        </svg>

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
            <div
              className="dash-hero__online"
              onClick={() => setShowOnlineDetails(true)}
              style={{ cursor: 'pointer' }}
              title="Click to view active admins/students"
            >
              <span className="online-badge">
                <span className="online-badge__dot" />
                {onlineCount} {onlineCount === 1 ? 'user' : 'users'} online now
              </span>
            </div>
          )}
          {showOnlineDetails && (
            <div className="online-modal-overlay" onClick={() => setShowOnlineDetails(false)}>
              <div className="online-modal" onClick={(e) => e.stopPropagation()}>
                <div className="online-modal__header">
                  <h3>👥 Active users ({onlineCount})</h3>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowOnlineDetails(false)}>✕</button>
                </div>
                <div className="online-modal__list">
                  {onlineUsers.length === 0 && <p className="online-modal__empty">No active users right now.</p>}
                  {onlineUsers.map((u, idx) => (
                    <div key={u.key || idx} className="online-user-item">
                      <div className="online-user-item__avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <div className="online-user-item__info">
                        <div className="online-user-item__name">{u.name || 'Anonymous'}</div>
                        <div className="online-user-item__role">{u.role === 'admin' ? '🔑 Admin' : '👤 Student'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

      <DashboardHub />

      {/* ── Regulation picker ─────────────────────────────── */}
      <section className="dash-section">
        <h2 className="dash-section-title">Choose your Regulation</h2>

        <div className="reg-grid">
          {REGULATIONS.map((reg) => (
            <button
              key={reg.id}
              className={`reg-card ${reg.accent}`}
              onClick={() => navigate(`/r/${reg.id}`)}
              onPointerMove={handleRegTiltMove}
              onPointerLeave={handleRegTiltLeave}
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

    </div>
  );
}
