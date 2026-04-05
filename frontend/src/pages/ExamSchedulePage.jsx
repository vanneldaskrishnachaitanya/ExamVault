import { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Trash2, Loader2, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// API helpers — uses your existing apiClient pattern
import api from '../api/apiClient';

const fetchExams    = async () => { const { data } = await api.get('/exams'); return data.data; };
const createExam    = async (payload) => { const { data } = await api.post('/exams', payload); return data.data; };
const deleteExam    = async (id) => { const { data } = await api.delete(`/exams/${id}`); return data; };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EXAM_TYPES_LABEL = { mid1: 'Mid-1', mid2: 'Mid-2', semester: 'Semester', other: 'Other' };
const TYPE_COLORS = {
  mid1:     { bg: '#3b82f618', border: '#3b82f640', color: '#60a5fa' },
  mid2:     { bg: '#f59e0b18', border: '#f59e0b40', color: '#fbbf24' },
  semester: { bg: '#ef444418', border: '#ef444440', color: '#f87171' },
  other:    { bg: '#a855f718', border: '#a855f740', color: '#c084fc' },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function ExamSchedulePage() {
  const { backendUser } = useAuth();
  const isStaff = backendUser?.role === 'admin' || backendUser?.role === 'faculty';

  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ title: '', subject: '', date: '', examType: 'mid1', regulation: 'R22', branch: 'CSE', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast,     setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await fetchExams(); setExams(d.exams || []); }
    catch { setExams([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title || !form.date) { showToast('Title and date are required'); return; }
    setSubmitting(true);
    try {
      const d = await createExam(form);
      setExams(prev => [...prev, d.exam].sort((a,b) => new Date(a.date) - new Date(b.date)));
      setShowForm(false);
      setForm({ title: '', subject: '', date: '', examType: 'mid1', regulation: 'R22', branch: 'CSE', notes: '' });
      showToast('Exam added ✓');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    try { await deleteExam(id); setExams(prev => prev.filter(e => e._id !== id)); showToast('Deleted'); }
    catch (e) { showToast(`Error: ${e.message}`); }
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); };

  // Group exams by date string
  const examsByDate = exams.reduce((acc, ex) => {
    const d = ex.date?.slice(0,10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(ex);
    return acc;
  }, {});

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDay     = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr     = today.toISOString().slice(0,10);

  // Upcoming exams (next 30 days)
  const upcoming = exams.filter(e => {
    const d = new Date(e.date);
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 30;
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="exam-page">
      <div className="exam-page__header">
        {isStaff && (
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            <Plus size={14} /> Add Exam
          </button>
        )}
      </div>

      {showForm && isStaff && (
        <div className="exam-form">
          <div className="exam-form__grid">
            <label className="modal__label">Title *
              <input className="modal__input" placeholder="e.g. Mid-1 Exam" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
            </label>
            <label className="modal__label">Date *
              <input className="modal__input" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
            </label>
            <label className="modal__label">Subject
              <input className="modal__input" placeholder="e.g. Data Structures" value={form.subject} onChange={e => setForm(f=>({...f,subject:e.target.value}))} />
            </label>
            <label className="modal__label">Type
              <select className="modal__select" value={form.examType} onChange={e => setForm(f=>({...f,examType:e.target.value}))}>
                <option value="mid1">Mid-1</option>
                <option value="mid2">Mid-2</option>
                <option value="semester">Semester</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="modal__label">Regulation
              <select className="modal__select" value={form.regulation} onChange={e => setForm(f=>({...f,regulation:e.target.value}))}>
                <option value="R25">R25</option>
                <option value="R22">R22</option>
                <option value="R19">R19</option>
              </select>
            </label>
            <label className="modal__label">Branch
              <input className="modal__input" placeholder="e.g. CSE" value={form.branch} onChange={e => setForm(f=>({...f,branch:e.target.value}))} />
            </label>
          </div>
          <label className="modal__label" style={{marginTop:'0.5rem'}}>Notes (optional)
            <textarea className="modal__input" rows={2} placeholder="Additional info…" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{resize:'vertical'}} />
          </label>
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem'}}>
            <button className="btn btn--primary" disabled={submitting} onClick={handleCreate}>
              {submitting ? <Loader2 size={14} className="spin"/> : <Plus size={14}/>} Save
            </button>
            <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="exam-layout">
        {/* Calendar */}
        <div className="exam-calendar">
          <div className="exam-calendar__nav">
            <button className="btn btn--ghost btn--sm" onClick={prevMonth}>‹</button>
            <h2 className="exam-calendar__month">{MONTHS[viewMonth]} {viewYear}</h2>
            <button className="btn btn--ghost btn--sm" onClick={nextMonth}>›</button>
          </div>

          <div className="exam-calendar__grid">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="exam-calendar__day-label">{d}</div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({length: firstDay}).map((_,i) => (
              <div key={`empty-${i}`} className="exam-calendar__cell exam-calendar__cell--empty" />
            ))}

            {/* Day cells */}
            {Array.from({length: daysInMonth}).map((_,i) => {
              const day    = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayExams = examsByDate[dateStr] || [];
              const isToday  = dateStr === todayStr;

              return (
                <div key={day} className={`exam-calendar__cell${isToday?' exam-calendar__cell--today':''}${dayExams.length?' exam-calendar__cell--has-exam':''}`}>
                  <span className="exam-calendar__date">{day}</span>
                  {dayExams.slice(0,2).map((ex,idx) => {
                    const tc = TYPE_COLORS[ex.examType] || TYPE_COLORS.other;
                    return (
                      <div key={idx} className="exam-calendar__dot" style={{background: tc.color}} title={ex.title} />
                    );
                  })}
                  {dayExams.length > 2 && <span className="exam-calendar__more">+{dayExams.length-2}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming exams */}
        <div className="exam-upcoming">
          <h3 className="exam-upcoming__title"><Clock size={15} /> Upcoming (30 days)</h3>
          {loading ? (
            <div className="sp-state sp-state--loading" style={{padding:'2rem 0'}}><Loader2 size={20} className="spin"/></div>
          ) : upcoming.length === 0 ? (
            <div className="exam-empty"><AlertCircle size={28}/><p>No upcoming exams</p></div>
          ) : (
            <div className="exam-list">
              {upcoming.map(ex => {
                const tc = TYPE_COLORS[ex.examType] || TYPE_COLORS.other;
                const d  = new Date(ex.date);
                const daysLeft = Math.ceil((d - today) / 86400000);
                return (
                  <div key={ex._id} className="exam-item" style={{borderLeftColor: tc.color}}>
                    <div className="exam-item__left">
                      <span className="exam-item__type" style={{background: tc.bg, color: tc.color, border:`1px solid ${tc.border}`}}>
                        {EXAM_TYPES_LABEL[ex.examType] || ex.examType}
                      </span>
                      <div>
                        <p className="exam-item__title">{ex.title}</p>
                        {ex.subject && <p className="exam-item__subject"><BookOpen size={11}/> {ex.subject} · {ex.regulation} · {ex.branch}</p>}
                        {ex.notes && <p className="exam-item__notes">{ex.notes}</p>}
                      </div>
                    </div>
                    <div className="exam-item__right">
                      <p className="exam-item__date">{d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</p>
                      <p className="exam-item__days" style={{color: daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--text-3)'}}>
                        {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
                      </p>
                      {isStaff && (
                        <button className="btn btn--sm btn--danger" style={{padding:'0.2rem 0.4rem'}} onClick={() => handleDelete(ex._id)}>
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
