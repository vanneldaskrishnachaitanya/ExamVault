'use strict';
const Feedback = require('../models/Feedback');

// GET /feedback — all open feedback (students see all, sorted by upvotes)
const getFeedback = async (req, res, next) => {
  try {
    const { status = 'open', category } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;

    const items = await Feedback.find(filter)
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Add upvote count and whether current user upvoted
    const userId = req.user._id.toString();
    const data = items.map(f => ({
      ...f,
      upvoteCount: f.upvotes?.length || 0,
      hasUpvoted: f.upvotes?.some(id => id.toString() === userId),
    }));

    res.json({ success: true, data: { feedback: data } });
  } catch (err) { next(err); }
};

// POST /feedback — submit new feedback
const createFeedback = async (req, res, next) => {
  try {
    const { title, message, category } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required' });

    const item = await Feedback.create({
      title, message, category: category || 'other',
      submittedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: { feedback: item } });
  } catch (err) { next(err); }
};

// PATCH /feedback/:id/upvote — toggle upvote
const upvoteFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Not found' });

    const userId = req.user._id;
    const idx    = feedback.upvotes.findIndex(id => id.toString() === userId.toString());

    if (idx === -1) feedback.upvotes.push(userId);
    else            feedback.upvotes.splice(idx, 1);

    await feedback.save();
    res.json({ success: true, data: { upvoteCount: feedback.upvotes.length, hasUpvoted: idx === -1 } });
  } catch (err) { next(err); }
};

// PATCH /admin/feedback/:id — update status + admin note
const reviewFeedback = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { ...(status && { status }), ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { feedback } });
  } catch (err) { next(err); }
};

// DELETE /admin/feedback/:id
const deleteFeedback = async (req, res, next) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getFeedback, createFeedback, upvoteFeedback, reviewFeedback, deleteFeedback };
