'use strict';

const mongoose = require('mongoose');

// ── QuoteSection ──────────────────────────────────────────────
const QuoteSectionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 300, default: '' },
  active:      { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
QuoteSectionSchema.index({ active: 1, order: 1 });

// ── Quote ─────────────────────────────────────────────────────
const QuoteSchema = new mongoose.Schema({
  text:         { type: String, required: true, maxlength: 600 },    // no trim — preserve newlines
  author:       { type: String, trim: true, maxlength: 150, default: '' },
  description:  { type: String, maxlength: 1000, default: '' },      // optional learn-more text
  section:      { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteSection', required: true },
  bgImageUrl:   { type: String, default: '' },
  active:       { type: Boolean, default: true },
  scheduledFor: { type: Date, default: null },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
QuoteSchema.index({ section: 1, active: 1, scheduledFor: 1 });

// ── QuoteSettings ─────────────────────────────────────────────
const QuoteSettingsSchema = new mongoose.Schema({
  enabled:      { type: Boolean, default: true },
  autoFallback: { type: Boolean, default: true },
  showAuthor:   { type: Boolean, default: true },
}, { timestamps: true });

// ── Poll ──────────────────────────────────────────────────────
const PollOptionSchema = new mongoose.Schema({
  text:     { type: String, required: true, trim: true, maxlength: 200 },
  votes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // array of userId who voted
}, { _id: true });

const PollSchema = new mongoose.Schema({
  question:    { type: String, required: true, trim: true, maxlength: 300 },
  options:     { type: [PollOptionSchema], required: true, validate: v => v.length >= 2 && v.length <= 10 },
  multiSelect: { type: Boolean, default: false },   // true = choose multiple, false = choose one
  active:      { type: Boolean, default: true },
  expiresAt:   { type: Date, required: true },       // admin sets how many days it stays
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
PollSchema.index({ active: 1, expiresAt: 1 });

const QuoteSection  = mongoose.model('QuoteSection',  QuoteSectionSchema);
const Quote         = mongoose.model('Quote',         QuoteSchema);
const QuoteSettings = mongoose.model('QuoteSettings', QuoteSettingsSchema);
const Poll          = mongoose.model('Poll',          PollSchema);

module.exports = { QuoteSection, Quote, QuoteSettings, Poll };
