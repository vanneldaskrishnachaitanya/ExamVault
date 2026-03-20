'use strict';

/**
 * fileHelpers.js
 * ──────────────
 * Pure utility functions for:
 *   • generating safe, descriptive file names
 *   • building organised storage paths
 *   • deleting files (and pruning empty parent directories) from disk
 *   • mapping MIME types to Content-Disposition behaviour (preview vs download)
 */

const path   = require('path');
const fs     = require('fs');
const logger = require('./logger');

// ── Root uploads directory ────────────────────────────────────────────────────
const UPLOAD_ROOT = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');

// ─────────────────────────────────────────────────────────────────────────────
// 1. SAFE SUBJECT SLUG
//    "Data Structures" → "DataStructures"
//    Removes anything that is not a letter, digit, or hyphen.
// ─────────────────────────────────────────────────────────────────────────────
const slugifySubject = (subject) =>
  subject
    .trim()
    .replace(/\s+/g, '')           // remove whitespace
    .replace(/[^a-zA-Z0-9-]/g, '') // remove unsafe chars
    .slice(0, 40);                  // cap length

// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERATE STORED FILE NAME
//    Format: REGULATION_BRANCH_SUBJECT_CATEGORY_TIMESTAMP.ext
//    Example: R22_CSE_DataStructures_mid1_1714583923.pdf
// ─────────────────────────────────────────────────────────────────────────────
const generateFileName = ({ regulation, branch, subject, category, examType, originalName }) => {
  const ext       = path.extname(originalName).toLowerCase() || '.bin';
  const slug      = slugifySubject(subject);
  const label     = category === 'paper' ? (examType || category) : category;
  const timestamp = Math.floor(Date.now() / 1000); // Unix seconds

  // e.g. R22_CSE_DataStructures_mid1_1714583923.pdf
  return `${regulation}_${branch}_${slug}_${label}_${timestamp}${ext}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. BUILD STORAGE DIRECTORY PATH
//    uploads/<regulation>/<branch>/<SubjectSlug>/papers|resources/
//    Directory is created on the fly if it does not exist.
// ─────────────────────────────────────────────────────────────────────────────
const buildStoragePath = ({ regulation, branch, subject, category }) => {
  const slug    = slugifySubject(subject);
  const subDir  = category === 'paper' ? 'papers' : 'resources';
  const dirPath = path.join(UPLOAD_ROOT, regulation, branch, slug, subDir);

  // Ensure the entire hierarchy exists (safe no-op if it already does)
  fs.mkdirSync(dirPath, { recursive: true });

  return dirPath;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. DELETE PHYSICAL FILE + PRUNE EMPTY PARENT DIRS
//    Non-fatal: logs a warning if the file has already been removed.
//    After deleting, walks UP the tree removing empty dirs (up to UPLOAD_ROOT).
// ─────────────────────────────────────────────────────────────────────────────
const deleteFileFromDisk = (relativeOrAbsPath) => {
  const absPath = path.isAbsolute(relativeOrAbsPath)
    ? relativeOrAbsPath
    : path.resolve(process.cwd(), relativeOrAbsPath);

  // Delete the file itself
  try {
    fs.unlinkSync(absPath);
    logger.info(`Deleted file from disk: ${absPath}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.warn(`File already gone (ENOENT): ${absPath}`);
    } else {
      logger.error(`Could not delete file: ${absPath} — ${err.message}`);
    }
  }

  // Prune empty parent directories up to (but not including) UPLOAD_ROOT
  let dir = path.dirname(absPath);
  while (dir.startsWith(UPLOAD_ROOT) && dir !== UPLOAD_ROOT) {
    try {
      const entries = fs.readdirSync(dir);
      if (entries.length === 0) {
        fs.rmdirSync(dir);
        logger.debug(`Pruned empty directory: ${dir}`);
        dir = path.dirname(dir); // step up
      } else {
        break; // directory still has files — stop
      }
    } catch {
      break; // can't read or remove — stop silently
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. MIME → CONTENT-DISPOSITION STRATEGY
//    Returns an object describing how the file should be served:
//      { disposition: 'inline'      }  → browser opens / previews it
//      { disposition: 'attachment'  }  → browser forces download
// ─────────────────────────────────────────────────────────────────────────────

// These types open natively in all major browsers
const INLINE_MIMETYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
]);

/**
 * @param {string} mimeType
 * @returns {{ disposition: 'inline' | 'attachment' }}
 */
const getServeStrategy = (mimeType) => ({
  disposition: INLINE_MIMETYPES.has(mimeType) ? 'inline' : 'attachment',
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. BUILD DUPLICATE-DETECTION FILTER
//    Checks: regulation + branch + subject + category + examType + storedName base
//    (We compare originalName because storedName is always unique.)
// ─────────────────────────────────────────────────────────────────────────────
const buildDuplicateFilter = ({ regulation, branch, subject, category, examType, originalName }) => ({
  regulation: regulation.toUpperCase(),
  branch:     branch.toUpperCase(),
  subject:    new RegExp(`^${subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  category,
  examType:   category === 'paper' ? (examType || null) : null,
  originalName,
  status: 'approved',
});

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  UPLOAD_ROOT,
  slugifySubject,
  generateFileName,
  buildStoragePath,
  deleteFileFromDisk,
  getServeStrategy,
  buildDuplicateFilter,
};
