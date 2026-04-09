import DashboardHub from '../components/DashboardHub';
import PomodoroTimer from '../components/PomodoroTimer';
import QuoteBanner from '../components/QuoteBanner';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchAnnouncements,
  fetchExams,
  fetchFiles,
  fetchPublicStats,
  fetchTimetable,
  updateMyPreferences,
} from '../api/apiClient';
import {
  ArrowRight, BellRing, BookOpen, CalendarDays, Clock3, EyeOff,
  FileUp, GraduationCap, GripVertical, Layers, Search, ShieldCheck,
  Sparkles, Users,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = [
  { id: 'R25', year: '2025', heading: 'Regulation 25', desc: 'Current regulation for 2025, 2026 & 2027 admitted batches', accent: 'reg--purple', note: 'Archive', emoji: '📘' },
  { id: 'R22', year: '2022', heading: 'Regulation 22', desc: 'Regulation for 2022, 2023 & 2024 admitted batches', accent: 'reg--blue', note: 'Active', emoji: '📗' },
  { id: 'R19', year: '2019', heading: 'Regulation 19', desc: 'Regulation for 2019–2021 admitted batches', accent: 'reg--teal', note: 'Legacy', emoji: '📙' },
];
const BRANCHES = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML'];
const YEARS = ['1', '2', '3', '4'];
const DEFAULT_WIDGET_ORDER = ['timetable', 'exam', 'uploads', 'announcements', 'pomodoro'];
const VALID_WIDGET_SET = new Set(DEFAULT_WIDGET_ORDER);

const normalizeWidgetOrder = (incoming = []) => {
  const merged = [...(Array.isArray(incoming) ? incoming : []), ...DEFAULT_WIDGET_ORDER];
  const normalized = [];
  merged.forEach((id) => {
    if (VALID_WIDGET_SET.has(id) && !normalized.includes(id)) normalized.push(id);
  });
  return normalized;
};

const normalizeHiddenWidgets = (incoming = []) => (
  Array.isArray(incoming) ? incoming.filter((id) => VALID_WIDGET_SET.has(id)) : []
);

const ROLE_HOME_CONFIG = {
  student: {
    label: 'Student home',
    cards: [
      { title: 'Find Papers Fast', description: 'Jump to global search and filter by branch, subject, and exam type.', to: '/search', icon: Search },
      { title: 'Today Timetable', description: 'Open your timetable and quickly check current mid/semester schedule.', to: '/timetable', icon: Clock3 },
      { title: 'Practice Zone', description: 'Continue coding practice with curated platforms and challenges.', to: '/coding', icon: Sparkles },
    ],
  },
  admin: {
    label: 'Admin control',
    cards: [
      { title: 'Review Content', description: 'Open admin panel to approve uploads and keep repository quality high.', to: '/admin', icon: ShieldCheck },
      { title: 'Monitor Analytics', description: 'Track file usage, user growth, and engagement trends at a glance.', to: '/admin/analytics', icon: Layers },
      { title: 'Manage Users', description: 'Control access and account status for active campus users.', to: '/admin/users', icon: Users },
    ],
  },
};

function getRoleHome(role) {
  if (role === 'admin') return ROLE_HOME_CONFIG.admin;
  return ROLE_HOME_CONFIG.student;
}

function safeISO(input) {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSnoozeTimestamp(mode) {
  const now = new Date();
  if (mode === '1h') return now.getTime() + 60 * 60 * 1000;
  if (mode === 'tonight') {
    const tonight = new Date(now);
    tonight.setHours(21, 0, 0, 0);
    if (tonight.getTime() <= now.getTime()) tonight.setDate(tonight.getDate() + 1);
    return tonight.getTime();
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.getTime();
}


const DEFAULT_SECTION_ORDER = ['regulation', 'personalized', 'recent', 'widgets', 'hub'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [sectionOrder, setSectionOrder] = useState(() => {
    return JSON.parse(localStorage.getItem('ev-section-order') || JSON.stringify(DEFAULT_SECTION_ORDER));
  });
  const dragSectionRef = useRef(null);

  const handleSectionDrop = (targetId) => {
    const sourceId = dragSectionRef.current;
    if (!sourceId || sourceId === targetId) return;
    setSectionOrder(prev => {
      const copy = [...prev];
      const sourceIdx = copy.indexOf(sourceId);
      const targetIdx = copy.indexOf(targetId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        copy.splice(sourceIdx, 1);
        copy.splice(targetIdx, 0, sourceId);
        localStorage.setItem('ev-section-order', JSON.stringify(copy));
      }
      return copy;
    });
    dragSectionRef.current = null;
  };
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const firstName = backendUser?.name?.split(' ')[0] || 'there';
  const roleHome = getRoleHome(backendUser?.role);
  const eyesRef = useRef(null);
  const dragWidgetRef = useRef(null);

  const storedPref = backendUser?.preferences?.dashboard || {};
  const [branchContext, setBranchContext] = useState(() => ({
    regulation: storedPref.defaultContext?.regulation || 'R22',
    branch: storedPref.defaultContext?.branch || 'CSE',
    year: storedPref.defaultContext?.year || '1',
  }));
  const [widgetOrder, setWidgetOrder] = useState(() => {
    return normalizeWidgetOrder(storedPref.widgetOrder);
  });
  const [hiddenWidgets, setHiddenWidgets] = useState(() => normalizeHiddenWidgets(storedPref.hiddenWidgets));

  const [reminderSnoozes, setReminderSnoozes] = useState(storedPref.reminderSnoozes || {});
  const [lastSeenAt, setLastSeenAt] = useState(storedPref.lastSeenAt || backendUser?.lastSeenAt || null);

  const [stats, setStats] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetData, setWidgetData] = useState({ timetable: null, exam: null, recentUploads: [], announcement: null });
  const [smartReminders, setSmartReminders] = useState([]);
  const [sinceLastSeen, setSinceLastSeen] = useState({ files: 0, exams: 0, announcements: 0 });
  const [showOnlineDetails, setShowOnlineDetails] = useState(false);
  const [onlineData, setOnlineData] = useState({ count: 1, users: [] });
  const canUsePortal = typeof document !== 'undefined' && !!document.body;

  useEffect(() => {
    fetchPublicStats().then(d => setStats(d)).catch(() => {});
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        await updateMyPreferences({
          defaultContext: branchContext,
          widgetOrder,
          hiddenWidgets,
          reminderSnoozes,
          lastSeenAt,
        });
      } catch {}
    };
    const timer = setTimeout(save, 450);
    return () => clearTimeout(timer);
  }, [branchContext, widgetOrder, hiddenWidgets, reminderSnoozes, lastSeenAt]);

  useEffect(() => {
    setWidgetOrder((prev) => normalizeWidgetOrder(prev));
    setHiddenWidgets((prev) => normalizeHiddenWidgets(prev));
  }, []);

  useEffect(() => {
    const loadWidgets = async () => {
      setWidgetLoading(true);
      try {
        const [tt, ex, files, ann] = await Promise.all([
          fetchTimetable({ regulation: branchContext.regulation, branch: branchContext.branch, year: branchContext.year, limit: 10 }).catch(() => ({ timetables: [] })),
          fetchExams().catch(() => ({ exams: [] })),
          fetchFiles({ regulation: branchContext.regulation, branch: branchContext.branch, limit: 12, sortBy: 'uploadedAt', sortOrder: 'desc' }).catch(() => ({ files: [] })),
          fetchAnnouncements().catch(() => ({ announcements: [] })),
        ]);

        const now = Date.now();
        const baseline = safeISO(lastSeenAt)?.getTime() || (now - (7 * 86400000));
        const timetables = (tt.timetables || []).slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        const exams = (ex.exams || []).filter(item => (
          (!item.regulation || String(item.regulation).toUpperCase() === branchContext.regulation)
          && (!item.branch || String(item.branch).toUpperCase() === branchContext.branch)
        ));
        exams.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const uploads = (files.files || []).slice().sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0));
        const announcements = ann.announcements || [];

        const nextExam = exams.find(item => new Date(item.date).getTime() >= now) || null;
        const latestTimetable = timetables[0] || null;
        const latestAnnouncement = announcements[0] || null;

        setWidgetData({
          timetable: latestTimetable,
          exam: nextExam,
          recentUploads: uploads.slice(0, 3),
          announcement: latestAnnouncement,
        });

        setSinceLastSeen({
          files: uploads.filter(f => new Date(f.uploadedAt || f.createdAt || 0).getTime() > baseline).length,
          exams: exams.filter(e => new Date(e.createdAt || e.updatedAt || 0).getTime() > baseline).length,
          announcements: announcements.filter(a => new Date(a.createdAt || 0).getTime() > baseline).length,
        });

        const reminderItems = [];
        if (nextExam) {
          const daysLeft = Math.ceil((new Date(nextExam.date).getTime() - now) / 86400000);
          if (daysLeft >= 0 && daysLeft <= 7) {
            reminderItems.push({ id: `exam:${nextExam._id}`, title: 'Exam reminder', message: `${nextExam.title} ${daysLeft <= 1 ? 'is very close' : `in ${daysLeft} days`}`, to: '/exams', tone: 'danger' });
          }
        }
        if (latestAnnouncement && /deadline|last date|submit|important/i.test(`${latestAnnouncement.title} ${latestAnnouncement.message}`)) {
          reminderItems.push({ id: `announcement:${latestAnnouncement._id}`, title: 'Deadline alert', message: latestAnnouncement.title, to: '/dashboard', tone: 'warning' });
        }
        if (latestTimetable) {
          const ageHours = Math.round((now - new Date(latestTimetable.updatedAt || latestTimetable.createdAt || 0).getTime()) / 3600000);
          if (ageHours >= 0 && ageHours <= 72) {
            reminderItems.push({ id: `timetable:${latestTimetable._id}`, title: 'Timetable updated', message: `${latestTimetable.title} was updated recently`, to: '/timetable', tone: 'info' });
          }
        }
        setSmartReminders(reminderItems);
        setLastSeenAt(new Date().toISOString());
      } finally {
        setWidgetLoading(false);
      }
    };
    loadWidgets();
  }, [branchContext.regulation, branchContext.branch, branchContext.year]);

  useEffect(() => {
    const key = `ev_user_${Math.random().toString(36).slice(2)}`;
    const heartbeat = () => localStorage.setItem(key, JSON.stringify({ ts: Date.now(), name: firstName, role: backendUser?.role || 'student', userId: backendUser?._id || 'anon' }));
    const refresh = () => {
      heartbeat();
      const now = Date.now();
      const active = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ev_user_')) {
          try {
            const v = JSON.parse(localStorage.getItem(k) || '{}');
            if (v.ts && now - v.ts < 120000) active.push({ key: k, ...v });
          } catch {}
        }
      }
      const users = Array.from(new Map(active.map(u => [u.userId || u.key, u])).values());
      setOnlineData({ count: Math.max(1, users.length), users });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      clearInterval(timer);
      localStorage.removeItem(key);
    };
  }, [backendUser?._id, backendUser?.role, firstName]);

  useEffect(() => {
    const el = eyesRef.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width * 0.5)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (rect.height * 0.5)));
      el.style.setProperty('--look-x', nx.toFixed(3));
      el.style.setProperty('--look-y', ny.toFixed(3));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    if (!showOnlineDetails) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showOnlineDetails]);

  const visibleReminders = useMemo(() => {
    const now = Date.now();
    return smartReminders.filter(r => !reminderSnoozes[r.id] || Number(reminderSnoozes[r.id]) <= now);
  }, [smartReminders, reminderSnoozes]);


  const widgetMap = {
    timetable: (
      <button key="timetable" className="dash-widget" draggable onDragStart={() => { dragWidgetRef.current = 'timetable'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleWidgetDrop('timetable')} onClick={() => navigate('/timetable')}>
        <div className="dash-widget__head"><GripVertical size={13} /><Clock3 size={15} /> Today's timetable</div>
        <p className="dash-widget__title">{widgetData.timetable?.title || 'Open timetable for your latest schedule'}</p>
        <p className="dash-widget__meta">{widgetData.timetable ? `${widgetData.timetable.regulation} · ${widgetData.timetable.branch} · Year ${widgetData.timetable.year}` : 'Check class tests and semester timings'}</p>
      </button>
    ),
    exam: (
      <button key="exam" className="dash-widget" draggable onDragStart={() => { dragWidgetRef.current = 'exam'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleWidgetDrop('exam')} onClick={() => navigate('/exams')}>
        <div className="dash-widget__head"><GripVertical size={13} /><CalendarDays size={15} /> Upcoming exam</div>
        <p className="dash-widget__title">{widgetData.exam?.title || 'No upcoming exam found'}</p>
        <p className="dash-widget__meta">{widgetData.exam ? `${new Date(widgetData.exam.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · ${widgetData.exam.regulation} · ${widgetData.exam.branch}` : 'You are clear for now'}</p>
      </button>
    ),
    uploads: (
      <button key="uploads" className="dash-widget" draggable onDragStart={() => { dragWidgetRef.current = 'uploads'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleWidgetDrop('uploads')} onClick={() => navigate('/search')}>
        <div className="dash-widget__head"><GripVertical size={13} /><FileUp size={15} /> Recent uploads</div>
        <p className="dash-widget__title">{widgetData.recentUploads[0]?.originalName || 'No recent uploads yet'}</p>
        <p className="dash-widget__meta">{widgetData.recentUploads.length > 0 ? `${widgetData.recentUploads.length} recent file${widgetData.recentUploads.length > 1 ? 's' : ''} available` : 'New uploads will appear here'}</p>
      </button>
    ),
    announcements: (
      <button key="announcements" className="dash-widget" draggable onDragStart={() => { dragWidgetRef.current = 'announcements'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleWidgetDrop('announcements')} onClick={() => navigate('/dashboard')}>
        <div className="dash-widget__head"><GripVertical size={13} /><BellRing size={15} /> Announcements</div>
        <p className="dash-widget__title">{widgetData.announcement?.title || 'No active announcement'}</p>
        <p className="dash-widget__meta">{widgetData.announcement?.message || 'Important notices will appear here'}</p>
      </button>
    ),
    pomodoro: (
      <PomodoroTimer key="pomodoro" />
    ),
  };

  function handleWidgetDrop(targetId) {
    const fromId = dragWidgetRef.current;
    dragWidgetRef.current = null;
    if (!fromId || fromId === targetId) return;
    setWidgetOrder(prev => {
      const copy = prev.slice();
      const fromIdx = copy.indexOf(fromId);
      const toIdx = copy.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, fromId);
      return copy;
    });
  }

  const orderedVisibleWidgets = widgetOrder.filter(id => !hiddenWidgets.includes(id));

  return (
    <div className="dashboard">
      <QuoteBanner />

      <section className="dash-hero">
        <div className="dash-hero__glow" aria-hidden="true" />
        <div className="dash-hero__glow dash-hero__glow--2" aria-hidden="true" />

        <div className="dash-hero__content">
          <GraduationCap size={36} className="dash-hero__icon" />
          <h1 className="dash-hero__title">Hello, <span className="dash-hero__name">{firstName}</span> <span className="dash-hero__wave">👋</span></h1>
          <p className="dash-hero__sub">Access previous papers and resources with a context tuned to your branch.</p>
          {isAdmin && (
            <div className="dash-hero__online" onClick={() => setShowOnlineDetails(true)} style={{ cursor: 'pointer' }}>
              <span className="online-badge"><span className="online-badge__dot" />{onlineData.count} {onlineData.count === 1 ? 'user' : 'users'} online now</span>
            </div>
          )}
        </div>

        <div className="dash-hero__stat-row">
          <div className="dash-hero__stat"><BookOpen size={15} /><div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{stats ? stats.approvedFiles ?? 0 : '—'}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Papers</div></div></div>
          <div className="dash-hero__stat"><Layers size={15} /><div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{stats ? stats.totalFolders ?? 0 : '—'}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Subjects</div></div></div>
          <div className="dash-hero__stat"><GraduationCap size={15} /><div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-1)' }}>{stats ? stats.totalUsers ?? 0 : '—'}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Students</div></div></div>
        </div>
      </section>

      {showOnlineDetails && canUsePortal && createPortal(
        <div className="online-modal-overlay" onClick={() => setShowOnlineDetails(false)}>
          <div className="online-modal" onClick={(e) => e.stopPropagation()}>
            <div className="online-modal__header"><h3>Active users ({onlineData.count})</h3><button className="btn btn--ghost btn--sm" onClick={() => setShowOnlineDetails(false)}>Close</button></div>
            <div className="online-modal__list">
              {onlineData.users.map((u, idx) => (
                <div key={u.key || idx} className="online-user-item">
                  <div className="online-user-item__avatar">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                  <div className="online-user-item__info"><div className="online-user-item__name">{u.name || 'Anonymous'}</div><div className="online-user-item__role">{u.role}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="dash-sections-container">
        {sectionOrder.map(sectionId => {
          if (sectionId === 'regulation') return (
            <section key="regulation" className="dash-section dash-section--draggable" draggable onDragStart={() => { dragSectionRef.current = 'regulation'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop('regulation')}>
              <h2 className="dash-section-title"><GripVertical size={16} /> Choose your Regulation</h2>
              <div className="reg-grid">
                {REGULATIONS.map((reg) => (
                  <button key={reg.id} className={`reg-card ${reg.accent}`} onClick={() => navigate(`/r/${reg.id}`)}>
                    <span className="reg-card__note">{reg.note}</span>
                    <span className="reg-card__watermark" aria-hidden="true">{reg.year}</span>
                    <div className="reg-card__body">
                      <span className="reg-card__emoji" aria-hidden="true">{reg.emoji}</span>
                      <div className="reg-card__id">{reg.id}</div>
                      <h3 className="reg-card__heading">{reg.heading}</h3>
                      <p className="reg-card__desc">{reg.desc}</p>
                    </div>
                    <span className="reg-card__cta">Browse <ArrowRight size={15} /></span>
                  </button>
                ))}
              </div>
            </section>
          );
          
          if (sectionId === 'personalized') return (
            <section key="personalized" className="dash-section dash-section--draggable" draggable onDragStart={() => { dragSectionRef.current = 'personalized'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop('personalized')}>
              <h2 className="dash-section-title"><GripVertical size={16} /> Personalized home page</h2>
              <div className="home-role-head"><p className="home-role-head__label">{roleHome.label}</p><p className="home-role-head__sub">Cards are tuned to your role so you can jump faster.</p></div>
              <div className="home-role-grid">
                {roleHome.cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button key={card.title} className="home-role-card" onClick={() => navigate(card.to)}>
                      <span className="home-role-card__icon"><Icon size={16} /></span>
                      <p className="home-role-card__title">{card.title}</p>
                      <p className="home-role-card__desc">{card.description}</p>
                      <span className="home-role-card__cta">Open <ArrowRight size={14} /></span>
                    </button>
                  );
                })}
              </div>
            </section>
          );

          if (sectionId === 'recent') return (
            <section key="recent" className="dash-section dash-section--draggable" draggable onDragStart={() => { dragSectionRef.current = 'recent'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop('recent')}>
              <h2 className="dash-section-title"><GripVertical size={16} /> What changed since last login</h2>
              <div className="digest-card">
                <p className="digest-card__title">Since your last seen timestamp</p>
                <p className="digest-card__text">{sinceLastSeen.files} new files, {sinceLastSeen.announcements} announcements, and {sinceLastSeen.exams} exam updates were added for your context.</p>
              </div>
            </section>
          );

          if (sectionId === 'widgets') return (
            <section key="widgets" className="dash-section dash-section--draggable" draggable onDragStart={() => { dragSectionRef.current = 'widgets'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop('widgets')}>
              <h2 className="dash-section-title"><GripVertical size={16} /> Smart dashboard widgets</h2>
              <div className="widget-customizer">
                {DEFAULT_WIDGET_ORDER.map(id => (
                  <button key={id} className={`widget-toggle ${hiddenWidgets.includes(id) ? 'widget-toggle--off' : ''}`} onClick={() => setHiddenWidgets(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}>
                    <EyeOff size={13} /> {id}
                  </button>
                ))}
                <button className="widget-toggle" onClick={() => { setWidgetOrder(DEFAULT_WIDGET_ORDER); setHiddenWidgets([]); }}>Reset widgets</button>
              </div>
              {widgetLoading ? (
                <div className="dash-widget-grid">{[1, 2, 3, 4].map((slot) => <div key={slot} className="dash-widget dash-widget--loading" />)}</div>
              ) : (
                <div className="dash-widget-grid">{orderedVisibleWidgets.map(id => widgetMap[id]).filter(Boolean)}</div>
              )}
            </section>
          );

          if (sectionId === 'hub') return (
            <div key="hub" className="dash-section dash-section--draggable" draggable onDragStart={() => { dragSectionRef.current = 'hub'; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop('hub')}>
              <DashboardHub smartReminders={visibleReminders} onSnooze={(id, mode) => setReminderSnoozes(prev => ({ ...prev, [id]: getSnoozeTimestamp(mode) }))} onNavigate={navigate} />
            </div>
          );

          return null;
        })}
      </div>
    </div>
  );
}
