'use strict';

/**
 * reportController.js
 * ───────────────────
 * POST /reports                  — student reports a file
 * GET  /admin/reports            — admin views all reports
 * PATCH /admin/reports/:id/resolve — admin resolves a report
 */

const Report = require('../models/Report');
const File   = require('../models/File');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// POST /reports
// Body: { fileId, reason, description? }
// ─────────────────────────────────────────────────────────────────────────────
const createReport = async (req, res, next) => {
  try {
    const { fileId, reason, description } = req.body;

    // Verify the file exists and is publicly approved
    const file = await File.findOne({ _id: fileId, status: 'approved' });
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found or is not publicly available.',
      });
    }

    // Create the report.
    // The compound unique index { fileId, reportedBy } enforces one-per-user.
    const report = await Report.create({
      fileId,
      reportedBy:  req.user._id,
      reason,
      description: description || null,
    });

    logger.info(`Report created — file: ${fileId}, user: ${req.user.email}, reason: ${reason}`);

    return res.status(201).json({
      success: true,
      message: 'Report submitted. An admin will review it shortly.',
      data:    { report },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a report for this file.',
      });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/reports
// Query: status (open|resolved), page, limit
// ─────────────────────────────────────────────────────────────────────────────
const getReports = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter   = {};
    if (status) filter.status = status;

    const pageNum  = Math.max(1,  parseInt(page,  10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [reports, total] = await Promise.all([
      Report.find(filter)
            .populate('fileId',     'originalName subject branch regulation status')
            .populate('reportedBy', 'name email')
            .populate('resolvedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean(),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /admin/reports/:id/resolve
// ─────────────────────────────────────────────────────────────────────────────
const resolveReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    if (report.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'Report is already resolved.' });
    }

    report.status     = 'resolved';
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    logger.info(`Report resolved: ${report._id} by admin ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Report has been resolved.',
      data:    { report },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReport, getReports, resolveReport };
