'use strict';

const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true, maxlength: 200 },
  message:   { type: String, required: true, trim: true, maxlength: 1000 },
  type:      { type: String, enum: ['info', 'warning', 'success', 'danger'], default: 'info' },
  active:    { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

AnnouncementSchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
