import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Loader2, Filter, X, SearchX, FileText, Quote, Calendar, Clock,
  Megaphone, ArrowRight, BookOpen,
} from 'lucide-react';
import { globalSearch, fetchTodayQuotes, fetchEvents, fetchExams, fetchAnnouncements } from '../api/apiClient';
import FileCard from '../components/FileCard';

const REGULATIONS = ['R25', 'R22', 'R19'];
const BRANCHES    = ['CSE', 'ECE', 'EEE', 'IT', 'MECH', 'CIVIL', 'AIML'];
const SOURCES = [
  { id: 'all', label: 'All' },
  { id: 'files', label: 'Files' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'events', label: 'Events' },
  { id: 'exams', label: 'Exams' },
  { id: 'announcements', label: 'Announcements' },
];

const includesText = (value, query) => String(value || '').toLowerCase().includes(query);

function SourcePill({ source, active, onClick }) {
  return (
    <button className={`search-source${active ? ' search-source--active' : ''}`} onClick={onClick}>
      {source.label}
    </button>
  );
}

function CompactCard({ icon: Icon, badge, title, subtitle, meta, href, actionLabel = 'Open' }) {
  return (
    <div className="search-hit-card">
      <div className="search-hit-card__icon"><Icon size={14} /></div>
      <div className="search-hit-card__body">
        <div className="search-hit-card__top">
          <span className="search-hit-card__badge">{badge}</span>
          {meta && <span className="search-hit-card__meta">{meta}</span>}
        </div>
        <p className="search-hit-card__title">{title}</p>
        {subtitle && <p className="search-hit-card__sub">{subtitle}</p>}
      </div>
      <a href={href} className="search-hit-card__action">{actionLabel} <ArrowRight size={13} /></a>
    </div>
  );
}

