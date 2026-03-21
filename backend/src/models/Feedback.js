'use strict';
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  title:      { type: String, required: true, trim: true, maxlength: 200 },
  message:    { type: String, required: true, trim: true, maxlength: 2000 },
  category:   {
    type: String,
    enum: ['feature', 'branch', 'file_request', 'bug', 'other'],
    default: 'other',
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, enum: ['open', 'reviewed', 'done', 'rejected'], default: 'open' },
  adminNote:  { type: String, default: '' },
  upvotes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

FeedbackSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
