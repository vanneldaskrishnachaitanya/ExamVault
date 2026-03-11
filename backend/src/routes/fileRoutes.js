'use strict';

const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const {
  uploadFile,
  getFiles,
  getFileById,
  previewFile,
  downloadFile,
  getPendingFiles,
  approveFile,
  rejectFile,
  deleteFile
} = require('../controllers/fileController');

const { upload } = require('../services/fileService');

const {
  uploadValidators,
  rejectValidators,
  mongoIdParam,
  validate
} = require('../utils/validators');


// ─────────────────────────────────────────────
// Student / shared routes
// ─────────────────────────────────────────────

/**
 * POST /files/upload
 */
router.post(
  '/upload',
  protect,
  restrictTo('student', 'admin'),
  upload.single('file'),
  uploadValidators,
  validate,
  uploadFile
);

/**
 * GET /files
 */
router.get(
  '/',
  protect,
  restrictTo('student', 'admin'),
  getFiles
);

/**
 * GET /files/preview/:id
 */
router.get(
  '/preview/:id',
  protect,
  restrictTo('student', 'admin'),
  mongoIdParam('id'),
  validate,
  previewFile
);

/**
 * GET /files/download/:id
 */
router.get(
  '/download/:id',
  protect,
  restrictTo('student', 'admin'),
  mongoIdParam('id'),
  validate,
  downloadFile
);

/**
 * GET /files/:id
 */
router.get(
  '/:id',
  protect,
  restrictTo('student', 'admin'),
  mongoIdParam('id'),
  validate,
  getFileById
);

module.exports = router;


// ─────────────────────────────────────────────
// Admin routes (mounted at /admin in server.js)
// ─────────────────────────────────────────────

const adminRouter = express.Router();

/**
 * GET /admin/pending-files
 */
adminRouter.get(
  '/pending-files',
  protect,
  restrictTo('admin'),
  getPendingFiles
);

/**
 * PATCH /admin/files/:id/approve
 */
adminRouter.patch(
  '/files/:id/approve',
  protect,
  restrictTo('admin'),
  mongoIdParam('id'),
  validate,
  approveFile
);

/**
 * PATCH /admin/files/:id/reject
 */
adminRouter.patch(
  '/files/:id/reject',
  protect,
  restrictTo('admin'),
  mongoIdParam('id'),
  rejectValidators,
  validate,
  rejectFile
);

/**
 * DELETE /admin/files/:id
 */
adminRouter.delete(
  '/files/:id',
  protect,
  restrictTo('admin'),
  mongoIdParam('id'),
  validate,
  deleteFile
);

module.exports.adminRouter = adminRouter;