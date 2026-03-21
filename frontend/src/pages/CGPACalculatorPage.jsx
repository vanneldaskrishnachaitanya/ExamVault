import { useState } from 'react';
import { Calculator, Plus, Trash2 } from 'lucide-react';

export default function CGPACalculatorPage() {
  const [sems, setSems] = useState([
    { id: 1, label: 'Semester 1', sgpa: '' },
    { id: 2, label: 'Semester 2', sgpa: '' },
  ]);

  const addSem = () => {
    const next = sems.length + 1;
    setSems(prev => [...prev, { id: next, label: `Semester ${next}`, sgpa: '' }]);
  };

  const removeSem = (id) => {
    if (sems.length <= 1) return;
    setSems(prev => prev.filter(s => s.id !== id));
  };

  const updateSgpa = (id, val) => {
    // Allow only numbers 0-10 with up to 2 decimal places
    if (val !== '' && (isNaN(val) || parseFloat(val) > 10 || parseFloat(val) < 0)) return;
    setSems(prev => prev.map(s => s.id === id ? { ...s, sgpa: val } : s));
  };

  const filledSems  = sems.filter(s => s.sgpa !== '' && !isNaN(s.sgpa));
  const cgpa        = filledSems.length
    ? (filledSems.reduce((sum, s) => sum + parseFloat(s.sgpa), 0) / filledSems.length).toFixed(2)
    : null;

  const cgpaNum = cgpa ? parseFloat(cgpa) : 0;
  const cgpaColor = cgpaNum >= 9 ? '#22c55e' : cgpaNum >= 8 ? '#f59e0b' : '#ef4444';
  const cgpaLabel = cgpaNum >= 9 ? 'Excellent! 🎉' : cgpaNum >= 8 ? 'Very Good 👍' : cgpaNum >= 6 ? 'Good 📚' : 'Keep Going 💪';

  return (
    <div className="cgpa-page">
      {/* Hero */}
      <div className="cgpa-hero">
        <div className="cgpa-hero__glow" />
        <Calculator size={34} className="cgpa-hero__icon" />
        <h1 className="cgpa-hero__title">CGPA Calculator</h1>
        <p className="cgpa-hero__sub">Enter your SGPA for each semester to calculate your overall CGPA</p>
      </div>

      {/* CGPA Result */}
      <div className="cgpa-result-card">
        {cgpa ? (
          <>
            <span className="cgpa-result__val" style={{ color: cgpaColor }}>{cgpa}</span>
            <span className="cgpa-result__label">CGPA</span>
            <span className="cgpa-result__tag" style={{ background: cgpaColor + '22', color: cgpaColor, border: `1px solid ${cgpaColor}44` }}>
              {cgpaLabel}
            </span>
            <span className="cgpa-result__sems">{filledSems.length} semester{filledSems.length !== 1 ? 's' : ''} entered</span>
          </>
        ) : (
          <>
            <span className="cgpa-result__val" style={{ color: 'var(--text-3)' }}>—</span>
            <span className="cgpa-result__label" style={{ color: 'var(--text-3)' }}>Enter SGPAs below</span>
          </>
        )}
      </div>

      {/* Color guide */}
      <div className="cgpa-legend">
        <span className="cgpa-legend__item" style={{ color: '#22c55e' }}>● 9.0+ Excellent</span>
        <span className="cgpa-legend__item" style={{ color: '#f59e0b' }}>● 8.0–8.99 Very Good</span>
        <span className="cgpa-legend__item" style={{ color: '#ef4444' }}>● Below 8.0</span>
      </div>

      {/* Semester inputs */}
      <div className="cgpa-inputs">
        {sems.map((s, idx) => (
          <div key={s.id} className="cgpa-sem-row">
            <span className="cgpa-sem-row__label">{s.label}</span>
            <input
              className="modal__input cgpa-sem-row__input"
              type="number"
              min="0" max="10" step="0.01"
              placeholder="e.g. 8.75"
              value={s.sgpa}
              onChange={e => updateSgpa(s.id, e.target.value)}
            />
            {s.sgpa !== '' && (
              <span className="cgpa-sem-row__badge" style={{
                color: parseFloat(s.sgpa) >= 9 ? '#22c55e' : parseFloat(s.sgpa) >= 8 ? '#f59e0b' : '#ef4444',
                background: parseFloat(s.sgpa) >= 9 ? '#22c55e18' : parseFloat(s.sgpa) >= 8 ? '#f59e0b18' : '#ef444418',
                border: `1px solid ${parseFloat(s.sgpa) >= 9 ? '#22c55e40' : parseFloat(s.sgpa) >= 8 ? '#f59e0b40' : '#ef444440'}`,
              }}>
                {parseFloat(s.sgpa) >= 9 ? '🟢' : parseFloat(s.sgpa) >= 8 ? '🟡' : '🔴'} {s.sgpa}
              </span>
            )}
            {sems.length > 1 && (
              <button className="cgpa-sem-row__remove" onClick={() => removeSem(s.id)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="btn btn--ghost btn--sm" style={{ marginTop: '0.75rem' }} onClick={addSem}>
        <Plus size={13} /> Add Semester
      </button>
    </div>
  );
}
