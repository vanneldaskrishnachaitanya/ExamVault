import { useEffect, useState, useRef } from 'react';
import { BookOpen, Upload, Trash2, Loader2, FileText, Eye, Download, Plus, X } from 'lucide-react';
import { fetchSyllabus, uploadSyllabus, deleteSyllabus } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = ['R25', 'R22', 'R19'];
const BRANCHES    = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML'];
const YEARS       = ['1', '2', '3', '4'];

const formatBytes = (b) => !b ? '' : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

export default function SyllabusPage() {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const fileRef = useRef(null);

  const [syllabi,    setSyllabi]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [regulation, setRegulation] = useState('R22');
  const [branch,     setBranch]     = useState('CSE');
  const [year,       setYear]       = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ regulation:'R22', branch:'CSE', year:'1', title:'' });
  const [file,       setFile]       = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [toast,      setToast]      = useState('');
  const [preview,    setPreview]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const params = { regulation, branch };
      if (year) params.year = year;
      const d = await fetchSyllabus(params);
      setSyllabi(d.syllabi || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [regulation, branch, year]);

  const handleUpload = async () => {
    if (!file) { showToast('Please select a file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    setUploading(true);
    try {
      const d = await uploadSyllabus(fd);
      setSyllabi(prev => [d.syllabus, ...prev]);
      setShowForm(false); setFile(null);
      setForm({ regulation:'R22', branch:'CSE', year:'1', title:'' });
      showToast('Syllabus uploaded ✓');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this syllabus?')) return;
    try {
      await deleteSyllabus(id);
      setSyllabi(prev => prev.filter(s => s._id !== id));
      showToast('Deleted');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const grouped = syllabi.reduce((acc, s) => {
    const k = `Year ${s.year}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  return (
    <div className="syllabus-page">
      <div className="syllabus-page__header">
        <h1 className="syllabus-page__title"><BookOpen size={22}/> Syllabus</h1>
        {isAdmin && (
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            <Plus size={14}/> Upload Syllabus
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="syllabus-filters">
        <label className="modal__label">
          Regulation
          <select className="modal__select" value={regulation} onChange={e => setRegulation(e.target.value)}>
            {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="modal__label">
          Branch
          <select className="modal__select" value={branch} onChange={e => setBranch(e.target.value)}>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="modal__label">
          Year
          <select className="modal__select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </label>
      </div>

      {/* Upload Form */}
      {showForm && isAdmin && (
        <div className="syllabus-form">
          <h3 className="syllabus-form__title">Upload Syllabus PDF</h3>
          <div className="syllabus-form__grid">
            <label className="modal__label">Regulation
              <select className="modal__select" value={form.regulation} onChange={e => setForm(f=>({...f,regulation:e.target.value}))}>
                {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="modal__label">Branch
              <select className="modal__select" value={form.branch} onChange={e => setForm(f=>({...f,branch:e.target.value}))}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="modal__label">Year
              <select className="modal__select" value={form.year} onChange={e => setForm(f=>({...f,year:e.target.value}))}>
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </label>
          </div>
          <label className="modal__label" style={{marginTop:'0.5rem'}}>Title (optional)
            <input className="modal__input" placeholder={`${form.regulation} ${form.branch} Year ${form.year} Syllabus`}
              value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
          </label>
          <div className="modal__dropzone" style={{marginTop:'0.75rem', cursor:'pointer'}}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
              onChange={e => setFile(e.target.files[0] || null)} />
            {file ? (
              <span style={{color:'var(--success)',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                ✓ {file.name} ({formatBytes(file.size)})
              </span>
            ) : (
              <span style={{color:'var(--text-3)'}}>Click to select PDF/DOCX</span>
            )}
          </div>
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem'}}>
            <button className="btn btn--primary" disabled={uploading} onClick={handleUpload}>
              {uploading ? <Loader2 size={14} className="spin"/> : <Upload size={14}/>} Upload
            </button>
            <button className="btn btn--ghost" onClick={() => { setShowForm(false); setFile(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Syllabus list */}
      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin"/></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="sp-state sp-state--empty">
          <BookOpen size={40}/>
          <p>No syllabi uploaded yet for {regulation} · {branch}{year ? ` · Year ${year}` : ''}</p>
          {isAdmin && <button className="btn btn--primary btn--sm" onClick={() => setShowForm(true)}><Plus size={14}/> Upload now</button>}
        </div>
      ) : (
        Object.entries(grouped).sort().map(([yearLabel, items]) => (
          <div key={yearLabel} className="syllabus-year-group">
            <h3 className="syllabus-year-label">{yearLabel}</h3>
            <div className="syllabus-list">
              {items.map(s => (
                <div key={s._id} className="syllabus-item">
                  <div className="syllabus-item__icon"><FileText size={22}/></div>
                  <div className="syllabus-item__body">
                    <p className="syllabus-item__title">{s.title}</p>
                    <p className="syllabus-item__meta">{s.regulation} · {s.branch} · Year {s.year} · {formatBytes(s.fileSize)}</p>
                  </div>
                  <div className="syllabus-item__actions">
                    <button className="fc-btn fc-btn--preview" onClick={() => setPreview(s)}>
                      <Eye size={13}/> Preview
                    </button>
                    <a href={s.fileUrl} download={s.fileName} className="fc-btn fc-btn--download">
                      <Download size={13}/> Download
                    </a>
                    {isAdmin && (
                      <button className="fc-btn fc-btn--delete" onClick={() => handleDelete(s._id)}>
                        <Trash2 size={13}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Preview modal */}
      {preview && (
        <div className="preview-modal-overlay" onClick={e => e.target===e.currentTarget && setPreview(null)}>
          <div className="preview-modal">
            <div className="preview-modal__header">
              <span className="preview-modal__title">{preview.title}</span>
              <button className="preview-modal__close" onClick={() => setPreview(null)}><X size={16}/></button>
            </div>
            <div className="preview-modal__body">
              <iframe
                src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(preview.fileUrl)}`}
                className="preview-modal__iframe" title={preview.title} allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
