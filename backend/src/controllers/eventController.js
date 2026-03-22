'use strict';
const Event    = require('../models/Event');
const cloudinary = require('../config/cloudinary');
const multer   = require('multer');

// Multer memory storage for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

const uploadToCloudinary = (buffer, folder, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename, resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });

// GET /events
const getEvents = async (req, res, next) => {
  try {
    const { type, club, completed } = req.query;
    const filter = {};
    if (type)      filter.eventType  = type;
    if (club)      filter.clubName   = new RegExp(club, 'i');
    if (completed !== undefined) filter.isCompleted = completed === 'true';

    const events = await Event.find(filter)
      .sort({ isCompleted: 1, eventDate: 1 })
      .lean();

    res.json({ success: true, data: { events } });
  } catch (err) { next(err); }
};

// POST /admin/events
const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, clubName, organizerName, eventType,
      registrationLink, registrationStart, registrationEnd,
      eventDate, venue, prize,
    } = req.body;

    if (!title || !clubName || !eventDate) {
      return res.status(400).json({ success: false, message: 'title, clubName, eventDate required' });
    }

    let imageUrl = '';
    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer, 'events', `event_${Date.now()}`
      );
      imageUrl = result.secure_url;
    }

    const event = await Event.create({
      title, description, clubName, organizerName, eventType,
      registrationLink, registrationStart, registrationEnd,
      eventDate, venue, prize, imageUrl,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// PATCH /admin/events/:id/complete — toggle completed
const toggleComplete = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Not found' });
    event.isCompleted = !event.isCompleted;
    await event.save();
    res.json({ success: true, data: { event } });
  } catch (err) { next(err); }
};

// DELETE /admin/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /events/clubs — list unique club names for filter
const getClubs = async (req, res, next) => {
  try {
    const clubs = await Event.distinct('clubName');
    res.json({ success: true, data: { clubs } });
  } catch (err) { next(err); }
};

module.exports = { upload, getEvents, createEvent, toggleComplete, deleteEvent, getClubs };
