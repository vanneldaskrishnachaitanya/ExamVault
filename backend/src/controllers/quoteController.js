'use strict';

const { QuoteSection, Quote, QuoteSettings } = require('../models/Quote');

// ────────────────────────────────────────────────────────────────────────────
//  FALLBACK QUOTES — Hindu philosophical & spiritual only
//  Auto-rotates daily; shown when admin hasn't added quotes yet
//  AND when admin has not disabled auto-fallback
// ────────────────────────────────────────────────────────────────────────────
const FALLBACK_QUOTES = [
  // Bhagavad Gita
  { text: "You have the right to perform your actions, but you are not entitled to the fruits of the actions.", author: "Bhagavad Gita 2.47", section: "Bhagavad Gita" },
  { text: "The soul is neither born nor does it die at any time. It has not come into being, does not come into being, and will not come into being.", author: "Bhagavad Gita 2.20", section: "Bhagavad Gita" },
  { text: "Set thy heart upon thy work but never on its reward. Work not for a reward; but never cease to do thy work.", author: "Bhagavad Gita 2.47", section: "Bhagavad Gita" },
  { text: "A person can rise through the efforts of his own mind; or draw himself down. Because each person is his own friend or enemy.", author: "Bhagavad Gita 6.5", section: "Bhagavad Gita" },
  { text: "Man is made by his belief. As he believes, so he becomes.", author: "Bhagavad Gita 17.3", section: "Bhagavad Gita" },
  { text: "Do not let the fruit of action be your motive, nor let your attachment be to inaction.", author: "Bhagavad Gita 2.47", section: "Bhagavad Gita" },
  { text: "The wise grieve neither for the living nor the dead.", author: "Bhagavad Gita 2.11", section: "Bhagavad Gita" },
  { text: "Let go of what has passed. Cherish what you have. Plan for what is to come.", author: "Bhagavad Gita", section: "Bhagavad Gita" },
  { text: "Perform every action with your heart fixed on the Supreme Lord. Renounce attachment to the fruits.", author: "Bhagavad Gita 12.6", section: "Bhagavad Gita" },
  { text: "Change is the law of the universe. What you think of as death is indeed life in a new form.", author: "Bhagavad Gita", section: "Bhagavad Gita" },

  // Upanishads & Vedanta
  { text: "Aham Brahmasmi — I am Brahman, I am the infinite reality.", author: "Brihadaranyaka Upanishad 1.4.10", section: "Upanishads" },
  { text: "Tat Tvam Asi — That thou art. You are that eternal consciousness.", author: "Chandogya Upanishad 6.8.7", section: "Upanishads" },
  { text: "The Self is everywhere. Bright is the Self, indivisible, untouched by sin, wise, immanent and transcendent.", author: "Isha Upanishad", section: "Upanishads" },
  { text: "The Atman, smaller than the small, greater than the great, is hidden in the heart of the creature.", author: "Katha Upanishad 1.2.20", section: "Upanishads" },
  { text: "Know the Self as the lord of the chariot and the body as the chariot itself.", author: "Katha Upanishad 1.3.3", section: "Upanishads" },
  { text: "From joy all beings are born, by joy they are sustained, and into joy they merge again.", author: "Taittiriya Upanishad 3.6", section: "Upanishads" },

  // Swami Vivekananda
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "All the powers in the universe are already ours. It is we who have put our hands before our eyes and cry that it is dark.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "The greatest sin is to think yourself weak.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "You have to grow from the inside out. None can teach you, none can make you spiritual. There is no other teacher but your own soul.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "Be not afraid of anything. You will do marvellous work. It is fearlessness that brings heaven even in a moment.", author: "Swami Vivekananda", section: "Swami Vivekananda" },
  { text: "The whole secret of existence is to have no fear. Only the moment you reject all help are you freed.", author: "Swami Vivekananda", section: "Swami Vivekananda" },

  // Adi Shankaracharya
  { text: "Brahma Satyam Jagan Mithya — Brahman is the only truth; the world is illusory.", author: "Adi Shankaracharya", section: "Advaita Vedanta" },
  { text: "Neither I am the mind, intellect, ego or memory; I am the eternal bliss and awareness — I am Shiva.", author: "Adi Shankaracharya, Nirvana Shatakam", section: "Advaita Vedanta" },
  { text: "The world is as you see it. Change your inner vision and the outer world transforms.", author: "Adi Shankaracharya", section: "Advaita Vedanta" },

  // Ramana Maharshi
  { text: "Your own self-realisation is the greatest service you can render the world.", author: "Ramana Maharshi", section: "Ramana Maharshi" },
  { text: "Happiness is your nature. It is not wrong to desire it. What is wrong is seeking it outside when it is inside.", author: "Ramana Maharshi", section: "Ramana Maharshi" },
  { text: "The mind is consciousness which has put on limitations. You are originally unlimited and perfect.", author: "Ramana Maharshi", section: "Ramana Maharshi" },
  { text: "Reality is simply the loss of ego. Destroy the ego by seeking its identity. Because the ego is no entity it will automatically vanish.", author: "Ramana Maharshi", section: "Ramana Maharshi" },

  // Thirukkural
  { text: "Learning is an inexhaustible treasure; no thief can steal it, no fire can burn it.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural" },
  { text: "Whatever you do, do with all your heart. The result will come to you of its own accord.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural" },
  { text: "The strength of the virtuous is not in muscles but in an unwavering mind.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural" },
];

