import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, Filter, X, SearchX } from 'lucide-react';
import { globalSearch } from '../api/apiClient';
import FileCard from '../components/FileCard';

const REGULATIONS = ['R25', 'R22', 'R19'];
const BRANCHES    = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML'];

export default function GlobalSearchPage() {
  const [query,       setQuery]       = useState('');
  const [filters,     setFilters]     = useState({ regulation: '', branch: '', category: '', examType: '' });
  const [results,     setResults]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const suggRef = useRef(null);

  // Autocomplete — fetch subject names matching query
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    const timer = setTimeout(async () => {
      try {
        const d = await globalSearch({ q: query, limit: 5 });
        const subjects = [...new Set((d.files || []).map(f => f.subject))].slice(0, 6);
        setSuggestions(subjects);
        setShowSugg(subjects.length > 0);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => { if (suggRef.current && !suggRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q = query) => {
    if (!q || q.trim().length < 2) return;
    setLoading(true); setSearched(true);
    try {
      const d = await globalSearch({ q: q.trim(), ...filters });
      setResults(d.files || []); setTotal(d.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [query, filters]);

  const clear = () => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); };
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="search-page">
      <h1 className="search-page__title"><Search size={22} /> Global Search</h1>

      <div className="search-page__bar">
        <div className="search-page__input-wrap">
          <Search size={15} className="search-page__icon" />
          <input ref={inputRef} className="search-page__input"
            placeholder="Search files, subjects, branches…"
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()} />
          {query && <button className="search-page__clear" onClick={clear}><X size={14} /></button>}
          {showSugg && suggestions.length > 0 && (
            <div className="search-sugg" ref={suggRef}>
              {suggestions.map((s, i) => (
                <button key={i} className="search-sugg__item"
                  onMouseDown={() => { setQuery(s); setShowSugg(false); doSearch(s); }}>
                  <Search size={11} /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className={`btn btn--ghost${activeFilters > 0 ? ' btn--filter-active' : ''}`}
          onClick={() => setShowFilters(f => !f)}>
          <Filter size={14} /> Filters {activeFilters > 0 && `(${activeFilters})`}
        </button>
        <button className="btn btn--primary" onClick={() => doSearch()} disabled={loading || query.length < 2}>
          {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />} Search
        </button>
      </div>

      {showFilters && (
        <div className="search-filters">
          <div className="search-filters__grid">
            <label className="modal__label">Regulation
              <select className="modal__select" value={filters.regulation} onChange={e => setFilters(f => ({ ...f, regulation: e.target.value }))}>
                <option value="">All</option>
                {REGULATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="modal__label">Branch
              <select className="modal__select" value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))}>
                <option value="">All</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="modal__label">Category
              <select className="modal__select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                <option value="">All</option>
                <option value="paper">Papers</option>
                <option value="resource">Resources</option>
              </select>
            </label>
            <label className="modal__label">Exam Type
              <select className="modal__select" value={filters.examType} onChange={e => setFilters(f => ({ ...f, examType: e.target.value }))}>
                <option value="">All</option>
                <option value="mid1">Mid-1</option>
                <option value="mid2">Mid-2</option>
                <option value="semester">Semester</option>
              </select>
            </label>
          </div>
          {activeFilters > 0 && (
            <button className="btn btn--ghost btn--sm" style={{ marginTop: '0.5rem' }}
              onClick={() => setFilters({ regulation: '', branch: '', category: '', examType: '' })}>
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      {loading && <div className="sp-state sp-state--loading"><Loader2 size={28} className="spin" /> Searching…</div>}

      {!loading && searched && results.length === 0 && (
        <div className="sp-state sp-state--empty">
          <SearchX size={36} /><p>No results for "<strong>{query}</strong>"</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Try different keywords or remove filters</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="search-page__count">{total} result{total !== 1 ? 's' : ''} for "<strong>{query}</strong>"</p>
          <div className="sp-file-list">
            {results.map(file => <FileCard key={file._id} file={file} />)}
          </div>
        </>
      )}

      {!searched && !loading && (
        <div className="search-page__empty-state">
          <Search size={52} />
          <p>Search across all papers and resources</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Type at least 2 characters and press Enter</p>
        </div>
      )}
    </div>
  );
}
