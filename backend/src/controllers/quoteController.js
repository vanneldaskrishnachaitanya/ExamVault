'use strict';

const { QuoteSection, Quote, QuoteSettings, Poll } = require('../models/Quote');
const User = require('../models/User');

// ── Fallback quotes (Hindu philosophical only, no Vivekananda) ────────────
const FALLBACK_QUOTES = [
  { text: "You have the right to perform your actions,\nbut you are not entitled to the fruits of the actions.\nDo not let the fruits of action be your motive,\nnor let your attachment be to inaction.", author: "Bhagavad Gita 2.47", section: "Bhagavad Gita", description: "This is one of the most famous verses of the Gita. Krishna teaches Arjuna the concept of Nishkama Karma — acting without attachment to results. True spiritual practice means giving your best effort and surrendering the outcome to the Divine." },
  { text: "The soul is neither born, nor does it ever die;\nnor having once existed, does it ever cease to be.\nIt is unborn, eternal, ever-existing and primeval.\nIt is not slain when the body is slain.", author: "Bhagavad Gita 2.20", section: "Bhagavad Gita", description: "Krishna reveals the immortal nature of the Atman (soul) to Arjuna. The soul does not die with the body — it is changeless, birthless, and deathless. Understanding this removes the fear of death and brings fearless living." },
  { text: "Man is made by his belief.\nAs he believes, so he becomes.", author: "Bhagavad Gita 17.3", section: "Bhagavad Gita", description: "This verse reveals the power of Shraddha — faith and conviction. Your inner beliefs shape your character, your actions, and ultimately your destiny. What you hold true in your heart becomes your reality." },
  { text: "A person can rise through the efforts of his own mind,\nor draw himself down in the same manner.\nBecause each person is his own friend or enemy.", author: "Bhagavad Gita 6.5", section: "Bhagavad Gita", description: "Krishna teaches self-mastery. The mind can be your greatest ally or your worst adversary. By disciplining the mind through practice and detachment, a person can elevate themselves. By indulging every impulse, one degrades oneself." },
  { text: "Let go of what has passed.\nCherish what you have.\nPlan for what is to come.", author: "Bhagavad Gita", section: "Bhagavad Gita", description: "A practical teaching on living in the present. The Gita emphasises releasing the burden of the past, fully experiencing the present, and wisely preparing for the future — without anxiety or attachment." },
  { text: "The wise grieve neither for the living\nnor for the dead.", author: "Bhagavad Gita 2.11", section: "Bhagavad Gita", description: "Krishna's first direct teaching to Arjuna on the battlefield. Grief arises from ignorance of the soul's true nature. The wise person understands that the Atman is eternal and therefore does not grieve over what is inevitable." },
  { text: "Even if you are the most sinful of all sinners,\nyou shall cross over all sin\nby the boat of knowledge alone.", author: "Bhagavad Gita 4.36", section: "Bhagavad Gita", description: "Jnana (spiritual knowledge) is the ultimate purifier. No matter how deep in darkness one has fallen, the light of self-knowledge can lift a person out completely. This is one of the most hopeful verses in the Gita." },
  { text: "Whatever happened, happened for the good.\nWhatever is happening, is happening for the good.\nWhatever will happen, will also happen for the good.", author: "Bhagavad Gita", section: "Bhagavad Gita", description: "A teaching of profound trust in the Divine order. This verse invites complete surrender to the cosmic will — understanding that every experience, pleasant or painful, serves a higher purpose in our spiritual evolution." },
  { text: "When meditation is mastered,\nthe mind is unwavering like the flame of a lamp\nin a windless place.", author: "Bhagavad Gita 6.19", section: "Bhagavad Gita", description: "Krishna describes the state of a perfected meditator. Just as a lamp flame in a sheltered spot does not flicker, the concentrated mind rests completely still in the Self — undisturbed by thoughts, desires or sensations." },
  { text: "Fix your mind on Me, be devoted to Me,\nworship Me, bow down to Me.\nSo shall you come to Me.\nI promise you truly, for you are dear to Me.", author: "Bhagavad Gita 18.65", section: "Bhagavad Gita", description: "One of the most intimate verses Krishna speaks to Arjuna. It reveals that Bhakti (devotion) is the highest path. Krishna personally promises liberation to the sincere devotee who gives their entire heart to the Divine." },

  { text: "Aham Brahmasmi.\nI am Brahman.\nI am the infinite, eternal reality.", author: "Brihadaranyaka Upanishad 1.4.10", section: "Upanishads", description: "One of the four Mahavakyas (great sayings) of the Upanishads. It proclaims that the individual self (Atman) is not separate from the universal consciousness (Brahman). Realising this truth is the goal of Advaita Vedanta." },
  { text: "Tat Tvam Asi.\nThat thou art.\nYou are that eternal, boundless consciousness.", author: "Chandogya Upanishad 6.8.7", section: "Upanishads", description: "Another of the four Mahavakyas. The sage Uddalaka tells his son Shvetaketu: the ultimate reality (Brahman) that pervades all existence is identical to your own innermost self. You are not separate from the whole." },
  { text: "The Self is everywhere.\nBright is the Self,\nindivisible, untouched by sin,\nwise, immanent and transcendent.", author: "Isha Upanishad", section: "Upanishads", description: "The Isha Upanishad opens with the vision of a Self that permeates all creation. It is not locked within the body but exists everywhere, in all things. Recognising this infinite Self dissolves all sense of separation." },
  { text: "The Atman, smaller than the small,\ngreater than the great,\nis hidden in the heart of every creature.", author: "Katha Upanishad 1.2.20", section: "Upanishads", description: "Yama (the god of death) reveals to the young Nachiketa this paradox: the Self is simultaneously the tiniest point of consciousness within the heart and the vastest, most all-encompassing reality in existence." },
  { text: "Know the Self as the lord of the chariot,\nthe body as the chariot itself,\nthe discriminating intellect as the charioteer,\nand the mind as the reins.", author: "Katha Upanishad 1.3.3", section: "Upanishads", description: "A powerful metaphor from the Katha Upanishad. The Self (Atman) is the passenger — the witness. The body is the vehicle. The intellect must guide the mind (reins) and the senses (horses) toward the goal of liberation." },
  { text: "From joy all beings are born,\nby joy they are sustained,\nand into joy they merge again.", author: "Taittiriya Upanishad 3.6", section: "Upanishads", description: "Brahman is described here as Ananda — pure bliss. The entire universe emerges from this bliss, is sustained by it, and ultimately returns to it. Our deepest nature is not suffering but overflowing joy." },

  { text: "Brahma Satyam, Jagan Mithya.\nBrahman alone is real.\nThe world is an illusion.\nThe individual self is none other than Brahman.", author: "Adi Shankaracharya", section: "Adi Shankaracharya", description: "This single Sanskrit line encapsulates all of Advaita Vedanta. Shankaracharya taught that only Brahman — pure, infinite consciousness — is ultimately real. The apparent diversity of the world is Maya (illusion). The separate self is a superimposition on the one Self." },
  { text: "I am not the mind, the intellect,\nthe ego or the memory.\nI am not the ears, the skin, the nose or the eyes.\nI am the eternal bliss and awareness.\nI am Shiva! I am Shiva!", author: "Adi Shankaracharya, Nirvana Shatakam", section: "Adi Shankaracharya", description: "The Nirvana Shatakam is a profound hymn of self-inquiry. Shankaracharya systematically negates every identification — body, mind, senses, emotions — to arrive at the bedrock truth: I am Shiva, pure consciousness and bliss, beyond all limitations." },
  { text: "Bhaja Govindam, Bhaja Govindam,\nGovindam Bhaja, Mudhamate.\nAt the time of death,\nthe rules of grammar will not save you.", author: "Adi Shankaracharya, Bhaja Govindam", section: "Adi Shankaracharya", description: "Shankaracharya composed this when he saw a scholar memorising grammar rules. He reminds us that intellectual knowledge alone cannot bring liberation. At death, only the direct experience of God (Govinda) matters. Surrender to the Divine is the essential practice." },
  { text: "Childhood is spent in play and sport.\nYouth is spent in chasing desire.\nOld age passes in worry and grief.\nYet no one seeks the Self.", author: "Adi Shankaracharya, Bhaja Govindam", section: "Adi Shankaracharya", description: "A sobering observation from Bhaja Govindam. Shankaracharya points out how human life slips by in worldly pursuits and distractions, leaving no time for the inquiry into one's true nature — which is the very purpose of human birth." },
  { text: "Even a little contemplation\non the truth of Brahman\nprotects one from the great fear of death.", author: "Adi Shankaracharya, Vivekachudamani", section: "Adi Shankaracharya", description: "From the Crest Jewel of Discrimination, this verse assures seekers that even partial knowledge of Brahman is infinitely valuable. A single moment of genuine self-inquiry weakens the grip of ignorance that makes death appear frightening." },
  { text: "The enquiry into the nature of the Self\nis the highest duty of the human being.\nKnowing the Self is the supreme knowledge.", author: "Adi Shankaracharya, Vivekachudamani", section: "Adi Shankaracharya", description: "Shankaracharya places Atma-vichara (self-inquiry) above all religious duties. The purpose of human life is to discover who we truly are. All other knowledge — science, scripture, philosophy — serves this single supreme inquiry." },

  { text: "Your own self-realisation\nis the greatest service\nyou can render the world.", author: "Ramana Maharshi", section: "Ramana Maharshi", description: "Ramana Maharshi was asked how to help the world. His answer: by realising your own Self. When you know yourself as the infinite Self, you radiate peace, wisdom and love that transforms everyone around you, far more than external charitable acts." },
  { text: "Happiness is your nature.\nIt is not wrong to desire it.\nWhat is wrong is seeking it outside,\nwhen it is already within you.", author: "Ramana Maharshi", section: "Ramana Maharshi", description: "Ramana teaches that our relentless pursuit of happiness through objects, people and experiences is misdirected. The happiness we seek is not something to be gained but something to be recognised as our own true nature — always present within." },
  { text: "The mind is nothing but\nconsciousness that has put on limitations.\nYou are originally unlimited and perfect.\nLater you take on limitations and become the mind.", author: "Ramana Maharshi", section: "Ramana Maharshi", description: "Ramana explains how the formless, infinite consciousness becomes the limited, restless mind through identification with the body and thoughts. The practice of self-inquiry reverses this process, expanding back into the original unlimited awareness." },
  { text: "The question 'Who am I?' is not really a question.\nIt is a quest for the source of the ego.\nWhen it is sought, the ego dissolves\nand what remains is the Self.", author: "Ramana Maharshi", section: "Ramana Maharshi", description: "Ramana's central teaching: the practice of asking 'Who am I?' is not about finding a conceptual answer. It is about turning attention inward to find the source of the sense 'I'. When this search is conducted sincerely, the ego-self dissolves into the pure Self." },
  { text: "Whatever is destined not to happen will not happen,\ntry as you may.\nWhatever is destined to happen will happen,\ndo what you may to prevent it.\nThis is certain. The best course, therefore,\nis to remain silent.", author: "Ramana Maharshi", section: "Ramana Maharshi", description: "A teaching on surrender and acceptance. Ramana points to the futility of anxiously trying to control outcomes. Resting in the silence of the Self — neither grasping nor resisting — is the highest response to whatever life brings." },

  { text: "Learning is an inexhaustible treasure.\nNo thief can steal it,\nno fire can burn it.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural", description: "Thiruvalluvar exalts knowledge as the most precious of all wealth. Material possessions can be lost to circumstance, but true learning becomes a permanent part of the self. This verse has inspired generations of Tamil students to value education above all." },
  { text: "Whatever you do,\ndo with all your heart.\nThe result will come to you\nof its own accord.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural", description: "Thiruvalluvar teaches wholehearted action — Porutserppu. When effort is sincere and total, the right result follows naturally. This mirrors the Gita's teaching on Karma Yoga: full engagement without anxious grasping for the fruit." },
  { text: "The strength of the virtuous\nis not in muscles\nbut in an unwavering mind.", author: "Thiruvalluvar, Thirukkural", section: "Thirukkural", description: "True strength, says Thiruvalluvar, is mental and moral — not physical. An unwavering mind grounded in virtue is more powerful than any bodily strength. This kural encourages students to cultivate inner resilience over outer appearance." },
];

