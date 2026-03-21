import { useEffect, useState, useRef } from 'react';
import { Clock, Upload, Trash2, Loader2, FileText, Eye, Download, Plus, X } from 'lucide-react';
import { fetchTimetable, uploadTimetable, deleteTimetable, fetchBranches } from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

const REGULATIONS = ['R25', 'R22', 'R19'];
const DEFAULT_BRANCHES = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML'];
const YEARS       = ['1', '2', '3', '4'];
const SEMS = [
  { id:'mid1', label:'Mid-1'    },
  { id:'mid2', label:'Mid-2'    },
  { id:'sem',  label:'Semester' },
];
const formatBytes = (b) => !b ? '' : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

export default function TimetablePage() {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const fileRef = useRef(null);

  const [timetables, setTimetables] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [regulation, setRegulation] = useState('R22');
  const [branch,     setBranch]     = useState('CSE');
  const [year,       setYear]       = useState('');
  const [sem,        setSem]        = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ regulation:'R22', branch:'CSE', year:'1', sem:'mid1', title:'' });
  const [file,       setFile]       = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [branches,   setBranches]   = useState(DEFAULT_BRANCHES);
  const [toast,      setToast]      = useState('');
  const [preview,    setPreview]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const params = { regulation, branch };
      if (year) params.year = year;
      if (sem)  params.sem  = sem;
      const d = await fetchTimetable(params);
      setTimetables(d.timetables || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBranches()
      .then(d => { if (d?.branches?.length) setBranches(d.branches.map(b => b.id)); })
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [regulation, branch, year, sem]);

  const handleUpload = async () => {
    if (!file) { showToast('Please select a file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
    setUploading(true);
    try {
      const d = await uploadTimetable(fd);
      setTimetables(prev => [d.timetable, ...prev]);
      setShowForm(false); setFile(null);
      setForm({ regulation:'R22', branch:'CSE', year:'1', sem:'1', title:'' });
      showToast('Timetable uploaded ✓');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this timetable?')) return;
    try {
      await deleteTimetable(id);
      setTimetables(prev => prev.filter(t => t._id !== id));
      showToast('Deleted');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  return (
    <div className="syllabus-page">
      <div className="syllabus-page__header">
        <h1 className="syllabus-page__title"><Clock size={22}/> Timetables</h1>
        {isAdmin && (
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            <Plus size={14}/> Upload Timetable
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="syllabus-filters">
        <label className="modal__label">Regulation
          <select className="modal__select" value={regulation} onChange={e => setRegulation(e.target.value)}>
            {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="modal__label">Branch
          <select className="modal__select" value={branch} onChange={e => setBranch(e.target.value)}>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className="modal__label">Year
          <select className="modal__select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </label>
        <label className="modal__label">Semester
          <select className="modal__select" value={sem} onChange={e => setSem(e.target.value)}>
            <option value="">All Sems</option>
            {SEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {/* Upload Form */}
      {showForm && isAdmin && (
        <div className="syllabus-form">
          <h3 className="syllabus-form__title">Upload Timetable PDF</h3>
          <div className="syllabus-form__grid">
            <label className="modal__label">Regulation
              <select className="modal__select" value={form.regulation} onChange={e => setForm(f=>({...f,regulation:e.target.value}))}>
                {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="modal__label">Branch
              <select className="modal__select" value={form.branch} onChange={e => setForm(f=>({...f,branch:e.target.value}))}>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="modal__label">Year
              <select className="modal__select" value={form.year} onChange={e => setForm(f=>({...f,year:e.target.value}))}>
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </label>
            <label className="modal__label">Semester
              <select className="modal__select" value={form.sem} onChange={e => setForm(f=>({...f,sem:e.target.value}))}>
                {SEMS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label className="modal__label" style={{marginTop:'0.5rem'}}>Title (optional)
            <input className="modal__input" placeholder={`${form.regulation} ${form.branch} Y${form.year} S${form.sem} Timetable`}
              value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
          </label>
          <div className="modal__dropzone" style={{marginTop:'0.75rem', cursor:'pointer'}} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
              onChange={e => setFile(e.target.files[0] || null)} />
            {file ? (
              <span style={{color:'var(--success)',display:'flex',alignItems:'center',gap:'0.4rem'}}>✓ {file.name}</span>
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

      {/* Timetable list */}
      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin"/></div>
      ) : timetables.length === 0 ? (
        <div className="sp-state sp-state--empty">
          <Clock size={40}/>
          <p>No timetables uploaded yet for {regulation} · {branch}</p>
          {isAdmin && <button className="btn btn--primary btn--sm" onClick={() => setShowForm(true)}><Plus size={14}/> Upload now</button>}
        </div>
      ) : (
        <div className="syllabus-list">
          {timetables.map(t => (
            <div key={t._id} className="syllabus-item">
              <div className="syllabus-item__icon"><FileText size={22}/></div>
              <div className="syllabus-item__body">
                <p className="syllabus-item__title">{t.title}</p>
                <p className="syllabus-item__meta">{t.regulation} · {t.branch} · Year {t.year} · {SEMS.find(s=>s.id===t.sem)?.label || t.sem} · {formatBytes(t.fileSize)}</p>
              </div>
              <div className="syllabus-item__actions">
                <button className="fc-btn fc-btn--preview" onClick={() => setPreview(t)}>
                  <Eye size={13}/> Preview
                </button>
                <button className="fc-btn fc-btn--download" onClick={async () => {
                    try {
                      const res = await fetch(t.fileUrl);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = t.fileName;
                      document.body.appendChild(a); a.click();
                      document.body.removeChild(a); URL.revokeObjectURL(url);
                    } catch { window.open(t.fileUrl, '_blank'); }
                  }}>
                  <Download size={13}/> Download
                </button>
                {isAdmin && (
                  <button className="fc-btn fc-btn--delete" onClick={() => handleDelete(t._id)}>
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
