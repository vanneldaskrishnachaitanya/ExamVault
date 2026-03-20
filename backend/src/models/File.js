'use strict';

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
  {
    // ── Hierarchy ────────────────────────────────────────────────────────────
    regulation: {
      type:      String,
      required:  true,
      enum:      ['R22', 'R18', 'R16', 'R14'],
      uppercase: true,
    },

    branch: {
      type:      String,
      required:  true,
      trim:      true,
      uppercase: true,
    },

    subject: {
      type:     String,
      required: true,
      trim:     true,
    },

    // ── Classification ───────────────────────────────────────────────────────
    category: {
      type:     String,
      required: true,
      enum:     ['paper', 'resource'],
    },

    // Required only when category === 'paper'
    examType: {
      type:    String,
      enum:    ['mid1', 'mid2', 'semester', null],
      default: null,
    },

    year: {
      type:    Number,
      default: null,
      min:     2000,
      max:     2100,
    },

    // ── Storage ──────────────────────────────────────────────────────────────
    /** Original filename as chosen by the uploader */
    originalName: {
      type:     String,
      required: true,
    },

    /**
     * Name on disk: REGULATION_BRANCH_Subject_category_timestamp.ext
     * Unique — collision-free by design (timestamp + naming scheme).
     */
    storedName: {
      type:     String,
      required: true,
      unique:   true,
    },

    /**
     * Relative path from project root.
     * e.g. uploads/R22/CSE/DataStructures/papers/R22_CSE_DataStructures_mid1_1714583923.pdf
     */
    filePath: {
      type:     String,
      required: true,
    },

    mimeType: {
      type:     String,
      required: true,
    },

    /** File size in bytes */
    fileSize: {
      type:     Number,
      required: true,
      min:      1,
    },

    // ── Moderation ───────────────────────────────────────────────────────────
    uploadedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    /** Admin can hide their name from file card */
    hideUploaderName: { type: Boolean, default: false },

    /** upload → pending → approved | rejected */
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'pending',
    },

    /** The admin who approved or rejected (reuses same field) */
    approvedBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },

    approvedAt: {
      type:    Date,
      default: null,
    },

    rejectionNote: {
      type:      String,
      default:   null,
      maxlength: 500,
    },

    // ── Engagement ───────────────────────────────────────────────────────────
    downloadCount: {
      type:    Number,
      default: 0,
      min:     0,
    },

    avgRating:   { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    /** Explicit upload timestamp (complements Mongoose createdAt) */
    uploadedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ── Pre-validate hook ────────────────────────────────────────────────────────
FileSchema.pre('validate', function (next) {
  if (this.category === 'paper' && !this.examType) {
    this.invalidate(
      'examType',
      "examType ('mid1', 'mid2', 'semester') is required when category is 'paper'"
    );
  }
  next();
});

// ── Indexes ──────────────────────────────────────────────────────────────────

// Primary browse: filters on all four hierarchy fields
FileSchema.index({ regulation: 1, branch: 1, subject: 1, status: 1 });

// Duplicate detection: same file in same slot
// (status excluded — catches even pending/rejected duplicates)
FileSchema.index(
  { regulation: 1, branch: 1, subject: 1, category: 1, examType: 1, originalName: 1 },
  { name: 'duplicate_detection' }
);

FileSchema.index({ uploadedBy: 1 });
FileSchema.index({ status: 1 });
FileSchema.index({ uploadedAt: -1 });

module.exports = mongoose.model('File', FileSchema);
