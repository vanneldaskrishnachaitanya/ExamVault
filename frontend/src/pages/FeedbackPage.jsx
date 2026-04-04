import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, Plus, ThumbsUp, Check, X,
  Loader2, Lightbulb, GitBranch, FileText, Bug, HelpCircle,
  ChevronDown, Shield,
} from 'lucide-react';
import { fetchFeedback, submitFeedback, upvoteFeedback, reviewFeedback, deleteFeedbackAdmin } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { id: 'feature',      label: 'Feature Request', icon: <Lightbulb size={14}/>,  color: '#3b82f6' },
  { id: 'branch',       label: 'New Branch',       icon: <GitBranch size={14}/>, color: '#a855f7' },
  { id: 'file_request', label: 'File Request',     icon: <FileText size={14}/>,  color: '#C8922A' },
  { id: 'bug',          label: 'Bug Report',       icon: <Bug size={14}/>,       color: '#ef4444' },
  { id: 'other',        label: 'Other',            icon: <HelpCircle size={14}/>,color: '#8b92a8' },
];

const STATUS_CONFIG = {
  open:     { label: 'Open',     color: '#3b82f6' },
  reviewed: { label: 'Reviewed', color: '#f59e0b' },
  done:     { label: 'Done',     color: '#22c55e' },
  rejected: { label: 'Rejected', color: '#ef4444' },
};

const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[4];

