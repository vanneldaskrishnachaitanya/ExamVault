// src/components/QuoteAdmin.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  Quote, Plus, Trash2, Eye, EyeOff, Loader2,
  ChevronDown, ChevronRight, Sparkles, X, Check,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  fetchQuoteSettings, toggleQuoteEnabled, toggleQuoteAutoFallback,
  fetchQuoteSections, createQuoteSection, updateQuoteSection, deleteQuoteSection,
  fetchQuotesBySection, createQuote, deleteQuote, updateQuote,
} from '../api/apiClient';

function useToast() {
  const [msg, setMsg] = useState('');
  const show = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  return { msg, show };
}

// ── Section row with expandable quotes ───────────────────────
function SectionRow({ sec, onDelete, onToggle, toast }) {
  const [open,    setOpen]    = useState(false);
  const [quotes,  setQuotes]  = useState([]);
  const [qLoad,   setQLoad]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ text: '', author: '', bgImageUrl: '', scheduledFor: '' });
  const [saving,  setSaving]  = useState(false);

  const loadQuotes = useCallback(async () => {
    setQLoad(true);
    try { const d = await fetchQuotesBySection(sec._id); setQuotes(d); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setQLoad(false); }
  }, [sec._id, toast]);

  const handleExpand = () => {
    if (!open) loadQuotes();
    setOpen(o => !o);
  };

  const handleAddQuote = async () => {
    if (!form.text.trim()) { toast.show('Quote text is required'); return; }
    setSaving(true);
    try {
      const d = await createQuote({ ...form, sectionId: sec._id });
      setQuotes(prev => [d, ...prev]);
      setForm({ text: '', author: '', bgImageUrl: '', scheduledFor: '' });
      setShowAdd(false);
      toast.show('Quote added ✓');
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('Delete this quote?')) return;
    try {
      await deleteQuote(id);
      setQuotes(prev => prev.filter(q => q._id !== id));
      toast.show('Deleted');
    } catch (e) { toast.show(`Error: ${e.message}`); }
  };

  const handleToggleQuote = async (q) => {
    try {
      const d = await updateQuote(q._id, { active: !q.active });
      setQuotes(prev => prev.map(x => x._id === q._id ? d : x));
    } catch (e) { toast.show(`Error: ${e.message}`); }
  };

  return (
    <div className={`qs-section-row${!sec.active ? ' qs-section-row--hidden' : ''}`}>
      <div className="qs-section-row__head">
        <button className="qs-section-row__expand" onClick={handleExpand}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="qs-section-row__name">{sec.name}</span>
          <span className="qs-section-row__count">{sec.quoteCount ?? 0} quotes</span>
        </button>
        <div className="qs-section-row__actions">
          <button className={`btn btn--sm ${sec.active ? 'btn--warning' : 'btn--success'}`}
            onClick={() => onToggle(sec)}>
            {sec.active ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
          </button>
          <button className="btn btn--sm btn--danger" onClick={() => onDelete(sec)}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="qs-quotes-panel">
          <button className="btn btn--primary btn--sm" style={{ marginBottom: '0.85rem' }}
            onClick={() => setShowAdd(s => !s)}>
            <Plus size={13} /> Add Quote
          </button>

          {showAdd && (
            <div className="qs-add-quote-form">
              <label className="modal__label">Quote text *
                <textarea className="modal__input" rows={3}
                  placeholder="Enter the inspirational quote…"
                  value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  maxLength={600} style={{ resize: 'vertical' }} />
              </label>
              <div className="qs-add-quote-form__row">
                <label className="modal__label">Author
                  <input className="modal__input" placeholder="e.g. Swami Vivekananda"
                    value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
                </label>
                <label className="modal__label">Schedule for date
                  <input className="modal__input" type="date"
                    value={form.scheduledFor} onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))} />
                </label>
              </div>
              <label className="modal__label">
                Background image URL <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(optional — shown dimly)</span>
                <input className="modal__input" placeholder="https://… (Cloudinary, Unsplash, etc.)"
                  value={form.bgImageUrl} onChange={e => setForm(f => ({ ...f, bgImageUrl: e.target.value }))} />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn--primary btn--sm" onClick={handleAddQuote} disabled={saving}>
                  {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Save Quote
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          )}

          {qLoad ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Loader2 size={20} className="spin" style={{ color: 'var(--amber)' }} />
            </div>
          ) : quotes.length === 0 ? (
            <p className="qs-empty">No quotes yet — auto-fallback quotes will show if enabled.</p>
          ) : (
            <div className="qs-quote-list">
              {quotes.map(q => (
                <div key={q._id} className={`qs-quote-item${!q.active ? ' qs-quote-item--hidden' : ''}`}>
                  <div className="qs-quote-item__body">
                    <p className="qs-quote-item__text">"{q.text}"</p>
                    <p className="qs-quote-item__meta">
                      {q.author && <span>— {q.author}</span>}
                      {q.scheduledFor && (
                        <span className="qs-quote-item__sched">
                          📅 {new Date(q.scheduledFor).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {q.bgImageUrl && <span className="qs-quote-item__has-img">🖼 bg</span>}
                    </p>
                  </div>
                  <div className="qs-quote-item__actions">
                    <button className={`btn btn--sm ${q.active ? 'btn--warning' : 'btn--success'}`}
                      onClick={() => handleToggleQuote(q)} title={q.active ? 'Hide' : 'Show'}>
                      {q.active ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button className="btn btn--sm btn--danger" onClick={() => handleDeleteQuote(q._id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main QuoteAdmin ───────────────────────────────────────────
export default function QuoteAdmin() {
  const toast = useToast();

  const [settings,   setSettings]   = useState(null);
  const [sections,   setSections]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toggling,   setToggling]   = useState(false);
  const [togglingAuto, setTogglingAuto] = useState(false);
  const [showNewSec, setShowNewSec] = useState(false);
  const [newSec,     setNewSec]     = useState({ name: '', description: '' });
  const [creating,   setCreating]   = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, secs] = await Promise.all([fetchQuoteSettings(), fetchQuoteSections()]);
      setSettings(s);
      setSections(secs);
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleToggleEnabled = async () => {
    setToggling(true);
    try {
      const d = await toggleQuoteEnabled();
      setSettings(d);
      toast.show(d.enabled ? 'Quote section shown to students ✓' : 'Quote section hidden from students');
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setToggling(false); }
  };

  const handleToggleAutoFallback = async () => {
    setTogglingAuto(true);
    try {
      const d = await toggleQuoteAutoFallback();
      setSettings(d);
      toast.show(d.autoFallback ? 'Auto Hindu quotes enabled ✓' : 'Auto quotes disabled — only manual quotes will show');
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setTogglingAuto(false); }
  };

  const handleCreateSection = async () => {
    if (!newSec.name.trim()) { toast.show('Section name required'); return; }
    setCreating(true);
    try {
      const d = await createQuoteSection(newSec);
      setSections(prev => [...prev, { ...d, quoteCount: 0 }]);
      setNewSec({ name: '', description: '' });
      setShowNewSec(false);
      toast.show(`Section "${d.name}" created ✓`);
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setCreating(false); }
  };

  const handleDeleteSection = async (sec) => {
    if (!window.confirm(`Delete section "${sec.name}" and ALL its quotes?`)) return;
    try {
      await deleteQuoteSection(sec._id);
      setSections(prev => prev.filter(s => s._id !== sec._id));
      toast.show('Section deleted');
    } catch (e) { toast.show(`Error: ${e.message}`); }
  };

  const handleToggleSection = async (sec) => {
    try {
      const d = await updateQuoteSection(sec._id, { active: !sec.active });
      setSections(prev => prev.map(s => s._id === sec._id ? { ...s, active: d.active } : s));
      toast.show(d.active ? 'Section visible to students' : 'Section hidden from students');
    } catch (e) { toast.show(`Error: ${e.message}`); }
  };

  if (loading) return (
    <div className="sp-state sp-state--loading" style={{ minHeight: 200 }}>
      <Loader2 size={26} className="spin" />
    </div>
  );

  return (
    <section className="admin-panel__section qs-admin">

      {/* Header row — title + visibility toggle */}
      <div className="qs-admin__header">
        <div className="qs-admin__title-row">
          <Quote size={20} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 className="qs-admin__title">Daily Quotes</h2>
            <p className="qs-admin__sub">
              Inspirational quotes shown to students on the home page every day.
              Add your own — or let auto-quotes run.
            </p>
          </div>
        </div>

        {/* Show/hide toggle */}
        <button
          className={`qs-toggle-btn${settings?.enabled ? ' qs-toggle-btn--on' : ''}`}
          onClick={handleToggleEnabled} disabled={toggling}
          title={settings?.enabled ? 'Hide from students' : 'Show to students'}
        >
          {toggling
            ? <Loader2 size={15} className="spin" />
            : settings?.enabled
              ? <><ToggleRight size={18} /> Visible to students</>
              : <><ToggleLeft size={18} /> Hidden from students</>
          }
        </button>
      </div>

      {/* Auto-fallback toggle row */}
      <div className="qs-autofallback-row">
        <div className="qs-autofallback-row__info">
          <Sparkles size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div>
            <strong>Auto Hindu Quotes</strong>
            <span style={{ color: 'var(--text-3)', marginLeft: '0.4rem', fontSize: '0.78rem' }}>
              — When a section has no quotes, the system automatically shows daily quotes from
              the Bhagavad Gita, Upanishads, Swami Vivekananda, Ramana Maharshi, Adi Shankaracharya and Thirukkural.
            </span>
          </div>
        </div>
        <button
          className={`qs-toggle-btn qs-toggle-btn--sm${settings?.autoFallback ? ' qs-toggle-btn--on' : ''}`}
          onClick={handleToggleAutoFallback} disabled={togglingAuto}
          title={settings?.autoFallback ? 'Turn off auto quotes' : 'Turn on auto quotes'}
        >
          {togglingAuto
            ? <Loader2 size={13} className="spin" />
            : settings?.autoFallback
              ? <><ToggleRight size={16} /> Auto ON</>
              : <><ToggleLeft size={16} /> Auto OFF</>
          }
        </button>
      </div>

      {/* Sections header */}
      <div className="qs-sections-header">
        <h3 className="qs-sections-title">Sections ({sections.length})</h3>
        <button className="btn btn--primary btn--sm" onClick={() => setShowNewSec(s => !s)}>
          <Plus size={13} /> New Section
        </button>
      </div>

      {/* New section form */}
      {showNewSec && (
        <div className="qs-new-section-form">
          <label className="modal__label">Section name *
            <input className="modal__input"
              placeholder="e.g. Bhagavad Gita, Spiritual, Study Motivation…"
              value={newSec.name}
              onChange={e => setNewSec(f => ({ ...f, name: e.target.value }))}
              maxLength={100} autoFocus />
          </label>
          <label className="modal__label" style={{ marginTop: '0.5rem' }}>Description (optional)
            <input className="modal__input"
              placeholder="Short description for admin reference"
              value={newSec.description}
              onChange={e => setNewSec(f => ({ ...f, description: e.target.value }))}
              maxLength={300} />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn--primary btn--sm" onClick={handleCreateSection} disabled={creating}>
              {creating ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Create Section
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowNewSec(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sections list */}
      {sections.length === 0 ? (
        <div className="qs-empty-state">
          <Quote size={36} style={{ opacity: 0.3 }} />
          <p>No sections yet.</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
            {settings?.autoFallback
              ? 'Auto Hindu quotes are showing to students. Create a section to add your own.'
              : 'Auto quotes are OFF and no sections exist — students see no quotes.'}
          </p>
        </div>
      ) : (
        <div className="qs-sections-list">
          {sections.map(sec => (
            <SectionRow key={sec._id} sec={sec}
              onDelete={handleDeleteSection}
              onToggle={handleToggleSection}
              toast={toast} />
          ))}
        </div>
      )}

      {toast.msg && <div className="toast">{toast.msg}</div>}
    </section>
  );
}
