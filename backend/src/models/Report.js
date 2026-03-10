'use strict';

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    fileId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'File',
      required: true,
    },

    reportedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    reason: {
      type:     String,
      required: true,
      enum: [
        'wrong_subject',
        'wrong_exam_type',
        'duplicate',
        'poor_quality',
        'inappropriate',
        'other',
      ],
    },

    description: {
      type:      String,
      default:   null,
      maxlength: 500,
      trim:      true,
    },

    status: {
      type:    String,
      enum:    ['open', 'resolved'],
      default: 'open',
    },

    resolvedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    resolvedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One user can only report a given file once
ReportSchema.index({ fileId: 1, reportedBy: 1 }, { unique: true });
ReportSchema.index({ fileId: 1, status: 1 });
ReportSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('Report', ReportSchema);
