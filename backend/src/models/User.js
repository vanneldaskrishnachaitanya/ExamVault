'use strict';

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    // Firebase UID — primary link between Firebase and our DB
    firebaseUid: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    name: {
      type:      String,
      required:  true,
      trim:      true,
      maxlength: 100,
    },

    email: {
  type: String,
  required: true,
  unique: true,
  lowercase: true,
  },

    role: {
      type:    String,
      enum:    ['student', 'faculty', 'admin'],
      default: 'student',
    },

    avatarUrl: {
      type:    String,
      default: null,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    lastLoginAt: {
      type:    Date,
      default: Date.now,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    preferences: {
      dashboard: {
        defaultContext: {
          regulation: { type: String, default: 'R22' },
          branch: { type: String, default: 'CSE' },
          year: { type: String, default: '1' },
        },
        widgetOrder: { type: [String], default: ['timetable', 'exam', 'uploads', 'announcements'] },
        hiddenWidgets: { type: [String], default: [] },
        digestMode: { type: String, enum: ['off', 'daily', 'weekly'], default: 'daily' },
        reminderSnoozes: { type: mongoose.Schema.Types.Mixed, default: {} },
        lastSeenAt: { type: Date, default: null },
      },
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 },       { unique: true });
UserSchema.index({ firebaseUid: 1 }, { unique: true });

// ── Instance helpers ─────────────────────────────────────────────────────────
UserSchema.methods.isAdmin = function () {
  return this.role === 'admin';
};

UserSchema.methods.toPublicJSON = function () {
  return {
    id:          this._id,
    name:        this.name,
    email:       this.email,
    role:        this.role,
    avatarUrl:   this.avatarUrl,
    createdAt:   this.createdAt,
    lastLoginAt: this.lastLoginAt,
    lastSeenAt:  this.lastSeenAt,
    preferences: this.preferences || {},
  };
};

module.exports = mongoose.model('User', UserSchema);
