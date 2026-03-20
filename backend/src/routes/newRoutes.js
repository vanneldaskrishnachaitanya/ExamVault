'use strict';

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const { getNotifications, markAllRead, markOneRead, deleteNotification } = require('../controllers/notificationController');
const { getAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement } = require('../controllers/announcementController');
const { getBookmarks, addBookmark, removeBookmark } = require('../controllers/bookmarkController');
const { getAnalytics } = require('../controllers/analyticsController');

// ── Notifications ─────────────────────────────────────────────
const notificationRouter = express.Router();
notificationRouter.get('/',              protect, getNotifications);
notificationRouter.patch('/read-all',    protect, markAllRead);
notificationRouter.patch('/:id/read',    protect, markOneRead);
notificationRouter.delete('/:id',        protect, deleteNotification);

// ── Announcements (public read, admin write) ──────────────────
const announcementRouter = express.Router();
announcementRouter.get('/', protect, getAnnouncements);

// ── Bookmarks ─────────────────────────────────────────────────
const bookmarkRouter = express.Router();
bookmarkRouter.get('/',    protect, getBookmarks);
bookmarkRouter.post('/',   protect, addBookmark);
bookmarkRouter.delete('/', protect, removeBookmark);

// ── Admin extras (mounted at /admin in server.js) ─────────────
const adminExtrasRouter = express.Router();
adminExtrasRouter.get('/analytics',                protect, restrictTo('admin'), getAnalytics);
adminExtrasRouter.post('/announcements',           protect, restrictTo('admin'), createAnnouncement);
adminExtrasRouter.delete('/announcements/:id',     protect, restrictTo('admin'), deleteAnnouncement);
adminExtrasRouter.patch('/announcements/:id',      protect, restrictTo('admin'), toggleAnnouncement);

module.exports = { notificationRouter, announcementRouter, bookmarkRouter, adminExtrasRouter };