// Pick a deterministic quote by day-of-year so every student sees the same one that day
function getDailyFallback() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now - start) / 86400000);
  return FALLBACK_QUOTES[day % FALLBACK_QUOTES.length];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getOrCreateSettings() {
  let s = await QuoteSettings.findOne();
  if (!s) s = await QuoteSettings.create({ enabled: true, autoFallback: true });
  return s;
}

// Pick today's quote from a section: prefer scheduledFor today, else rotate by day
async function pickDailyQuote(sectionId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const scheduled = await Quote.findOne({
    section: sectionId, active: true,
    scheduledFor: { $gte: today, $lt: tomorrow },
  }).lean();
  if (scheduled) return scheduled;

  const all = await Quote.find({ section: sectionId, active: true, scheduledFor: null })
    .sort({ createdAt: 1 }).lean();
  if (!all.length) return null;

  const start    = new Date(all[0].createdAt);
  const daysSince = Math.floor((today - start) / 86400000);
  return all[daysSince % all.length];
}

// ────────────────────────────────────────────────────────────────────────────
//  PUBLIC — GET /quotes/today
// ────────────────────────────────────────────────────────────────────────────
exports.getTodayQuotes = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (!settings.enabled) return res.json({ success: true, data: { enabled: false, quotes: [] } });

    const sections = await QuoteSection.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();

    if (!sections.length) {
      if (!settings.autoFallback) {
        return res.json({ success: true, data: { enabled: true, quotes: [] } });
      }
      return res.json({
        success: true,
        data: { enabled: true, quotes: [{ ...getDailyFallback(), _id: 'fallback', isFallback: true }] },
      });
    }

    const quotes = [];
    for (const sec of sections) {
      const q = await pickDailyQuote(sec._id);
      if (q) {
        quotes.push({ ...q, sectionName: sec.name });
      } else if (settings.autoFallback) {
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

exports.toggleAutoFallback = async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    s.autoFallback = !s.autoFallback;
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
    const sec = await QuoteSection.create({
      name: name.trim(), description: description?.trim() || '',
      order: order || 0, createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: sec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSection = async (req, res) => {
  try {
    const { name, description, order, active } = req.body;
    const sec = await QuoteSection.findByIdAndUpdate(
      req.params.id,
      { $set: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(order       !== undefined && { order }),
        ...(active      !== undefined && { active }),
      }},
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
      text: text.trim(), author: author?.trim() || '', section: sectionId,
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
        ...(text         !== undefined && { text }),
        ...(author       !== undefined && { author }),
        ...(bgImageUrl   !== undefined && { bgImageUrl }),
        ...(scheduledFor !== undefined && { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }),
        ...(active       !== undefined && { active }),
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
