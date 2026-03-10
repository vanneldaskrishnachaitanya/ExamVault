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
      enum:    ['student', 'admin'],
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
  };
};

module.exports = mongoose.model('User', UserSchema);
