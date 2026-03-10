// src/components/UploadModal.jsx
import { useEffect, useRef, useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { uploadFile } from '../api/apiClient';

const REGULATIONS = ['R22', 'R18', 'R16', 'R14'];
const EXAM_TYPES  = ['mid1', 'mid2', 'semester'];

/**
 * UploadModal
 * ───────────
 * Slide-up modal for uploading exam papers and subject resources.
 *
 * @param {boolean}  isOpen
 * @param {Function} onClose
 * @param {Function} onSuccess  — called with the new file document on success
 * @param {{ regulation?, branch?, subject? }} prefill — pre-fill from page context
 */
export default function UploadModal({ isOpen, onClose, onSuccess, prefill = {} }) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    regulation: prefill.regulation || '',
    branch:     prefill.branch     || '',
    subject:    prefill.subject    || '',
    category:   'paper',
    examType:   '',
    year:       '',
  });
  const [file,     setFile]     = useState(null);
  const [progress, setProgress] = useState(0);   // 0-100
  const [status,   setStatus]   = useState('idle'); // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  // Re-apply prefill when modal reopens
  useEffect(() => {
    if (isOpen) {
      setForm((f) => ({ ...f, ...prefill }));
      setFile(null);
      setProgress(0);
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen, prefill.regulation, prefill.branch, prefill.subject]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setErrorMsg('Please select a file.');

    const fd = new FormData();
    fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });

    try {
      setStatus('uploading');
      setErrorMsg('');
      const newFile = await uploadFile(fd, (loaded, total) => {
        setProgress(Math.round((loaded / total) * 100));
      });
      setStatus('success');
      setTimeout(() => {
        onSuccess?.(newFile);
        onClose();
      }, 1200);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
      setProgress(0);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Upload file">
        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">
            <FileUp size={20} /> Upload File
          </h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>
          {/* Row 1: Regulation + Branch */}
          <div className="modal__row modal__row--2col">
            <label className="modal__label">
              Regulation *
              <select className="modal__select" value={form.regulation} onChange={set('regulation')} required>
                <option value="">Select…</option>
                {REGULATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="modal__label">
              Branch *
              <input
                className="modal__input"
                type="text"
                placeholder="e.g. CSE"
                value={form.branch}
                onChange={set('branch')}
                required
              />
            </label>
          </div>

          {/* Row 2: Subject */}
          <label className="modal__label">
            Subject *
            <input
              className="modal__input"
              type="text"
              placeholder="e.g. Data Structures"
              value={form.subject}
              onChange={set('subject')}
              required
            />
          </label>

          {/* Row 3: Category + ExamType */}
          <div className="modal__row modal__row--2col">
            <label className="modal__label">
              Category *
              <select className="modal__select" value={form.category} onChange={set('category')} required>
                <option value="paper">Exam Paper</option>
                <option value="resource">Resource</option>
              </select>
            </label>
            {form.category === 'paper' && (
              <label className="modal__label">
                Exam Type *
                <select className="modal__select" value={form.examType} onChange={set('examType')} required>
                  <option value="">Select…</option>
                  {EXAM_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>
            )}
          </div>

          {/* Year */}
          <label className="modal__label">
            Year (optional)
            <input
              className="modal__input"
              type="number"
              placeholder="e.g. 2024"
              min="2000" max="2100"
              value={form.year}
              onChange={set('year')}
            />
          </label>

          {/* Drop zone */}
          <div
            className={`modal__dropzone${file ? ' modal__dropzone--has-file' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="modal__file-input"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file ? (
              <div className="modal__file-chosen">
                <CheckCircle size={20} className="modal__file-icon--ok" />
                <span>{file.name}</span>
                <span className="modal__file-size">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            ) : (
              <>
                <Upload size={28} className="modal__dropzone-icon" />
                <p className="modal__dropzone-text">Drag & drop or <span>browse</span></p>
                <p className="modal__dropzone-hint">PDF, PPT, DOCX, images — max 25 MB</p>
              </>
            )}
          </div>

          {/* Progress bar */}
          {status === 'uploading' && (
            <div className="modal__progress-wrap">
              <div className="modal__progress-bar" style={{ width: `${progress}%` }} />
              <span className="modal__progress-label">{progress}%</span>
            </div>
          )}

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div className="modal__error">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="modal__success">
              <CheckCircle size={16} /> Uploaded! Awaiting admin approval.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="modal__submit"
            disabled={status === 'uploading' || status === 'success'}
          >
            {status === 'uploading' ? `Uploading… ${progress}%` : 'Upload File'}
          </button>
        </form>
      </div>
    </div>
  );
}
