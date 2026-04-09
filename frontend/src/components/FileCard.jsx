import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Download, Eye, FileText, Flag, Image, Presentation,
  FileSpreadsheet, Calendar, User, Clock, TrendingDown,
  X, Loader2, HardDriveDownload, HardDrive,
  CheckCircle, Timer, AlertCircle, Star, Share2, Pin, Trash2,
} from 'lucide-react';
import api, {
  getFileRatings, rateFile, recordDownloadApi, toggleImportant,
  addSavedItem, removeSavedItem as removeSavedItemApi,
} from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';
import StarRating from './StarRating';
import { isSavedItem, toggleSavedItem } from '../utils/featureStorage';
import { saveFileOffline, removeFileOffline, checkFileOffline } from '../utils/offlineStorage';

const MIME_CONFIG = {
  'application/pdf': { icon: <FileText size={22} />, label: 'PDF',   color: 'file-icon--pdf' },
  'image/png':       { icon: <Image size={22} />,    label: 'Image', color: 'file-icon--img' },
  'image/jpeg':      { icon: <Image size={22} />,    label: 'Image', color: 'file-icon--img' },
  'image/webp':      { icon: <Image size={22} />,    label: 'Image', color: 'file-icon--img' },
  'application/vnd.ms-powerpoint': { icon: <Presentation size={22} />, label: 'PPT',  color: 'file-icon--ppt' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: <Presentation size={22} />, label: 'PPTX', color: 'file-icon--ppt' },
  'application/vnd.ms-excel': { icon: <FileSpreadsheet size={22} />, label: 'XLS', color: 'file-icon--xls' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: <FileSpreadsheet size={22} />, label: 'XLSX', color: 'file-icon--xls' },
};

const getMimeConfig = (mime) => MIME_CONFIG[mime] || { icon: <FileText size={22} />, label: 'FILE', color: 'file-icon--default' };
const formatBytes = (b) => !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const formatDate  = (d) => !d ? '' : new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

const StatusDot = ({ status }) => {
  const cfg = {
    approved: { icon: <CheckCircle size={11} />, cls: 'status--approved', label: 'Approved' },
    pending:  { icon: <Timer size={11} />,       cls: 'status--pending',  label: 'Pending'  },
    rejected: { icon: <AlertCircle size={11} />, cls: 'status--rejected', label: 'Rejected' },
  };
  const { icon, cls, label } = cfg[status] || cfg.pending;
  return <span className={`fc-status ${cls}`}>{icon}{label}</span>;
};

export function FileCardSkeleton() {
  return (
    <div className="file-card file-card--skeleton">
      <div className="skeleton skeleton--icon" />
      <div className="skeleton-body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--meta" />
        <div className="skeleton skeleton--meta" style={{ width: '55%' }} />
      </div>
      <div className="skeleton-actions">
        <div className="skeleton skeleton--btn" />
        <div className="skeleton skeleton--btn" />
      </div>
    </div>
  );
}

