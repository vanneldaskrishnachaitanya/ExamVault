'use strict';

const express    = require('express');
const router     = express.Router();
const { protect }    = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');
const { createReport, getReports, resolveReport } = require('../controllers/reportController');
const { reportValidators, mongoIdParam, validate } = require('../utils/validators');

/**
 * POST /reports
 * Any authenticated user (student or admin) can report an approved file.
 * Body: { fileId, reason, description? }
 */
router.post(
  '/',
  protect,
  restrictTo('student', 'admin'),
  reportValidators,
  validate,
  createReport
);

/**
 * GET /admin/reports  — mounted via adminRouter in fileRoutes.js
 * Exported below and wired in server.js
 */

// ── Admin sub-router for reports (merged into /admin in server.js) ───────────
const adminReportRouter = express.Router();

adminReportRouter.get(
  '/reports',
  protect,
  restrictTo('admin'),
  getReports
);

adminReportRouter.patch(
  '/reports/:id/resolve',
  protect,
  restrictTo('admin'),
  mongoIdParam('id'),
  validate,
  resolveReport
);

module.exports = router;
module.exports.adminReportRouter = adminReportRouter;
