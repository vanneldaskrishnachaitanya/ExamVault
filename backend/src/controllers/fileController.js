'use strict';

/**
 * fileController.js
 * Files stored in Cloudinary
 */

const File = require('../models/File');
const Report = require('../models/Report');
const Folder = require('../models/Folder'); // Fixed casing to match 'Folder.js'

const {
  checkDuplicate,
  saveFileMeta,
  buildFileFilter
} = require('../services/fileService');

const logger = require('../utils/logger');
const { createNotification } = require('./notificationController');

/* ─────────────────────────────────────────────
POST /files/upload
───────────────────────────────────────────── */
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
        message: 'examType required for papers'
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

/* ─────────────────────────────────────────────
GET /files
───────────────────────────────────────────── */
const getFiles = async (req, res, next) => {
  try {

    const { page = 1, limit = 20, status, ...filterParams } = req.query;

    const filter = buildFileFilter(filterParams);

    if (req.user.role !== 'admin') {
      filter.status = 'approved';
    } else if (status) {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page));
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

/* ─────────────────────────────────────────────
GET /files/:id
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
PREVIEW FILE
───────────────────────────────────────────── */
const previewFile = async (req, res, next) => {
  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (req.user.role === 'student' && file.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'File not accessible'
      });
    }

    if (!file.filePath) {
      return res.status(404).json({
        success: false,
        message: 'File URL missing'
      });
    }

    let previewUrl = file.filePath;

    // For Cloudinary URLs, ensure we don't force download (fl_attachment)
    if (previewUrl.includes('cloudinary.com') && previewUrl.includes('/fl_attachment:')) {
      previewUrl = previewUrl.replace('/fl_attachment:', '/');
    }

    return res.redirect(previewUrl);

  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
DOWNLOAD FILE
───────────────────────────────────────────── */
const downloadFile = async (req, res, next) => {
  try {

    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (req.user.role === 'student' && file.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'File not accessible'
      });
    }

    if (!file.filePath) {
      return res.status(404).json({
        success: false,
        message: 'File URL missing'
      });
    }

    let downloadUrl = file.filePath;

    if (downloadUrl && downloadUrl.includes('cloudinary.com')) {

      const encodedName = encodeURIComponent(file.originalName || 'file');

      // If an fl_attachment transformation is already present, don't add another
      if (downloadUrl.includes('/fl_attachment:')) {
        // leave downloadUrl as-is
      } else if (downloadUrl.includes('/raw/upload/')) {
        downloadUrl = downloadUrl.replace(
          '/raw/upload/',
          `/raw/upload/fl_attachment:${encodedName}/`
        );
      } else if (downloadUrl.includes('/upload/')) {
        downloadUrl = downloadUrl.replace(
          '/upload/',
          `/upload/fl_attachment:${encodedName}/`
        );
      }

    }

    File.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloadCount: 1 } }
    ).exec();

    logger.info(`Download: ${file.originalName} by ${req.user.email}`);

    return res.redirect(downloadUrl);


  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
ADMIN — PENDING FILES
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
APPROVE FILE
───────────────────────────────────────────── */
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

    // Notify uploader
    createNotification({
      userId:  file.uploadedBy,
      type:    'file_approved',
      title:   '✅ File Approved',
      message: `Your file "${file.originalName}" has been approved and is now live.`,
      link:    `/r/${file.regulation}/${file.branch}/${encodeURIComponent(file.subject)}`,
    });

    res.json({ success: true, message: 'File approved' });


  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
REJECT FILE
───────────────────────────────────────────── */
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

    // Notify uploader
    createNotification({
      userId:  file.uploadedBy,
      type:    'file_rejected',
      title:   '❌ File Rejected',
      message: `Your file "${file.originalName}" was rejected. Reason: ${file.rejectionNote}`,
    });

    res.json({ success: true, message: 'File rejected' });


  } catch (err) {
    next(err);
  }
};

/* ─────────────────────────────────────────────
DELETE FILE
───────────────────────────────────────────── */
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


/* ─────────────────────────────────────────────
FOLDERS
───────────────────────────────────────────── */
const getFolders = async (req, res, next) => {
  try {
    const { regulation, branch } = req.query;
    const filter = {};
    if (regulation) filter.regulation = regulation.toUpperCase();
    if (branch)     filter.branch     = branch.toUpperCase();
    const folders = await Folder.find(filter).sort({ subject: 1 }).lean();
    res.json({ success: true, data: { folders } });
  } catch (err) {
    next(err);
  }
};

const createFolder = async (req, res, next) => {
  try {
    const { regulation, branch, subject } = req.body;
    if (!regulation || !branch || !subject) {
      return res.status(400).json({ success: false, message: 'regulation, branch and subject are required' });
    }
    const folder = await Folder.findOneAndUpdate(
      { regulation: regulation.toUpperCase(), branch: branch.toUpperCase(), subject: subject.trim() },
      { $setOnInsert: { regulation: regulation.toUpperCase(), branch: branch.toUpperCase(), subject: subject.trim(), createdBy: req.user._id } },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, data: { folder } });
  } catch (err) {
    next(err);
  }
};

const deleteFolder = async (req, res, next) => {
  try {
    await Folder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Folder deleted' });
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
  deleteFile,
  getFolders,
  createFolder,
  deleteFolder
};