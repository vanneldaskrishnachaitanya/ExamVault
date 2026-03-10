'use strict';

/**
 * fileService.js  (enhanced)
 * ──────────────────────────
 * Responsibilities:
 *   1. Multer configuration  — organised hierarchy, descriptive names,
 *                              MIME filtering, size cap
 *   2. saveFileMeta()        — persist upload metadata to MongoDB
 *   3. checkDuplicate()      — query DB before accepting a new upload
 *   4. buildFileFilter()     — construct Mongoose query from URL params
 */

const path   = require('path');
const multer = require('multer');
const File   = require('../models/File');
const logger = require('../utils/logger');
const {
  UPLOAD_ROOT,
  generateFileName,
  buildStoragePath,
  deleteFileFromDisk,
  buildDuplicateFilter,
} = require('../utils/fileHelpers');

// ── Allowed MIME types ───────────────────────────────────────────────────────
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
]);

// ── Multer disk storage ──────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const { regulation, branch, subject, category } = req.body;
      if (regulation && branch && subject && category) {
        cb(null, buildStoragePath({ regulation, branch, subject, category }));
      } else {
        cb(null, UPLOAD_ROOT);
      }
    } catch (err) { cb(err); }
  },

  filename(req, file, cb) {
    try {
      const { regulation, branch, subject, category, examType } = req.body;
      cb(null, generateFileName({
        regulation:   (regulation  || 'MISC').toUpperCase(),
        branch:       (branch      || 'MISC').toUpperCase(),
        subject:      subject      || 'Unknown',
        category:     category     || 'resource',
        examType:     examType     || null,
        originalName: file.originalname,
      }));
    } catch (err) { cb(err); }
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMETYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(
      new Error(`File type '${file.mimetype}' is not permitted.`),
      { statusCode: 415 }
    ));
  }
};

const MAX_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

// ── Duplicate detection ──────────────────────────────────────────────────────

const checkDuplicate = async ({ regulation, branch, subject, category, examType, originalName }) => {
  const filter = buildDuplicateFilter({ regulation, branch, subject, category, examType, originalName });
  return File.findOne(filter).lean();
};

// ── Save metadata ────────────────────────────────────────────────────────────

const saveFileMeta = async ({ multerFile, body, userId }) => {
  const { regulation, branch, subject, category, examType, year } = body;
  const relPath = path.relative(process.cwd(), multerFile.path);

  const doc = await File.create({
    regulation:   regulation.toUpperCase(),
    branch:       branch.toUpperCase(),
    subject:      subject.trim(),
    category,
    examType:     category === 'paper' ? (examType || null) : null,
    year:         year ? parseInt(year, 10) : null,
    originalName: multerFile.originalname,
    storedName:   multerFile.filename,
    filePath:     relPath,
    mimeType:     multerFile.mimetype,
    fileSize:     multerFile.size,
    uploadedBy:   userId,
    status:       'pending',
    uploadedAt:   new Date(),
  });

  logger.info(`Metadata saved: ${doc.storedName} [${doc._id}]`);
  return doc;
};

// ── Query filter builder ─────────────────────────────────────────────────────

const buildFileFilter = ({ regulation, branch, subject, category, examType, year }) => {
  const filter = {};
  if (regulation) filter.regulation = regulation.toUpperCase();
  if (branch)     filter.branch     = branch.toUpperCase();
  if (subject)    filter.subject    = new RegExp(subject.trim(), 'i');
  if (category)   filter.category   = category;
  if (examType)   filter.examType   = examType;
  if (year)       filter.year       = parseInt(year, 10);
  return filter;
};

module.exports = {
  upload,
  checkDuplicate,
  saveFileMeta,
  buildFileFilter,
  deleteFileFromDisk,
  UPLOAD_ROOT,
};
