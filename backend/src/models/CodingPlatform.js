'use strict';
const mongoose = require('mongoose');

const CodingPlatformSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  url:        { type: String, required: true, trim: true },
  logo:       { type: String, default: '💻' },
  desc:       { type: String, default: '', maxlength: 300 },
  tags:       [{ type: String, trim: true }],
  difficulty: { type: String, default: '' },
  type:       { type: String, enum: ['platform', 'resource', 'topic', 'contest'], default: 'platform' },
  active:     { type: Boolean, default: true },
  order:      { type: Number, default: 0 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

CodingPlatformSchema.index({ type: 1, active: 1 });

module.exports = mongoose.model('CodingPlatform', CodingPlatformSchema);
