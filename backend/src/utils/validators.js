'use strict';

const { body, param, query, validationResult } = require('express-validator');

// ── Reusable field rules ─────────────────────────────────────────────────────

const regulationRule = () =>
  body('regulation')
    .trim().notEmpty().withMessage('regulation is required')
    .isIn(['R22', 'R18', 'R16', 'R14']).withMessage('regulation must be R22, R18, R16, or R14');

const branchRule = () =>
  body('branch')
    .trim().notEmpty().withMessage('branch is required')
    .isLength({ max: 20 }).withMessage('branch too long');

const subjectRule = () =>
  body('subject')
    .trim().notEmpty().withMessage('subject is required')
    .isLength({ max: 100 }).withMessage('subject cannot exceed 100 characters');

const categoryRule = () =>
  body('category')
    .trim().notEmpty().withMessage('category is required')
    .isIn(['paper', 'resource']).withMessage("category must be 'paper' or 'resource'");

const examTypeRule = () =>
  body('examType')
    .optional()
    .isIn(['mid1', 'mid2', 'semester']).withMessage("examType must be 'mid1', 'mid2', or 'semester'");

const yearRule = () =>
  body('year')
    .optional()
    .isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid integer between 2000 and 2100');

// ── Validator chains ─────────────────────────────────────────────────────────

const uploadValidators = [
  regulationRule(),
  branchRule(),
  subjectRule(),
  categoryRule(),
  examTypeRule(),
  yearRule(),
];

const reportValidators = [
  body('fileId')
    .notEmpty().withMessage('fileId is required')
    .isMongoId().withMessage('fileId must be a valid MongoDB ObjectId'),
  body('reason')
    .trim().notEmpty().withMessage('reason is required')
    .isIn(['wrong_subject', 'wrong_exam_type', 'duplicate', 'poor_quality', 'inappropriate', 'other'])
    .withMessage('Invalid reason value'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('description cannot exceed 500 characters'),
];

const rejectValidators = [
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('note cannot exceed 500 characters'),
];

const mongoIdParam = (name = 'id') =>
  param(name).isMongoId().withMessage(`${name} must be a valid MongoDB ObjectId`);

// ── Middleware: read validation results and short-circuit on error ────────────

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  errors.array().map((e) => `${e.path}: ${e.msg}`),
    });
  }
  next();
};

module.exports = {
  uploadValidators,
  reportValidators,
  rejectValidators,
  mongoIdParam,
  validate,
};
