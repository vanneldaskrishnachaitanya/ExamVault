import { useEffect, useState, useCallback } from 'react';
import { Users, Search, Loader2, CheckCircle, XCircle, Shield, GraduationCap } from 'lucide-react';
import { fetchAllUsers, toggleUserActive } from '../api/apiClient';

function formatLastSeen(dateValue) {
  if (!dateValue) return 'Never';
  const ts = new Date(dateValue).getTime();
  if (Number.isNaN(ts)) return 'Never';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateValue).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function shouldHideAdminListUser(user) {
  const name = String(user?.name || '').trim().toLowerCase();
  const email = String(user?.email || '').trim().toLowerCase();
  const emailLocal = email.split('@')[0] || '';
  const hiddenKeys = new Set(['faculty', 'demo', 'faculty demo']);
  const facultyDemoPattern = /faculty[\s._-]*demo/;

  return (
    hiddenKeys.has(name)
    || hiddenKeys.has(emailLocal)
    || facultyDemoPattern.test(name)
    || facultyDemoPattern.test(emailLocal)
  );
}

export default function UserManagementPage() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [toast,   setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchAllUsers({ search, role, limit: 50 });
      const filteredUsers = (d.users || []).filter((u) => !shouldHideAdminListUser(u));
      setUsers(filteredUsers);
      setTotal(filteredUsers.length);
    } catch {}
    finally { setLoading(false); }
  }, [search, role]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, name, isActive) => {
    try {
      await toggleUserActive(id);
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
      showToast(`${name} ${isActive ? 'deactivated' : 'activated'} ✓`);
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  return (
    <div className="users-page">
      <div className="users-page__header">
        <h1 className="users-page__title"><Users size={22} /> User Management</h1>
        <span className="users-page__count">{total} total</span>
      </div>

      <div className="users-page__filters">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
          <input className="reg-page__search" style={{ paddingLeft:'2.2rem' }}
            placeholder="Search by name or email…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="modal__select" style={{ width:'auto' }} value={role} onChange={e => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin" /> Loading…</div>
      ) : users.length === 0 ? (
        <div className="sp-state sp-state--empty"><Users size={36} /><p>No users found</p></div>
      ) : (
        <div className="users-list">
          {users.map(user => (
            <div key={user._id} className={`user-row${!user.isActive ? ' user-row--inactive' : ''}`}>
              <div className="user-row__avatar">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} />
                  : <span>{user.name?.slice(0,2).toUpperCase()}</span>}
              </div>
              <div className="user-row__body">
                <p className="user-row__name">{user.name}</p>
                <p className="user-row__email">{user.email}</p>
              </div>
              <div className="user-row__meta">
                <span className={`user-row__role user-row__role--${user.role}`}>
                  {user.role === 'admin'
                    ? <><Shield size={11} /> Admin</>
                    : <><GraduationCap size={11} /> Student</>}
                </span>
                <span className="user-row__status" title={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString('en-IN') : 'Never'}>
                  Last seen: {formatLastSeen(user.lastSeenAt)}
                </span>
                <span className={`user-row__status${user.isActive ? ' user-row__status--active' : ' user-row__status--inactive'}`}>
                  {user.isActive
                    ? <><CheckCircle size={11} /> Active</>
                    : <><XCircle size={11} /> Inactive</>}
                </span>
              </div>
              {user.role !== 'admin' && (
                <button
                  className={`btn btn--sm ${user.isActive ? 'btn--danger' : 'btn--success'}`}
                  onClick={() => handleToggle(user._id, user.name, user.isActive)}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
