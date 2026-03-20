'use strict';
const mongoose = require('mongoose');

const PlatformSuggestionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  url:         { type: String, required: true, trim: true },
  desc:        { type: String, default: '', maxlength: 300 },
  type:        { type: String, enum: ['platform', 'resource', 'topic', 'contest'], default: 'platform' },
  suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote:   { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSuggestion', PlatformSuggestionSchema);