export default function FeedbackPage() {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';

  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [filterCat,   setFilterCat]   = useState('');
  const [filterStatus,setFilterStatus]= useState('open');
  const [form,        setForm]        = useState({ title: '', message: '', category: 'feature' });
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState('');
  const [expandId,    setExpandId]    = useState(null);
  const [adminNote,   setAdminNote]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status   = filterStatus;
      if (filterCat)    params.category = filterCat;
      const d = await fetchFeedback(params);
      setItems(d.feedback || []);
    } catch {}
    finally { setLoading(false); }
  }, [filterStatus, filterCat]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.message.trim()) { showToast('Title and message required'); return; }
    setSubmitting(true);
    try {
      const d = await submitFeedback(form);
      setItems(prev => [{ ...d.feedback, upvoteCount: 0, hasUpvoted: false, submittedBy: { name: backendUser?.name } }, ...prev]);
      setShowForm(false);
      setForm({ title: '', message: '', category: 'feature' });
      showToast('Feedback submitted! Thank you 🙏');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const handleUpvote = async (id) => {
    try {
      const d = await upvoteFeedback(id);
      setItems(prev => prev.map(i => i._id === id ? { ...i, upvoteCount: d.upvoteCount, hasUpvoted: d.hasUpvoted } : i));
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const handleReview = async (id, status) => {
    try {
      await reviewFeedback(id, { status, adminNote });
      setItems(prev => prev.map(i => i._id === id ? { ...i, status, adminNote } : i));
      setExpandId(null);
      setAdminNote('');
      showToast('Updated ✓');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await deleteFeedbackAdmin(id);
      setItems(prev => prev.filter(i => i._id !== id));
      showToast('Deleted');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  return (
    <div className="feedback-page">
      {/* Hero */}
      <div className="feedback-hero">
        <div className="feedback-hero__glow" />

        {/* SVG: floating message bubbles */}
        <svg aria-hidden="true" style={{position:'absolute',top:8,right:12,width:110,height:90,pointerEvents:'none',opacity:0.15}} viewBox="0 0 110 90">
          <rect x="10" y="10" width="36" height="24" rx="6" fill="none" stroke="var(--amber)" strokeWidth="1">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite"/>
          </rect>
          <rect x="55" y="28" width="42" height="26" rx="6" fill="none" stroke="var(--blue)" strokeWidth="1">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3.4s" begin="0.7s" repeatCount="indefinite"/>
          </rect>
          <rect x="18" y="52" width="30" height="20" rx="5" fill="none" stroke="var(--teal)" strokeWidth="0.8">
            <animate attributeName="opacity" values="0.25;0.85;0.25" dur="2.2s" begin="1.2s" repeatCount="indefinite"/>
          </rect>
          <circle cx="32" cy="18" r="1.5" fill="var(--amber)"/>
          <circle cx="40" cy="18" r="1.5" fill="var(--amber)"/>
          <circle cx="20" cy="60" r="1.2" fill="var(--teal)"/>
          <circle cx="28" cy="60" r="1.2" fill="var(--teal)"/>
        </svg>

        <MessageSquare size={34} className="feedback-hero__icon" />
        <h1 className="feedback-hero__title">Feedback &amp; Suggestions</h1>
        <p className="feedback-hero__sub">
          Share your ideas, request new features, suggest branches or files.<br />
          Your feedback shapes ExamVault!
        </p>
        {!isAdmin && (
          <button className="btn btn--primary" style={{ marginTop: '1rem' }} onClick={() => setShowForm(s => !s)}>
            <Plus size={14} /> Share Your Feedback
          </button>
        )}
      </div>

      {/* Submit form — students only */}
      {showForm && !isAdmin && (
        <div className="feedback-form">
          <h3 className="feedback-form__title">New Feedback</h3>
          <div className="feedback-form__cats">
            {CATEGORIES.map(cat => (
              <button key={cat.id}
                className={`feedback-cat-btn${form.category === cat.id ? ' feedback-cat-btn--active' : ''}`}
                style={form.category === cat.id ? { borderColor: cat.color, background: cat.color + '18', color: cat.color } : {}}
                onClick={() => setForm(f => ({ ...f, category: cat.id }))}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <input className="modal__input" placeholder="Title *"
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={200} style={{ marginBottom: '0.5rem' }} />
          <textarea className="modal__input" placeholder="Describe your feedback in detail… *"
            rows={4} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            maxLength={2000} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn--primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={14} className="spin" /> : <MessageSquare size={14} />} Submit
            </button>
            <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="feedback-filters">
        <div className="feedback-filter-group">
          {['open','reviewed','done','rejected'].map(s => (
            <button key={s}
              className={`feedback-filter-btn${filterStatus === s ? ' feedback-filter-btn--active' : ''}`}
              onClick={() => setFilterStatus(s === filterStatus ? '' : s)}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
        <select className="modal__select feedback-cat-select"
          value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin" /></div>
      ) : items.length === 0 ? (
        <div className="sp-state sp-state--empty">
          <MessageSquare size={36} />
          <p>No feedback yet — be the first to share!</p>
        </div>
      ) : (
        <div className="feedback-list">
          {items.map(item => {
            const cat    = getCat(item.category);
            const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
            const isExpanded = expandId === item._id;

            return (
              <div key={item._id} className="feedback-item">
                <div className="feedback-item__left">
                  {/* Upvote */}
                  <button
                    className={`feedback-upvote${item.hasUpvoted ? ' feedback-upvote--active' : ''}`}
                    onClick={() => handleUpvote(item._id)}>
                    <ThumbsUp size={14} />
                    <span>{item.upvoteCount || 0}</span>
                  </button>
                </div>

                <div className="feedback-item__body">
                  <div className="feedback-item__header">
                    <span className="feedback-item__cat" style={{ color: cat.color, background: cat.color + '15', border: `1px solid ${cat.color}30` }}>
                      {cat.icon} {cat.label}
                    </span>
                    <span className="feedback-item__status" style={{ color: status.color, background: status.color + '15', border: `1px solid ${status.color}30` }}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="feedback-item__title">{item.title}</h3>
                  <p className="feedback-item__message">{item.message}</p>
                  {item.adminNote && (
                    <div className="feedback-item__admin-note">
                      <Shield size={12} /> Admin: {item.adminNote}
                    </div>
                  )}
                  <p className="feedback-item__meta">
                    By {item.submittedBy?.name || 'Student'} · {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="feedback-item__admin">
                    <button className="btn btn--ghost btn--sm"
                      onClick={() => { setExpandId(isExpanded ? null : item._id); setAdminNote(item.adminNote || ''); }}>
                      <ChevronDown size={13} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                    </button>
                    <button className="btn btn--danger btn--sm" style={{ padding: '0.2rem 0.4rem' }}
                      onClick={() => handleDelete(item._id)}>
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Admin expand panel */}
                {isAdmin && isExpanded && (
                  <div className="feedback-item__review">
                    <input className="modal__input" placeholder="Admin note (optional)"
                      value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                    <div className="feedback-item__review-btns">
                      <button className="btn btn--primary btn--sm" onClick={() => handleReview(item._id, 'reviewed')}>
                        Mark Reviewed
                      </button>
                      <button className="btn btn--success btn--sm" onClick={() => handleReview(item._id, 'done')}>
                        <Check size={13} /> Done
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleReview(item._id, 'rejected')}>
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