export default function FileCard({ file, showStatus = false, onReport, compact = false }) {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const mime = getMimeConfig(file.mimeType);

  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [ratingOpen,    setRatingOpen]    = useState(false);
  const [myStars,       setMyStars]       = useState(file.myRating?.stars || 0);
  const [avgRating,     setAvgRating]     = useState(file.avgRating || 0);
  const [ratingCount,   setRatingCount]   = useState(file.ratingCount || 0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [important,     setImportant]     = useState(file.isImportant || false);
  const [saved,         setSaved]         = useState(isSavedItem({ type: 'file', id: file._id }));
  const [offline,       setOffline]       = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const canUsePortal = typeof document !== 'undefined' && !!document.body;

  useEffect(() => {
    const sync = () => setSaved(isSavedItem({ type: 'file', id: file._id }));
    window.addEventListener('ev:saved-changed', sync);
    
    if (file.filePath) {
      checkFileOffline(file.filePath).then(setOffline);
    }
    
    return () => window.removeEventListener('ev:saved-changed', sync);
  }, [file._id, file.filePath]);

  const canPreview = file.mimeType === 'application/pdf' || file.mimeType?.startsWith('image/')
    || file.mimeType?.includes('word') || file.mimeType?.includes('powerpoint')
    || file.mimeType?.includes('presentation') || file.mimeType?.includes('spreadsheet')
    || file.mimeType?.includes('excel');

  const getDisplayName = () => {
    if (file.hideUploaderName) return null;
    const uploader = file.uploadedBy;
    if (!uploader) return null;
    if (uploader.role === 'admin') return null;
    const email = uploader.email || '';
    if (email.endsWith('@vnrvjiet.in')) return email.split('@')[0].toUpperCase();
    return uploader.name || email.split('@')[0] || null;
  };
  const uploaderName = getDisplayName();
  const dateStr = formatDate(file.uploadedAt || file.createdAt);

  const isPdf = file.mimeType === 'application/pdf';

  const getPreviewUrl = () => {
    if (!file.filePath) return null;
    if (file.mimeType?.startsWith('image/')) return file.filePath;
    if (isPdf) return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(file.filePath)}`;
    return `https://docs.google.com/viewer?url=${encodeURIComponent(file.filePath)}&embedded=true`;
  };

  const handleDownload = async () => {
    if (!file.filePath) return alert('Download not available.');
    try {
      const res = await fetch(file.filePath);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = file.originalName || 'download';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      recordDownloadApi(file._id);
    } catch {
      window.open(file.filePath, '_blank');
      recordDownloadApi(file._id);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePin = () => {
    const payload = {
      type: 'file',
      id: file._id,
      title: file.originalName,
      subtitle: `${file.regulation || ''} ${file.branch || ''} ${file.subject || ''}`.trim(),
      href: file.regulation && file.branch && file.subject
        ? `/r/${file.regulation}/${file.branch}/${encodeURIComponent(file.subject)}`
        : '/dashboard',
      meta: {
        fileUrl: file.filePath || '',
        mimeType: file.mimeType || '',
        fileName: file.originalName || 'File',
      },
    };

    const sync = async () => {
      try {
        if (saved) {
          await removeSavedItemApi({ type: 'file', itemId: String(file._id) });
        } else {
          await addSavedItem({
            type: 'file',
            itemId: String(file._id),
            title: payload.title,
            subtitle: payload.subtitle,
            href: payload.href,
            meta: payload.meta,
          });
        }
        const next = toggleSavedItem(payload);
        setSaved(next.some(entry => entry.type === 'file' && String(entry.id) === String(file._id)));
      } catch {}
    };

    sync();
  };

  const handleOfflineToggle = async () => {
    if (!file.filePath) return alert('No file path provided.');
    setOfflineLoading(true);
    try {
      if (offline) {
        await removeFileOffline(file.filePath);
        setOffline(false);
      } else {
        const ok = await saveFileOffline(file.filePath);
        if (ok) setOffline(true);
        else alert('Failed to cache file.');
      }
    } finally {
      setOfflineLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.originalName}"?`)) return;
    try { await api.delete(`/admin/files/${file._id}`); window.location.reload(); }
    catch { alert('Delete failed'); }
  };

  const handleRatingSubmit = async () => {
    if (!myStars) return;
    setRatingLoading(true);
    try {
      await rateFile(file._id, myStars, ratingComment);
      const fresh = await getFileRatings(file._id);
      setAvgRating(fresh.avg); setRatingCount(fresh.total);
      setRatingOpen(false); setRatingComment('');
    } catch {}
    finally { setRatingLoading(false); }
  };

  return (
    <>
      {/* Wrapper div so rating panel sits BELOW the file-card row */}
      <div className="file-card-wrapper">
        <article className={`file-card${compact ? ' file-card--compact' : ''}`}>
          <div className={`file-card__icon ${mime.color}`}>
            {mime.icon}
            <span className="file-card__type-label">{mime.label}</span>
          </div>

          <div className="file-card__info">
            <div className="file-card__title-row">
              <h3 className="file-card__name" title={file.originalName}>{file.originalName}</h3>
              {important && <span className="file-card__important-badge">⭐ Important</span>}
              {showStatus && <StatusDot status={file.status} />}
            </div>
            <div className="file-card__meta">
              {uploaderName && <span className="file-card__chip"><User size={11} /> {uploaderName}</span>}
              {dateStr && <span className="file-card__chip"><Calendar size={11} /> {dateStr}</span>}
              {file.fileSize > 0 && <span className="file-card__chip">{formatBytes(file.fileSize)}</span>}
              {file.downloadCount > 0 && <span className="file-card__chip"><TrendingDown size={11} /> {file.downloadCount}</span>}
              {file.year && <span className="file-card__chip"><Clock size={11} /> {file.year}</span>}
              {ratingCount > 0 && (
                <span className="file-card__chip file-card__chip--rating">
                  <Star size={11} fill="currentColor" /> {avgRating} ({ratingCount})
                </span>
              )}
            </div>
          </div>

          <div className="file-card__actions">
            {canPreview && (
              <button className="fc-btn fc-btn--preview" onClick={() => setPreviewOpen(true)}>
                <Eye size={14} /><span>Preview</span>
              </button>
            )}
            <button className="fc-btn fc-btn--download" onClick={handleDownload}>
              <Download size={14} /><span>Download</span>
            </button>
            <button className="fc-btn fc-btn--share" onClick={handleShare} title="Copy link">
              <Share2 size={13} />
              {copied && <span style={{ fontSize: '0.7rem' }}>Copied!</span>}
            </button>
            <button className={`fc-btn fc-btn--pin${saved ? ' fc-btn--pin-active' : ''}`} onClick={handlePin} title={saved ? 'Unpin' : 'Pin to saved items'}>
              <Pin size={13} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button className={`fc-btn fc-btn--offline${offline ? ' fc-btn--offline-active' : ''}`} onClick={handleOfflineToggle} title={offline ? 'Available Offline' : 'Save Offline'}>
              {offlineLoading ? <Loader2 size={13} className="spin" /> : offline ? <HardDrive size={13} color="var(--blue)" /> : <HardDriveDownload size={13} />}
            </button>
            {!isAdmin && (
              <button className="fc-btn fc-btn--rate" onClick={() => setRatingOpen(r => !r)} title="Rate">
                <Star size={13} fill={myStars > 0 ? 'currentColor' : 'none'} />
              </button>
            )}
            {isAdmin && (
              <button className="fc-btn fc-btn--important" title={important ? 'Unmark important' : 'Mark as important'}
                onClick={async () => { try { await toggleImportant(file._id); setImportant(p => !p); } catch {} }}>
                {important ? '⭐' : '☆'}
              </button>
            )}
            {isAdmin && (
              <button className="fc-btn fc-btn--delete" onClick={handleDelete}>
                <Trash2 size={14} /><span>Delete</span>
              </button>
            )}
            {!isAdmin && onReport && (
              <button className="fc-btn fc-btn--flag" onClick={() => onReport(file)}>
                <Flag size={13} />
              </button>
            )}
          </div>
        </article>

        {/* Rating panel — OUTSIDE article, below the card */}
        {ratingOpen && (
          <div className="file-card__rating-panel">
            <p className="file-card__rating-label">Rate this file</p>
            <StarRating value={myStars} onChange={setMyStars} size={20} />
            <input className="file-card__rating-comment" placeholder="Optional comment…"
              value={ratingComment} onChange={e => setRatingComment(e.target.value)} maxLength={300} />
            <div className="file-card__rating-actions">
              <button className="btn btn--primary btn--sm" disabled={!myStars || ratingLoading} onClick={handleRatingSubmit}>
                {ratingLoading ? <Loader2 size={13} className="spin" /> : <Star size={13} />} Submit
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setRatingOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewOpen && canUsePortal && createPortal(
        <div className="preview-modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewOpen(false)}>
          <div className="preview-modal">
            <div className="preview-modal__header">
              <span className="preview-modal__title">{file.originalName}</span>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <a href={file.filePath} target="_blank" rel="noreferrer" className="fc-btn fc-btn--download">
                  <Download size={13} /> Open
                </a>
                <button className="preview-modal__close" onClick={() => setPreviewOpen(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="preview-modal__body">
              {file.mimeType?.startsWith('image/') ? (
                <img src={file.filePath} alt={file.originalName} className="preview-modal__img" />
              ) : (
                <iframe src={getPreviewUrl()} className="preview-modal__iframe" title={file.originalName} allowFullScreen />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
