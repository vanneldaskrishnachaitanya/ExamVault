'use strict';

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const {
  getFolders,
  createFolder,
  deleteFolder
} = require('../controllers/folderController');

router.get('/', protect, getFolders);

router.post('/', protect, createFolder);

router.delete('/:id', protect, restrictTo('admin'), deleteFolder);

module.exports = router;