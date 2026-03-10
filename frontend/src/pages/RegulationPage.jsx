import { useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight, Home, Search, FolderPlus,
  Folder, FolderOpen, X, Loader2,
  AlertCircle, Trash2,
} from 'lucide-react';

import {
  fetchFiles,
  fetchFolders,
  createFolder,
  deleteFolder
} from '../api/apiClient';

import { useAuth } from '../hooks/useAuth';

const BRANCHES = [
  { id: 'CSE', label: 'Computer Science & Engineering', emoji: '💻' },
  { id: 'ECE', label: 'Electronics & Communication Engineering', emoji: '📡' },
  { id: 'EEE', label: 'Electrical & Electronics Engineering', emoji: '⚡' },
  { id: 'IT', label: 'Information Technology', emoji: '🌐' },
  { id: 'MECH', label: 'Mechanical Engineering', emoji: '⚙️' },
  { id: 'CIVIL', label: 'Civil Engineering', emoji: '🏗️' },
  { id: 'AIML', label: 'Artificial Intelligence & Machine learning', emoji: '🧠' },
];

export default function RegulationPage() {

  const { regulation } = useParams();
  const navigate = useNavigate();
  const { backendUser } = useAuth();

  const isAdmin = backendUser?.role === 'admin';

  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [subjects, setSubjects] = useState({});
  const [loadingBranch, setLoadingBranch] = useState(null);
  const [creating, setCreating] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folderError, setFolderError] = useState('');

  const loadSubjects = useCallback(async (branchId) => {

    setLoadingBranch(branchId);

    try {

      const { folders } = await fetchFolders({
        regulation,
        branch: branchId
      });

      setSubjects((s) => ({
        ...s,
        [branchId]: folders
      }));

    } finally {

      setLoadingBranch(null);

    }

  }, [regulation]);

  const toggleBranch = (branchId) => {

    if (expanded === branchId) {

      setExpanded(null);
      setCreating(null);

    } else {

      setExpanded(branchId);
      setCreating(null);
      loadSubjects(branchId);

    }

  };

  const openCreateForm = (branchId, e) => {

    e.stopPropagation();

    setCreating(branchId);
    setFolderName('');
    setFolderError('');

  };

  const cancelCreate = (e) => {

    e?.stopPropagation();

    setCreating(null);
    setFolderName('');
    setFolderError('');

  };

  const handleCreate = async (branchId) => {

    const name = folderName.trim();

    if (!name) {
      setFolderError('Please enter a subject name.');
      return;
    }

    const { folder } = await createFolder({
      regulation,
      branch: branchId,
      subject: name
    });

    setSubjects((s) => ({
      ...s,
      [branchId]: [...(s[branchId] || []), folder]
    }));

    setCreating(null);
    setFolderName('');
    setFolderError('');

    navigate(`/r/${regulation}/${branchId}/${encodeURIComponent(name)}`);

  };

  const handleDelete = async (branchId, folderId, e) => {

    if (!isAdmin) return;

    e.stopPropagation();

    if (!window.confirm("Delete this folder?")) return;

    await deleteFolder(folderId);

    setSubjects((s) => ({
      ...s,
      [branchId]: s[branchId].filter((f) => f._id !== folderId)
    }));

  };

  const query = search.trim().toLowerCase();

  const filtered = BRANCHES.filter((b) =>
    !query ||
    b.id.toLowerCase().includes(query) ||
    b.label.toLowerCase().includes(query)
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
            Select a branch → open or create a subject folder.
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
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="branch-list">

        {filtered.map((branch) => {

          const isOpen = expanded === branch.id;
          const isLoading = loadingBranch === branch.id;
          const subs = subjects[branch.id] || [];
          const isCreating = creating === branch.id;

          return (

            <div
              key={branch.id}
              className={'branch-accordion' + (isOpen ? ' branch-accordion--open' : '')}
            >

              <button
                className="branch-accordion__header"
                onClick={() => toggleBranch(branch.id)}
                aria-expanded={isOpen}
              >

                <span className="branch-accordion__emoji">{branch.emoji}</span>
                <span className="branch-accordion__id">{branch.id}</span>
                <span className="branch-accordion__label">{branch.label}</span>

                {isOpen && (
                  <span
                    className="branch-accordion__new-btn"
                    onClick={(e) => openCreateForm(branch.id, e)}
                    role="button"
                    tabIndex={0}
                  >
                    <FolderPlus size={15} />
                    New folder
                  </span>
                )}

                <ChevronRight
                  size={16}
                  className={'branch-accordion__chevron' + (isOpen ? ' branch-accordion__chevron--open' : '')}
                />

              </button>

              {isOpen && (

                <div className="branch-accordion__body">

                  {isCreating && (
                    <div className="create-folder-form" onClick={(e) => e.stopPropagation()}>
                      <div className="create-folder-form__inner">

                        <Folder size={16} className="create-folder-form__icon" />

                        <input
                          autoFocus
                          className="create-folder-form__input"
                          type="text"
                          placeholder="Subject name"
                          value={folderName}
                          onChange={(e) => setFolderName(e.target.value)}
                        />

                        <button
                          className="create-folder-form__confirm"
                          onClick={() => handleCreate(branch.id)}
                        >
                          Create
                        </button>

                        <button
                          className="create-folder-form__cancel"
                          onClick={cancelCreate}
                        >
                          <X size={14} />
                        </button>

                      </div>
                    </div>
                  )}

                  {!isLoading && (

                    <div className="subject-folder-grid">

                      {subs.map((folder) => (

                        <div key={folder._id} className="subject-folder-row">

                          <button
                            className="subject-folder"
                            onClick={() =>
                              navigate(`/r/${regulation}/${branch.id}/${encodeURIComponent(folder.subject)}`)
                            }
                          >

                            <FolderOpen size={17} className="subject-folder__icon" />
                            <span className="subject-folder__name">{folder.subject}</span>

                          </button>

                          {isAdmin && (
                            <button
                              className="subject-folder__delete"
                              onClick={(e) => handleDelete(branch.id, folder._id, e)}
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

          );

        })}

      </div>

    </div>
  );
}