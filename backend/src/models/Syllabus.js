'use strict';
const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
  regulation: { type: String, required: true, uppercase: true, trim: true },
  branch:     { type: String, required: true, uppercase: true, trim: true },
  year:       { type: String, required: true, enum: ['1','2','3','4'] },
  title:      { type: String, required: true, trim: true, default: 'Syllabus' },
  fileUrl:    { type: String, required: true },
  fileName:   { type: String, required: true },
  fileSize:   { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

SyllabusSchema.index({ regulation: 1, branch: 1, year: 1 });

module.exports = mongoose.model('Syllabus', SyllabusSchema);
