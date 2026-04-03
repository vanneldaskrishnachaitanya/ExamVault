// src/components/QuoteAdmin.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  Quote, Plus, Trash2, Eye, EyeOff, Loader2, ChevronDown, ChevronRight,
  Sparkles, Check, ToggleLeft, ToggleRight, User, UserX, BarChart2, Clock, X,
} from 'lucide-react';
import {
  fetchQuoteSettings, toggleQuoteEnabled, toggleQuoteAutoFallback, toggleQuoteShowAuthor,
  fetchQuoteSections, createQuoteSection, updateQuoteSection, deleteQuoteSection,
  fetchQuotesBySection, createQuote, deleteQuote, updateQuote,
  fetchAllPolls, createPoll, togglePoll, deletePoll,
} from '../api/apiClient';

function useToast() {
  const [msg, setMsg] = useState('');
  const show = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  return { msg, show };
}

// ── Poll Admin Panel ──────────────────────────────────────────
function PollAdmin({ toast }) {
  const [polls,    setPolls]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ question: '', options: ['', ''], multiSelect: false, durationDays: 3 });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPolls(await fetchAllPolls()); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const addOption     = () => setForm(f => ({ ...f, options: [...f.options, ''] }));
  const removeOption  = (i) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  const updateOption  = (i, v) => setForm(f => { const o = [...f.options]; o[i] = v; return { ...f, options: o }; });

  const handleCreate = async () => {
    if (!form.question.trim()) { toast.show('Question is required'); return; }
    const opts = form.options.filter(o => o.trim());
    if (opts.length < 2)       { toast.show('At least 2 options required'); return; }
    setSaving(true);
    try {
      const d = await createPoll({ ...form, options: opts, durationDays: Number(form.durationDays) });
      setPolls(prev => [{ ...d, totalVotes: 0, expired: false }, ...prev]);
      setForm({ question: '', options: ['', ''], multiSelect: false, durationDays: 3 });
      setShowForm(false);
      toast.show('Poll created ✓');
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try {
      const d = await togglePoll(id);
      setPolls(prev => prev.map(p => p._id === id ? { ...p, active: d.active } : p));
      toast.show(d.active ? 'Poll activated' : 'Poll deactivated');
    } catch (e) { toast.show(`Error: ${e.message}`); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this poll?')) return;
    try { await deletePoll(id); setPolls(prev => prev.filter(p => p._id !== id)); toast.show('Deleted'); }
    catch (e) { toast.show(`Error: ${e.message}`); }
  };

  const isExpired = (p) => new Date(p.expiresAt) < new Date();
  const daysLeft  = (p) => {
    const diff = new Date(p.expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
  };

  return (
    <div className="poll-admin">
      <div className="poll-admin__header">
        <div className="poll-admin__title-row">
          <BarChart2 size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <div>
            <h3 className="poll-admin__title">Polls</h3>
            <p className="poll-admin__sub">Create polls shown beside the quote section. Students swipe to view and vote.</p>
          </div>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
          <Plus size={13} /> New Poll
        </button>
      </div>

      {/* Create poll form */}
      {showForm && (
        <div className="poll-admin__form">
          <label className="modal__label">Question *
            <input className="modal__input" placeholder="Ask your students something…"
              value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} maxLength={300} />
          </label>

          <div className="poll-admin__options-header">
            <span className="modal__label" style={{ marginBottom: 0 }}>Options * (min 2, max 10)</span>
            {form.options.length < 10 && (
              <button className="btn btn--ghost btn--sm" onClick={addOption}><Plus size={12} /> Add option</button>
            )}
          </div>
          <div className="poll-admin__options-list">
            {form.options.map((opt, i) => (
              <div key={i} className="poll-admin__option-row">
                <span className="poll-admin__option-num">{i + 1}</span>
                <input className="modal__input" placeholder={`Option ${i + 1}`}
                  value={opt} onChange={e => updateOption(i, e.target.value)} maxLength={200} />
                {form.options.length > 2 && (
                  <button className="poll-admin__option-remove" onClick={() => removeOption(i)}><X size={13} /></button>
                )}
              </div>
            ))}
          </div>

          <div className="poll-admin__form-row">
            <label className="modal__label">Duration (days) *
              <input className="modal__input" type="number" min={1} max={30}
                value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                style={{ maxWidth: 100 }} />
            </label>
            <label className="poll-admin__check-label">
              <input type="checkbox" checked={form.multiSelect}
                onChange={e => setForm(f => ({ ...f, multiSelect: e.target.checked }))} />
              Allow multiple selections
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn--primary btn--sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Create Poll
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Polls list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
          <Loader2 size={22} className="spin" style={{ color: 'var(--amber)' }} />
        </div>
      ) : polls.length === 0 ? (
        <div className="qs-empty-state">
          <BarChart2 size={34} style={{ opacity: 0.25 }} />
          <p>No polls yet. Create one!</p>
        </div>
      ) : (
        <div className="poll-admin__list">
          {polls.map(p => {
            const expired  = isExpired(p);
            const total    = p.options?.reduce((s, o) => s + (o.votes?.length ?? o.votes ?? 0), 0) ?? p.totalVotes ?? 0;
            return (
              <div key={p._id} className={`poll-admin__row${!p.active || expired ? ' poll-admin__row--dim' : ''}`}>
                <div className="poll-admin__row-body">
                  <div className="poll-admin__row-meta">
                    {p.multiSelect && <span className="poll-admin__badge poll-admin__badge--multi">multi</span>}
                    {expired && <span className="poll-admin__badge poll-admin__badge--expired">expired</span>}
                    {!expired && p.active && <span className="poll-admin__badge poll-admin__badge--live">live</span>}
                    <span className="poll-admin__timer"><Clock size={11} /> {daysLeft(p)}</span>
                    <span className="poll-admin__votes">{total} {total === 1 ? 'vote' : 'votes'}</span>
                  </div>
                  <p className="poll-admin__question">{p.question}</p>
                  <div className="poll-admin__options-preview">
                    {p.options?.map(o => (
                      <span key={o._id} className="poll-admin__opt-chip">{o.text}</span>
                    ))}
                  </div>
                </div>
                <div className="poll-admin__row-actions">
                  <button className={`btn btn--sm ${p.active && !expired ? 'btn--warning' : 'btn--success'}`}
                    onClick={() => handleToggle(p._id)} disabled={expired}>
                    {p.active && !expired ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                  </button>
                  <button className="btn btn--sm btn--danger" onClick={() => handleDelete(p._id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Section Row (Quotes) ──────────────────────────────────────
function SectionRow({ sec, onDelete, onToggle, toast }) {
  const [open,    setOpen]    = useState(false);
  const [quotes,  setQuotes]  = useState([]);
  const [qLoad,   setQLoad]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ text: '', author: '', description: '', bgImageUrl: '', scheduledFor: '' });
  const [saving,  setSaving]  = useState(false);

  const loadQuotes = useCallback(async () => {
    setQLoad(true);
    try { setQuotes(await fetchQuotesBySection(sec._id)); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setQLoad(false); }
  }, [sec._id, toast]);

  const handleExpand = () => { if (!open) loadQuotes(); setOpen(o => !o); };

  const handleAddQuote = async () => {
    if (!form.text.trim()) { toast.show('Quote text is required'); return; }
    setSaving(true);
    try {
      const d = await createQuote({ ...form, sectionId: sec._id });
      setQuotes(prev => [d, ...prev]);
      setForm({ text: '', author: '', description: '', bgImageUrl: '', scheduledFor: '' });
      setShowAdd(false);
      toast.show('Quote added ✓');
    } catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const handleDeleteQuote = async (id) => {
    if (!window.confirm('Delete this quote?')) return;
    try { await deleteQuote(id); setQuotes(prev => prev.filter(q => q._id !== id)); toast.show('Deleted'); }
    catch (e) { toast.show(`Error: ${e.message}`); }
  };

  const handleToggleQuote = async (q) => {
    try { const d = await updateQuote(q._id, { active: !q.active }); setQuotes(prev => prev.map(x => x._id === q._id ? d : x)); }
    catch (e) { toast.show(`Error: ${e.message}`); }
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
          <button className={`btn btn--sm ${sec.active ? 'btn--warning' : 'btn--success'}`} onClick={() => onToggle(sec)}>
            {sec.active ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
          </button>
          <button className="btn btn--sm btn--danger" onClick={() => onDelete(sec)}><Trash2 size={13} /></button>
        </div>
      </div>

      {open && (
        <div className="qs-quotes-panel">
          <button className="btn btn--primary btn--sm" style={{ marginBottom: '0.85rem' }} onClick={() => setShowAdd(s => !s)}>
            <Plus size={13} /> Add Quote
          </button>

          {showAdd && (
            <div className="qs-add-quote-form">
              <label className="modal__label">
                Quote text *
                <span className="qs-newline-hint">↵ Press Enter for line breaks — shown exactly as typed</span>
                <textarea className="modal__input" rows={5}
                  placeholder={"Enter the quote…\nPress Enter to add line breaks."}
                  value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  maxLength={600} style={{ resize: 'vertical', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
              </label>
              <div className="qs-add-quote-form__row">
                <label className="modal__label">Author
                  <input className="modal__input" placeholder="e.g. Adi Shankaracharya"
                    value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
                </label>
                <label className="modal__label">Schedule for date
                  <input className="modal__input" type="date"
                    value={form.scheduledFor} onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))} />
                </label>
              </div>
              <label className="modal__label">
                Description <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(optional — students tap "Learn more" to read)</span>
                <textarea className="modal__input" rows={4}
                  placeholder="Explain the meaning, context or significance of this quote…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  maxLength={1000} style={{ resize: 'vertical' }} />
              </label>
              <label className="modal__label">
                Background image URL <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(optional)</span>
                <input className="modal__input" placeholder="https://… (appears dimly behind text)"
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
                    <p className="qs-quote-item__text" style={{ whiteSpace: 'pre-wrap' }}>"{q.text}"</p>
                    <p className="qs-quote-item__meta">
                      {q.author && <span>— {q.author}</span>}
                      {q.description && <span className="qs-quote-item__has-desc">📖 has description</span>}
                      {q.scheduledFor && <span className="qs-quote-item__sched">📅 {new Date(q.scheduledFor).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      {q.bgImageUrl && <span className="qs-quote-item__has-img">🖼 bg</span>}
                    </p>
                  </div>
                  <div className="qs-quote-item__actions">
                    <button className={`btn btn--sm ${q.active ? 'btn--warning' : 'btn--success'}`} onClick={() => handleToggleQuote(q)}>
                      {q.active ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button className="btn btn--sm btn--danger" onClick={() => handleDeleteQuote(q._id)}><Trash2 size={12} /></button>
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
  const [toggling,   setToggling]   = useState('');
  const [showNewSec, setShowNewSec] = useState(false);
  const [newSec,     setNewSec]     = useState({ name: '', description: '' });
  const [creating,   setCreating]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('quotes');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try { const [s, secs] = await Promise.all([fetchQuoteSettings(), fetchQuoteSections()]); setSettings(s); setSections(secs); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const makeToggler = (key, fn, onMsg, offMsg) => async () => {
    setToggling(key);
    try { const d = await fn(); setSettings(d); toast.show(d[key] ? onMsg : offMsg); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setToggling(''); }
  };
  const handleToggleEnabled      = makeToggler('enabled',      toggleQuoteEnabled,      'Quote section shown ✓',        'Quote section hidden');
  const handleToggleAutoFallback = makeToggler('autoFallback', toggleQuoteAutoFallback, 'Auto Hindu quotes ON ✓',      'Auto quotes OFF');
  const handleToggleShowAuthor   = makeToggler('showAuthor',   toggleQuoteShowAuthor,   'Author names visible ✓',      'Author names hidden');

  const handleCreateSection = async () => {
    if (!newSec.name.trim()) { toast.show('Section name required'); return; }
    setCreating(true);
    try { const d = await createQuoteSection(newSec); setSections(prev => [...prev, { ...d, quoteCount: 0 }]); setNewSec({ name: '', description: '' }); setShowNewSec(false); toast.show(`Section "${d.name}" created ✓`); }
    catch (e) { toast.show(`Error: ${e.message}`); }
    finally { setCreating(false); }
  };
  const handleDeleteSection = async (sec) => {
    if (!window.confirm(`Delete section "${sec.name}" and ALL its quotes?`)) return;
    try { await deleteQuoteSection(sec._id); setSections(prev => prev.filter(s => s._id !== sec._id)); toast.show('Deleted'); }
    catch (e) { toast.show(`Error: ${e.message}`); }
  };
  const handleToggleSection = async (sec) => {
    try { const d = await updateQuoteSection(sec._id, { active: !sec.active }); setSections(prev => prev.map(s => s._id === sec._id ? { ...s, active: d.active } : s)); toast.show(d.active ? 'Section visible' : 'Section hidden'); }
    catch (e) { toast.show(`Error: ${e.message}`); }
  };

  if (loading) return <div className="sp-state sp-state--loading" style={{ minHeight: 200 }}><Loader2 size={26} className="spin" /></div>;

  return (
    <section className="admin-panel__section qs-admin">
      {/* Header */}
      <div className="qs-admin__header">
        <div className="qs-admin__title-row">
          <Quote size={20} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 className="qs-admin__title">Daily Quotes & Polls</h2>
            <p className="qs-admin__sub">Manage quotes and polls shown on the student home page.</p>
          </div>
        </div>
        <button className={`qs-toggle-btn${settings?.enabled ? ' qs-toggle-btn--on' : ''}`}
          onClick={handleToggleEnabled} disabled={!!toggling}>
          {toggling === 'enabled' ? <Loader2 size={15} className="spin" /> :
            settings?.enabled ? <><ToggleRight size={18} /> Visible</> : <><ToggleLeft size={18} /> Hidden</>}
        </button>
      </div>

      {/* Control rows */}
      <div className="qs-controls">
        <div className="qs-control-row">
          <div className="qs-control-row__info">
            <Sparkles size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <div>
              <strong>Auto Hindu Quotes</strong>
              <span className="qs-control-row__desc">When a section has no quotes, daily quotes from the Bhagavad Gita, Upanishads, Adi Shankaracharya, Ramana Maharshi and Thirukkural show automatically.</span>
            </div>
          </div>
          <button className={`qs-toggle-btn qs-toggle-btn--sm${settings?.autoFallback ? ' qs-toggle-btn--on' : ''}`}
            onClick={handleToggleAutoFallback} disabled={!!toggling}>
            {toggling === 'autoFallback' ? <Loader2 size={13} className="spin" /> :
              settings?.autoFallback ? <><ToggleRight size={16} /> Auto ON</> : <><ToggleLeft size={16} /> Auto OFF</>}
          </button>
        </div>
        <div className="qs-control-row">
          <div className="qs-control-row__info">
            {settings?.showAuthor ? <User size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} /> : <UserX size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
            <div>
              <strong>Author Names</strong>
              <span className="qs-control-row__desc">Show or hide the author attribution below each quote.</span>
            </div>
          </div>
          <button className={`qs-toggle-btn qs-toggle-btn--sm${settings?.showAuthor ? ' qs-toggle-btn--teal' : ''}`}
            onClick={handleToggleShowAuthor} disabled={!!toggling}>
            {toggling === 'showAuthor' ? <Loader2 size={13} className="spin" /> :
              settings?.showAuthor ? <><ToggleRight size={16} /> Showing</> : <><ToggleLeft size={16} /> Hidden</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="qs-section-tabs">
        <button className={`qs-section-tab${activeTab === 'quotes' ? ' qs-section-tab--active' : ''}`} onClick={() => setActiveTab('quotes')}>
          <Quote size={13} /> Quotes
        </button>
        <button className={`qs-section-tab${activeTab === 'polls' ? ' qs-section-tab--active' : ''}`} onClick={() => setActiveTab('polls')}>
          <BarChart2 size={13} /> Polls
        </button>
      </div>

      {/* Quotes tab */}
      {activeTab === 'quotes' && (
        <>
          <div className="qs-sections-header">
            <h3 className="qs-sections-title">Sections ({sections.length})</h3>
            <button className="btn btn--primary btn--sm" onClick={() => setShowNewSec(s => !s)}><Plus size={13} /> New Section</button>
          </div>
          {showNewSec && (
            <div className="qs-new-section-form">
              <label className="modal__label">Section name *
                <input className="modal__input" placeholder="e.g. Bhagavad Gita, Spiritual…"
                  value={newSec.name} onChange={e => setNewSec(f => ({ ...f, name: e.target.value }))} maxLength={100} autoFocus />
              </label>
              <label className="modal__label" style={{ marginTop: '0.5rem' }}>Description (optional)
                <input className="modal__input" placeholder="Admin-only note"
                  value={newSec.description} onChange={e => setNewSec(f => ({ ...f, description: e.target.value }))} maxLength={300} />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn--primary btn--sm" onClick={handleCreateSection} disabled={creating}>
                  {creating ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Create
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowNewSec(false)}>Cancel</button>
              </div>
            </div>
          )}
          {sections.length === 0 ? (
            <div className="qs-empty-state">
              <Quote size={36} style={{ opacity: 0.25 }} />
              <p>No sections yet.</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: 340 }}>
                {settings?.autoFallback ? 'Auto Hindu quotes are showing. Create a section to add your own.' : 'Auto quotes are OFF and no sections — students see no quotes.'}
              </p>
            </div>
          ) : (
            <div className="qs-sections-list">
              {sections.map(sec => <SectionRow key={sec._id} sec={sec} onDelete={handleDeleteSection} onToggle={handleToggleSection} toast={toast} />)}
            </div>
          )}
        </>
      )}

      {/* Polls tab */}
      {activeTab === 'polls' && <PollAdmin toast={toast} />}

      {toast.msg && <div className="toast">{toast.msg}</div>}
    </section>
  );
}
