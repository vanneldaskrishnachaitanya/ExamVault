'use strict';

const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  regulation: { type: String, required: true },
  branch:     { type: String, required: true },
  subject:    { type: String, required: true },
}, { timestamps: true });

BookmarkSchema.index({ userId: 1, regulation: 1, branch: 1, subject: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1 });

module.exports = mongoose.model('Bookmark', BookmarkSchema);
