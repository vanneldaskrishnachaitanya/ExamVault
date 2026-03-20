'use strict';
const CodingPlatform    = require('../models/CodingPlatform');
const PlatformSuggestion = require('../models/PlatformSuggestion');

// Default seed data
const SEED_DATA = [
  { name:'LeetCode',    url:'https://leetcode.com',               logo:'🟨', desc:'Best for interview prep. 2500+ problems.',            tags:['DSA','Interviews'],  difficulty:'Beginner → Advanced',   type:'platform' },
  { name:'Codeforces',  url:'https://codeforces.com',             logo:'🔵', desc:'Competitive programming contests. Strong community.', tags:['Contests','CP'],     difficulty:'Intermediate → Expert', type:'platform' },
  { name:'CodeChef',    url:'https://www.codechef.com',           logo:'🟤', desc:'Monthly Long Challenge, Starters, Cook-Off.',         tags:['Contests','Practice'],difficulty:'Beginner → Advanced',  type:'platform' },
  { name:'HackerRank',  url:'https://www.hackerrank.com',         logo:'🟢', desc:'Great for beginners. Certifications available.',      tags:['Beginners','Certs'], difficulty:'Beginner → Intermediate',type:'platform'},
  { name:'GeeksforGeeks',url:'https://www.geeksforgeeks.org',     logo:'🟩', desc:'DSA theory + practice + placement preparation.',      tags:['DSA','Placement'],   difficulty:'Beginner → Advanced',   type:'platform' },
  { name:'AtCoder',     url:'https://atcoder.jp',                 logo:'⬜', desc:'High quality problems. Great for beginners too.',     tags:['Contests','Quality'],difficulty:'Intermediate → Expert', type:'platform' },
  { name:'SPOJ',        url:'https://www.spoj.com',               logo:'🔴', desc:'Classic problems. Strong classical CP resource.',     tags:['Classic','Practice'],difficulty:'Intermediate → Expert', type:'platform' },
  { name:'HackerEarth', url:'https://www.hackerearth.com',        logo:'🟣', desc:'Hackathons, hiring contests and challenges.',         tags:['Hackathons','Hiring'],difficulty:'Beginner → Advanced',  type:'platform' },
  { name:'CP-Algorithms',url:'https://cp-algorithms.com',          logo:'📚', desc:'Comprehensive algorithms reference.',                 tags:['Algorithms'],        difficulty:'',                      type:'resource' },
  { name:'USACO Guide', url:'https://usaco.guide',                logo:'🗺️', desc:'Structured CP learning roadmap.',                     tags:['Roadmap'],           difficulty:'',                      type:'resource' },
  { name:'Visualgo',    url:'https://visualgo.net',               logo:'👁️', desc:'Algorithm visualizations.',                          tags:['Visual'],            difficulty:'',                      type:'resource' },
  { name:'NeetCode',    url:'https://neetcode.io',                logo:'🎯', desc:'LeetCode patterns & roadmap.',                        tags:['LeetCode'],          difficulty:'',                      type:'resource' },
  { name:'Striver A2Z', url:'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2', logo:'⚡', desc:'Complete DSA sheet by Striver.', tags:['DSA'], difficulty:'', type:'resource' },
  { name:'Codeforces EDU',url:'https://codeforces.com/edu/courses',logo:'🎓', desc:'Free structured CP courses.',                        tags:['Courses'],           difficulty:'',                      type:'resource' },
  { name:'clist.by',    url:'https://clist.by',                   logo:'📅', desc:'All upcoming contests from all platforms in one place.',tags:['Contests'],         difficulty:'',                      type:'contest'  },
  { name:'LeetCode Weekly',url:'https://leetcode.com/contest/',   logo:'🟨', desc:'Every Sunday — Weekly & Biweekly contests.',          tags:['Weekly'],            difficulty:'',                      type:'contest'  },
  { name:'Codeforces Contests',url:'https://codeforces.com/contests',logo:'🔵',desc:'Every 2-3 days. Div 1-4 rounds.',                  tags:['Regular'],           difficulty:'',                      type:'contest'  },
  { name:'CodeChef Starters',url:'https://www.codechef.com/contests',logo:'🟤',desc:'Every Wednesday. Beginner friendly.',              tags:['Weekly'],            difficulty:'',                      type:'contest'  },
];

