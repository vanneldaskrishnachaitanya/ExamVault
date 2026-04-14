'use strict';

const mongoose = require('mongoose');

// ── Song ──────────────────────────────────────────────────────
const SongSchema = new mongoose.Schema({
  title:         { type: String, required: true, trim: true, maxlength: 200 },
  artist:        { type: String, trim: true, maxlength: 150, default: '' },
  lyrics:        { type: String, default: '' },          // no trim — preserve newlines
  audioUrl:      { type: String, default: '' },
  audioFileName: { type: String, default: '' },
  audioPublicId: { type: String, default: '' },          // Cloudinary public_id for deletion
  imageUrls:     [{ type: String }],                     // up to 6 Cloudinary image URLs
  imagePublicIds:[{ type: String }],                     // Cloudinary public_ids for images
  bgImageUrl:    { type: String, default: '' },
  active:        { type: Boolean, default: true },
  scheduledFor:  { type: Date, default: null },          // pin to a specific date
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

SongSchema.index({ active: 1, scheduledFor: 1, createdAt: 1 });

// ── SongSettings ──────────────────────────────────────────────
const SongSettingsSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

const Song         = mongoose.model('Song',         SongSchema);
const SongSettings = mongoose.model('SongSettings', SongSettingsSchema);

module.exports = { Song, SongSettings };
