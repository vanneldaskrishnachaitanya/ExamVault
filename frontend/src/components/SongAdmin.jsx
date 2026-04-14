// src/components/SongAdmin.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Music, Plus, Trash2, Eye, EyeOff, Loader2, Check,
  ToggleLeft, ToggleRight, Calendar, Download, Image, X,
} from 'lucide-react';
import {
  fetchSongSettings, toggleSongEnabled,
  fetchAllSongs, createSong, updateSong, deleteSong,
} from '../api/apiClient';

export default function SongAdmin({ toast }) {
  const [settings,  setSettings]  = useState(null);
  const [songs,     setSongs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  const [form, setForm] = useState({
    title: '', artist: '', lyrics: '', bgImageUrl: '', scheduledFor: '',
  });
  const [audioFile,   setAudioFile]   = useState(null);
  const [imageFiles,  setImageFiles]  = useState([]);          // File[]
  const [imagePreviews, setImagePreviews] = useState([]);     // DataURL[]

  const audioInputRef = useRef();
  const imageInputRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([fetchSongSettings(), fetchAllSongs()]);
      setSettings(s);
      setSongs(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.show(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Image preview helpers ─────────────────────────────────
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    setImageFiles(files);
    const previews = [];
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        previews.push(ev.target.result);
        if (previews.length === files.length) setImagePreviews([...previews]);
      };
      reader.readAsDataURL(f);
    });
    if (!files.length) setImagePreviews([]);
  };

  const removeImagePreview = (i) => {
    const newFiles = imageFiles.filter((_, idx) => idx !== i);
    const newPreviews = imagePreviews.filter((_, idx) => idx !== i);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    // update the file input so it reflects the change visually
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ── Toggle global enabled ─────────────────────────────────
  const handleToggleEnabled = async () => {
    setToggling(true);
    try {
      const d = await toggleSongEnabled();
      setSettings(d);
      toast.show(d.enabled ? 'Song section visible ✓' : 'Song section hidden');
    } catch (e) {
      toast.show(`Error: ${e.message}`);
    } finally {
      setToggling(false);
    }
  };

  // ── Create song ───────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim()) { toast.show('Song title is required'); return; }
    if (!audioFile)          { toast.show('Audio file is required'); return; }

    const fd = new FormData();
    fd.append('title',  form.title.trim());
    fd.append('artist', form.artist.trim());
    fd.append('lyrics', form.lyrics);
    fd.append('bgImageUrl', form.bgImageUrl.trim());
    if (form.scheduledFor) fd.append('scheduledFor', form.scheduledFor);
    fd.append('audio', audioFile);
    imageFiles.forEach(f => fd.append('images', f));

    setSaving(true);
    try {
      const created = await createSong(fd);
      setSongs(prev => [{ ...created, isToday: false }, ...prev]);
      // Reset form
      setForm({ title: '', artist: '', lyrics: '', bgImageUrl: '', scheduledFor: '' });
      setAudioFile(null);
      setImageFiles([]);
      setImagePreviews([]);
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
      setShowForm(false);
      toast.show('Song added ✓');
      // Reload to get accurate isToday badges
      load();
    } catch (e) {
      toast.show(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle individual song active ─────────────────────────
  const handleToggleSong = async (song) => {
    try {
      const d = await updateSong(song._id, { active: !song.active });
      setSongs(prev => prev.map(s => s._id === song._id ? { ...s, active: d.active } : s));
      toast.show(d.active ? 'Song activated' : 'Song deactivated (skipped in rotation)');
    } catch (e) {
      toast.show(`Error: ${e.message}`);
    }
  };

  // ── Delete song ───────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this song? Its audio and images will also be removed.')) return;
    try {
      await deleteSong(id);
      setSongs(prev => prev.filter(s => s._id !== id));
      toast.show('Song deleted');
    } catch (e) {
      toast.show(`Error: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 size={24} className="spin" style={{ color: 'var(--amber)' }} />
      </div>
    );
  }

  return (
    <div className="song-admin">

      {/* ── Header & global toggle ─────────────────────────── */}
      <div className="song-admin__header">
        <div className="song-admin__title-row">
          <Music size={18} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <div>
            <h3 className="song-admin__title">Song of the Day</h3>
            <p className="song-admin__sub">
              One song is shown per day — cycling through all active songs.
              Schedule a specific song to a date to pin it.
            </p>
          </div>
        </div>
        <button
          className={`qs-toggle-btn qs-toggle-btn--sm${settings?.enabled ? ' qs-toggle-btn--on' : ''}`}
          onClick={handleToggleEnabled}
          disabled={toggling}
        >
          {toggling
            ? <Loader2 size={13} className="spin" />
            : settings?.enabled
              ? <><ToggleRight size={16} /> Visible</>
              : <><ToggleLeft size={16} /> Hidden</>}
        </button>
      </div>

      {/* ── Add song button ───────────────────────────────── */}
      <button
        className="btn btn--primary btn--sm"
        style={{ marginBottom: '1rem' }}
        onClick={() => setShowForm(s => !s)}
      >
        <Plus size={13} /> {showForm ? 'Cancel' : 'Add New Song'}
      </button>

      {/* ── Add song form ─────────────────────────────────── */}
      {showForm && (
        <div className="song-admin__form">

          <div className="song-admin__form-row">
            <label className="modal__label">
              Song Title *
              <input
                className="modal__input"
                placeholder="e.g. Om Namah Shivaya"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
              />
            </label>
            <label className="modal__label">
              Artist / Author
              <input
                className="modal__input"
                placeholder="e.g. S.P. Balasubrahmanyam"
                value={form.artist}
                onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                maxLength={150}
              />
            </label>
          </div>

          <label className="modal__label">
            Lyrics <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(press Enter for line breaks — shown exactly as typed)</span>
            <textarea
              className="modal__input"
              rows={7}
              placeholder={"Enter the lyrics here…\nPress Enter for new lines."}
              value={form.lyrics}
              onChange={e => setForm(f => ({ ...f, lyrics: e.target.value }))}
              style={{ resize: 'vertical', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            />
          </label>

          {/* Audio upload */}
          <label className="modal__label">
            Audio File * <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(MP3, WAV, OGG, M4A — max 50 MB)</span>
            <div className="song-admin__file-row">
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.wav,.ogg,.m4a,audio/*"
                className="song-admin__file-input"
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
              />
              {audioFile && (
                <span className="song-admin__file-chip">
                  🎵 {audioFile.name}
                </span>
              )}
            </div>
          </label>

          {/* Image upload */}
          <label className="modal__label">
            Images beside lyrics <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(up to 6 — JPEG/PNG/WebP)</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="song-admin__file-input"
              onChange={handleImageSelect}
            />
          </label>

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="song-admin__img-previews">
              {imagePreviews.map((src, i) => (
                <div key={i} className="song-admin__img-preview-wrap">
                  <img src={src} alt={`Preview ${i + 1}`} className="song-admin__img-preview" />
                  <button
                    className="song-admin__img-remove"
                    onClick={() => removeImagePreview(i)}
                    title="Remove"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="song-admin__form-row">
            <label className="modal__label">
              Background image URL <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(optional — shown dimly)</span>
              <input
                className="modal__input"
                placeholder="https://… (appears dimly behind content)"
                value={form.bgImageUrl}
                onChange={e => setForm(f => ({ ...f, bgImageUrl: e.target.value }))}
              />
            </label>
            <label className="modal__label">
              Schedule for date <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>(optional — pins to a day)</span>
              <input
                className="modal__input"
                type="date"
                value={form.scheduledFor}
                onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button className="btn btn--primary btn--sm" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Save Song
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Song archive list ─────────────────────────────── */}
      {songs.length === 0 ? (
        <div className="qs-empty-state">
          <Music size={34} style={{ opacity: 0.25 }} />
          <p>No songs yet. Add one!</p>
        </div>
      ) : (
        <div className="song-admin__list">
          <p className="song-admin__list-label">Archive — {songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          {songs.map(song => (
            <div
              key={song._id}
              className={`song-admin__row${!song.active ? ' song-admin__row--dim' : ''}`}
            >
              <div className="song-admin__row-body">
                <div className="song-admin__row-meta">
                  {song.isToday && <span className="song-admin__badge song-admin__badge--today">🎵 Today</span>}
                  {!song.active && <span className="song-admin__badge song-admin__badge--off">inactive</span>}
                  {song.scheduledFor && (
                    <span className="song-admin__timer">
                      <Calendar size={11} />
                      {new Date(song.scheduledFor).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="song-admin__timer" style={{ color: 'var(--text-3)' }}>
                    Added {new Date(song.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="song-admin__row-title">{song.title}</p>
                {song.artist && <p className="song-admin__row-artist">— {song.artist}</p>}
                <div className="song-admin__row-chips">
                  {song.audioUrl && (
                    <span className="song-admin__chip">🎵 audio</span>
                  )}
                  {song.imageUrls?.length > 0 && (
                    <span className="song-admin__chip">
                      <Image size={11} /> {song.imageUrls.length} image{song.imageUrls.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {song.bgImageUrl && <span className="song-admin__chip">🖼 bg</span>}
                  {song.lyrics && <span className="song-admin__chip">📝 lyrics</span>}
                </div>
              </div>

              <div className="song-admin__row-actions">
                {song.audioUrl && (
                  <a
                    href={song.audioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--sm btn--ghost"
                    title="Preview audio"
                  >
                    <Download size={12} />
                  </a>
                )}
                <button
                  className={`btn btn--sm ${song.active ? 'btn--warning' : 'btn--success'}`}
                  onClick={() => handleToggleSong(song)}
                >
                  {song.active ? <><EyeOff size={12} /> Deactivate</> : <><Eye size={12} /> Activate</>}
                </button>
                <button
                  className="btn btn--sm btn--danger"
                  onClick={() => handleDelete(song._id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
