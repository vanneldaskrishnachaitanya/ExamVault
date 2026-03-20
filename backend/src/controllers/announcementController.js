'use strict';

const Announcement = require('../models/Announcement');

// GET /announcements — all active announcements
const getAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      active: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: { announcements } });
  } catch (err) { next(err); }
};

// POST /admin/announcements — create announcement
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, type, expiresAt } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }
    const ann = await Announcement.create({
      title, message,
      type: type || 'info',
      expiresAt: expiresAt || null,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { announcement: ann } });
  } catch (err) { next(err); }
};

// DELETE /admin/announcements/:id
const deleteAnnouncement = async (req, res, next) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /admin/announcements/:id — toggle active
const toggleAnnouncement = async (req, res, next) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ success: false, message: 'Not found' });
    ann.active = !ann.active;
    await ann.save();
    res.json({ success: true, data: { announcement: ann } });
  } catch (err) { next(err); }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement };
