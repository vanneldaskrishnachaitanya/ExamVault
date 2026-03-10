'use strict';

/**
 * fileController.js  (enhanced)
 * ──────────────────────────────
 * POST  /files/upload          — upload with duplicate check
 * GET   /files                 — list approved files (filterable, paginated)
 * GET   /files/:id             — single file metadata
 * GET   /files/preview/:id     — serve file for browser preview or download
 * GET   /files/download/:id    — always force-download
 * GET   /admin/pending-files   — admin queue
 * PATCH /admin/files/:id/approve
 * PATCH /admin/files/:id/reject
 * DELETE /admin/files/:id      — DB + disk + reports
 */

const path   = require('path');
const fs     = require('fs');
const File   = require('../models/File');
const Report = require('../models/Report');
const {
  upload,
  checkDuplicate,
  saveFileMeta,
  buildFileFilter,
  deleteFileFromDisk,
} = require('../services/fileService');
const { getServeStrategy } = require('../utils/fileHelpers');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// POST /files/upload
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res, next) => {
  try {
    // ── Guard: file must be present ──────────────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file received. Send multipart/form-data with field name "file".',
      });
    }

    const { regulation, branch, subject, category, examType } = req.body;

    // ── Guard: examType required for papers ──────────────────────────────────
    if (category === 'paper' && !examType) {
      deleteFileFromDisk(req.file.path);
      return res.status(400).json({
        success: false,
        message: "examType ('mid1', 'mid2', 'semester') is required when category is 'paper'.",
      });
    }

    // ── Duplicate detection ──────────────────────────────────────────────────
    const duplicate = await checkDuplicate({
      regulation,
      branch,
      subject,
      category,
      examType: category === 'paper' ? examType : null,
      originalName: req.file.originalname,
    });

    if (duplicate) {
      // Remove the file multer already wrote to disk
      deleteFileFromDisk(req.file.path);
      return res.status(409).json({
        success: false,
        message: 'A file with the same name already exists for this regulation / branch / subject / category.',
        data: {
          existingFileId: duplicate._id,
          uploadedAt:     duplicate.uploadedAt,
          status:         duplicate.status,
        },
      });
    }

    // ── Persist metadata ─────────────────────────────────────────────────────
    const file = await saveFileMeta({
      multerFile: req.file,
      body:       req.body,
      userId:     req.user._id,
    });

    logger.info(`Upload: ${file.storedName} by ${req.user.email} [pending]`);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully. It will become visible after admin approval.',
      data: {
        file: {
          id:           file._id,
          originalName: file.originalName,
          storedName:   file.storedName,
          regulation:   file.regulation,
          branch:       file.branch,
          subject:      file.subject,
          category:     file.category,
          examType:     file.examType,
          mimeType:     file.mimeType,
          fileSize:     file.fileSize,
          status:       file.status,
          uploadedAt:   file.uploadedAt,
        },
      },
    });
  } catch (err) {
    // If Mongoose validation fails AFTER disk write, clean up the orphan
    if (req.file?.path) deleteFileFromDisk(req.file.path);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /files
// ─────────────────────────────────────────────────────────────────────────────
const getFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, ...filterParams } = req.query;

    const filter = buildFileFilter(filterParams);

    // Students always get approved only; admins can filter by status
    if (req.user.role !== 'admin') {
      filter.status = 'approved';
    } else if (status) {
      filter.status = status;
    }

    const pageNum  = Math.max(1,  parseInt(page,  10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [files, total] = await Promise.all([
      File.find(filter)
          .populate('uploadedBy', 'name email')
          .sort({ uploadedAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
      File.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        files,
        pagination: {
          total,
          page:       pageNum,
          limit:      limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /files/:id
// ─────────────────────────────────────────────────────────────────────────────
const getFileById = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (req.user.role === 'student' && file.status !== 'approved') {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    return res.status(200).json({ success: true, data: { file } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared serve helper — used by both preview and download endpoints
// ─────────────────────────────────────────────────────────────────────────────
const _serveFile = async ({ req, res, forceDownload = false }) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  if (req.user.role === 'student' && file.status !== 'approved') {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }

  const absPath = path.resolve(process.cwd(), file.filePath);
  if (!fs.existsSync(absPath)) {
    logger.error(`Physical file missing: ${absPath} (id: ${file._id})`);
    return res.status(410).json({
      success: false,
      message: 'File is no longer available on this server.',
    });
  }

  // Increment download counter (fire-and-forget)
  File.findByIdAndUpdate(file._id, { $inc: { downloadCount: 1 } }).exec();

  const { disposition } = forceDownload
    ? { disposition: 'attachment' }
    : getServeStrategy(file.mimeType);

  logger.info(`Serve [${disposition}]: ${file.storedName} → ${req.user.email}`);

  res.setHeader('Content-Type',        file.mimeType);
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalName)}"`);
  res.setHeader('Content-Length',      file.fileSize);
  res.setHeader('Cache-Control',       'private, max-age=3600');

  fs.createReadStream(absPath).pipe(res);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /files/preview/:id
// PDF → opens in browser tab
// Images → preview in browser
// Other → forced download
// ─────────────────────────────────────────────────────────────────────────────
const previewFile = async (req, res, next) => {
  try {
    await _serveFile({ req, res, forceDownload: false });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /files/download/:id
// Always forces a browser download regardless of MIME type
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {
    await _serveFile({ req, res, forceDownload: true });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/pending-files
// ─────────────────────────────────────────────────────────────────────────────
const getPendingFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1,  parseInt(page,  10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [files, total] = await Promise.all([
      File.find({ status: 'pending' })
          .populate('uploadedBy', 'name email')
          .sort({ uploadedAt: 1 })   // oldest-first queue
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
      File.countDocuments({ status: 'pending' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        files,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/files/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
const approveFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    if (file.status === 'approved') {
      return res.status(400).json({ success: false, message: 'File is already approved.' });
    }

    file.status        = 'approved';
    file.approvedBy    = req.user._id;
    file.approvedAt    = new Date();
    file.rejectionNote = null;
    await file.save();

    logger.info(`Approved: ${file.storedName} by ${req.user.email}`);
    return res.status(200).json({
      success: true,
      message: 'File approved and is now publicly visible.',
      data:    { file },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/files/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
const rejectFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    if (file.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'File is already rejected.' });
    }

    file.status        = 'rejected';
    file.approvedBy    = req.user._id;
    file.approvedAt    = new Date();
    file.rejectionNote = req.body.note || 'No reason provided.';
    await file.save();

    logger.info(`Rejected: ${file.storedName} by ${req.user.email}. Note: ${file.rejectionNote}`);
    return res.status(200).json({
      success: true,
      message: 'File rejected.',
      data:    { file },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /admin/files/:id  — safe, atomic, 3-step deletion
// ─────────────────────────────────────────────────────────────────────────────
const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    // Step 1: Remove physical file + prune empty dirs
    deleteFileFromDisk(file.filePath);

    // Step 2: Remove all reports that reference this file
    const { deletedCount } = await Report.deleteMany({ fileId: file._id });

    // Step 3: Remove the MongoDB document
    await file.deleteOne();

    logger.info(`Deleted: ${file.storedName} by admin ${req.user.email} (${deletedCount} reports removed)`);

    return res.status(200).json({
      success: true,
      message: 'File, physical asset, and all associated reports permanently deleted.',
      data: { deletedReports: deletedCount },
    });
  } catch (err) { next(err); }
};

module.exports = {
  uploadFile,
  getFiles,
  getFileById,
  previewFile,
  downloadFile,
  getPendingFiles,
  approveFile,
  rejectFile,
  deleteFile,
};
// const File = require("../models/File");

const deleteSubject = async (req, res) => {
  try {

    const { regulation, branch, subject } = req.body;

    const files = await File.find({ regulation, branch, subject });

    for (const file of files) {

      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

    }

    await File.deleteMany({ regulation, branch, subject });

    res.json({
      success: true,
      message: "Folder and all files deleted"
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

module.exports.deleteSubject = deleteSubject;