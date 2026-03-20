import { useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, Home, Search, FolderPlus,
  FolderOpen, X, Loader2, Trash2,
  GraduationCap, BookMarked, ChevronDown,
} from 'lucide-react';

import {
  fetchFolders,
  createFolder,
  deleteFolder,
} from '../api/apiClient';

import { useAuth } from '../hooks/useAuth';

const BRANCHES = [
  { id: 'CSE',   label: 'Computer Science & Engineering',            emoji: '💻' },
  { id: 'ECE',   label: 'Electronics & Communication Engineering',   emoji: '📡' },
  { id: 'EEE',   label: 'Electrical & Electronics Engineering',      emoji: '⚡' },
  { id: 'IT',    label: 'Information Technology',                    emoji: '🌐' },
  { id: 'MECH',  label: 'Mechanical Engineering',                    emoji: '⚙️' },
  { id: 'CIVIL', label: 'Civil Engineering',                         emoji: '🏗️' },
  { id: 'AIML',  label: 'Artificial Intelligence & Machine Learning', emoji: '🧠' },
];

const YEARS = [
  { id: '1', label: '1st Year', short: 'Y1', desc: 'Foundation' },
  { id: '2', label: '2nd Year', short: 'Y2', desc: 'Core concepts' },
  { id: '3', label: '3rd Year', short: 'Y3', desc: 'Advanced' },
  { id: '4', label: '4th Year', short: 'Y4', desc: 'Specialisation' },
];

const SEMESTERS = [
  { id: '1', label: 'Semester 1', short: 'SEM 1' },
  { id: '2', label: 'Semester 2', short: 'SEM 2' },
];

