import { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink, Code, Trophy, BookOpen, Zap, Star,
  Plus, Trash2, Loader2, Eye, EyeOff, Check, X, Lightbulb,
} from 'lucide-react';
import {
  getCodingItems, suggestPlatform,
  getAllCodingItems, createCodingItem, deleteCodingItem,
  toggleCodingItem, getCodingSuggestions, reviewSuggestion,
} from '../api/apiClient';
import { useAuth } from '../hooks/useAuth';

const TABS       = ['Platforms', 'Resources', 'Contests', 'Suggest'];
const ADMIN_TABS = ['Platforms', 'Resources', 'Contests', 'Manage', 'Suggestions'];
const TYPE_MAP   = { Platforms:'platform', Resources:'resource', Contests:'contest' };
const TYPE_OPTIONS = [{v:'platform',l:'Platform'},{v:'resource',l:'Resource'},{v:'contest',l:'Contest'}];

export default function CodingPage() {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';

  const [activeTab,   setActiveTab]   = useState('Platforms');
  const [items,       setItems]       = useState({ platforms:[], resources:[], contests:[] });
  const [allItems,    setAllItems]    = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');
  const [suggestForm, setSuggestForm] = useState({ name:'', url:'', desc:'', type:'platform' });
  const [suggesting,  setSuggesting]  = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [addForm,     setAddForm]     = useState({ name:'', url:'', logo:'\u{1F4BB}', desc:'', tags:'', difficulty:'', type:'platform' });
  const [adding,      setAdding]      = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { const d = await getCodingItems(); setItems(d); } catch {}
    finally { setLoading(false); }
  }, []);

  const loadAll = useCallback(async () => {
    try { const d = await getAllCodingItems(); setAllItems(d.items || []); } catch {}
  }, []);

  const loadSuggestions = useCallback(async () => {
    try { const d = await getCodingSuggestions(); setSuggestions(d.suggestions || []); } catch {}
  }, []);

  useEffect(() => {
    loadItems();
    if (isAdmin) { loadAll(); loadSuggestions(); }
  }, [loadItems, loadAll, loadSuggestions, isAdmin]);

  const handleSuggest = async () => {
    if (!suggestForm.name || !suggestForm.url) { showToast('Name and URL required'); return; }
    setSuggesting(true);
    try { await suggestPlatform(suggestForm); setSuggestDone(true); setSuggestForm({ name:'', url:'', desc:'', type:'platform' }); showToast('Submitted!'); }
    catch (e) { showToast(e.message); } finally { setSuggesting(false); }
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.url) { showToast('Name and URL required'); return; }
    setAdding(true);
    try {
      const payload = { ...addForm, tags: addForm.tags.split(',').map(t => t.trim()).filter(Boolean) };
      const d = await createCodingItem(payload);
      setAllItems(prev => [...prev, d.item]);
      await loadItems(); setShowAdd(false);
      setAddForm({ name:'', url:'', logo:'💻', desc:'', tags:'', difficulty:'', type:'platform' });
      showToast('Added ✓');
    } catch (e) { showToast(e.message); } finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await deleteCodingItem(id); setAllItems(p => p.filter(i => i._id !== id)); await loadItems(); showToast('Deleted'); }
    catch (e) { showToast(e.message); }
  };

  const handleToggle = async (id) => {
    try { await toggleCodingItem(id); setAllItems(p => p.map(i => i._id === id ? {...i, active: !i.active} : i)); await loadItems(); }
    catch (e) { showToast(e.message); }
  };

  const handleReview = async (id, action) => {
    try {
      await reviewSuggestion(id, action);
      setSuggestions(p => p.filter(s => s._id !== id));
      if (action === 'approve') { await loadItems(); await loadAll(); }
      showToast(action === 'approve' ? 'Approved ✓' : 'Rejected');
    } catch (e) { showToast(e.message); }
  };

  const tabs = isAdmin ? ADMIN_TABS : TABS;
  const currentType = TYPE_MAP[activeTab];
  const displayItems = currentType ? (items[currentType + 's'] || []) : [];

  return (
    <div className="coding-page">
      <div className="coding-hero">
        <div className="coding-hero__glow" />
        <Code size={36} className="coding-hero__icon" />
        <h1 className="coding-hero__title">Competitive Programming</h1>
        <p className="coding-hero__sub">Platforms, resources, and tools to level up your coding skills.</p>
        <div className="coding-hero__stats">
          <div className="coding-stat"><Trophy size={14}/><span>{items.platforms?.length||0} Platforms</span></div>
          <div className="coding-stat"><BookOpen size={14}/><span>{items.resources?.length||0} Resources</span></div>
          <div className="coding-stat"><Zap size={14}/><span>{items.contests?.length||0} Contests</span></div>
          {suggestions.length > 0 && <div className="coding-stat" style={{color:'var(--warning)'}}><Star size={14}/><span>{suggestions.length} pending</span></div>}
        </div>
      </div>

      <div className="coding-tabs">
        {tabs.map(t => (
          <button key={t} className={`coding-tab${activeTab===t?' coding-tab--active':''}`} onClick={() => setActiveTab(t)}>
            {t}
            {t==='Suggestions' && suggestions.length>0 && (
              <span style={{marginLeft:'0.3rem',background:'var(--warning)',color:'#111',borderRadius:'100px',padding:'0.05rem 0.4rem',fontSize:'0.65rem',fontWeight:700}}>{suggestions.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && currentType && <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin"/></div>}

      {currentType && !loading && (
        <div>
          {isAdmin && (
            <button className="btn btn--primary btn--sm" style={{marginBottom:'1rem'}} onClick={() => { setShowAdd(true); setAddForm(f=>({...f,type:currentType})); }}>
              <Plus size={14}/> Add {activeTab.slice(0,-1)}
            </button>
          )}
          <div className="platform-grid">
            {displayItems.length===0 && <p style={{color:'var(--text-3)',fontSize:'0.875rem'}}>No {activeTab.toLowerCase()} yet.</p>}
            {displayItems.map(item => (
              <a key={item._id} href={item.url} target="_blank" rel="noreferrer" className="platform-card">
                <div className="platform-card__header">
                  <span className="platform-card__logo">{item.logo}</span>
                  <div>
                    <h3 className="platform-card__name">{item.name}</h3>
                    {item.difficulty && <p className="platform-card__difficulty">{item.difficulty}</p>}
                  </div>
                  <ExternalLink size={14} className="platform-card__ext"/>
                </div>
                {item.desc && <p className="platform-card__desc">{item.desc}</p>}
                {item.tags?.length>0 && <div className="platform-card__tags">{item.tags.map(tag=><span key={tag} className="platform-card__tag">{tag}</span>)}</div>}
              </a>
            ))}
          </div>
        </div>
      )}

      {activeTab==='Suggest' && (
        <div className="suggest-section">
          <div className="suggest-hero">
            <Lightbulb size={28} style={{color:'var(--amber)'}}/>
            <h2 className="suggest-hero__title">Suggest a Platform or Resource</h2>
            <p className="suggest-hero__sub">Know something useful? Admin will review and add it!</p>
          </div>
          {suggestDone ? (
            <div className="suggest-success">
              <Check size={32} style={{color:'var(--success)'}}/>
              <p>Suggestion submitted! Admin will review it.</p>
              <button className="btn btn--ghost btn--sm" style={{marginTop:'0.75rem'}} onClick={() => setSuggestDone(false)}>Suggest another</button>
            </div>
          ) : (
            <div className="suggest-form">
              <div className="suggest-form__grid">
                <label className="modal__label">Name * <input className="modal__input" placeholder="e.g. Exercism" value={suggestForm.name} onChange={e=>setSuggestForm(f=>({...f,name:e.target.value}))}/></label>
                <label className="modal__label">URL * <input className="modal__input" placeholder="https://…" value={suggestForm.url} onChange={e=>setSuggestForm(f=>({...f,url:e.target.value}))}/></label>
                <label className="modal__label">Type <select className="modal__select" value={suggestForm.type} onChange={e=>setSuggestForm(f=>({...f,type:e.target.value}))}>{TYPE_OPTIONS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
              </div>
              <label className="modal__label" style={{marginTop:'0.75rem'}}>Why is it useful?
                <textarea className="modal__input" rows={3} placeholder="Describe why…" value={suggestForm.desc} onChange={e=>setSuggestForm(f=>({...f,desc:e.target.value}))} style={{resize:'vertical'}} maxLength={300}/>
              </label>
              <button className="btn btn--primary" style={{marginTop:'0.75rem'}} disabled={suggesting} onClick={handleSuggest}>
                {suggesting ? <Loader2 size={14} className="spin"/> : <Lightbulb size={14}/>} Submit Suggestion
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab==='Manage' && isAdmin && (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
            <p style={{fontSize:'0.85rem',color:'var(--text-3)'}}>Toggle visibility or delete items</p>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAdd(true)}><Plus size={14}/> Add Item</button>
          </div>
          <div className="coding-manage-list">
            {allItems.map(item => (
              <div key={item._id} className={`coding-manage-row${!item.active?' coding-manage-row--hidden':''}`}>
                <span className="coding-manage-logo">{item.logo}</span>
                <div className="coding-manage-body">
                  <p className="coding-manage-name">{item.name}</p>
                  <p className="coding-manage-meta"><span className="coding-manage-type">{item.type}</span> · {item.url.slice(0,50)}</p>
                </div>
                <div className="coding-manage-actions">
                  <button className={`btn btn--sm ${item.active?'btn--warning':'btn--success'}`} onClick={() => handleToggle(item._id)}>
                    {item.active ? <><EyeOff size={13}/> Hide</> : <><Eye size={13}/> Show</>}
                  </button>
                  <button className="btn btn--sm btn--danger" onClick={() => handleDelete(item._id)}><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='Suggestions' && isAdmin && (
        <div>
          {suggestions.length===0 ? (
            <div className="sp-state sp-state--empty"><Lightbulb size={36}/><p>No pending suggestions</p></div>
          ) : (
            <div className="suggest-list">
              {suggestions.map(s => (
                <div key={s._id} className="suggest-item">
                  <div className="suggest-item__body">
                    <p className="suggest-item__name">{s.name} <span className="coding-manage-type">{s.type}</span></p>
                    <a href={s.url} target="_blank" rel="noreferrer" className="suggest-item__url">{s.url} <ExternalLink size={11}/></a>
                    {s.desc && <p className="suggest-item__desc">{s.desc}</p>}
                    <p className="suggest-item__by">By {s.suggestedBy?.name || s.suggestedBy?.email}</p>
                  </div>
                  <div className="suggest-item__actions">
                    <button className="btn btn--success btn--sm" onClick={() => handleReview(s._id,'approve')}><Check size={13}/> Approve</button>
                    <button className="btn btn--danger btn--sm" onClick={() => handleReview(s._id,'reject')}><X size={13}/> Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title"><Plus size={16}/> Add Item</h2>
              <button className="modal__close" onClick={()=>setShowAdd(false)}><X size={16}/></button>
            </div>
            <div className="modal__form">
              <div className="modal__row modal__row--2col">
                <label className="modal__label">Name * <input className="modal__input" placeholder="e.g. LeetCode" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}/></label>
                <label className="modal__label">Emoji <input className="modal__input" placeholder="💻" maxLength={4} value={addForm.logo} onChange={e=>setAddForm(f=>({...f,logo:e.target.value}))}/></label>
              </div>
              <label className="modal__label">URL * <input className="modal__input" placeholder="https://…" value={addForm.url} onChange={e=>setAddForm(f=>({...f,url:e.target.value}))}/></label>
              <div className="modal__row modal__row--2col">
                <label className="modal__label">Type <select className="modal__select" value={addForm.type} onChange={e=>setAddForm(f=>({...f,type:e.target.value}))}>{TYPE_OPTIONS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></label>
                <label className="modal__label">Difficulty <input className="modal__input" placeholder="e.g. Beginner" value={addForm.difficulty} onChange={e=>setAddForm(f=>({...f,difficulty:e.target.value}))}/></label>
              </div>
              <label className="modal__label">Description <textarea className="modal__input" rows={2} value={addForm.desc} onChange={e=>setAddForm(f=>({...f,desc:e.target.value}))} style={{resize:'vertical'}}/></label>
              <label className="modal__label">Tags (comma separated) <input className="modal__input" placeholder="DSA, Interviews" value={addForm.tags} onChange={e=>setAddForm(f=>({...f,tags:e.target.value}))}/></label>
              <button className="modal__submit" disabled={adding} onClick={handleAdd}>
                {adding ? <Loader2 size={14} className="spin"/> : <Plus size={14}/>} Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
