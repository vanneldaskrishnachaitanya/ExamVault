'use strict';

const cloudinary = require('../config/cloudinary');
const multer     = require('multer');
const { Song, SongSettings } = require('../models/Song');

// ── Multer — accepts audio + images in one request ────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },   // 50 MB per file
  fileFilter: (req, file, cb) => {
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if ([...audioTypes, ...imageTypes].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio (MP3/WAV/OGG/M4A) and image (JPEG/PNG/WebP) files are allowed'));
    }
  },
});

// ── Cloudinary helpers ────────────────────────────────────────
const uploadAudioToCloudinary = (file, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'songs/audio',
        public_id: publicId,
        resource_type: 'video',   // Cloudinary uses 'video' resource type for audio
        use_filename: false,
        unique_filename: false,
      },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(file.buffer);
  });

const uploadImageToCloudinary = (file, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'songs/images',
        public_id: publicId,
        resource_type: 'image',
        use_filename: false,
        unique_filename: false,
      },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(file.buffer);
  });

const deleteFromCloudinary = (publicId, resourceType = 'image') =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});

// ── Settings helper ───────────────────────────────────────────
async function getOrCreateSettings() {
  let s = await SongSettings.findOne();
  if (!s) s = await SongSettings.create({ enabled: true });
  return s;
}

// ── Daily pick algorithm (mirrors quote pickDailyQuote) ───────
async function pickTodaySong() {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Scheduled for today wins
  const scheduled = await Song.findOne({
    active: true,
    scheduledFor: { $gte: today, $lt: tomorrow },
  }).lean();
  if (scheduled) return scheduled;

  // 2. Cycle through unscheduled active songs by day-of-year
  const all = await Song.find({ active: true, scheduledFor: null }).sort({ createdAt: 1 }).lean();
  if (!all.length) return null;

  const start      = new Date(all[0].createdAt); start.setHours(0, 0, 0, 0);
  const daysSince  = Math.floor((today - start) / 86400000);
  return all[daysSince % all.length];
}

// ── PUBLIC ────────────────────────────────────────────────────

// GET /songs/today
exports.getTodaySong = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (!settings.enabled) {
      return res.json({ success: true, data: { enabled: false, song: null } });
    }
    const song = await pickTodaySong();
    res.json({ success: true, data: { enabled: true, song: song || null } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── ADMIN — SETTINGS ──────────────────────────────────────────

// GET /admin/songs/settings
exports.getSongSettings = async (req, res) => {
  try {
    res.json({ success: true, data: await getOrCreateSettings() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PATCH /admin/songs/settings/toggle
exports.toggleSongEnabled = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    s.enabled = !s.enabled;
    await s.save();
    res.json({ success: true, data: s });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── ADMIN — SONGS ─────────────────────────────────────────────

// GET /admin/songs — full permanent archive, newest first
exports.getAllSongs = async (req, res) => {
  try {
    // Also compute today's song so frontend can badge it
    const todaySong = await pickTodaySong();
    const songs = await Song.find().sort({ createdAt: -1 }).lean();
    const todayId = todaySong?._id?.toString();
    const out = songs.map(s => ({ ...s, isToday: s._id.toString() === todayId }));
    res.json({ success: true, data: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /admin/songs — multipart: audio field + images[] field
exports.createSong = async (req, res) => {
  try {
    const { title, artist, lyrics, bgImageUrl, scheduledFor } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Song title is required' });

    const audioFile  = req.files?.audio?.[0];
    const imageFiles = req.files?.images || [];

    if (!audioFile) return res.status(400).json({ success: false, message: 'Audio file is required' });

    // Upload audio
    const audioPublicId = `song_audio_${Date.now()}`;
    const audioResult   = await uploadAudioToCloudinary(audioFile, audioPublicId);

    // Upload images (parallel)
    const imageResults = await Promise.all(
      imageFiles.map((img, i) => uploadImageToCloudinary(img, `song_img_${Date.now()}_${i}`))
    );

    const song = await Song.create({
      title:         title.trim(),
      artist:        artist?.trim() || '',
      lyrics:        lyrics || '',
      audioUrl:      audioResult.secure_url,
      audioFileName: audioFile.originalname,
      audioPublicId: audioResult.public_id,
      imageUrls:     imageResults.map(r => r.secure_url),
      imagePublicIds:imageResults.map(r => r.public_id),
      bgImageUrl:    bgImageUrl?.trim() || '',
      scheduledFor:  scheduledFor ? new Date(scheduledFor) : null,
      createdBy:     req.user._id,
    });

    res.status(201).json({ success: true, data: song });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PATCH /admin/songs/:id — update metadata (not audio/images)
exports.updateSong = async (req, res) => {
  try {
    const { title, artist, lyrics, bgImageUrl, scheduledFor, active } = req.body;
    const updates = {};
    if (title       !== undefined) updates.title        = title;
    if (artist      !== undefined) updates.artist       = artist;
    if (lyrics      !== undefined) updates.lyrics       = lyrics;
    if (bgImageUrl  !== undefined) updates.bgImageUrl   = bgImageUrl;
    if (scheduledFor!== undefined) updates.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    if (active      !== undefined) updates.active       = active;

    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!song) return res.status(404).json({ success: false, message: 'Song not found' });
    res.json({ success: true, data: song });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /admin/songs/:id
exports.deleteSong = async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ success: false, message: 'Song not found' });

    // Clean up Cloudinary assets
    if (song.audioPublicId)  deleteFromCloudinary(song.audioPublicId, 'video');
    song.imagePublicIds?.forEach(pid => deleteFromCloudinary(pid, 'image'));

    res.json({ success: true, message: 'Song deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports.upload = upload;
