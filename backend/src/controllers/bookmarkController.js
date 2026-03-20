'use strict';

const Bookmark = require('../models/Bookmark');

// GET /bookmarks
const getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { bookmarks } });
  } catch (err) { next(err); }
};

// POST /bookmarks
const addBookmark = async (req, res, next) => {
  try {
    const { regulation, branch, subject } = req.body;
    if (!regulation || !branch || !subject) {
      return res.status(400).json({ success: false, message: 'regulation, branch and subject required' });
    }
    const bookmark = await Bookmark.findOneAndUpdate(
      { userId: req.user._id, regulation, branch, subject },
      { userId: req.user._id, regulation, branch, subject },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: { bookmark } });
  } catch (err) { next(err); }
};

// DELETE /bookmarks
const removeBookmark = async (req, res, next) => {
  try {
    const { regulation, branch, subject } = req.body;
    await Bookmark.findOneAndDelete({ userId: req.user._id, regulation, branch, subject });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getBookmarks, addBookmark, removeBookmark };
