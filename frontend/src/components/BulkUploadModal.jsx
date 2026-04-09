// src/components/BulkUploadModal.jsx
import { useEffect, useRef, useState } from 'react';
import { X, Upload, CheckCircle, AlertCircle, FileUp, Trash2, Loader2, Plus } from 'lucide-react';
import { uploadFile, fetchBranches } from '../api/apiClient';

const REGULATIONS = [
  { id: 'R25', label: 'R25' },
  { id: 'R22', label: 'R22' },
  { id: 'R19', label: 'R19' },
];
const EXAM_TYPES = [
  { id: 'mid1',     label: 'Mid-1'    },
  { id: 'mid2',     label: 'Mid-2'    },
  { id: 'semester', label: 'Semester' },
];
const DEFAULT_BRANCHES = ['CSE','ECE','EEE','IT','MECH','CIVIL','AIML'];

// Each row = one file + its metadata
const newRow = () => ({
  id:       Math.random().toString(36).slice(2),
  file:     null,
  subject:  '',
  category: 'paper',
  examType: 'mid1',
  year:     '',
  status:   'idle', // idle | uploading | success | error
  error:    '',
  progress: 0,
});

export default function BulkUploadModal({ isOpen, onClose, onDone, prefill = {} }) {
  const fileInputRef = useRef(null);
  const [rows,       setRows]       = useState([newRow()]);
  const [regulation, setRegulation] = useState(prefill.regulation || 'R22');
  const [branch,     setBranch]     = useState(prefill.branch || '');
  const [branches,   setBranches]   = useState(DEFAULT_BRANCHES);
  const [uploading,  setUploading]  = useState(false);

  useEffect(() => {
    fetchBranches().then(d => { if (d?.branches?.length) setBranches(d.branches.map(b => b.id)); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) { setRows([newRow()]); setRegulation(prefill.regulation || 'R22'); setBranch(prefill.branch || ''); }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateRow = (id, patch) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const addRow = () => setRows(prev => [...prev, newRow()]);

  const removeRow = (id) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const handleFileSelect = (id, file) => updateRow(id, { file });

  const handleDrop = (id, e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) updateRow(id, { file });
  };

  const uploadAll = async () => {
    const valid = rows.filter(r => r.file && r.subject.trim());
    if (!valid.length) return;
    if (!regulation || !branch) { alert('Set regulation and branch first'); return; }

    setUploading(true);
    for (const row of valid) {
      updateRow(row.id, { status: 'uploading', error: '' });
      try {
        const fd = new FormData();
        fd.append('file', row.file);
        fd.append('regulation', regulation);
        fd.append('branch', branch);
        fd.append('subject', row.subject.trim());
        fd.append('category', row.category);
        if (row.category === 'paper') fd.append('examType', row.examType);
        if (row.year) fd.append('year', row.year);

        await uploadFile(fd, (loaded, total) => {
          updateRow(row.id, { progress: Math.round((loaded / total) * 100) });
        });
        updateRow(row.id, { status: 'success', progress: 100 });
      } catch (e) {
        updateRow(row.id, { status: 'error', error: e.message, progress: 0 });
      }
    }
    setUploading(false);
    onDone?.();
  };

  const allDone   = rows.every(r => !r.file || r.status === 'success');
  const hasErrors = rows.some(r => r.status === 'error');
  const readyCount = rows.filter(r => r.file && r.subject.trim()).length;

  return (
    <div className="modal-overlay modal-overlay--upload" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--upload modal--bulk" role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2 className="modal__title"><FileUp size={20} /> Bulk Upload</h2>
          <button className="modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal__form">
          {/* Shared regulation + branch */}
          <div className="modal__row modal__row--2col" style={{marginBottom:'1rem'}}>
            <label className="modal__label">Regulation *
              <select className="modal__select" value={regulation} onChange={e => setRegulation(e.target.value)}>
                {REGULATIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </label>
            <label className="modal__label">Branch *
              <select className="modal__select" value={branch} onChange={e => setBranch(e.target.value)}>
                <option value="">Select…</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          </div>

          {/* File rows */}
          <div className="bulk-rows">
            {rows.map((row, idx) => (
              <div key={row.id} className={`bulk-row bulk-row--${row.status}`}>
                <div className="bulk-row__num">{idx + 1}</div>

                {/* Drop zone */}
                <div className="bulk-row__drop"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(row.id, e)}
                  onClick={() => { const inp = document.getElementById(`bulk-file-${row.id}`); inp?.click(); }}>
                  <input id={`bulk-file-${row.id}`} type="file" style={{display:'none'}}
                    onChange={e => handleFileSelect(row.id, e.target.files[0] || null)} />
                  {row.file ? (
                    <span className="bulk-row__filename" title={row.file.name}>
                      {row.status === 'success' && <CheckCircle size={13} style={{color:'var(--success)'}}/>}
                      {row.status === 'error'   && <AlertCircle size={13} style={{color:'var(--danger)'}}/>}
                      {row.status === 'uploading' && <Loader2 size={13} className="spin"/>}
                      {row.file.name.length > 22 ? row.file.name.slice(0,22)+'…' : row.file.name}
                    </span>
                  ) : (
                    <span className="bulk-row__placeholder"><Upload size={12}/> Drop or click</span>
                  )}
                </div>

                {/* Subject */}
                <input className="modal__input bulk-row__subject" placeholder="Subject name *"
                  value={row.subject} onChange={e => updateRow(row.id, { subject: e.target.value })}
                  disabled={row.status === 'success'} />

                {/* Category */}
                <select className="modal__select bulk-row__cat"
                  value={row.category} onChange={e => updateRow(row.id, { category: e.target.value })}
                  disabled={row.status === 'success'}>
                  <option value="paper">Paper</option>
                  <option value="resource">Resource</option>
                </select>

                {/* Exam type slot kept stable to avoid row jumping */}
                <select
                  className="modal__select bulk-row__exam"
                  value={row.examType}
                  onChange={e => updateRow(row.id, { examType: e.target.value })}
                  disabled={row.status === 'success' || row.category !== 'paper'}
                >
                  {row.category !== 'paper' && <option value="">N/A for resource</option>}
                  {EXAM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>

                {/* Progress bar */}
                {row.status === 'uploading' && (
                  <div className="bulk-row__progress">
                    <div className="bulk-row__progress-fill" style={{width:`${row.progress}%`}}/>
                  </div>
                )}

                {/* Error */}
                {row.status === 'error' && (
                  <span className="bulk-row__error" title={row.error}>
                    <AlertCircle size={12}/> {row.error.slice(0,30)}
                  </span>
                )}

                {/* Remove */}
                {row.status !== 'success' && rows.length > 1 && (
                  <button className="bulk-row__remove" onClick={() => removeRow(row.id)} disabled={uploading}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add row */}
          {!allDone && (
            <button className="btn btn--ghost btn--sm" style={{marginTop:'0.5rem'}} onClick={addRow} disabled={uploading}>
              <Plus size={13}/> Add another file
            </button>
          )}

          {/* Summary */}
          {readyCount > 0 && !uploading && !allDone && (
            <p style={{fontSize:'0.8rem',color:'var(--text-3)',marginTop:'0.5rem'}}>
              {readyCount} file{readyCount > 1 ? 's' : ''} ready to upload
            </p>
          )}

          {allDone && readyCount > 0 && (
            <div className="modal__success" style={{marginTop:'0.75rem'}}>
              <CheckCircle size={16}/> All files uploaded! Awaiting admin approval.
            </div>
          )}

          {hasErrors && (
            <div className="modal__error" style={{marginTop:'0.5rem'}}>
              <AlertCircle size={14}/> Some files failed. Check errors above and retry.
            </div>
          )}

          {/* Submit */}
          {!allDone && (
            <button className="modal__submit" style={{marginTop:'1rem'}}
              disabled={uploading || readyCount === 0 || !branch}
              onClick={uploadAll}>
              {uploading
                ? <><Loader2 size={14} className="spin"/> Uploading…</>
                : <><Upload size={14}/> Upload {readyCount} File{readyCount !== 1 ? 's' : ''}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
