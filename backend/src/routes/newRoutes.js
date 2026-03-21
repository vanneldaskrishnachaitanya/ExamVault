'use strict';

const express    = require('express');
const { protect }     = require('../middleware/authMiddleware');
const { restrictTo }  = require('../middleware/roleMiddleware');

const { getNotifications, markAllRead, markOneRead, deleteNotification } = require('../controllers/notificationController');
const { getAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement } = require('../controllers/announcementController');
const { getBookmarks, addBookmark, removeBookmark } = require('../controllers/bookmarkController');
const { getAnalytics, getPublicStats } = require('../controllers/analyticsController');
const { getFileRatings, rateFile, deleteRating } = require('../controllers/ratingController');
const { getDownloadHistory, recordDownloadFromFrontend, globalSearch, getAllUsers, toggleUserActive } = require('../controllers/extraController');
const { getExams, createExam, deleteExam } = require('../controllers/examController');
const {
  getCodingItems, getAllCodingItems, createCodingItem, deleteCodingItem,
  toggleCodingItem, suggestPlatform, getSuggestions, reviewSuggestion,
} = require('../controllers/codingController');
const { getBranches, getAllBranches, createBranch, updateBranch, deleteBranch } = require('../controllers/branchController');
const { getFeedback, createFeedback, upvoteFeedback, reviewFeedback, deleteFeedback } = require('../controllers/feedbackController');
const {
  upload: syllabusUpload,
  getSyllabus, uploadSyllabus, deleteSyllabus,
  getTimetable, uploadTimetable, deleteTimetable,
} = require('../controllers/syllabusController');

// ── Notifications ─────────────────────────────────────────────
const notificationRouter = express.Router();
notificationRouter.get('/',           protect, getNotifications);
notificationRouter.patch('/read-all', protect, markAllRead);
notificationRouter.patch('/:id/read', protect, markOneRead);
notificationRouter.delete('/:id',     protect, deleteNotification);

// ── Announcements ─────────────────────────────────────────────
const announcementRouter = express.Router();
announcementRouter.get('/', protect, getAnnouncements);

// ── Bookmarks ─────────────────────────────────────────────────
const bookmarkRouter = express.Router();
bookmarkRouter.get('/',    protect, getBookmarks);
bookmarkRouter.post('/',   protect, addBookmark);
bookmarkRouter.delete('/', protect, removeBookmark);

// ── Ratings ───────────────────────────────────────────────────
const ratingRouter = express.Router();
ratingRouter.get('/:fileId',    protect, getFileRatings);
ratingRouter.post('/:fileId',   protect, rateFile);
ratingRouter.delete('/:fileId', protect, deleteRating);

// ── Download history ──────────────────────────────────────────
const historyRouter = express.Router();
historyRouter.get('/',                protect, getDownloadHistory);
historyRouter.post('/record/:fileId', protect, recordDownloadFromFrontend);

// ── Global search ─────────────────────────────────────────────
const searchRouter = express.Router();
searchRouter.get('/', protect, globalSearch);

// ── Branches ─────────────────────────────────────────────────
const branchRouter = express.Router();
branchRouter.get('/', protect, getBranches);

// ── Public stats (no auth) ────────────────────────────────────
const statsRouter = express.Router();
statsRouter.get('/', getPublicStats);

// ── Exams ─────────────────────────────────────────────────────
const examRouter = express.Router();
examRouter.get('/',       protect, getExams);
examRouter.post('/',      protect, restrictTo('admin'), createExam);
examRouter.delete('/:id', protect, restrictTo('admin'), deleteExam);

// ── Coding platforms ──────────────────────────────────────────
const codingRouter = express.Router();
codingRouter.get('/',         protect, getCodingItems);
codingRouter.post('/suggest', protect, suggestPlatform);

// ── Syllabus ─────────────────────────────────────────────────
const syllabusRouter = express.Router();
syllabusRouter.get('/', protect, getSyllabus);

// ── Timetable ─────────────────────────────────────────────────
const timetableRouter = express.Router();
timetableRouter.get('/', protect, getTimetable);

// ── Feedback ─────────────────────────────────────────────────
const feedbackRouter = express.Router();
feedbackRouter.get('/',              protect, getFeedback);
feedbackRouter.post('/',             protect, createFeedback);
feedbackRouter.patch('/:id/upvote', protect, upvoteFeedback);

// ── Admin extras ──────────────────────────────────────────────
const adminExtrasRouter = express.Router();
adminExtrasRouter.get('/analytics',              protect, restrictTo('admin'), getAnalytics);
adminExtrasRouter.post('/announcements',         protect, restrictTo('admin'), createAnnouncement);
adminExtrasRouter.delete('/announcements/:id',   protect, restrictTo('admin'), deleteAnnouncement);
adminExtrasRouter.patch('/announcements/:id',    protect, restrictTo('admin'), toggleAnnouncement);
adminExtrasRouter.get('/users',                  protect, restrictTo('admin'), getAllUsers);
adminExtrasRouter.patch('/users/:id/toggle',     protect, restrictTo('admin'), toggleUserActive);
adminExtrasRouter.get('/branches',               protect, restrictTo('admin'), getAllBranches);
adminExtrasRouter.post('/branches',              protect, restrictTo('admin'), createBranch);
adminExtrasRouter.patch('/branches/:id',         protect, restrictTo('admin'), updateBranch);
adminExtrasRouter.delete('/branches/:id',        protect, restrictTo('admin'), deleteBranch);
adminExtrasRouter.get('/coding',                 protect, restrictTo('admin'), getAllCodingItems);
adminExtrasRouter.post('/coding',                protect, restrictTo('admin'), createCodingItem);
adminExtrasRouter.delete('/coding/:id',          protect, restrictTo('admin'), deleteCodingItem);
adminExtrasRouter.patch('/coding/:id',           protect, restrictTo('admin'), toggleCodingItem);
adminExtrasRouter.get('/coding/suggestions',     protect, restrictTo('admin'), getSuggestions);
adminExtrasRouter.patch('/coding/suggestions/:id', protect, restrictTo('admin'), reviewSuggestion);
adminExtrasRouter.post('/syllabus',              protect, restrictTo('admin'), syllabusUpload.single('file'), uploadSyllabus);
adminExtrasRouter.delete('/syllabus/:id',        protect, restrictTo('admin'), deleteSyllabus);
adminExtrasRouter.post('/timetable',             protect, restrictTo('admin'), syllabusUpload.single('file'), uploadTimetable);
adminExtrasRouter.delete('/timetable/:id',       protect, restrictTo('admin'), deleteTimetable);
adminExtrasRouter.get('/feedback',               protect, restrictTo('admin'), getFeedback);
adminExtrasRouter.patch('/feedback/:id',         protect, restrictTo('admin'), reviewFeedback);
adminExtrasRouter.delete('/feedback/:id',        protect, restrictTo('admin'), deleteFeedback);

module.exports = {
  notificationRouter,
  announcementRouter,
  bookmarkRouter,
  adminExtrasRouter,
  ratingRouter,
  historyRouter,
  searchRouter,
  branchRouter,
  examRouter,
  codingRouter,
  syllabusRouter,
  timetableRouter,
  statsRouter,
  feedbackRouter,
};