function Hl({ text, query }) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="hl">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function RegulationPage() {
  const { regulation } = useParams();
  const navigate = useNavigate();
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';

  const [expandedBranch, setExpandedBranch] = useState(null);
  const [selectedYear, setSelectedYear] = useState({});
  const [selectedSem, setSelectedSem] = useState({});
  const [folders, setFolders] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [creating, setCreating] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');
  const [search, setSearch] = useState('');

  const cacheKey = (branch, year, sem) => `${branch}-${year}-${sem}`;

  const loadFolders = useCallback(async (branch, year, sem) => {
    const key = cacheKey(branch, year, sem);
    if (folders[key]) return;
    setLoadingKey(key);
    try {
      const result = await fetchFolders({ regulation, branch, year, sem });
      const list = result?.folders || result?.data?.folders || [];
      setFolders(prev => ({ ...prev, [key]: list }));
    } finally {
      setLoadingKey(null);
    }
  }, [regulation, folders]);

  const toggleBranch = (branchId) => {
    if (expandedBranch === branchId) {
      setExpandedBranch(null);
    } else {
      setExpandedBranch(branchId);
      setSelectedYear(prev => ({ ...prev, [branchId]: null }));
      setSelectedSem(prev => ({ ...prev, [branchId]: null }));
    }
    setCreating(null);
  };

  const pickYear = (branchId, yearId) => {
    setSelectedYear(prev => ({ ...prev, [branchId]: yearId }));
    setSelectedSem(prev => ({ ...prev, [branchId]: null }));
    setCreating(null);
  };

  const pickSem = (branchId, semId) => {
    const year = selectedYear[branchId];
    setSelectedSem(prev => ({ ...prev, [branchId]: semId }));
    loadFolders(branchId, year, semId);
    setCreating(null);
  };

  const handleCreate = async (branchId) => {
    const name = folderName.trim();
    if (!name) { setFolderError('Please enter a subject name.'); return; }
    const year = selectedYear[branchId];
    const sem = selectedSem[branchId];
    const key = cacheKey(branchId, year, sem);
    try {
      const result = await createFolder({ regulation, branch: branchId, subject: name, year, sem });
      const folder = result?.folder || result?.data?.folder;
      setFolders(prev => ({ ...prev, [key]: [...(prev[key] || []), folder] }));
      setCreating(null);
      setFolderName('');
      navigate(`/r/${regulation}/${branchId}/${encodeURIComponent(name)}`);
    } catch (e) {
      setFolderError(e.message || 'Failed to create folder.');
    }
  };

  const handleDelete = async (branchId, folderId, e) => {
    if (!isAdmin) return;
    e.stopPropagation();
    if (!window.confirm('Delete this folder?')) return;
    const year = selectedYear[branchId];
    const sem = selectedSem[branchId];
    const key = cacheKey(branchId, year, sem);
    await deleteFolder(folderId);
    setFolders(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(f => f._id !== folderId),
    }));
  };

  const cancelCreate = () => { setCreating(null); setFolderName(''); setFolderError(''); };

  const query = search.trim().toLowerCase();
  const filtered = BRANCHES.filter(b =>
    !query || b.id.toLowerCase().includes(query) || b.label.toLowerCase().includes(query)
  );

  return (
    <div className="reg-page">
      <nav className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb__item">
          <Home size={13} /> Repository
        </Link>
        <ChevronRight size={13} className="breadcrumb__sep" />
        <span className="breadcrumb__item breadcrumb__item--active">{regulation}</span>
      </nav>

      <div className="reg-page__header">
        <div>
          <h1 className="reg-page__title">Regulation {regulation}</h1>
          <p className="reg-page__sub">
            Select a branch → year → semester → subject folder
          </p>
        </div>
      </div>

      <div className="reg-page__search-wrap">
        <Search size={15} className="reg-page__search-icon" />
        <input
          type="search"
          className="reg-page__search"
          placeholder="Search branches…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="branch-list">
        {filtered.length === 0 && (
          <p className="reg-page__no-results">No branches match "{search}"</p>
        )}

        {filtered.map(branch => {
          const isOpen = expandedBranch === branch.id;
          const year = selectedYear[branch.id];
          const sem = selectedSem[branch.id];
          const key = cacheKey(branch.id, year, sem);
          const subs = (year && sem && folders[key]) || [];
          const loading = loadingKey === key;
          const isCreating = creating === key;

          return (
            <div
              key={branch.id}
              className={`branch-accordion${isOpen ? ' branch-accordion--open' : ''}`}
            >
              <button
                className="branch-accordion__header"
                onClick={() => toggleBranch(branch.id)}
                aria-expanded={isOpen}
              >
                <span className="branch-accordion__emoji">{branch.emoji}</span>
                <span className="branch-accordion__id">{branch.id}</span>
                <span className="branch-accordion__label">
                  <Hl text={branch.label} query={query} />
                </span>
                <ChevronDown
                  size={16}
                  className={`branch-accordion__chevron-down${isOpen ? ' open' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="branch-accordion__body">

                  {/* STEP 1: Year picker */}
                  <div className="drill-step">
                    <p className="drill-step__label">
                      <GraduationCap size={14} /> Select Year
                    </p>
                    <div className="year-grid">
                      {YEARS.map(y => (
                        <button
                          key={y.id}
                          className={`year-card${year === y.id ? ' year-card--active' : ''}`}
                          onClick={() => pickYear(branch.id, y.id)}
                        >
                          <span className="year-card__short">{y.short}</span>
                          <span className="year-card__label">{y.label}</span>
                          <span className="year-card__desc">{y.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STEP 2: Semester picker */}
                  {year && (
                    <div className="drill-step drill-step--animate">
                      <p className="drill-step__label">
                        <BookMarked size={14} /> Select Semester
                        <span className="drill-step__ctx"> — {YEARS.find(y => y.id === year)?.label}</span>
                      </p>
                      <div className="sem-grid">
                        {SEMESTERS.map(s => (
                          <button
                            key={s.id}
                            className={`sem-card${sem === s.id ? ' sem-card--active' : ''}`}
                            onClick={() => pickSem(branch.id, s.id)}
                          >
                            <span className="sem-card__label">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Subject folders */}
                  {year && sem && (
                    <div className="drill-step drill-step--animate">
                      <div className="drill-step__header-row">
                        <p className="drill-step__label">
                          <FolderOpen size={14} /> Subjects
                          <span className="drill-step__ctx"> — Y{year} · Sem {sem}</span>
                        </p>
                        {isAdmin && (
                          <button
                            className="branch-accordion__new-btn"
                            onClick={() => { setCreating(key); setFolderName(''); setFolderError(''); }}
                          >
                            <FolderPlus size={14} /> New folder
                          </button>
                        )}
                      </div>

                      {isCreating && (
                        <div className="create-folder-form">
                          <div className="create-folder-form__inner">
                            <FolderOpen size={16} className="create-folder-form__icon" />
                            <input
                              autoFocus
                              className="create-folder-form__input"
                              type="text"
                              placeholder="Subject name"
                              value={folderName}
                              onChange={e => setFolderName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCreate(branch.id)}
                            />
                            <button
                              className="create-folder-form__confirm"
                              onClick={() => handleCreate(branch.id)}
                            >Create</button>
                            <button className="create-folder-form__cancel" onClick={cancelCreate}>
                              <X size={14} />
                            </button>
                          </div>
                          {folderError && <p className="create-folder-form__error">{folderError}</p>}
                        </div>
                      )}

                      {loading && (
                        <div className="branch-subjects-loading">
                          <Loader2 size={15} className="spin" /> Loading subjects…
                        </div>
                      )}

                      {!loading && (
                        <div className="subject-folder-grid">
                          {subs.length === 0 && !isCreating && (
                            <div className="subject-folder-empty">
                              <FolderOpen size={32} />
                              <p>No subjects yet for Y{year} · Sem {sem}</p>
                              {isAdmin && (
                                <button
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => { setCreating(key); setFolderName(''); setFolderError(''); }}
                                >
                                  <FolderPlus size={13} /> Add subject
                                </button>
                              )}
                            </div>
                          )}

                          {subs.map(folder => (
                            <div key={folder._id} className="subject-folder-row">
                              <button
                                className="subject-folder"
                                onClick={() =>
                                  navigate(`/r/${regulation}/${branch.id}/${encodeURIComponent(folder.subject)}`)
                                }
                              >
                                <FolderOpen size={16} className="subject-folder__icon" />
                                <span className="subject-folder__name">{folder.subject}</span>
                                <ChevronRight size={14} className="subject-folder__arrow" />
                              </button>
                              {isAdmin && (
                                <button
                                  className="subject-folder__delete"
                                  onClick={e => handleDelete(branch.id, folder._id, e)}
                                  title="Delete folder"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}