import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Calendar, Plus, Trash2, Loader2, ExternalLink, CheckCircle,
  Clock, MapPin, Trophy, Users, X, Upload, Tag, Filter,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchEvents, fetchEventClubs, createEvent, toggleEventComplete, deleteEvent } from '../api/apiClient';

const EVENT_TYPES = [
  { id: 'technical',     label: 'Technical',     color: '#3b82f6' },
  { id: 'non_technical', label: 'Non-Technical',  color: '#a855f7' },
  { id: 'workshop',      label: 'Workshop',       color: '#f59e0b' },
  { id: 'hackathon',     label: 'Hackathon',      color: '#ef4444' },
  { id: 'cultural',      label: 'Cultural',       color: '#ec4899' },
  { id: 'sports',        label: 'Sports',         color: '#22c55e' },
  { id: 'other',         label: 'Other',          color: '#8b92a8' },
];

const getType = (id) => EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[6];

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
const isRegOpen = (e) => {
  const now = new Date();
  if (e.registrationEnd && new Date(e.registrationEnd) < now) return false;
  if (e.registrationStart && new Date(e.registrationStart) > now) return false;
  return !!e.registrationLink;
};

export default function EventsPage() {
  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === 'admin';
  const imgRef = useRef(null);

  const [events,       setEvents]       = useState([]);
  const [clubs,        setClubs]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [filterType,   setFilterType]   = useState('');
  const [filterClub,   setFilterClub]   = useState('');
  const [filterDone,   setFilterDone]   = useState(false);
  const [toast,        setToast]        = useState('');
  const [imgPreview,   setImgPreview]   = useState(null);
  const [selectedEvent,setSelectedEvent]= useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  const [form, setForm] = useState({
    title:'', description:'', clubName:'', organizerName:'',
    eventType:'technical', registrationLink:'', registrationStart:'',
    registrationEnd:'', eventDate:'', eventEnd:'', venue:'', prize:'', image: null,
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type      = filterType;
      if (filterClub) params.club      = filterClub;
      if (filterDone) params.completed = 'true';
      const [evData, clubData] = await Promise.all([
        fetchEvents(params),
        fetchEventClubs(),
      ]);
      setEvents(evData.events || []);
      setClubs(clubData.clubs || []);
    } catch {}
    finally { setLoading(false); }
  }, [filterType, filterClub, filterDone]);

  useEffect(() => { load(); }, [load]);

  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setForm(p => ({ ...p, image: f }));
    setImgPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.clubName || !form.eventDate) {
      showToast('Title, Club Name, and Event Date are required'); return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (k !== 'image' && v) fd.append(k, v); });
      if (form.image) fd.append('image', form.image);
      const d = await createEvent(fd);
      setEvents(prev => [d.event, ...prev]);
      setShowForm(false);
      setForm({ title:'', description:'', clubName:'', organizerName:'', eventType:'technical', registrationLink:'', registrationStart:'', registrationEnd:'', eventDate:'', venue:'', prize:'', image:null });
      setImgPreview(null);
      showToast('Event added ✓');
    } catch (e) { showToast(`Error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const handleComplete = async (id) => {
    try {
      const d = await toggleEventComplete(id);
      setEvents(prev => prev.map(e => e._id === id ? d.event : e));
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      setEvents(prev => prev.filter(e => e._id !== id));
      showToast('Deleted');
    } catch (e) { showToast(`Error: ${e.message}`); }
  };

  const upcoming  = events.filter(e => !e.isCompleted);
  const completed = events.filter(e => e.isCompleted);

  return (
    <div className="events-page">
      {/* Header */}
      <div className="events-header">
        <div>
          <h1 className="events-title"><Calendar size={24}/> Events</h1>
          <p className="events-sub">Upcoming college events, workshops, hackathons & more</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={14}/> Add Event
          </button>
        )}
      </div>

      {/* Add Event Form */}
      {showForm && isAdmin && (
        <div className="event-form">
          <h3 className="event-form__title">New Event</h3>
          <div className="event-form__grid">
            <label className="modal__label" style={{gridColumn:'1/-1'}}>Event Title *
              <input className="modal__input" placeholder="e.g. CodeFest 2025" value={form.title}
                onChange={e => setForm(p=>({...p,title:e.target.value}))} />
            </label>
            <label className="modal__label">Club / Organization *
              <input className="modal__input" placeholder="e.g. CSE Association" value={form.clubName}
                onChange={e => setForm(p=>({...p,clubName:e.target.value}))} />
            </label>
            <label className="modal__label">Organizer Name
              <input className="modal__input" placeholder="e.g. Dr. Krishna" value={form.organizerName}
                onChange={e => setForm(p=>({...p,organizerName:e.target.value}))} />
            </label>
            <label className="modal__label">Event Type
              <select className="modal__select" value={form.eventType}
                onChange={e => setForm(p=>({...p,eventType:e.target.value}))}>
                {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="modal__label">Event Date *
              <input className="modal__input" type="date" value={form.eventDate}
                onChange={e => setForm(p=>({...p,eventDate:e.target.value}))} />
            </label>
            <label className="modal__label">Event End Date
              <input className="modal__input" type="date" value={form.eventEnd}
                onChange={e => setForm(p=>({...p,eventEnd:e.target.value}))} />
            </label>
            <label className="modal__label">Venue
              <input className="modal__input" placeholder="e.g. Seminar Hall" value={form.venue}
                onChange={e => setForm(p=>({...p,venue:e.target.value}))} />
            </label>
            <label className="modal__label">Prize / Reward
              <input className="modal__input" placeholder="e.g. ₹10,000 + Certificate" value={form.prize}
                onChange={e => setForm(p=>({...p,prize:e.target.value}))} />
            </label>
            <label className="modal__label">Registration Link
              <input className="modal__input" placeholder="https://forms.gle/..." value={form.registrationLink}
                onChange={e => setForm(p=>({...p,registrationLink:e.target.value}))} />
            </label>
            <label className="modal__label">Registration Opens
              <input className="modal__input" type="date" value={form.registrationStart}
                onChange={e => setForm(p=>({...p,registrationStart:e.target.value}))} />
            </label>
            <label className="modal__label">Registration Deadline
              <input className="modal__input" type="date" value={form.registrationEnd}
                onChange={e => setForm(p=>({...p,registrationEnd:e.target.value}))} />
            </label>
            <label className="modal__label" style={{gridColumn:'1/-1'}}>Description
              <textarea className="modal__input" rows={3} placeholder="Describe the event..."
                value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                style={{resize:'vertical'}} />
            </label>
            <label className="modal__label" style={{gridColumn:'1/-1'}}>Event Poster / Image
              <div className="event-form__imgbox" onClick={() => imgRef.current?.click()}>
                <input ref={imgRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg}/>
                {imgPreview
                  ? <img src={imgPreview} alt="preview" className="event-form__imgpreview"/>
                  : <span style={{color:'var(--text-3)',fontSize:'0.85rem'}}><Upload size={14}/> Click to upload poster</span>
                }
              </div>
            </label>
          </div>
          <div style={{display:'flex',gap:'0.5rem',marginTop:'0.75rem'}}>
            <button className="btn btn--primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={14} className="spin"/> : <Plus size={14}/>} Add Event
            </button>
            <button className="btn btn--ghost" onClick={() => { setShowForm(false); setImgPreview(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="events-filters">
        <div className="events-filter-types">
          <button className={`evt-filter-btn${!filterType?' evt-filter-btn--active':''}`} onClick={() => setFilterType('')}>
            All
          </button>
          {EVENT_TYPES.map(t => (
            <button key={t.id}
              className={`evt-filter-btn${filterType===t.id?' evt-filter-btn--active':''}`}
              style={filterType===t.id ? {borderColor:t.color,background:t.color+'18',color:t.color} : {}}
              onClick={() => setFilterType(filterType===t.id?'':t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:'0.5rem',alignItems:'center',flexWrap:'wrap'}}>
          {clubs.length > 0 && (
            <select className="modal__select" style={{fontSize:'0.8rem',padding:'0.3rem 0.6rem'}}
              value={filterClub} onChange={e => setFilterClub(e.target.value)}>
              <option value="">All Clubs</option>
              {clubs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button className={`evt-filter-btn${filterDone?' evt-filter-btn--active':''}`}
            onClick={() => setFilterDone(p => !p)}>
            <CheckCircle size={12}/> Completed
          </button>
        </div>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin"/></div>
      ) : events.length === 0 ? (
        <div className="sp-state sp-state--empty">
          <Calendar size={40}/>
          <p>No events yet. {isAdmin ? 'Add the first event!' : 'Check back soon!'}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="events-section">
              <h2 className="events-section__title">Upcoming Events <span className="events-section__count">{upcoming.length}</span></h2>
              <div className="events-grid">
                {upcoming.map(ev => <EventCard key={ev._id} ev={ev} isAdmin={isAdmin} onView={setSelectedEvent} onComplete={handleComplete} onDelete={handleDelete}/>)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className="events-section" style={{marginTop:'2rem'}}>
              <h2 className="events-section__title" style={{color:'var(--text-3)'}}>Completed <span className="events-section__count">{completed.length}</span></h2>
              <div className="events-grid">
                {completed.map(ev => <EventCard key={ev._id} ev={ev} isAdmin={isAdmin} onView={setSelectedEvent} onComplete={handleComplete} onDelete={handleDelete}/>)}
              </div>
            </div>
          )}
        </>
      )}

      {selectedEvent && (
        <div className="event-detail-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="event-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-detail-row" style={{justifyContent:'space-between'}}>
              <h3 style={{margin:0}}>{selectedEvent.title}</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
            <p style={{color:'var(--text-2)', margin:'0.4rem 0 0.8rem'}}>{selectedEvent.description || 'No description provided.'}</p>
            <div className="event-detail-row"><strong>Club:</strong><span>{selectedEvent.clubName || '-'}</span></div>
            <div className="event-detail-row"><strong>Organizer:</strong><span>{selectedEvent.organizerName || '-'}</span></div>
            <div className="event-detail-row"><strong>Type:</strong><span>{getType(selectedEvent.eventType).label}</span></div>
            <div className="event-detail-row"><strong>Venue:</strong><span>{selectedEvent.venue || '-'}</span></div>
            <div className="event-detail-row"><strong>Prize:</strong><span>{selectedEvent.prize || '-'}</span></div>
            <div className="event-detail-row"><strong>Event starts:</strong><span>{fmt(selectedEvent.eventDate)}</span></div>
            {selectedEvent.eventEnd && <div className="event-detail-row"><strong>Event ends:</strong><span>{fmt(selectedEvent.eventEnd)}</span></div>}
            <div className="event-detail-row"><strong>Registration opens:</strong><span>{selectedEvent.registrationStart ? fmt(selectedEvent.registrationStart) : '-'}</span></div>
            <div className="event-detail-row"><strong>Registration closes:</strong><span>{selectedEvent.registrationEnd ? fmt(selectedEvent.registrationEnd) : '-'}</span></div>
            {selectedEvent.registrationLink && <div className="event-detail-row"><strong>Register:</strong><a href={selectedEvent.registrationLink} target="_blank" rel="noreferrer">Open link</a></div>}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function EventCard({ ev, isAdmin, onView, onComplete, onDelete }) {
  const type   = getType(ev.eventType);
  const regOpen = isRegOpen(ev);
  const isPast  = new Date(ev.eventDate) < new Date();

  return (
    <div className={`event-card${ev.isCompleted ? ' event-card--done' : ''}`}>
      {/* Image */}
      {ev.imageUrl && (
        <div className="event-card__img">
          <img src={ev.imageUrl} alt={ev.title}/>
          {ev.isCompleted && <div className="event-card__done-overlay"><CheckCircle size={32}/> Completed</div>}
        </div>
      )}

      <div className="event-card__body" onClick={() => onView && onView(ev)} style={{ cursor: 'pointer' }}>
        {/* Type + Club badges */}
        <div className="event-card__badges">
          <span className="event-card__badge" style={{color:type.color, background:type.color+'18', border:`1px solid ${type.color}30`}}>
            <Tag size={10}/> {type.label}
          </span>
          <span className="event-card__badge event-card__badge--club">
            <Users size={10}/> {ev.clubName}
          </span>
          {ev.isCompleted && (
            <span className="event-card__badge" style={{color:'#22c55e',background:'#22c55e18',border:'1px solid #22c55e30'}}>
              ✓ Done
            </span>
          )}
          {!ev.isCompleted && regOpen && (
            <span className="event-card__badge event-card__badge--open">🟢 Reg Open</span>
          )}
          {!ev.isCompleted && !regOpen && ev.registrationLink && (
            <span className="event-card__badge event-card__badge--closed">🔴 Reg Closed</span>
          )}
        </div>

        <h3 className="event-card__title">{ev.title}</h3>
        {ev.description && <p className="event-card__desc">{ev.description}</p>}

        {/* Meta info */}
        <div className="event-card__meta">
          <span><Calendar size={12}/> {fmt(ev.eventDate)}</span>
          {ev.venue && <span><MapPin size={12}/> {ev.venue}</span>}
          {ev.organizerName && <span><Users size={12}/> {ev.organizerName}</span>}
          {ev.prize && <span><Trophy size={12}/> {ev.prize}</span>}
        </div>

        {/* Registration dates */}
        {(ev.registrationStart || ev.registrationEnd) && (
          <div className="event-card__regdates">
            <Clock size={11}/>
            {ev.registrationStart && <span>Opens: {fmt(ev.registrationStart)}</span>}
            {ev.registrationEnd && <span>Deadline: {fmt(ev.registrationEnd)}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="event-card__actions">
          {ev.registrationLink && regOpen && (
            <a href={ev.registrationLink} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">
              <ExternalLink size={13}/> Register
            </a>
          )}
          {ev.registrationLink && !regOpen && (
            <a href={ev.registrationLink} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
              <ExternalLink size={13}/> View Form
            </a>
          )}
          {isAdmin && (
            <>
              <button className={`btn btn--sm ${ev.isCompleted ? 'btn--ghost' : 'btn--success'}`}
                onClick={(e) => { e.stopPropagation(); onComplete(ev._id); }}>
                <CheckCircle size={13}/> {ev.isCompleted ? 'Reopen' : 'Mark Done'}
              </button>
              <button className="btn btn--danger btn--sm" onClick={(e) => { e.stopPropagation(); onDelete(ev._id); }}>
                <Trash2 size={13}/>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
