'use strict';
const cloudinary = require('../config/cloudinary');
const multer     = require('multer');
const Syllabus   = require('../models/Syllabus');
const Timetable  = require('../models/Timetable');

// Multer memory storage for direct Cloudinary upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word, and image files are allowed'));
  },
});

// Upload buffer to Cloudinary
const uploadToCloudinary = (file, folder, filename) =>
  new Promise((resolve, reject) => {
    const resourceType = String(file?.mimetype || '').startsWith('image/') ? 'image' : 'raw';
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType, public_id: filename, use_filename: true, unique_filename: false },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(file.buffer);
  });

// ── Syllabus ──────────────────────────────────────────────────

// GET /syllabus?regulation=R22&branch=CSE&year=2
const getSyllabus = async (req, res, next) => {
  try {
    const { regulation, branch, year } = req.query;
    const filter = {};
    if (regulation) filter.regulation = regulation.toUpperCase();
    if (branch)     filter.branch     = branch.toUpperCase();
    if (year)       filter.year       = year;
    const items = await Syllabus.find(filter).sort({ year: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: { syllabi: items } });
  } catch (err) { next(err); }
};

// POST /admin/syllabus
const uploadSyllabus = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { regulation, branch, year, title } = req.body;
    if (!regulation || !branch || !year) return res.status(400).json({ success: false, message: 'regulation, branch, year required' });

    const result = await uploadToCloudinary(
      req.file,
      `syllabus/${regulation}/${branch}`,
      `${regulation}_${branch}_Y${year}_${Date.now()}`
    );

    const syllabus = await Syllabus.create({
      regulation: regulation.toUpperCase(),
      branch:     branch.toUpperCase(),
      year,
      title:      title || `${regulation} ${branch} Year ${year} Syllabus`,
      fileUrl:    result.secure_url,
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      uploadedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { syllabus } });
  } catch (err) { next(err); }
};

// DELETE /admin/syllabus/:id
const deleteSyllabus = async (req, res, next) => {
  try {
    await Syllabus.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Timetable ─────────────────────────────────────────────────

// GET /timetable?regulation=R22&branch=CSE&year=2&sem=1
const getTimetable = async (req, res, next) => {
  try {
    const { regulation, branch, year, sem } = req.query;
    const filter = {};
    if (regulation) filter.regulation = regulation.toUpperCase();
    if (branch)     filter.branch     = branch.toUpperCase();
    if (year)       filter.year       = year;
    if (sem)        filter.sem        = sem;
    const items = await Timetable.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { timetables: items } });
  } catch (err) { next(err); }
};

// POST /admin/timetable
const uploadTimetable = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { regulation, branch, year, sem, title } = req.body;
    if (!regulation || !branch || !year || !sem) return res.status(400).json({ success: false, message: 'regulation, branch, year, sem required' });

    const result = await uploadToCloudinary(
      req.file,
      `timetable/${regulation}/${branch}`,
      `${regulation}_${branch}_Y${year}_S${sem}_${Date.now()}`
    );

    const timetable = await Timetable.create({
      regulation: regulation.toUpperCase(),
      branch:     branch.toUpperCase(),
      year, sem,
      title:      title || `${regulation} ${branch} Y${year} S${sem} Timetable`,
      fileUrl:    result.secure_url,
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      uploadedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: { timetable } });
  } catch (err) { next(err); }
};

// DELETE /admin/timetable/:id
const deleteTimetable = async (req, res, next) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  upload,
  getSyllabus, uploadSyllabus, deleteSyllabus,
  getTimetable, uploadTimetable, deleteTimetable,
};
