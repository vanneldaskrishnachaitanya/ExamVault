'use strict';

const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  regulation: { type: String, required: true, uppercase: true },
  branch:     { type: String, required: true, uppercase: true },
  subject:    { type: String, required: true, trim: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// One folder per regulation+branch+subject combination
FolderSchema.index({ regulation: 1, branch: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Folder', FolderSchema);
