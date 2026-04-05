'use strict';

const mongoose = require('mongoose');

const SavedItemSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:     { type: String, required: true, enum: ['file', 'quote', 'event', 'coding'] },
  itemId:   { type: String, required: true },
  title:    { type: String, required: true, trim: true },
  subtitle: { type: String, default: '', trim: true },
  href:     { type: String, default: '/dashboard', trim: true },
  meta:     { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

SavedItemSchema.index({ userId: 1, type: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('SavedItem', SavedItemSchema);
