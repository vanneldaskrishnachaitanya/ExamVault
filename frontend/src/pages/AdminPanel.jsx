// src/pages/AdminPanel.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  Check, ChevronDown, Flag, Loader2, RefreshCw,
  Shield, Trash2, X,
} from 'lucide-react';
import {
  approveFile, deleteFile, fetchPendingFiles,
  fetchReports, rejectFile, resolveReport,
} from '../api/apiClient';
import FileCard from '../components/FileCard';

const TABS = [
  { id: 'pending', label: 'Pending Approval' },
  { id: 'reports', label: 'Reports'          },
];

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal__header">
          <h2 className="modal__title">Confirm Action</h2>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1.5rem' }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn--danger" onClick={onConfirm}>Yes, proceed</button>
            <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reject note dialog ────────────────────────────────────────────────────────
function RejectDialog({ file, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal__header">
          <h2 className="modal__title"><X size={18} /> Reject File</h2>
          <button className="modal__close" onClick={onCancel}>✕</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            Rejecting: <strong>{file?.originalName}</strong>
          </p>
          <label className="modal__label">
            Rejection Note (optional)
            <textarea
              className="modal__input"
              rows={3}
              placeholder="Reason for rejection…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </label>
          <button className="modal__submit" style={{ marginTop: '1rem', background: 'var(--danger)' }}
            onClick={() => onConfirm(note)}>
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('pending');

  // Pending files
  const [pending, setPending]     = useState([]);
  const [pLoading, setPLoading]   = useState(true);
  const [pError, setPError]       = useState('');

  // Reports
  const [reports, setReports]     = useState([]);
  const [rLoading, setRLoading]   = useState(false);
  const [rError, setRError]       = useState('');

  // Dialogs
  const [rejectTarget,  setRejectTarget]  = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [toastMsg,      setToastMsg]      = useState('');

  const toast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const loadPending = useCallback(async () => {
    setPLoading(true); setPError('');
    try {
      const { files } = await fetchPendingFiles();
      setPending(files || []);
    } catch (e) { setPError(e.message); }
    finally { setPLoading(false); }
  }, []);

  const loadReports = useCallback(async () => {
    setRLoading(true); setRError('');
    try {
      const { reports: data } = await fetchReports({ status: 'open' });
      setReports(data || []);
    } catch (e) { setRError(e.message); }
    finally { setRLoading(false); }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => {
    if (activeTab === 'reports') loadReports();
  }, [activeTab, loadReports]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionLoading(id + '-approve');
    try {
      await approveFile(id);
      setPending((p) => p.filter((f) => f._id !== id));
      toast('File approved ✓');
    } catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  const handleRejectConfirm = async (note) => {
    const id = rejectTarget._id;
    setActionLoading(id + '-reject');
    setRejectTarget(null);
    try {
      await rejectFile(id, note);
      setPending((p) => p.filter((f) => f._id !== id));
      toast('File rejected');
    } catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  const handleDeleteConfirm = async () => {
    const id = deleteTarget._id;
    setActionLoading(id + '-delete');
    setDeleteTarget(null);
    try {
      await deleteFile(id);
      setPending((p) => p.filter((f) => f._id !== id));
      toast('File permanently deleted');
    } catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  const handleResolveReport = async (id) => {
    setActionLoading(id + '-resolve');
    try {
      await resolveReport(id);
      setReports((r) => r.filter((rp) => rp._id !== id));
      toast('Report resolved');
    } catch (e) { toast(`Error: ${e.message}`); }
    finally { setActionLoading(''); }
  };

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-panel__header">
        <h1 className="admin-panel__title">
          <Shield size={24} /> Admin Panel
        </h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`tab-bar__tab${activeTab === t.id ? ' tab-bar__tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'pending' && pending.length > 0 && (
              <span className="tab-bar__badge">{pending.length}</span>
            )}
            {t.id === 'reports' && reports.length > 0 && (
              <span className="tab-bar__badge tab-bar__badge--red">{reports.length}</span>
            )}
          </button>
        ))}
        <button className="tab-bar__refresh" onClick={activeTab === 'pending' ? loadPending : loadReports}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Pending files tab ── */}
      {activeTab === 'pending' && (
        <section className="admin-panel__section">
          {pLoading ? (
            <div className="admin-panel__loader"><Loader2 size={26} className="spin" /> Loading…</div>
          ) : pError ? (
            <p className="admin-panel__error">{pError}</p>
          ) : pending.length === 0 ? (
            <div className="admin-panel__empty">
              <Check size={36} /> <p>All caught up! No files awaiting approval.</p>
            </div>
          ) : (
            <div className="admin-file-list">
              {pending.map((file) => (
                <div key={file._id} className="admin-file-row">
                  <FileCard file={file} showStatus />
                  <div className="admin-file-row__actions">
                    <button
                      className="btn btn--success btn--sm"
                      disabled={!!actionLoading}
                      onClick={() => handleApprove(file._id)}
                    >
                      {actionLoading === file._id + '-approve'
                        ? <Loader2 size={14} className="spin" />
                        : <Check size={14} />}
                      Approve
                    </button>
                    <button
                      className="btn btn--warning btn--sm"
                      disabled={!!actionLoading}
                      onClick={() => setRejectTarget(file)}
                    >
                      <X size={14} /> Reject
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      disabled={!!actionLoading}
                      onClick={() => setDeleteTarget(file)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Reports tab ── */}
      {activeTab === 'reports' && (
        <section className="admin-panel__section">
          {rLoading ? (
            <div className="admin-panel__loader"><Loader2 size={26} className="spin" /> Loading…</div>
          ) : rError ? (
            <p className="admin-panel__error">{rError}</p>
          ) : reports.length === 0 ? (
            <div className="admin-panel__empty">
              <Flag size={36} /> <p>No open reports.</p>
            </div>
          ) : (
            <div className="admin-report-list">
              {reports.map((report) => (
                <div key={report._id} className="report-card">
                  <div className="report-card__body">
                    <p className="report-card__file">
                      📄 {report.fileId?.originalName || 'Unknown file'}
                    </p>
                    <p className="report-card__meta">
                      <strong>Reason:</strong> {report.reason.replace(/_/g, ' ')}
                    </p>
                    {report.description && (
                      <p className="report-card__desc">"{report.description}"</p>
                    )}
                    <p className="report-card__by">
                      Reported by {report.reportedBy?.name || report.reportedBy?.email}
                      {' · '}{new Date(report.reportedAt || report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="btn btn--success btn--sm"
                    disabled={!!actionLoading}
                    onClick={() => handleResolveReport(report._id)}
                  >
                    {actionLoading === report._id + '-resolve'
                      ? <Loader2 size={14} className="spin" />
                      : <Check size={14} />}
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Dialogs */}
      {rejectTarget && (
        <RejectDialog
          file={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`Permanently delete "${deleteTarget.originalName}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast */}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}