function getDailyFallback() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now - start) / 86400000);
  return FALLBACK_QUOTES[day % FALLBACK_QUOTES.length];
}

async function getOrCreateSettings() {
  let s = await QuoteSettings.findOne();
  if (!s) s = await QuoteSettings.create({ enabled: true, autoFallback: true, showAuthor: true });
  return s;
}

async function pickDailyQuote(sectionId) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const scheduled = await Quote.findOne({ section: sectionId, active: true, scheduledFor: { $gte: today, $lt: tomorrow } }).lean();
  if (scheduled) return scheduled;
  const all = await Quote.find({ section: sectionId, active: true, scheduledFor: null }).sort({ createdAt: 1 }).lean();
  if (!all.length) return null;
  const daysSince = Math.floor((today - new Date(all[0].createdAt)) / 86400000);
  return all[daysSince % all.length];
}

// ── PUBLIC ────────────────────────────────────────────────────
exports.getTodayQuotes = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (!settings.enabled) return res.json({ success: true, data: { enabled: false, showAuthor: true, quotes: [] } });
    const showAuthor = settings.showAuthor !== false;
    const sections   = await QuoteSection.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();

    if (!sections.length) {
      if (!settings.autoFallback) return res.json({ success: true, data: { enabled: true, showAuthor, quotes: [] } });
      return res.json({ success: true, data: { enabled: true, showAuthor, quotes: [{ ...getDailyFallback(), _id: 'fallback', isFallback: true }] } });
    }

    const quotes = [];
    for (const sec of sections) {
      const q = await pickDailyQuote(sec._id);
      if (q) quotes.push({ ...q, sectionName: sec.name });
      else if (settings.autoFallback) quotes.push({ ...getDailyFallback(), _id: `fallback-${sec._id}`, isFallback: true, sectionName: sec.name });
    }
    res.json({ success: true, data: { enabled: true, showAuthor, quotes } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── ADMIN — SETTINGS ──────────────────────────────────────────
exports.getSettings       = async (req, res) => { try { res.json({ success: true, data: await getOrCreateSettings() }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };
exports.toggleEnabled     = async (req, res) => { try { const s = await getOrCreateSettings(); s.enabled     = !s.enabled;     await s.save(); res.json({ success: true, data: s }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };
exports.toggleAutoFallback= async (req, res) => { try { const s = await getOrCreateSettings(); s.autoFallback= !s.autoFallback; await s.save(); res.json({ success: true, data: s }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };
exports.toggleShowAuthor  = async (req, res) => { try { const s = await getOrCreateSettings(); s.showAuthor  = !s.showAuthor;  await s.save(); res.json({ success: true, data: s }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } };

// ── ADMIN — SECTIONS ──────────────────────────────────────────
exports.getSections = async (req, res) => {
  try {
    const secs = await QuoteSection.find().sort({ order: 1, createdAt: 1 }).lean();
    const out  = await Promise.all(secs.map(async s => ({ ...s, quoteCount: await Quote.countDocuments({ section: s._id, active: true }) })));
    res.json({ success: true, data: out });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.createSection = async (req, res) => {
  try {
    const { name, description, order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Section name required' });
    const sec = await QuoteSection.create({ name: name.trim(), description: description?.trim() || '', order: order || 0, createdBy: req.user._id });
    res.status(201).json({ success: true, data: sec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.updateSection = async (req, res) => {
  try {
    const { name, description, order, active } = req.body;
    const sec = await QuoteSection.findByIdAndUpdate(req.params.id, { $set: { ...(name!==undefined&&{name}), ...(description!==undefined&&{description}), ...(order!==undefined&&{order}), ...(active!==undefined&&{active}) } }, { new: true, runValidators: true });
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });
    res.json({ success: true, data: sec });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.deleteSection = async (req, res) => {
  try {
    const sec = await QuoteSection.findByIdAndDelete(req.params.id);
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });
    await Quote.deleteMany({ section: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── ADMIN — QUOTES ────────────────────────────────────────────
exports.getQuotesBySection = async (req, res) => {
  try { res.json({ success: true, data: await Quote.find({ section: req.params.sectionId }).populate('section', 'name').sort({ createdAt: -1 }).lean() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.createQuote = async (req, res) => {
  try {
    const { text, author, description, sectionId, bgImageUrl, scheduledFor } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Quote text required' });
    if (!sectionId)    return res.status(400).json({ success: false, message: 'Section ID required' });
    const sec = await QuoteSection.findById(sectionId);
    if (!sec) return res.status(404).json({ success: false, message: 'Section not found' });
    const q = await Quote.create({ text, author: author?.trim() || '', description: description || '', section: sectionId, bgImageUrl: bgImageUrl?.trim() || '', scheduledFor: scheduledFor ? new Date(scheduledFor) : null, createdBy: req.user._id });
    res.status(201).json({ success: true, data: q });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.updateQuote = async (req, res) => {
  try {
    const { text, author, description, bgImageUrl, scheduledFor, active } = req.body;
    const q = await Quote.findByIdAndUpdate(req.params.id, { $set: { ...(text!==undefined&&{text}), ...(author!==undefined&&{author}), ...(description!==undefined&&{description}), ...(bgImageUrl!==undefined&&{bgImageUrl}), ...(scheduledFor!==undefined&&{scheduledFor:scheduledFor?new Date(scheduledFor):null}), ...(active!==undefined&&{active}) } }, { new: true, runValidators: true });
    if (!q) return res.status(404).json({ success: false, message: 'Quote not found' });
    res.json({ success: true, data: q });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
exports.deleteQuote = async (req, res) => {
  try {
    const q = await Quote.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ success: false, message: 'Quote not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── PUBLIC — POLLS ────────────────────────────────────────────
exports.getActivePolls = async (req, res) => {
  try {
    const now   = new Date();
    const userId= req.user._id.toString();
    const polls = await Poll.find({ active: true }).sort({ createdAt: -1 }).lean();

    const out = polls
      .filter(p => p.expiresAt > now || p.options.some(o => o.votes.some(v => v.toString() === userId)))
      .map(p => {
        const userVoted = p.options.some(o => o.votes.some(v => v.toString() === userId));
        return {
          _id:         p._id,
          question:    p.question,
          multiSelect: p.multiSelect,
          expiresAt:   p.expiresAt,
          createdAt:   p.createdAt,
          options: p.options.map(o => ({
            _id:       o._id,
            text:      o.text,
            votes:     o.votes.length,
            voted:     o.votes.some(v => v.toString() === userId),
          })),
          totalVotes: p.options.reduce((s, o) => s + o.votes.length, 0),
          userVoted,
        };
      });

    res.json({ success: true, data: out });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.votePoll = async (req, res) => {
  try {
    const { optionIds } = req.body;   // array of option _id strings
    if (!optionIds?.length) return res.status(400).json({ success: false, message: 'Select at least one option' });
    const poll = await Poll.findById(req.params.id);
    if (!poll || !poll.active || poll.expiresAt < new Date()) return res.status(404).json({ success: false, message: 'Poll not found or expired' });

    const userId = req.user._id;

    // If single-select, only first optionId matters
    const selected = poll.multiSelect ? optionIds : [optionIds[0]];

    // Remove existing votes from this user across all options
    poll.options.forEach(o => { o.votes = o.votes.filter(v => v.toString() !== userId.toString()); });

    // Add new votes
    selected.forEach(oid => {
      const opt = poll.options.id(oid);
      if (opt) opt.votes.push(userId);
    });

    await poll.save();

    // Return updated counts
    const updatedOptions = poll.options.map(o => ({
      _id: o._id, text: o.text,
      votes: o.votes.length,
      voted: o.votes.map(v => v.toString()).includes(userId.toString()),
    }));
    res.json({ success: true, data: { options: updatedOptions, totalVotes: poll.options.reduce((s, o) => s + o.votes.length, 0) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── ADMIN — POLLS ─────────────────────────────────────────────
exports.getAllPolls = async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 }).lean();
    const allVoterIds = [
      ...new Set(polls.flatMap(p => p.options.flatMap(o => o.votes.map(v => v.toString())))),
    ];
    const users = await User.find({ _id: { $in: allVoterIds } }).lean();
    const userMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});

    const out = polls.map(p => {
      const totalVotes = p.options.reduce((s, o) => s + o.votes.length, 0);
      return {
        ...p,
        totalVotes,
        expired: p.expiresAt < new Date(),
        options: p.options.map(o => ({
          _id:    o._id,
          text:   o.text,
          votes:  o.votes.length,
          voters: o.votes.map(v => ({
            _id:   v,
            name:  userMap[v.toString()]?.name || 'Unknown',
            email: userMap[v.toString()]?.email || undefined,
          })),
        })),
      };
    });

    res.json({ success: true, data: out });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.createPoll = async (req, res) => {
  try {
    const { question, options, multiSelect, durationDays } = req.body;
    if (!question?.trim()) return res.status(400).json({ success: false, message: 'Question required' });
    if (!options?.length || options.length < 2) return res.status(400).json({ success: false, message: 'At least 2 options required' });
    if (!durationDays || durationDays < 1) return res.status(400).json({ success: false, message: 'Duration must be at least 1 day' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(durationDays));

    const poll = await Poll.create({
      question: question.trim(),
      options:  options.map(o => ({ text: typeof o === 'string' ? o.trim() : o.text.trim(), votes: [] })),
      multiSelect: !!multiSelect,
      expiresAt,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: poll });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.togglePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    poll.active = !poll.active;
    await poll.save();
    res.json({ success: true, data: poll });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) return res.status(404).json({ success: false, message: 'Poll not found' });
    res.json({ success: true, message: 'Poll deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
