import { useState } from 'react';
import { Calculator, Plus, Trash2, RotateCcw } from 'lucide-react';

const GRADE_POINTS = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0,
};

const newSubject = () => ({ id: Math.random().toString(36).slice(2), name: '', grade: 'O', credits: 3 });

export default function CGPACalculatorPage() {
  const [semesters, setSemesters] = useState([
    { id: 's1', label: 'Semester 1', subjects: [newSubject()] },
  ]);
  const [activeTab, setActiveTab] = useState('s1');

  const activeSem  = semesters.find(s => s.id === activeTab);
  const updateSem  = (id, patch) => setSemesters(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const addSubject = () => updateSem(activeTab, {
    subjects: [...activeSem.subjects, newSubject()]
  });

  const removeSubject = (subId) => updateSem(activeTab, {
    subjects: activeSem.subjects.filter(s => s.id !== subId)
  });

  const updateSubject = (subId, patch) => updateSem(activeTab, {
    subjects: activeSem.subjects.map(s => s.id === subId ? { ...s, ...patch } : s)
  });

  const addSemester = () => {
    const id = `s${semesters.length + 1}`;
    setSemesters(prev => [...prev, { id, label: `Semester ${semesters.length + 1}`, subjects: [newSubject()] }]);
    setActiveTab(id);
  };

  const removeSemester = (id) => {
    if (semesters.length === 1) return;
    const remaining = semesters.filter(s => s.id !== id);
    setSemesters(remaining);
    if (activeTab === id) setActiveTab(remaining[0].id);
  };

  const calcSGPA = (subjects) => {
    const valid = subjects.filter(s => s.credits > 0);
    if (!valid.length) return 0;
    const totalPoints  = valid.reduce((sum, s) => sum + (GRADE_POINTS[s.grade] ?? 0) * s.credits, 0);
    const totalCredits = valid.reduce((sum, s) => sum + Number(s.credits), 0);
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  const calcCGPA = () => {
    let totalPoints = 0, totalCredits = 0;
    semesters.forEach(sem => {
      sem.subjects.filter(s => s.credits > 0).forEach(s => {
        totalPoints  += (GRADE_POINTS[s.grade] ?? 0) * Number(s.credits);
        totalCredits += Number(s.credits);
      });
    });
    return totalCredits ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  const reset = () => {
    setSemesters([{ id: 's1', label: 'Semester 1', subjects: [newSubject()] }]);
    setActiveTab('s1');
  };

  const cgpa    = calcCGPA();
  const sgpa    = calcSGPA(activeSem?.subjects || []);
  const cgpaNum = parseFloat(cgpa);
  const cgpaColor = cgpaNum >= 9 ? 'var(--success)' : cgpaNum >= 7 ? 'var(--amber)' : cgpaNum >= 5 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="cgpa-page">
      <div className="cgpa-hero">
        <div className="cgpa-hero__glow" />
        <Calculator size={34} className="cgpa-hero__icon" />
        <h1 className="cgpa-hero__title">CGPA Calculator</h1>
        <p className="cgpa-hero__sub">Enter your grades per semester to calculate SGPA and CGPA</p>
      </div>

      {/* CGPA display */}
      <div className="cgpa-summary">
        <div className="cgpa-summary__item cgpa-summary__item--main">
          <span className="cgpa-summary__val" style={{ color: cgpaColor }}>{cgpa}</span>
          <span className="cgpa-summary__label">Overall CGPA</span>
        </div>
        <div className="cgpa-summary__item">
          <span className="cgpa-summary__val">{sgpa}</span>
          <span className="cgpa-summary__label">Current Semester SGPA</span>
        </div>
        <div className="cgpa-summary__item">
          <span className="cgpa-summary__val">{semesters.length}</span>
          <span className="cgpa-summary__label">Semesters</span>
        </div>
        <div className="cgpa-summary__item">
          <span className="cgpa-summary__val">
            {semesters.reduce((t, s) => t + s.subjects.reduce((tt, sub) => tt + Number(sub.credits || 0), 0), 0)}
          </span>
          <span className="cgpa-summary__label">Total Credits</span>
        </div>
      </div>

      {/* Grade scale reference */}
      <div className="cgpa-scale">
        {Object.entries(GRADE_POINTS).map(([g, p]) => (
          <span key={g} className="cgpa-scale__chip">{g} = {p}</span>
        ))}
      </div>

      {/* Semester tabs */}
      <div className="cgpa-tabs">
        {semesters.map(s => (
          <div key={s.id} className={`cgpa-tab${activeTab === s.id ? ' cgpa-tab--active' : ''}`}>
            <button onClick={() => setActiveTab(s.id)} className="cgpa-tab__btn">
              {s.label}
              <span className="cgpa-tab__sgpa">{calcSGPA(s.subjects)}</span>
            </button>
            {semesters.length > 1 && (
              <button className="cgpa-tab__remove" onClick={() => removeSemester(s.id)}>✕</button>
            )}
          </div>
        ))}
        <button className="cgpa-tab cgpa-tab--add" onClick={addSemester}>
          <Plus size={14} /> Add Sem
        </button>
        <button className="cgpa-tab cgpa-tab--reset" onClick={reset} title="Reset all">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Subject table */}
      {activeSem && (
        <div className="cgpa-table">
          <div className="cgpa-table__header">
            <span>Subject Name</span>
            <span>Grade</span>
            <span>Credits</span>
            <span>Points</span>
            <span></span>
          </div>
          {activeSem.subjects.map(sub => (
            <div key={sub.id} className="cgpa-row">
              <input className="modal__input cgpa-row__name" placeholder="e.g. Data Structures"
                value={sub.name} onChange={e => updateSubject(sub.id, { name: e.target.value })} />
              <select className="modal__select cgpa-row__grade"
                value={sub.grade} onChange={e => updateSubject(sub.id, { grade: e.target.value })}>
                {Object.keys(GRADE_POINTS).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <input className="modal__input cgpa-row__credits" type="number" min="0" max="6"
                value={sub.credits} onChange={e => updateSubject(sub.id, { credits: e.target.value })} />
              <span className="cgpa-row__points">
                {((GRADE_POINTS[sub.grade] ?? 0) * Number(sub.credits || 0)).toFixed(0)}
              </span>
              <button className="cgpa-row__remove" onClick={() => removeSubject(sub.id)}
                disabled={activeSem.subjects.length === 1}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button className="btn btn--ghost btn--sm" style={{ marginTop: '0.5rem' }} onClick={addSubject}>
            <Plus size={13} /> Add Subject
          </button>
        </div>
      )}
    </div>
  );
}