const seedCodingData = async (adminUserId) => {
  try {
    const count = await CodingPlatform.countDocuments();
    if (count === 0 && adminUserId) {
      const docs = SEED_DATA.map((d, i) => ({ ...d, createdBy: adminUserId, order: i }));
      await CodingPlatform.insertMany(docs);
      console.log('Coding platforms seeded');
    }
  } catch (err) { console.error('Seed error:', err.message); }
};

// GET /coding — all active items grouped by type
const getCodingItems = async (req, res, next) => {
  try {
    const items = await CodingPlatform.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
    const grouped = {
      platforms: items.filter(i => i.type === 'platform'),
      resources: items.filter(i => i.type === 'resource'),
      topics:    items.filter(i => i.type === 'topic'),
      contests:  items.filter(i => i.type === 'contest'),
    };
    res.json({ success: true, data: grouped });
  } catch (err) { next(err); }
};

// GET /admin/coding — all items including inactive
const getAllCodingItems = async (req, res, next) => {
  try {
    const items = await CodingPlatform.find().sort({ type: 1, order: 1 }).lean();
    res.json({ success: true, data: { items } });
  } catch (err) { next(err); }
};

// POST /admin/coding
const createCodingItem = async (req, res, next) => {
  try {
    const { name, url, logo, desc, tags, difficulty, type } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: 'name and url required' });
    const item = await CodingPlatform.create({
      name, url, logo: logo || '💻', desc: desc || '', type: type || 'platform',
      tags: tags || [], difficulty: difficulty || '',
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

// DELETE /admin/coding/:id
const deleteCodingItem = async (req, res, next) => {
  try {
    await CodingPlatform.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// PATCH /admin/coding/:id — toggle active
const toggleCodingItem = async (req, res, next) => {
  try {
    const item = await CodingPlatform.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    item.active = !item.active;
    await item.save();
    res.json({ success: true, data: { item } });
  } catch (err) { next(err); }
};

// ── Suggestions ───────────────────────────────────────────────

// POST /coding/suggest — student suggests a platform
const suggestPlatform = async (req, res, next) => {
  try {
    const { name, url, desc, type } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: 'name and url required' });
    const suggestion = await PlatformSuggestion.create({
      name, url, desc: desc || '', type: type || 'platform',
      suggestedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { suggestion } });
  } catch (err) { next(err); }
};

// GET /admin/coding/suggestions
const getSuggestions = async (req, res, next) => {
  try {
    const suggestions = await PlatformSuggestion.find({ status: 'pending' })
      .populate('suggestedBy', 'name email')
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { suggestions } });
  } catch (err) { next(err); }
};

// PATCH /admin/coding/suggestions/:id — approve or reject
const reviewSuggestion = async (req, res, next) => {
  try {
    const { action, adminNote } = req.body; // action: 'approve' | 'reject'
    const suggestion = await PlatformSuggestion.findById(req.params.id).populate('suggestedBy','name');
    if (!suggestion) return res.status(404).json({ success: false, message: 'Not found' });

    if (action === 'approve') {
      // Add to platforms
      await CodingPlatform.create({
        name: suggestion.name, url: suggestion.url,
        desc: suggestion.desc, type: suggestion.type,
        logo: '🔗', tags: [], createdBy: req.user._id,
      });
      suggestion.status = 'approved';
    } else {
      suggestion.status = 'rejected';
    }
    suggestion.adminNote = adminNote || '';
    await suggestion.save();
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  seedCodingData, getCodingItems, getAllCodingItems,
  createCodingItem, deleteCodingItem, toggleCodingItem,
  suggestPlatform, getSuggestions, reviewSuggestion,
};
