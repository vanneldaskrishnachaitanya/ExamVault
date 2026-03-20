'use strict';

const File = require('../models/File');
const User = require('../models/User');
const Folder = require('../models/Folder');

// GET /admin/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalFiles,
      totalUsers,
      totalFolders,
      pendingFiles,
      approvedFiles,
      rejectedFiles,
      topDownloaded,
      uploadsByBranch,
      recentUploads,
    ] = await Promise.all([
      File.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Folder.countDocuments(),
      File.countDocuments({ status: 'pending' }),
      File.countDocuments({ status: 'approved' }),
      File.countDocuments({ status: 'rejected' }),
      File.find({ status: 'approved' })
        .sort({ downloadCount: -1 })
        .limit(5)
        .select('originalName branch subject downloadCount regulation')
        .lean(),
      File.aggregate([
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      File.find()
        .sort({ uploadedAt: -1 })
        .limit(5)
        .populate('uploadedBy', 'name email')
        .select('originalName branch subject status uploadedAt uploadedBy')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        overview: { totalFiles, totalUsers, totalFolders, pendingFiles, approvedFiles, rejectedFiles },
        topDownloaded,
        uploadsByBranch,
        recentUploads,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { getAnalytics };
