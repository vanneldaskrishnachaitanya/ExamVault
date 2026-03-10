'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
{
  regulation: {
    type: String,
    required: true,
    index: true,
  },

  branch: {
    type: String,
    required: true,
    index: true,
  },

  subject: {
    type: String,
    required: true,
    trim: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }

},
{
  timestamps: true
});

folderSchema.index({ regulation: 1, branch: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);