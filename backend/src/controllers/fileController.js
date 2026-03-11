'use strict';

/**
 * fileController.js  (Cloudinary version)
 * Files are stored in Cloudinary, not on disk.
 */

const File   = require('../models/File');
const Report = require('../models/Report');

const {
  checkDuplicate,
  saveFileMeta,
  buildFileFilter
} = require('../services/fileService');

const logger = require('../utils/logger');


// ─────────────────────────────────────────────────────────────
// POST /files/upload
// ─────────────────────────────────────────────────────────────
const uploadFile = async (req, res, next) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { regulation, branch, subject, category, examType } = req.body;

    if (category === 'paper' && !examType) {
      return res.status(400).json({
        success: false,
        message: "examType required for papers"
      });
    }

    const duplicate = await checkDuplicate({
      regulation,
      branch,
      subject,
      category,
      examType: category === 'paper' ? examType : null,
      originalName: req.file.originalname
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate file already exists'
      });
    }

    const file = await saveFileMeta({
      multerFile: req.file,
      body: req.body,
      userId: req.user._id
    });

    logger.info(`Upload: ${file.originalName} by ${req.user.email}`);

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully. Waiting for admin approval.',
      data: { file }
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// GET /files
// ─────────────────────────────────────────────────────────────
const getFiles = async (req, res, next) => {

  try {

    const { page = 1, limit = 20, status, ...filterParams } = req.query;

    const filter = buildFileFilter(filterParams);

    if (req.user.role !== 'admin') {
      filter.status = 'approved';
    } else if (status) {
      filter.status = status;
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [files, total] = await Promise.all([
      File.find(filter)
        .populate('uploadedBy', 'name email')
        .sort({ uploadedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),

      File.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// GET /files/:id
// ─────────────────────────────────────────────────────────────
const getFileById = async (req, res, next) => {

  try {

    const file = await File.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (req.user.role === 'student' && file.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      data: { file }
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// PREVIEW FILE (Cloudinary URL redirect)
// ─────────────────────────────────────────────────────────────
const previewFile = async (req, res, next) => {
  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    if (req.user.role === "student" && file.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "File not accessible"
      });
    }

    // Redirect to Cloudinary URL — browser previews inline
    return res.redirect(file.fileUrl);

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// DOWNLOAD FILE
// ─────────────────────────────────────────────────────────────
const downloadFile = async (req, res, next) => {
  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    if (req.user.role === "student" && file.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "File not accessible"
      });
    }

    // Force download via Cloudinary fl_attachment flag
    let downloadUrl = file.fileUrl;
    if (downloadUrl && downloadUrl.includes('cloudinary.com')) {
      const encodedName = encodeURIComponent(file.originalName || file.fileName || 'file');
      downloadUrl = downloadUrl.replace('/upload/', `/upload/fl_attachment:${encodedName}/`);
    }

    File.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }).exec();
    logger.info(`Download: ${file.originalName} by ${req.user.email}`);

    return res.redirect(downloadUrl);

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// ADMIN — PENDING FILES
// ─────────────────────────────────────────────────────────────
const getPendingFiles = async (req, res, next) => {

  try {

    const files = await File.find({ status: 'pending' })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: 1 });

    res.json({
      success: true,
      data: { files }
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// APPROVE FILE
// ─────────────────────────────────────────────────────────────
const approveFile = async (req, res, next) => {

  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    file.status = 'approved';
    file.approvedBy = req.user._id;
    file.approvedAt = new Date();

    await file.save();

    res.json({
      success: true,
      message: 'File approved'
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// REJECT FILE
// ─────────────────────────────────────────────────────────────
const rejectFile = async (req, res, next) => {

  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    file.status = 'rejected';
    file.rejectionNote = req.body.note || 'No reason provided';
    file.approvedBy = req.user._id;
    file.approvedAt = new Date();

    await file.save();

    res.json({
      success: true,
      message: 'File rejected'
    });

  } catch (err) {
    next(err);
  }

};


// ─────────────────────────────────────────────────────────────
// DELETE FILE
// ─────────────────────────────────────────────────────────────
const deleteFile = async (req, res, next) => {

  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    await Report.deleteMany({ fileId: file._id });

    await file.deleteOne();

    logger.info(`Deleted file ${file.originalName}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (err) {
    next(err);
  }

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
  deleteFile
};