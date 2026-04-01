'use strict';

const mongoose = require('mongoose');

// ── QuoteSection — named categories admin creates ─────────────────────────
const QuoteSectionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  active:      { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

QuoteSectionSchema.index({ active: 1, order: 1 });

// ── Quote — individual quote entries ─────────────────────────────────────
const QuoteSchema = new mongoose.Schema({
  text:        { type: String, required: true, trim: true, maxlength: 600 },
  author:      { type: String, trim: true, maxlength: 150, default: '' },
  section:     { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteSection', required: true },
  bgImageUrl:  { type: String, default: '' },   // optional Cloudinary URL for dim bg image
  active:      { type: Boolean, default: true },
  scheduledFor:{ type: Date, default: null },    // null = auto-rotate
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

QuoteSchema.index({ section: 1, active: 1, scheduledFor: 1 });

// ── QuoteSettings — global on/off toggle ─────────────────────────────────
const QuoteSettingsSchema = new mongoose.Schema({
  enabled:   { type: Boolean, default: true },
  singleton: { type: Boolean, default: true },   // only one document ever
}, { timestamps: true });

const QuoteSection = mongoose.model('QuoteSection', QuoteSectionSchema);
const Quote        = mongoose.model('Quote',        QuoteSchema);
const QuoteSettings= mongoose.model('QuoteSettings',QuoteSettingsSchema);

module.exports = { QuoteSection, Quote, QuoteSettings };
