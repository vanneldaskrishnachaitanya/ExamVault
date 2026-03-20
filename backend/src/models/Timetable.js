'use strict';
const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  regulation: { type: String, required: true, uppercase: true, trim: true },
  branch:     { type: String, required: true, uppercase: true, trim: true },
  year:       { type: String, required: true, enum: ['1','2','3','4'] },
  sem:        { type: String, required: true, enum: ['1','2'] },
  title:      { type: String, required: true, trim: true },
  fileUrl:    { type: String, required: true },
  fileName:   { type: String, required: true },
  fileSize:   { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

TimetableSchema.index({ regulation: 1, branch: 1, year: 1, sem: 1 });

module.exports = mongoose.model('Timetable', TimetableSchema);
