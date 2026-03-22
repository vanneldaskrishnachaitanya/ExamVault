'use strict';
const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title:             { type: String, required: true, trim: true, maxlength: 200 },
  description:       { type: String, default: '', trim: true, maxlength: 2000 },
  clubName:          { type: String, required: true, trim: true, maxlength: 100 },
  organizerName:     { type: String, default: '', trim: true, maxlength: 100 },
  eventType:         {
    type: String,
    enum: ['technical', 'non_technical', 'workshop', 'hackathon', 'cultural', 'sports', 'other'],
    default: 'technical',
  },
  registrationLink:  { type: String, default: '', trim: true },
  registrationStart: { type: Date, default: null },
  registrationEnd:   { type: Date, default: null },
  eventDate:         { type: Date, required: true },
  venue:             { type: String, default: '', trim: true },
  prize:             { type: String, default: '', trim: true },
  imageUrl:          { type: String, default: '' },
  isCompleted:       { type: Boolean, default: false },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

EventSchema.index({ eventDate: 1, isCompleted: 1 });
module.exports = mongoose.model('Event', EventSchema);
