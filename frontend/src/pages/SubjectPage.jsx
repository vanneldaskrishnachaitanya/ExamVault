// src/pages/SubjectPage.jsx
/**
 * SubjectPage
 * ───────────
 * Shows files for a specific subject split into:
 *   Papers → Mid-1 | Mid-2 | Semester  (three sub-sections)
 *   Resources → flat list
 *
 * API:  GET /files?regulation=&branch=&subject=&category=
 * Auth: Bearer token via axios interceptor
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, BookOpen, ChevronRight, FileText, Flag,
  Home, Loader2, Plus, RefreshCw, SearchX, X,
} from 'lucide-react';
import { fetchFiles, reportFile, fetchBookmarks, addBookmark, removeBookmark } from '../api/apiClient';
import FileCard    from '../components/FileCard';
import UploadModal from '../components/UploadModal';

// ── Config ───────────────────────────────────────────────────
const PAPER_SECTIONS = [
  { id: 'mid1',     label: 'Mid-1',    emoji: '📝' },
  { id: 'mid2',     label: 'Mid-2',    emoji: '📝' },
  { id: 'semester', label: 'Semester', emoji: '📋' },
];

const REPORT_REASONS = [
  { value: 'wrong_subject',    label: 'Wrong subject'          },
  { value: 'wrong_exam_type',  label: 'Wrong exam type'        },
  { value: 'duplicate',        label: 'Duplicate file'         },
  { value: 'poor_quality',     label: 'Poor quality / unreadable' },
  { value: 'inappropriate',    label: 'Inappropriate content'  },
  { value: 'other',            label: 'Other'                  },
];

// ── Helpers ──────────────────────────────────────────────────
const SectionHeader = ({ emoji, label, count }) => (
  <div className="sp-section-hdr">
    <span className="sp-section-hdr__emoji">{emoji}</span>
    <span className="sp-section-hdr__label">{label}</span>
    <span className="sp-section-hdr__count">{count}</span>
  </div>
);

const EmptySection = ({ label, onUpload }) => (
  <div className="sp-empty-section">
    <SearchX size={28} />
    <p>No {label} papers yet</p>
    <button className="btn btn--ghost btn--sm" onClick={onUpload}>
      <Plus size={13} /> Upload one
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────
export default function SubjectPage() {
  const { regulation, branch, subject } = useParams();
  const decodedSubject = decodeURIComponent(subject);

  // Data
  const [papers,    setPapers]    = useState([]);
  const [resources, setResources] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // UI
  const [mainTab,    setMainTab]    = useState('papers');   // papers | resources
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCat,  setUploadCat]  = useState('paper');

  // Report modal
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDesc,   setReportDesc]   = useState('');
  const [reportStatus, setReportStatus] = useState('idle'); // idle|loading|ok|error
  const [reportMsg,    setReportMsg]    = useState('');

  // ── Fetch ────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const base = { regulation, branch, subject: decodedSubject };

      const [papersRes, resourcesRes] = await Promise.all([
        fetchFiles({ ...base, category: 'paper' }),
        fetchFiles({ ...base, category: 'resource' }),
      ]);

      setPapers(papersRes.files    || []);
      setResources(resourcesRes.files || []);
    } catch (err) {
      setError(err.message || 'Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [regulation, branch, decodedSubject]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // ── Group papers by examType ──────────────────────────────
  const papersByType = PAPER_SECTIONS.reduce((acc, sec) => {
    acc[sec.id] = papers.filter((f) => f.examType === sec.id);
    return acc;
  }, {});

  // ── Report handlers ──────────────────────────────────────
  const openReport  = (file) => { setReportTarget(file); setReportReason(''); setReportDesc(''); setReportStatus('idle'); setReportMsg(''); };
  const closeReport = () => { setReportTarget(null); };

  const submitReport = async () => {
    if (!reportReason) return;
    setReportStatus('loading');
    try {
      await reportFile(reportTarget._id, reportReason, reportDesc);
      setReportStatus('ok');
      setReportMsg('Report submitted. Thank you!');
      setTimeout(closeReport, 1800);
    } catch (err) {
      setReportStatus('error');
      setReportMsg(err.message);
    }
  };

  // ── Upload shortcut ───────────────────────────────────────
  // Bookmark
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    fetchBookmarks().then(d => {
      const bms = d.bookmarks || [];
      setBookmarked(bms.some(b => b.regulation === regulation && b.branch === branch && b.subject === decodedSubject));
    }).catch(() => {});
  }, [regulation, branch, decodedSubject]);

  const toggleBookmark = async () => {
    try {
      if (bookmarked) { await removeBookmark({ regulation, branch, subject: decodedSubject }); setBookmarked(false); }
      else { await addBookmark({ regulation, branch, subject: decodedSubject }); setBookmarked(true); }
    } catch {}
  };

  const openUpload = (cat = 'paper') => { setUploadCat(cat); setUploadOpen(true); };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="subject-page">

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/dashboard"           className="breadcrumb__item"><Home size={13} /> Repository</Link>
        <ChevronRight size={13}         className="breadcrumb__sep" />
        <Link to={`/r/${regulation}`}   className="breadcrumb__item">{regulation}</Link>
        <ChevronRight size={13}         className="breadcrumb__sep" />
        <Link to={`/r/${regulation}`}   className="breadcrumb__item">{branch}</Link>
        <ChevronRight size={13}         className="breadcrumb__sep" />
        <span className="breadcrumb__item breadcrumb__item--active">{decodedSubject}</span>
      </nav>

      {/* Header */}
      <div className="sp-header">
        <div className="sp-header__left">
          <BookOpen size={20} className="sp-header__icon" />
          <div>
            <h1 className="sp-header__title">{decodedSubject}</h1>
            <p className="sp-header__meta">
              {regulation} &nbsp;·&nbsp; {branch}
              &nbsp;·&nbsp;
              <span className="sp-header__counts">
                {papers.length} paper{papers.length !== 1 ? 's' : ''}
                &nbsp;·&nbsp;
                {resources.length} resource{resources.length !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
        </div>

        <div className="sp-header__actions">
          <button
            className={`btn btn--sm ${bookmarked ? 'btn--warning' : 'btn--ghost'}`}
            onClick={toggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this subject'}
          >
            {bookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => openUpload('resource')}>
            <Plus size={14} /> Resource
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => openUpload('paper')}>
            <Plus size={14} /> Paper
          </button>
          <button className="btn btn--ghost btn--sm sp-refresh-btn" onClick={loadFiles} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Loading / error states ─────────────────────────── */}
      {loading && (
        <div className="sp-state sp-state--loading">
          <Loader2 size={30} className="spin" />
          <span>Fetching files…</span>
        </div>
      )}

      {!loading && error && (
        <div className="sp-state sp-state--error">
          <AlertCircle size={26} />
          <p>{error}</p>
          <button className="btn btn--ghost btn--sm" onClick={loadFiles}>Retry</button>
        </div>
      )}

      {/* ── Main tabs ─────────────────────────────────────── */}
      {!loading && !error && (
        <>
          <div className="sp-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mainTab === 'papers'}
              className={'sp-tab' + (mainTab === 'papers' ? ' sp-tab--active' : '')}
              onClick={() => setMainTab('papers')}
            >
              <FileText size={15} />
              Papers
              <span className="sp-tab__badge">{papers.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={mainTab === 'resources'}
              className={'sp-tab' + (mainTab === 'resources' ? ' sp-tab--active' : '')}
              onClick={() => setMainTab('resources')}
            >
              <BookOpen size={15} />
              Resources
              <span className="sp-tab__badge">{resources.length}</span>
            </button>
          </div>

          {/* ── Papers tab ──────────────────────────────────── */}
          {mainTab === 'papers' && (
            <div className="sp-papers">
              {PAPER_SECTIONS.map((sec) => {
                const secFiles = papersByType[sec.id] || [];
                return (
                  <section key={sec.id} className="sp-paper-section">
                    <SectionHeader emoji={sec.emoji} label={sec.label} count={secFiles.length} />

                    {secFiles.length === 0 ? (
                      <EmptySection label={sec.label} onUpload={() => openUpload('paper')} />
                    ) : (
                      <div className="sp-file-list">
                        {secFiles.map((file) => (
                          <FileCard
                            key={file._id}
                            file={file}
                            onReport={openReport}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* ── Resources tab ───────────────────────────────── */}
          {mainTab === 'resources' && (
            <div className="sp-resources">
              {resources.length === 0 ? (
                <div className="sp-state sp-state--empty">
                  <SearchX size={36} />
                  <p>No resources uploaded yet for this subject.</p>
                  <button className="btn btn--primary btn--sm" onClick={() => openUpload('resource')}>
                    <Plus size={14} /> Upload Resource
                  </button>
                </div>
              ) : (
                <div className="sp-file-list">
                  {resources.map((file) => (
                    <FileCard
                      key={file._id}
                      file={file}
                      onReport={openReport}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Upload modal ─────────────────────────────────────── */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => { setUploadOpen(false); loadFiles(); }}
        prefill={{
          regulation,
          branch,
          subject: decodedSubject,
          category: uploadCat,
        }}
      />

      {/* ── Report modal ─────────────────────────────────────── */}
      {reportTarget && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && closeReport()}
        >
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal__header">
              <h2 className="modal__title"><Flag size={16} /> Report File</h2>
              <button className="modal__close" onClick={closeReport}><X size={16} /></button>
            </div>

            <div className="modal__form">
              <p className="report-modal__filename">
                <FileText size={14} /> {reportTarget.originalName}
              </p>

              <label className="modal__label">
                Reason *
                <select
                  className="modal__select"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  <option value="">Select a reason…</option>
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>

              <label className="modal__label">
                Additional details (optional)
                <textarea
                  className="modal__input"
                  rows={3}
                  maxLength={500}
                  placeholder="Describe the issue…"
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </label>

              {reportMsg && (
                <div className={reportStatus === 'ok' ? 'modal__success' : 'modal__error'}>
                  {reportStatus === 'ok' ? <AlertCircle size={14} /> : <AlertCircle size={14} />}
                  {reportMsg}
                </div>
              )}

              <button
                className="modal__submit"
                disabled={!reportReason || reportStatus === 'loading' || reportStatus === 'ok'}
                onClick={submitReport}
              >
                {reportStatus === 'loading' ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