export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query,       setQuery]       = useState('');
  const [filters,     setFilters]     = useState({ regulation: '', branch: '', category: '', examType: '' });
  const [source,      setSource]      = useState(searchParams.get('source') || 'all');
  const [fileResults, setFileResults] = useState([]);
  const [quoteResults,setQuoteResults]= useState([]);
  const [eventResults,setEventResults]= useState([]);
  const [examResults, setExamResults] = useState([]);
  const [annResults,  setAnnResults]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg,    setShowSugg]    = useState(false);
  const suggRef = useRef(null);

  useEffect(() => {
    const nextSource = searchParams.get('source') || 'all';
    setSource(nextSource);
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) setQuery(q);
  }, [searchParams]);

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
      const normalized = q.trim().toLowerCase();
      const wantFiles = source === 'all' || source === 'files';
      const wantQuotes = source === 'all' || source === 'quotes';
      const wantEvents = source === 'all' || source === 'events';
      const wantExams  = source === 'all' || source === 'exams';
      const wantAnns   = source === 'all' || source === 'announcements';

      const [fileData, quoteData, eventData, examData, annData] = await Promise.all([
        wantFiles ? globalSearch({ q: q.trim(), ...filters, limit: 24 }) : Promise.resolve({ files: [], total: 0 }),
        wantQuotes ? fetchTodayQuotes().catch(() => ({ quotes: [] })) : Promise.resolve({ quotes: [] }),
        wantEvents ? fetchEvents().catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
        wantExams  ? fetchExams().catch(() => ({ exams: [] })) : Promise.resolve({ exams: [] }),
        wantAnns   ? fetchAnnouncements().catch(() => ({ announcements: [] })) : Promise.resolve({ announcements: [] }),
      ]);

      setFileResults(fileData.files || []);
      setQuoteResults((quoteData.quotes || []).filter(q => [q.text, q.author, q.sectionName, q.description].some(v => includesText(v, normalized))));
      setEventResults((eventData.events || []).filter(ev => [ev.title, ev.description, ev.clubName, ev.organizerName, ev.venue].some(v => includesText(v, normalized))));
      setExamResults((examData.exams || []).filter(ex => [ex.title, ex.subject, ex.notes, ex.regulation, ex.branch, ex.examType].some(v => includesText(v, normalized))));
      setAnnResults((annData.announcements || []).filter(a => [a.title, a.message, a.type].some(v => includesText(v, normalized))));
    } catch {}
    finally { setLoading(false); }
  }, [query, filters, source]);

  const clearResults = () => {
    setFileResults([]);
    setQuoteResults([]);
    setEventResults([]);
    setExamResults([]);
    setAnnResults([]);
    setSearched(false);
  };
  const clear = () => { setQuery(''); clearResults(); inputRef.current?.focus(); };
  const activeFilters = Object.values(filters).filter(Boolean).length + (source !== 'all' ? 1 : 0);

  const totalHits = useMemo(() => fileResults.length + quoteResults.length + eventResults.length + examResults.length + annResults.length, [fileResults, quoteResults, eventResults, examResults, annResults]);

  useEffect(() => { if (query.trim().length >= 2) doSearch(query); }, [source]);

  return (
    <div className="search-page">
      <div className="search-page__hero">
        <div>
          <h1 className="search-page__title"><Search size={22} /> Global Search</h1>
          <p className="search-page__sub">Search files, quotes, events, exams, and announcements from one place.</p>
        </div>
        <div className="search-page__source-row">
          {SOURCES.map(s => <SourcePill key={s.id} source={s} active={source === s.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set('source', s.id); setSource(s.id); setSearchParams(next); }} />)}
        </div>
      </div>

      <div className="search-page__bar">
        <div className="search-page__input-wrap">
          <Search size={15} className="search-page__icon" />
          <input ref={inputRef} className="search-page__input"
            placeholder="Search files, quotes, events, exams, announcements…"
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
          <div className="search-filters__note">
            <BookOpen size={13} /> File filters apply when searching files.
          </div>
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

      {!loading && searched && totalHits === 0 && (
        <div className="sp-state sp-state--empty">
          <SearchX size={36} /><p>No results for "<strong>{query}</strong>"</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Try different keywords or remove filters</p>
        </div>
      )}

      {!loading && totalHits > 0 && (
        <div className="search-page__results">
          <p className="search-page__count">{totalHits} total result{totalHits !== 1 ? 's' : ''} for "<strong>{query}</strong>"</p>

          {(source === 'all' || source === 'files') && fileResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-section__title"><FileText size={14} /> Files <span>{fileResults.length}</span></h2>
              <div className="sp-file-list">
                {fileResults.map(file => <FileCard key={file._id} file={file} />)}
              </div>
            </section>
          )}

          {(source === 'all' || source === 'quotes') && quoteResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-section__title"><Quote size={14} /> Quotes <span>{quoteResults.length}</span></h2>
              <div className="search-hit-list">
                {quoteResults.map(q => (
                  <CompactCard
                    key={q._id}
                    icon={Quote}
                    badge={q.sectionName || 'Quote'}
                    title={q.text}
                    subtitle={q.author || q.description}
                    meta={q.isFallback ? 'auto' : 'saved quote'}
                    href="/dashboard"
                    actionLabel="View"
                  />
                ))}
              </div>
            </section>
          )}

          {(source === 'all' || source === 'events') && eventResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-section__title"><Calendar size={14} /> Events <span>{eventResults.length}</span></h2>
              <div className="search-hit-list">
                {eventResults.map(ev => (
                  <CompactCard
                    key={ev._id}
                    icon={Calendar}
                    badge={ev.eventType || 'event'}
                    title={ev.title}
                    subtitle={ev.clubName || ev.description}
                    meta={ev.eventDate ? new Date(ev.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                    href="/events"
                    actionLabel="Open"
                  />
                ))}
              </div>
            </section>
          )}

          {(source === 'all' || source === 'exams') && examResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-section__title"><Clock size={14} /> Exams <span>{examResults.length}</span></h2>
              <div className="search-hit-list">
                {examResults.map(ex => (
                  <CompactCard
                    key={ex._id}
                    icon={Clock}
                    badge={ex.examType || 'exam'}
                    title={ex.title}
                    subtitle={ex.subject || ex.notes || ''}
                    meta={`${ex.regulation || ''} ${ex.branch || ''}`.trim()}
                    href="/exams"
                    actionLabel="Open"
                  />
                ))}
              </div>
            </section>
          )}

          {(source === 'all' || source === 'announcements') && annResults.length > 0 && (
            <section className="search-section">
              <h2 className="search-section__title"><Megaphone size={14} /> Announcements <span>{annResults.length}</span></h2>
              <div className="search-hit-list">
                {annResults.map(a => (
                  <CompactCard
                    key={a._id}
                    icon={Megaphone}
                    badge={a.type || 'notice'}
                    title={a.title}
                    subtitle={a.message}
                    meta={a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                    href="/dashboard"
                    actionLabel="View"
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="search-page__empty-state">
          <Search size={52} />
          <p>Search across files, quotes, events, exams, and announcements</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Type at least 2 characters and press Enter</p>
        </div>
      )}
    </div>
  );
}
