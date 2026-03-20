import { useCallback, useEffect, useState } from 'react';
import {
  Check, Flag, Loader2, RefreshCw, Shield,
  Trash2, X, Megaphone, Plus, BarChart2, Eye,
} from 'lucide-react';
import {
  approveFile, deleteFile, fetchPendingFiles,
  fetchReports, rejectFile, resolveReport,
  fetchAnnouncements, createAnnouncement, deleteAnnouncement,
} from '../api/apiClient';
import FileCard from '../components/FileCard';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'pending',       label: 'Pending',       icon: <Check size={14} /> },
  { id: 'reports',       label: 'Reports',        icon: <Flag size={14} /> },
  { id: 'announcements', label: 'Announcements',  icon: <Megaphone size={14} /> },
];

function RejectDialog({ file, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal__header">
          <h2 className="modal__title"><X size={18} /> Reject File</h2>
          <button className="modal__close" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal__form">
          <p style={{ fontSize: '0.875rem' }}>Rejecting: <strong>{file?.originalName}</strong></p>
          <label className="modal__label">
            Rejection Note (optional)
            <textarea className="modal__input" rows={3} placeholder="Reason for rejection…" value={note}
              onChange={e => setNote(e.target.value)} style={{ resize: 'vertical' }} />
          </label>
          <button className="modal__submit" style={{ background: 'var(--danger)' }} onClick={() => onConfirm(note)}>
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');

  const [pending, setPending]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [pError, setPError]     = useState('');

  const [reports, setReports]   = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError]     = useState('');

  const [announcements, setAnnouncements] = useState([]);
  const [aLoading, setALoading]           = useState(false);
  const [newAnn, setNewAnn]               = useState({ title: '', message: '', type: 'info' });
  const [aSubmitting, setASubmitting]     = useState(false);

  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [toastMsg, setToastMsg]           = useState('');

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const loadPending = useCallback(async () => {
    setPLoading(true); setPError(''); setSelected([]);
    try { const { files } = await fetchPendingFiles(); setPending(files || []); }
    catch (e) { setPError(e.message); }
    finally { setPLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setRLoading(true); setRError('');
    try { const { reports: d } = await fetchReports({ status: 'open' }); setReports(d || []); }
    catch (e) { setRError(e.message); }
    finally { setRLoading(false); }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setALoading(true);
    try { const d = await fetchAnnouncements(); setAnnouncements(d.announcements || []); }
    catch {}
    finally { setALoading(false); }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => {
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'announcements') loadAnnouncements();
  }, [activeTab, loadReports, loadAnnouncements]);

  // ── Single approve ──
  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try { await approveFile(id); setPending(p => p.filter(f => f._id !== id)); setSelected(s => s.filter(x => x !== id)); toast('File approved ✓'); }
    catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  // ── Bulk approve ──
  const handleBulkApprove = async () => {
    setActionLoading('bulk');
    let count = 0;
    for (const id of selected) {
      try { await approveFile(id); count++; } catch {}
    }
    setPending(p => p.filter(f => !selected.includes(f._id)));
    setSelected([]);
    setActionLoading('');
    toast(`${count} file(s) approved ✓`);
  };

  // ── Bulk reject ──
  const handleBulkReject = async () => {
    setActionLoading('bulk');
    let count = 0;
    for (const id of selected) {
      try { await rejectFile(id, 'Bulk rejected by admin'); count++; } catch {}
    }
    setPending(p => p.filter(f => !selected.includes(f._id)));
    setSelected([]);
    setActionLoading('');
    toast(`${count} file(s) rejected`);
  };

  // ── Reject single ──
  const handleRejectConfirm = async (note) => {
    const id = rejectTarget._id;
    setRejectTarget(null);
    setActionLoading(id + '-reject');
    try { await rejectFile(id, note); setPending(p => p.filter(f => f._id !== id)); toast('File rejected'); }
    catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this file?')) return;
    setActionLoading(id + '-delete');
    try { await deleteFile(id); setPending(p => p.filter(f => f._id !== id)); toast('File deleted'); }
    catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  // ── Resolve report ──
  const handleResolveReport = async (id) => {
    setActionLoading(id + '-resolve');
    try { await resolveReport(id); setReports(r => r.filter(x => x._id !== id)); toast('Report resolved'); }
    catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  // ── Create announcement ──
  const handleCreateAnnouncement = async () => {
    if (!newAnn.title || !newAnn.message) { toast('Title and message are required'); return; }
    setASubmitting(true);
    try {
      const d = await createAnnouncement(newAnn);
      setAnnouncements(prev => [d.announcement, ...prev]);
      setNewAnn({ title: '', message: '', type: 'info' });
      toast('Announcement posted ✓');
    } catch (e) { toast(`Error: ${e.message}`); }
    finally { setASubmitting(false); }
  };

  const handleDeleteAnnouncement = async (id) => {
    try { await deleteAnnouncement(id); setAnnouncements(a => a.filter(x => x._id !== id)); toast('Deleted'); }
    catch (e) { toast(`Error: ${e.message}`); }
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleSelectAll = () => setSelected(s => s.length === pending.length ? [] : pending.map(f => f._id));

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h1 className="admin-panel__title"><Shield size={24} /> Admin Panel</h1>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/admin/analytics')}>
          <BarChart2 size={14} /> Analytics
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={activeTab === t.id}
            className={`tab-bar__tab${activeTab === t.id ? ' tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
            {t.id === 'pending' && pending.length > 0 && <span className="tab-bar__badge">{pending.length}</span>}
            {t.id === 'reports' && reports.length > 0 && <span className="tab-bar__badge tab-bar__badge--red">{reports.length}</span>}
          </button>
        ))}
        <button className="tab-bar__refresh" onClick={activeTab === 'pending' ? loadPending : activeTab === 'reports' ? loadReports : loadAnnouncements}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Pending tab ── */}
      {activeTab === 'pending' && (
        <section className="admin-panel__section">
          {pLoading ? (
            <div className="admin-panel__loader"><Loader2 size={26} className="spin" /> Loading…</div>
          ) : pError ? (
            <p className="admin-panel__error">{pError}</p>
          ) : pending.length === 0 ? (
            <div className="admin-panel__empty"><Check size={36} /><p>All caught up!</p></div>
          ) : (
            <>
              {/* Bulk action bar */}
              <div className="bulk-bar">
                <label className="bulk-bar__select-all">
                  <input type="checkbox" checked={selected.length === pending.length && pending.length > 0}
                    onChange={toggleSelectAll} />
                  Select all ({pending.length})
                </label>
                {selected.length > 0 && (
                  <div className="bulk-bar__actions">
                    <span className="bulk-bar__count">{selected.length} selected</span>
                    <button className="btn btn--success btn--sm" disabled={actionLoading === 'bulk'} onClick={handleBulkApprove}>
                      {actionLoading === 'bulk' ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Approve all
                    </button>
                    <button className="btn btn--danger btn--sm" disabled={actionLoading === 'bulk'} onClick={handleBulkReject}>
                      <X size={13} /> Reject all
                    </button>
                  </div>
                )}
              </div>

              <div className="admin-file-list">
                {pending.map(file => (
                  <div key={file._id} className={`admin-file-row${selected.includes(file._id) ? ' admin-file-row--selected' : ''}`}>
                    <input type="checkbox" className="admin-file-row__checkbox"
                      checked={selected.includes(file._id)} onChange={() => toggleSelect(file._id)} />
                    <FileCard file={file} showStatus />
                    <div className="admin-file-row__actions">
                      <button className="btn btn--success btn--sm" disabled={!!actionLoading} onClick={() => handleApprove(file._id)}>
                        {actionLoading === file._id + '-approve' ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Approve
                      </button>
                      <button className="btn btn--warning btn--sm" disabled={!!actionLoading} onClick={() => setRejectTarget(file)}>
                        <X size={14} /> Reject
                      </button>
                      <button className="btn btn--danger btn--sm" disabled={!!actionLoading} onClick={() => handleDelete(file._id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Reports tab ── */}
      {activeTab === 'reports' && (
        <section className="admin-panel__section">
          {rLoading ? <div className="admin-panel__loader"><Loader2 size={26} className="spin" /> Loading…</div>
          : rError ? <p className="admin-panel__error">{rError}</p>
          : reports.length === 0 ? <div className="admin-panel__empty"><Flag size={36} /><p>No open reports.</p></div>
          : (
            <div className="admin-report-list">
              {reports.map(report => (
                <div key={report._id} className="report-card">
                  <div className="report-card__body">
                    <p className="report-card__file">📄 {report.fileId?.originalName || 'Unknown file'}</p>
                    <p className="report-card__meta"><strong>Reason:</strong> {report.reason.replace(/_/g, ' ')}</p>
                    {report.description && <p className="report-card__desc">"{report.description}"</p>}
                    <p className="report-card__by">
                      Reported by {report.reportedBy?.name || report.reportedBy?.email}
                      {' · '}{new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="btn btn--success btn--sm" disabled={!!actionLoading} onClick={() => handleResolveReport(report._id)}>
                    {actionLoading === report._id + '-resolve' ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Announcements tab ── */}
      {activeTab === 'announcements' && (
        <section className="admin-panel__section">
          {/* Create form */}
          <div className="ann-form">
            <h3 className="ann-form__title"><Plus size={15} /> New Announcement</h3>
            <input className="modal__input" placeholder="Title" value={newAnn.title}
              onChange={e => setNewAnn(p => ({ ...p, title: e.target.value }))} />
            <textarea className="modal__input" rows={3} placeholder="Message" value={newAnn.message}
              onChange={e => setNewAnn(p => ({ ...p, message: e.target.value }))} style={{ resize: 'vertical' }} />
            <div className="ann-form__row">
              <select className="modal__select" value={newAnn.type}
                onChange={e => setNewAnn(p => ({ ...p, type: e.target.value }))}>
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warning</option>
                <option value="success">✅ Success</option>
                <option value="danger">🚨 Danger</option>
              </select>
              <button className="btn btn--primary" disabled={aSubmitting} onClick={handleCreateAnnouncement}>
                {aSubmitting ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Post
              </button>
            </div>
          </div>

          {/* Existing announcements */}
          {aLoading ? <div className="admin-panel__loader"><Loader2 size={20} className="spin" /> Loading…</div>
          : announcements.length === 0 ? <div className="admin-panel__empty"><Megaphone size={32} /><p>No announcements yet.</p></div>
          : (
            <div className="ann-list">
              {announcements.map(a => (
                <div key={a._id} className={`ann-item ann-item--${a.type}`}>
                  <div className="ann-item__body">
                    <p className="ann-item__title">{a.title}</p>
                    <p className="ann-item__msg">{a.message}</p>
                    <p className="ann-item__meta">
                      {a.active ? '🟢 Active' : '⚫ Inactive'} · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="btn btn--danger btn--sm" onClick={() => handleDeleteAnnouncement(a._id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {rejectTarget && <RejectDialog file={rejectTarget} onConfirm={handleRejectConfirm} onCancel={() => setRejectTarget(null)} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
