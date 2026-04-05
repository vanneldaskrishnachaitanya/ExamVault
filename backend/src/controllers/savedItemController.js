'use strict';

const SavedItem = require('../models/SavedItem');

const getSavedItems = async (req, res, next) => {
  try {
    const savedItems = await SavedItem.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: { savedItems } });
  } catch (err) { next(err); }
};

const addSavedItem = async (req, res, next) => {
  try {
    const { type, itemId, title, subtitle = '', href = '/dashboard', meta = {} } = req.body;
    if (!type || !itemId || !title) {
      return res.status(400).json({ success: false, message: 'type, itemId, and title are required' });
    }

    const savedItem = await SavedItem.findOneAndUpdate(
      { userId: req.user._id, type, itemId },
      { $set: { title, subtitle, href, meta } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: { savedItem } });
  } catch (err) { next(err); }
};

const removeSavedItem = async (req, res, next) => {
  try {
    const { type, itemId } = req.body;
    if (!type || !itemId) {
      return res.status(400).json({ success: false, message: 'type and itemId are required' });
    }

    await SavedItem.findOneAndDelete({ userId: req.user._id, type, itemId });
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getSavedItems, addSavedItem, removeSavedItem };
