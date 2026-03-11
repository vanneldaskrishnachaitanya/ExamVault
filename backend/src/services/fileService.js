'use strict';

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const File = require('../models/File');
const logger = require('../utils/logger');
const { buildDuplicateFilter } = require('../utils/fileHelpers');

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

/* ─────────────────────────────────────────────
Cloudinary Storage
───────────────────────────────────────────── */

const storage = new CloudinaryStorage({
cloudinary,
params: async (req, file) => {


const { regulation, branch, subject } = req.body;

// remove extension from original filename
const nameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");

return {
  folder: `vnr_repository/${regulation || "misc"}/${branch || "misc"}/${subject || "misc"}`,
  resource_type: "auto",   // IMPORTANT: allows PDF preview
  public_id: `${Date.now()}-${nameWithoutExt}`
};


}
});

/* ─────────────────────────────────────────────
File filter
───────────────────────────────────────────── */

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

const upload = multer({
storage,
fileFilter,
limits: { fileSize: MAX_BYTES }
});

/* ─────────────────────────────────────────────
Duplicate check
───────────────────────────────────────────── */

const checkDuplicate = async ({
regulation,
branch,
subject,
category,
examType,
originalName
}) => {

const filter = buildDuplicateFilter({
regulation,
branch,
subject,
category,
examType,
originalName
});

return File.findOne(filter).lean();

};

/* ─────────────────────────────────────────────
Save metadata
───────────────────────────────────────────── */

const saveFileMeta = async ({ multerFile, body, userId }) => {

const {
regulation,
branch,
subject,
category,
examType,
year
} = body;

const doc = await File.create({


regulation: regulation.toUpperCase(),
branch: branch.toUpperCase(),
subject: subject.trim(),

category,
examType: category === 'paper' ? (examType || null) : null,

year: year ? parseInt(year, 10) : null,

originalName: multerFile.originalname,

storedName: multerFile.filename || multerFile.public_id,

filePath: multerFile.path,   // Cloudinary URL

mimeType: multerFile.mimetype,

fileSize: multerFile.size,

uploadedBy: userId,

status: 'pending',

uploadedAt: new Date(),


});

logger.info(`Metadata saved: ${doc.originalName} [${doc._id}]`);

return doc;

};

/* ─────────────────────────────────────────────
Build query filter
───────────────────────────────────────────── */

const buildFileFilter = ({
regulation,
branch,
subject,
category,
examType,
year
}) => {

const filter = {};

if (regulation) filter.regulation = regulation.toUpperCase();
if (branch) filter.branch = branch.toUpperCase();
if (subject) filter.subject = new RegExp(subject.trim(), 'i');
if (category) filter.category = category;
if (examType) filter.examType = examType;
if (year) filter.year = parseInt(year, 10);

return filter;

};

module.exports = {
upload,
checkDuplicate,
saveFileMeta,
buildFileFilter
};
