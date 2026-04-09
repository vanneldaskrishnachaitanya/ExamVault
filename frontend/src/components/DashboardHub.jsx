import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, Bookmark, BellRing, Calendar, Clock, ExternalLink, FileText, Flame, Pin,
  TriangleAlert, Quote, Download, Megaphone, AlarmClock,
} from 'lucide-react';
import {
  fetchAnnouncements, fetchBookmarks, fetchDownloadHistory, fetchEvents,
  fetchExams, fetchNotifications, removeBookmark,
  fetchSavedItems, removeSavedItem as removeSavedItemApi,
} from '../api/apiClient';
import { getSavedItems, formatRelativeTime, removeSavedItem } from '../utils/featureStorage';
import { X } from 'lucide-react';

function buildSubjectLink(item) {
  if (!item.regulation || !item.branch || !item.subject) return '/dashboard';
  return `/r/${item.regulation}/${item.branch}/${encodeURIComponent(item.subject)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildFilePreviewUrl(fileUrl, mimeType) {
  if (!fileUrl) return '';
  if (String(mimeType || '').startsWith('image/')) return fileUrl;
  if (mimeType === 'application/pdf') {
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`;
  }
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
}

function openQuoteWindow(item) {
  const meta = item.meta || {};
  const quote = meta.text || item.title || 'Saved quote';
  const author = meta.author || item.subtitle || 'Unknown';
  const description = meta.description || 'No description available for this quote yet.';
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Saved Quote</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: "Segoe UI", Tahoma, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
      .wrap { max-width: 760px; margin: 0 auto; padding: 28px 24px 40px; }
      .chip { display: inline-block; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 10px; border-radius: 999px; background: rgba(148,163,184,0.2); }
      .quote { margin: 20px 0 14px; font-size: clamp(24px, 3.2vw, 34px); line-height: 1.35; font-weight: 600; white-space: pre-wrap; }
      .author { margin: 0; font-size: 18px; font-weight: 700; color: #93c5fd; }
      .desc { margin-top: 14px; color: #cbd5e1; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <span class="chip">Saved quote</span>
      <p class="quote">${escapeHtml(quote)}</p>
      <p class="author">- ${escapeHtml(author)}</p>
      <p class="desc">${escapeHtml(description)}</p>
    </div>
  </body>
</html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function openFileWindow(item) {
  const meta = item.meta || {};
  const fileUrl = meta.fileUrl || item.href || '';
  const mimeType = meta.mimeType || '';
  const previewUrl = buildFilePreviewUrl(fileUrl, mimeType);
  const fileName = meta.fileName || item.title || 'Saved file';
  const hasPreview = Boolean(fileUrl && previewUrl);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(fileName)}</title>
    <style>
      body { margin: 0; font-family: "Segoe UI", Tahoma, sans-serif; background: #0b1220; color: #e2e8f0; }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 18px; }
      .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
      .title { margin: 0; font-size: 22px; }
      .sub { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
      .actions { display: flex; gap: 10px; }
      .btn { border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-ghost { background: rgba(148,163,184,0.2); color: #e2e8f0; }
      .preview { margin-top: 14px; height: 78vh; min-height: 420px; border: 1px solid rgba(148,163,184,0.3); border-radius: 12px; overflow: hidden; background: #111827; }
      iframe, img { width: 100%; height: 100%; border: 0; display: block; }
      .empty { padding: 16px; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="head">
        <div>
          <h1 class="title">${escapeHtml(fileName)}</h1>
          <p class="sub">${escapeHtml(item.subtitle || 'Saved file')}</p>
        </div>
        <div class="actions">
          <a class="btn btn-ghost" href="${escapeHtml(previewUrl || fileUrl)}" target="_blank" rel="noreferrer">Preview</a>
          <a class="btn btn-primary" href="${escapeHtml(fileUrl)}" download="${escapeHtml(fileName)}">Download</a>
        </div>
      </div>
      <div class="preview">
        ${hasPreview
          ? (String(mimeType || '').startsWith('image/')
            ? `<img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(fileName)}" />`
            : `<iframe src="${escapeHtml(previewUrl)}" title="${escapeHtml(fileName)}"></iframe>`)
          : '<div class="empty">Preview unavailable for this file. Use the buttons above.</div>'}
      </div>
    </div>
  </body>
</html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function SavedCard({ item, onOpen, onRemove }) {
  const Icon = item.type === 'quote'
    ? Quote
    : item.type === 'event'
      ? Calendar
      : item.type === 'coding'
        ? ExternalLink
        : FileText;
  return (
    <div className="hub-saved-card">
      <button type="button" className="hub-saved-card__link" onClick={() => onOpen(item)}>
        <div className="hub-saved-card__icon">
          <Icon size={14} />
        </div>
        <div className="hub-saved-card__body">
          <p className="hub-saved-card__title">{item.title}</p>
          <p className="hub-saved-card__meta">{item.subtitle}</p>
        </div>
        <ArrowRight size={13} />
      </button>
      {onRemove && (
        <button
          className="hub-saved-card__remove"
          onClick={(e) => { e.stopPropagation(); onRemove(item); }}
          title="Remove saved item"
        >
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

export default function DashboardHub({ smartReminders = [], onSnooze, onNavigate }) {
  const _navigate = useNavigate();
  const navigate = onNavigate || _navigate;
  const [bookmarks, setBookmarks] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [exams, setExams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileRemindersOpen, setMobileRemindersOpen] = useState(false);

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
          meta: item.meta || {},
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
    const allPins = [...localPins, ...bookmarkPins];
    
    // Group them
    const groups = { 'Subjects': [], 'Files': [], 'Other': [] };
    
    for (const item of allPins) {
      if (item.type === 'subject') {
        groups['Subjects'].push(item);
      } else if (item.type === 'file') {
        groups['Files'].push(item);
      } else {
        groups['Other'].push(item);
      }
    }
    
    return groups;
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

  const localReminders = useMemo(() => {
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

  const openSavedItem = (item) => {
    if (!item) return;

    if (item.type === 'quote') {
      openQuoteWindow(item);
      return;
    }

    if (item.type === 'file') {
      if (!item.meta?.fileUrl) {
        navigate(item.href || '/dashboard');
        return;
      }
      openFileWindow(item);
      return;
    }

    if (item.type === 'coding') {
      const target = item.meta?.url || item.href;
      if (target) window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    if (item.href && /^https?:\/\//i.test(item.href)) {
      window.open(item.href, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(item.href || '/dashboard');
  };

  const hasSmartReminders = smartReminders.length > 0;
  const hasFeedReminders = localReminders.length > 0;

  return (
    <section className="dash-hub">
      <div className="dash-hub__grid">
        <div className="dash-hub__panel">
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><Bookmark size={12} /> Saved</p>
              <h2 className="dash-hub__title">Pinned items</h2>
            </div>
            <span className="dash-hub__count">{Object.values(pinned).flat().length}</span>
          </div>
          {loading ? (
            <div className="dash-hub__empty">Loading pins…</div>
          ) : Object.values(pinned).flat().length === 0 ? (
            <div className="dash-hub__empty">Pin files, quotes, or events to keep them here.</div>
          ) : (
            <div className="dash-hub__saved-groups">
              {['Subjects', 'Files', 'Other'].map(group => {
                if (pinned[group].length === 0) return null;
                return (
                  <div key={group} className="dash-hub__pin-group">
                    <h3 className="dash-hub__pin-group-title">{group}</h3>
                    <div className="dash-hub__saved-list">
                      {pinned[group].map(item => (
                <SavedCard
                  key={item.id}
                  item={item}
                  onOpen={openSavedItem}
                  onRemove={item.type === 'subject' ? removeBookmarkPin : removePinned}
                />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dash-hub__panel dash-hub__panel--feed">
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><Flame size={12} /> Activity</p>
              <h2 className="dash-hub__title">What's moving now</h2>
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

        {/* Reminders section with bottom-sheet logic on mobile */}
        {(hasFeedReminders || hasSmartReminders) && (
          <button 
            className="dash-hub__mobile-reminders-fab" 
            onClick={() => setMobileRemindersOpen(true)}
          >
            <Bell size={20} />
            <span className="fab-badge">{localReminders.length + smartReminders.length}</span>
          </button>
        )}

        <div className={`dash-hub__panel dash-hub__panel--reminders ${mobileRemindersOpen ? 'dash-hub__panel--open' : ''}`}>
          <div className="dash-hub__panel-head">
            <div>
              <p className="dash-hub__eyebrow"><TriangleAlert size={12} /> Reminders</p>
              <h2 className="dash-hub__title">Upcoming alerts</h2>
            </div>
            <button className="dash-hub__close-sheet" onClick={() => setMobileRemindersOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Smart reminders with snooze from Dashboard */}
          {hasSmartReminders && (
            <div className="dash-hub__smart-reminders">
              {smartReminders.map((item) => (
                <div key={item.id} className={`hub-smart-reminder hub-smart-reminder--${item.tone}`}>
                  <div className="hub-smart-reminder__header">
                    <BellRing size={13} className="hub-smart-reminder__icon" />
                    <button className="hub-smart-reminder__title" onClick={() => navigate(item.to)}>{item.title}</button>
                  </div>
                  <p className="hub-smart-reminder__msg">{item.message}</p>
                  {onSnooze && (
                    <div className="hub-smart-reminder__actions">
                      <button className="hub-snooze-btn" onClick={() => onSnooze(item.id, '1h')} title="Snooze 1 hour">
                        <AlarmClock size={11} /> +1h
                      </button>
                      <button className="hub-snooze-btn" onClick={() => onSnooze(item.id, 'tonight')} title="Snooze until tonight">
                        Tonight
                      </button>
                      <button className="hub-snooze-btn" onClick={() => onSnooze(item.id, 'tomorrow')} title="Snooze until tomorrow">
                        Tomorrow
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Regular local reminders */}
          {!hasFeedReminders && !hasSmartReminders ? (
            <div className="dash-hub__empty">No urgent reminders right now.</div>
          ) : hasFeedReminders ? (
            <div className="dash-hub__reminder-list">
              {localReminders.map((item, idx) => <ReminderItem key={`${item.title}-${idx}`} item={item} />)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

