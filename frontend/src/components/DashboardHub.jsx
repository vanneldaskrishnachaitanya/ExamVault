import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bell, Bookmark, Calendar, Clock, FileText, Flame, Pin,
  TriangleAlert, Quote, Download, Megaphone,
} from 'lucide-react';
import {
  fetchAnnouncements, fetchBookmarks, fetchDownloadHistory, fetchEvents,
  fetchExams, fetchNotifications, removeBookmark,
  fetchSavedItems, removeSavedItem as removeSavedItemApi,
} from '../api/apiClient';
import { getSavedItems, formatRelativeTime, removeSavedItem } from '../utils/featureStorage';

function buildSubjectLink(item) {
  if (!item.regulation || !item.branch || !item.subject) return '/dashboard';
  return `/r/${item.regulation}/${item.branch}/${encodeURIComponent(item.subject)}`;
}

function SavedCard({ item, onRemove }) {
  const Icon = item.type === 'quote' ? Quote : item.type === 'event' ? Calendar : FileText;
  return (
    <div className="hub-saved-card">
      <Link to={item.href || '/dashboard'} className="hub-saved-card__link">
        <div className="hub-saved-card__icon">
          <Icon size={14} />
        </div>
        <div className="hub-saved-card__body">
          <p className="hub-saved-card__title">{item.title}</p>
          <p className="hub-saved-card__meta">{item.subtitle}</p>
        </div>
        <ArrowRight size={13} />
      </Link>
      {onRemove && (
        <button className="hub-saved-card__remove" onClick={() => onRemove(item)} title="Remove saved item">
          <Pin size={12} />
        </button>
      )}
    </div>
  );
}

function FeedItem({ item }) {
  const Icon = item.icon;
  return (
    <Link to={item.href || '/dashboard'} className="hub-feed-item">
      <div className="hub-feed-item__icon" style={{ '--accent': item.accent }}>
        <Icon size={14} />
      </div>
      <div className="hub-feed-item__body">
        <div className="hub-feed-item__topline">
          <span className="hub-feed-item__type">{item.typeLabel}</span>
          <span className="hub-feed-item__time">{formatRelativeTime(item.ts)}</span>
        </div>
        <p className="hub-feed-item__title">{item.title}</p>
        {item.subtitle && <p className="hub-feed-item__sub">{item.subtitle}</p>}
      </div>
    </Link>
  );
}

function ReminderItem({ item }) {
  const Icon = item.icon;
  const iconStyle = item.accent === 'var(--danger)'
    ? { background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }
    : item.accent === 'var(--blue)'
      ? { background: 'rgba(79,142,247,0.12)', color: 'var(--blue)' }
      : { background: 'rgba(245,166,35,0.12)', color: 'var(--amber)' };
  return (
    <div className="hub-reminder-item">
      <div className="hub-reminder-item__icon" style={iconStyle}>
        <Icon size={14} />
      </div>
      <div className="hub-reminder-item__body">
        <p className="hub-reminder-item__title">{item.title}</p>
        <p className="hub-reminder-item__sub">{item.subtitle}</p>
      </div>
    </div>
  );
}

