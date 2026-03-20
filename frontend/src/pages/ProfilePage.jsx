import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, BookMarked, FileText, Clock, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchBookmarks, removeBookmark } from '../api/apiClient';

export default function ProfilePage() {
  const { backendUser } = useAuth();
  const [activeTab, setActiveTab] = useState('bookmarks');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks().then(d => setBookmarks(d.bookmarks || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRemoveBookmark = async (b) => {
    try {
      await removeBookmark({ regulation: b.regulation, branch: b.branch, subject: b.subject });
      setBookmarks(prev => prev.filter(x => x._id !== b._id));
    } catch {}
  };

  const joinedDate = backendUser?.createdAt
    ? new Date(backendUser.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  const initials = backendUser?.name
    ? backendUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-card__avatar">
          {backendUser?.avatarUrl
            ? <img src={backendUser.avatarUrl} alt={backendUser.name} />
            : <span>{initials}</span>}
        </div>
        <div className="profile-card__info">
          <h1 className="profile-card__name">{backendUser?.name}</h1>
          <div className="profile-card__meta">
            <span className="profile-card__meta-item"><Mail size={13} />{backendUser?.email}</span>
            <span className="profile-card__meta-item">
              <Shield size={13} />
              <span className={`profile-card__role profile-card__role--${backendUser?.role}`}>
                {backendUser?.role === 'admin' ? '⚡ Admin' : '🎓 Student'}
              </span>
            </span>
            <span className="profile-card__meta-item"><Clock size={13} /> Joined {joinedDate}</span>
          </div>
        </div>
      </div>

      <section className="profile-section">
        <h2 className="profile-section__title">
          <BookMarked size={17} /> Bookmarked Subjects
          <span className="profile-section__count">{bookmarks.length}</span>
        </h2>
        {loading ? (
          <div className="profile-loading"><Loader2 size={20} className="spin" /> Loading bookmarks…</div>
        ) : bookmarks.length === 0 ? (
          <div className="profile-empty">
            <BookMarked size={32} />
            <p>No bookmarks yet</p>
            <p className="profile-empty__sub">Bookmark subjects from the subject page for quick access.</p>
          </div>
        ) : (
          <div className="bookmark-list">
            {bookmarks.map(b => (
              <div key={b._id} className="bookmark-item">
                <Link to={`/r/${b.regulation}/${b.branch}/${encodeURIComponent(b.subject)}`} className="bookmark-item__link">
                  <FileText size={15} className="bookmark-item__icon" />
                  <div className="bookmark-item__body">
                    <span className="bookmark-item__subject">{b.subject}</span>
                    <span className="bookmark-item__meta">{b.regulation} · {b.branch}</span>
                  </div>
                  <ChevronRight size={14} className="bookmark-item__arrow" />
                </Link>
                <button className="bookmark-item__remove" onClick={() => handleRemoveBookmark(b)} title="Remove bookmark">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
