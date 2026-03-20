import RecentlyViewed from '../components/RecentlyViewed';
// src/pages/Dashboard.jsx
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../api/apiClient';
import { ArrowRight, BookOpen, GraduationCap, Layers } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = [
  {
    id:       'R25',
    year:     '2025',
    heading:  'Regulation 25',
    desc:     'Current regulation for 2025, 2026 & 2027 admitted batches',
    accent:   'reg--purple',
    note:     'Archive',
  },
  {
    id:       'R22',
    year:     '2022',
    heading:  'Regulation 22',
    desc:     'regulation for 2022, 2023 & 2024 admitted batches',
    accent:   'reg--blue',
    note:     'Active',
  },
  {
    id:       'R19',
    year:     '2019',
    heading:  'Regulation 19',
    desc:     'Regulation for 2019–2021 admitted batches',
    accent:   'reg--teal',
    note:     'Legacy',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { backendUser } = useAuth();
  const firstName = backendUser?.name?.split(' ')[0] || 'there';
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchAnalytics().then(d => setStats(d)).catch(() => {});
  }, []);

  return (
    <div className="dashboard">

      {/* ── Hero banner ──────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero__glow" aria-hidden="true" />
        <div className="dash-hero__content">
          <GraduationCap size={36} className="dash-hero__icon" />
          <h1 className="dash-hero__title">
            Hello, {firstName} <span className="dash-hero__wave">👋</span>
          </h1>
          <p className="dash-hero__sub">
            Access previous exam papers and subject resources.
            Select your regulation to get started.
          </p>
        </div>
        <div className="dash-hero__stat-row">
          <div className="dash-hero__stat">
            <Layers size={16} />
            3 Regulations
          </div>
          <div className="dash-hero__stat">
            <BookOpen size={16} />
            6 Branches
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
              {/* Note badge */}
              <span className="reg-card__note">{reg.note}</span>

              {/* Year watermark */}
              <span className="reg-card__watermark" aria-hidden="true">
                {reg.year}
              </span>

              <div className="reg-card__body">
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
