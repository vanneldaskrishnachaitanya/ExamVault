import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function CommandPalette({ open, onClose, onToggleStudyMode }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const commands = useMemo(() => {
    const base = [
      { id: 'dash', title: 'Open Dashboard', hint: 'Go to home dashboard', keywords: 'dashboard home', run: () => navigate('/dashboard') },
      { id: 'search', title: 'Global Search', hint: 'Find files, exams, events, quotes', keywords: 'search files exams events', run: () => navigate('/search') },
      { id: 'timetable', title: 'Open Timetable', hint: 'See your schedule quickly', keywords: 'timetable schedule class', run: () => navigate('/timetable') },
      { id: 'exams', title: 'Open Exams', hint: 'Check upcoming exams', keywords: 'exam test schedule', run: () => navigate('/exams') },
      { id: 'coding', title: 'Open Coding', hint: 'Continue coding practice', keywords: 'coding practice dsa', run: () => navigate('/coding') },
      { id: 'downloads', title: 'Open Downloads', hint: 'See your download history', keywords: 'downloads history', run: () => navigate('/downloads') },
      { id: 'study', title: 'Toggle Study Mode', hint: 'Reduce distractions and focus', keywords: 'study focus mode', run: () => onToggleStudyMode?.() },
    ];

    const admin = isAdmin
      ? [{ id: 'admin', title: 'Open Admin Panel', hint: 'Manage repository and users', keywords: 'admin panel manage', run: () => navigate('/admin') }]
      : [];

    let saved = [];
    try {
      const raw = JSON.parse(localStorage.getItem('ev-saved-items-v1') || '[]');
      saved = raw.slice(0, 4).map((item, idx) => ({
        id: `saved-${idx}`,
        title: `Open saved: ${item.title || 'Item'}`,
        hint: item.subtitle || 'Saved quick link',
        keywords: `${item.title || ''} ${item.subtitle || ''} saved pinned`,
        run: () => {
          if (item.href) navigate(item.href);
        },
      }));
    } catch {
      saved = [];
    }

    return [...base, ...admin, ...saved];
  }, [isAdmin, navigate, onToggleStudyMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => (`${cmd.title} ${cmd.hint} ${cmd.keywords}`).toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runCommand = (cmd) => {
    if (!cmd) return;
    cmd.run();
    onClose();
  };

  const handleListKeyDown = (e) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} onKeyDown={handleListKeyDown}>
        <div className="cmdk__input-wrap">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands..."
            className="cmdk__input"
          />
          <span className="cmdk__kbd"><Command size={12} /> K</span>
        </div>

        <div className="cmdk__list" role="listbox" aria-label="Command results">
          {filtered.length === 0 ? (
            <div className="cmdk__empty">No command matched your search.</div>
          ) : (
            filtered.slice(0, 12).map((cmd, index) => (
              <button
                key={cmd.id}
                className={`cmdk__item${index === activeIndex ? ' cmdk__item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => runCommand(cmd)}
              >
                <div>
                  <p className="cmdk__title">{cmd.title}</p>
                  <p className="cmdk__hint">{cmd.hint}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
