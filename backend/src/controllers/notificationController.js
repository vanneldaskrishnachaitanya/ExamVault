'use strict';

const Notification = require('../models/Notification');

// GET /notifications — get current user's notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) { next(err); }
};

// PATCH /notifications/read-all — mark all as read
const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

// PATCH /notifications/:id/read — mark one as read
const markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// DELETE /notifications/:id
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// Helper — create notification (used internally by other controllers)
const createNotification = async ({ userId, type, title, message, link = null, meta = {} }) => {
  try {
    await Notification.create({ userId, type, title, message, link, meta });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = { getNotifications, markAllRead, markOneRead, deleteNotification, createNotification };
