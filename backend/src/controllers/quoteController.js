'use strict';

const { QuoteSection, Quote, QuoteSettings } = require('../models/Quote');

// ────────────────────────────────────────────────────────────────────────────
//  FALLBACK QUOTES  — shown when admin has uploaded nothing yet,
//  organised by built-in "sections" (never saved to DB)
// ────────────────────────────────────────────────────────────────────────────
const FALLBACK_QUOTES = [
  // Motivational
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", section: "Motivational" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", section: "Motivational" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", section: "Motivational" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", section: "Motivational" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", section: "Motivational" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Anonymous", section: "Motivational" },
  { text: "Dream bigger. Do bigger.", author: "Anonymous", section: "Motivational" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous", section: "Motivational" },

  // Spiritual
  { text: "The mind is everything. What you think you become.", author: "Buddha", section: "Spiritual" },
  { text: "You yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "Buddha", section: "Spiritual" },
  { text: "Do your duty and leave the rest to God.", author: "Bhagavad Gita", section: "Spiritual" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", section: "Spiritual" },
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi", section: "Spiritual" },
  { text: "Silence is the language of God; all else is poor translation.", author: "Rumi", section: "Spiritual" },
  { text: "The soul that is within me no man can degrade.", author: "Frederick Douglass", section: "Spiritual" },

  // Academic
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X", section: "Academic" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", section: "Academic" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", section: "Academic" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", section: "Academic" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "W.B. Yeats", section: "Academic" },
  { text: "Strive for progress, not perfection.", author: "Anonymous", section: "Academic" },

  // Mindfulness
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott", section: "Mindfulness" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", section: "Mindfulness" },
  { text: "Take a deep breath. It's just a bad day, not a bad life.", author: "Anonymous", section: "Mindfulness" },
  { text: "You don't have to be positive all the time. It's perfectly okay to feel sad, angry or unsettled.", author: "Lori Deschene", section: "Mindfulness" },
  { text: "Rest and self-care are so important. When you take time to replenish your spirit, it allows you to serve others from the overflow.", author: "Eleanor Brownn", section: "Mindfulness" },
];

// Pick a deterministic quote by day-of-year so every student sees the same one
function getDailyFallback() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now - start) / 86400000);
  const idx   = day % FALLBACK_QUOTES.length;
  return FALLBACK_QUOTES[idx];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getOrCreateSettings() {
  let s = await QuoteSettings.findOne();
  if (!s) s = await QuoteSettings.create({ enabled: true });
  return s;
}

// Pick today's quote from a section: prefer scheduledFor today, else rotate by day
async function pickDailyQuote(sectionId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  // Prefer a quote scheduled for today
  const scheduled = await Quote.findOne({
    section: sectionId, active: true,
    scheduledFor: { $gte: today, $lt: tomorrow },
  }).lean();
  if (scheduled) return scheduled;

  // Else pick by day rotation
  const all = await Quote.find({ section: sectionId, active: true, scheduledFor: null })
    .sort({ createdAt: 1 }).lean();
  if (!all.length) return null;

  const start = new Date(all[0].createdAt);
  const daysSince = Math.floor((today - start) / 86400000);
  return all[daysSince % all.length];
}

// ────────────────────────────────────────────────────────────────────────────
//  PUBLIC ENDPOINTS  (auth required, student + admin)
// ────────────────────────────────────────────────────────────────────────────

// GET /quotes/today  → returns today's quote from each active section (or fallback)
exports.getTodayQuotes = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (!settings.enabled) return res.json({ success: true, data: { enabled: false, quotes: [] } });

    const sections = await QuoteSection.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();

    if (!sections.length) {
      // No sections yet — return one auto fallback
      return res.json({
        success: true,
        data: {
          enabled: true,
          quotes: [{ ...getDailyFallback(), _id: 'fallback', isFallback: true }],
        },
      });
    }

    const quotes = [];
    for (const sec of sections) {
      const q = await pickDailyQuote(sec._id);
      if (q) {
        quotes.push({ ...q, sectionName: sec.name });
      } else {
        // Section has no quotes → inject a fallback tagged with section name
        const fb = getDailyFallback();
        quotes.push({ ...fb, _id: `fallback-${sec._id}`, isFallback: true, sectionName: sec.name });
      }
    }

    res.json({ success: true, data: { enabled: true, quotes } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
//  ADMIN — SETTINGS
// ────────────────────────────────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    res.json({ success: true, data: s });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.toggleEnabled = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    s.enabled = !s.enabled;
    await s.save();
    res.json({ success: true, data: s });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ────────────────────────────────────────────────────────────────────────────
//  ADMIN — SECTIONS
// ────────────────────────────────────────────────────────────────────────────
exports.getSections = async (req, res) => {
  try {
    const sections = await QuoteSection.find().sort({ order: 1, createdAt: 1 }).lean();
    // Attach quote count to each section
    const withCounts = await Promise.all(sections.map(async (s) => ({
      ...s,
      quoteCount: await Quote.countDocuments({ section: s._id, active: true }),
    })));
    res.json({ success: true, data: withCounts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createSection = async (req, res) => {
  try {
    const { name, description, order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Section name required' });
    const sec = await QuoteSection.create({ name: name.trim(), description: description?.trim() || '', order: order || 0, createdBy: req.user._id });
    res.status(201).json({ success: true, data: sec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSection = async (req, res) => {
  try {
    const { name, description, order, active } = req.body;
    const sec = await QuoteSection.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(order !== undefined && { order }), ...(active !== undefined && { active }) } },
      { new: true, runValidators: true }
    );
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, data: sec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteSection = async (req, res) => {
  try {
    const sec = await QuoteSection.findByIdAndDelete(req.params.id);
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });
    // Remove all quotes in that section
    await Quote.deleteMany({ section: req.params.id });
    res.json({ success: true, message: 'Section and its quotes deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ────────────────────────────────────────────────────────────────────────────
//  ADMIN — QUOTES
// ────────────────────────────────────────────────────────────────────────────
exports.getQuotesBySection = async (req, res) => {
  try {
    const quotes = await Quote.find({ section: req.params.sectionId })
      .populate('section', 'name').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: quotes });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.createQuote = async (req, res) => {
  try {
    const { text, author, sectionId, bgImageUrl, scheduledFor } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Quote text required' });
    if (!sectionId)    return res.status(400).json({ success: false, message: 'Section ID required' });

    const sec = await QuoteSection.findById(sectionId);
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });

    const q = await Quote.create({
      text: text.trim(),
      author: author?.trim() || '',
      section: sectionId,
      bgImageUrl: bgImageUrl?.trim() || '',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: q });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateQuote = async (req, res) => {
  try {
    const { text, author, bgImageUrl, scheduledFor, active } = req.body;
    const q = await Quote.findByIdAndUpdate(
      req.params.id,
      { $set: {
        ...(text       !== undefined && { text }),
        ...(author     !== undefined && { author }),
        ...(bgImageUrl !== undefined && { bgImageUrl }),
        ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
        ...(active     !== undefined && { active }),
      }},
      { new: true, runValidators: true }
    );
    if (!q) return res.status(404).json({ success: false, message: 'Quote not found' });
    res.json({ success: true, data: q });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteQuote = async (req, res) => {
  try {
    const q = await Quote.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quote not found' });
    res.json({ success: true, message: 'Quote deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
