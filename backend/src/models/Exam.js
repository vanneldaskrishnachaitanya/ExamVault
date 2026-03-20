'use strict';
const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true, maxlength: 200 },
  subject:    { type: String, default: '', trim: true },
  date:       { type: Date, required: true },
  examType:   { type: String, enum: ['mid1','mid2','semester','other'], default: 'other' },
  regulation: { type: String, default: '' },
  branch:     { type: String, default: '' },
  notes:      { type: String, default: '', maxlength: 500 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

ExamSchema.index({ date: 1 });

module.exports = mongoose.model('Exam', ExamSchema);
