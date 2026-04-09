// src/components/UploadModal.jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, CheckCircle, AlertCircle, FileUp } from 'lucide-react';
import { uploadFile, fetchBranches } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = [
  { id: 'R25', label: 'R25 — Regulation 2025' },
  { id: 'R22', label: 'R22 — Regulation 2022' },
  { id: 'R19', label: 'R19 — Regulation 2019' },
];

const EXAM_TYPES = [
  { id: 'mid1',     label: 'Mid-1'    },
  { id: 'mid2',     label: 'Mid-2'    },
  { id: 'semester', label: 'Semester' },
];

const DEFAULT_BRANCHES = [
  'CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML',
];

export default function UploadModal({ isOpen, onClose, onSuccess, prefill = {} }) {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    regulation: prefill.regulation || '',
    branch:     prefill.branch     || '',
    subject:    prefill.subject    || '',
    category:   prefill.category   || 'paper',
    examType:   '',
    year:            '',
    hideUploaderName: false,
  });

  const [file,       setFile]       = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [status,     setStatus]     = useState('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [branches,   setBranches]   = useState(DEFAULT_BRANCHES);
  const canUsePortal = typeof document !== 'undefined' && !!document.body;

  // Load branches from API
  useEffect(() => {
    fetchBranches()
      .then(d => { if (d?.branches?.length) setBranches(d.branches.map(b => b.id)); })
      .catch(() => {});
  }, []);

  // Re-apply prefill when modal reopens
  useEffect(() => {
    if (isOpen) {
      setForm({
        regulation: prefill.regulation || '',
        branch:     prefill.branch     || '',
        subject:    prefill.subject    || '',
        category:   prefill.category   || 'paper',
        examType:   '',
        year:            '',
    hideUploaderName: false,
      });
      setFile(null);
      setProgress(0);
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen, prefill.regulation, prefill.branch, prefill.subject, prefill.category]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

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
    if (!form.regulation) return setErrorMsg('Please select a regulation.');
    if (!form.branch) return setErrorMsg('Please select a branch.');
    if (!form.subject) return setErrorMsg('Please enter a subject name.');
    if (form.category === 'paper' && !form.examType) return setErrorMsg('Please select an exam type.');

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

  const modalUi = (
    <div className="modal-overlay modal-overlay--upload" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--upload" role="dialog" aria-modal="true" aria-label="Upload file">

        <div className="modal__header">
          <h2 className="modal__title"><FileUp size={20} /> Upload File</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <form className="modal__form" onSubmit={handleSubmit}>

          {/* Row 1: Regulation + Branch */}
          <div className="modal__row modal__row--2col">
            <label className="modal__label">
              Regulation *
              <select className="modal__select" value={form.regulation} onChange={set('regulation')} required>
                <option value="">Select…</option>
                {REGULATIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="modal__label">
              Branch *
              <select className="modal__select" value={form.branch} onChange={set('branch')} required>
                <option value="">Select…</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Row 2: Subject */}
          <label className="modal__label">
            Subject *
            <input className="modal__input" type="text"
              placeholder="e.g. Data Structures"
              value={form.subject} onChange={set('subject')} required />
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
            <label className={`modal__label ${form.category !== 'paper' ? 'modal__label--disabled' : ''}`}>
              Exam Type *
              <select
                className="modal__select"
                value={form.examType}
                onChange={set('examType')}
                required={form.category === 'paper'}
                disabled={form.category !== 'paper'}
              >
                <option value="">{form.category === 'paper' ? 'Select…' : 'Not required for resources'}</option>
                {EXAM_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Year */}
          <label className="modal__label">
            Year (optional)
            <input className="modal__input" type="number"
              placeholder="e.g. 2024" min="2000" max="2100"
              value={form.year} onChange={set('year')} />
          </label>

          {/* Drop zone */}
          <div
            className={`modal__dropzone${file ? ' modal__dropzone--has-file' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" className="modal__file-input"
              onChange={e => setFile(e.target.files[0] || null)} />
            {file ? (
              <div className="modal__file-chosen">
                <CheckCircle size={20} className="modal__file-icon--ok" />
                <span>{file.name}</span>
                <span className="modal__file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            ) : (
              <>
                <Upload size={28} className="modal__dropzone-icon" />
                <p className="modal__dropzone-text">Drag & drop or <span>browse</span></p>
                <p className="modal__dropzone-hint">PDF, PPT, DOCX, images — max 25 MB</p>
              </>
            )}
          </div>

          {/* Progress */}
          {status === 'uploading' && (
            <div className="modal__progress-wrap">
              <div className="modal__progress-bar" style={{ width: `${progress}%` }} />
              <span className="modal__progress-label">{progress}%</span>
            </div>
          )}

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div className="modal__error"><AlertCircle size={16} /> {errorMsg}</div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="modal__success"><CheckCircle size={16} /> Uploaded! Awaiting admin approval.</div>
          )}

          {isAdmin && (
            <label style={{display:'flex',alignItems:'center',gap:'0.6rem',fontSize:'0.85rem',color:'var(--text-2)',cursor:'pointer',marginBottom:'0.5rem'}}>
              <input type="checkbox" checked={form.hideUploaderName}
                onChange={e => setForm(f=>({...f,hideUploaderName:e.target.checked}))} />
              Hide my name from this file
            </label>
          )}
          {/* Submit */}
          <button type="submit" className="modal__submit" data-no-magnetic="true"
            disabled={status === 'uploading' || status === 'success'}>
            {status === 'uploading' ? `Uploading… ${progress}%` : 'Upload File'}
          </button>

        </form>
      </div>
    </div>
  );

  return canUsePortal ? createPortal(modalUi, document.body) : modalUi;
}