export default function DashboardHub() {
  const [bookmarks, setBookmarks] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [exams, setExams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ann, ev, ex, note, hist, bm, saved] = await Promise.all([
          fetchAnnouncements().catch(() => ({ announcements: [] })),
          fetchEvents().catch(() => ({ events: [] })),
          fetchExams().catch(() => ({ exams: [] })),
          fetchNotifications().catch(() => ({ notifications: [] })),
          fetchDownloadHistory().catch(() => ({ history: [] })),
          fetchBookmarks().catch(() => ({ bookmarks: [] })),
          fetchSavedItems().catch(() => ({ savedItems: [] })),
        ]);
        setAnnouncements(ann.announcements || []);
        setEvents(ev.events || []);
        setExams(ex.exams || []);
        setNotifications(note.notifications || []);
        setDownloads(hist.history || []);
        setBookmarks(bm.bookmarks || []);
        const normalizedSaved = (saved.savedItems || []).map(item => ({
          type: item.type,
          id: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          href: item.href,
          savedAt: item.createdAt,
        }));
        setSavedItems(normalizedSaved);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const syncSaved = () => setSavedItems(getSavedItems());
    window.addEventListener('ev:saved-changed', syncSaved);
    window.addEventListener('storage', syncSaved);
    return () => {
      window.removeEventListener('ev:saved-changed', syncSaved);
      window.removeEventListener('storage', syncSaved);
    };
  }, []);

  const pinned = useMemo(() => {
    const bookmarkPins = bookmarks.map(b => ({
      type: 'subject',
      title: b.subject,
      subtitle: `${b.regulation} · ${b.branch}`,
      href: buildSubjectLink(b),
      regulation: b.regulation,
      branch: b.branch,
      subject: b.subject,
      id: `bookmark:${b.regulation}:${b.branch}:${b.subject}`,
    }));
    const localPins = savedItems.map(item => ({
      ...item,
      id: `${item.type}:${item.id ?? item.itemId}`,
      href: item.type === 'quote' && (!item.href || item.href === '/dashboard')
        ? `/search?source=quotes&q=${encodeURIComponent(item.subtitle || item.title || 'quote')}`
        : item.href,
    }));
    return [...localPins, ...bookmarkPins].slice(0, 8);
  }, [bookmarks, savedItems]);

  const feed = useMemo(() => {
    let recentViewed = [];
    try {
      recentViewed = JSON.parse(localStorage.getItem('ev-recent') || '[]').map(r => ({
        typeLabel: 'Recently viewed',
        title: r.label,
        subtitle: r.sub,
        ts: r.ts,
        href: r.path,
        icon: Clock,
        accent: 'var(--blue)',
      }));
    } catch {
      recentViewed = [];
    }
    const noticeItems = announcements.slice(0, 4).map(a => ({
      typeLabel: 'Announcement',
      title: a.title,
      subtitle: a.message,
      ts: a.createdAt,
      href: '/dashboard',
      icon: Megaphone,
      accent: 'var(--pink)',
    }));
    const eventItems = events.slice(0, 4).map(ev => ({
      typeLabel: ev.isCompleted ? 'Event completed' : 'Event live',
      title: ev.title,
      subtitle: ev.clubName ? `${ev.clubName} · ${new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      ts: ev.createdAt || ev.eventDate,
      href: '/events',
      icon: Calendar,
      accent: 'var(--amber)',
    }));
    const examItems = exams.slice(0, 4).map(ex => ({
      typeLabel: 'Exam',
      title: ex.title,
      subtitle: `${ex.regulation} · ${ex.branch} · ${new Date(ex.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      ts: ex.createdAt || ex.date,
      href: '/exams',
      icon: Clock,
      accent: 'var(--danger)',
    }));
    const downloadItems = downloads.slice(0, 4).map(item => ({
      typeLabel: 'Downloaded',
      title: item.fileName || 'File download',
      subtitle: `${item.regulation || ''} ${item.branch || ''} ${item.subject || ''}`.trim(),
      ts: item.createdAt,
      href: item.fileId ? `/r/${item.regulation}/${item.branch}/${encodeURIComponent(item.subject)}` : '/downloads',
      icon: Download,
      accent: 'var(--teal)',
    }));
    return [...noticeItems, ...eventItems, ...examItems, ...downloadItems, ...recentViewed]
      .filter(item => item.title)
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
      .slice(0, 8);
  }, [announcements, events, exams, downloads]);

  const reminders = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 86400000;
    const examReminders = exams
      .map(ex => ({
        icon: Clock,
        accent: 'var(--danger)',
        title: ex.title,
        subtitle: `${ex.regulation} · ${ex.branch} · ${new Date(ex.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        date: new Date(ex.date).getTime(),
      }))
      .filter(item => item.date >= now && item.date - now <= sevenDays)
      .sort((a, b) => a.date - b.date)
      .slice(0, 4);

    const eventReminders = events
      .map(ev => ({
        icon: Calendar,
        accent: 'var(--amber)',
        title: ev.title,
        subtitle: `${ev.clubName || 'Event'} · ${new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
        date: new Date(ev.eventDate).getTime(),
      }))
      .filter(item => item.date >= now && item.date - now <= sevenDays)
      .sort((a, b) => a.date - b.date)
      .slice(0, 4);

    const reminderNotices = notifications
      .filter(n => /exam|timetable|deadline|announcement/i.test(`${n.title} ${n.message}`))
      .slice(0, 4)
      .map(n => ({
        icon: Bell,
        accent: 'var(--blue)',
        title: n.title,
        subtitle: n.message,
        date: new Date(n.createdAt).getTime(),
      }));

    return [...examReminders, ...eventReminders, ...reminderNotices]
      .sort((a, b) => a.date - b.date)
      .slice(0, 6);
  }, [events, exams, notifications]);

  const removePinned = async (item) => {
    try {
      const pinId = String(item.id).includes(':') ? String(item.id).split(':').slice(1).join(':') : String(item.id);
      await removeSavedItemApi({ type: item.type, itemId: pinId });
      setSavedItems(removeSavedItem({ type: item.type, id: pinId }));
    } catch {}
  };

  const removeBookmarkPin = async (item) => {
    if (!item.regulation || !item.branch || !item.subject) return;
    try {
      await removeBookmark({ regulation: item.regulation, branch: item.branch, subject: item.subject });
      setBookmarks(prev => prev.filter(b => !(b.regulation === item.regulation && b.branch === item.branch && b.subject === item.subject)));
    } catch {}
  };

  return (
    <section className="dash-hub">
      <div className="dash-hub__grid">
        <div className="dash-hub__panel">
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><Bookmark size={12} /> Saved</p>
              <h2 className="dash-hub__title">Pinned items</h2>
            </div>
            <span className="dash-hub__count">{pinned.length}</span>
          </div>
          {loading ? (
            <div className="dash-hub__empty">Loading pins…</div>
          ) : pinned.length === 0 ? (
            <div className="dash-hub__empty">Pin files, quotes, or events to keep them here.</div>
          ) : (
            <div className="dash-hub__saved-list">
              {pinned.map(item => (
                <SavedCard
                  key={item.id}
                  item={item}
                  onRemove={item.type === 'subject' ? removeBookmarkPin : removePinned}
                />
              ))}
            </div>
          )}
        </div>

        <div className="dash-hub__panel dash-hub__panel--feed">
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><Flame size={12} /> Activity</p>
              <h2 className="dash-hub__title">What’s moving now</h2>
            </div>
          </div>
          {feed.length === 0 ? (
            <div className="dash-hub__empty">Recent uploads, announcements, and views will appear here.</div>
          ) : (
            <div className="dash-hub__feed-list">
              {feed.map((item, idx) => <FeedItem key={`${item.typeLabel}-${idx}`} item={item} />)}
            </div>
          )}
        </div>

        <div className="dash-hub__panel dash-hub__panel--reminders">
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><TriangleAlert size={12} /> Reminders</p>
              <h2 className="dash-hub__title">Upcoming alerts</h2>
            </div>
          </div>
          {reminders.length === 0 ? (
            <div className="dash-hub__empty">No urgent reminders right now.</div>
          ) : (
            <div className="dash-hub__reminder-list">
              {reminders.map((item, idx) => <ReminderItem key={`${item.title}-${idx}`} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
