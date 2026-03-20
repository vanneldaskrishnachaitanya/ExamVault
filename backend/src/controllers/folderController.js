'use strict';

const Folder = require('../models/Folder');

const getFolders = async (req, res) => {

  const { regulation, branch, year, sem } = req.query;

  // Build filter — year & sem are required for the new UI
  const filter = { regulation, branch };
  if (year) filter.year = year;
  if (sem)  filter.sem  = sem;

  const folders = await Folder.find(filter).sort({ subject: 1 });

  res.json({
    success: true,
    folders
  });

};

const createFolder = async (req, res) => {

  const { regulation, branch, subject, year, sem } = req.body;

  if (!year || !sem) {
    return res.status(400).json({
      success: false,
      message: 'year and sem are required'
    });
  }

  const folder = await Folder.create({
    regulation,
    branch,
    subject,
    year,
    sem,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    folder
  });

};

const deleteFolder = async (req, res) => {

  const { id } = req.params;

  await Folder.findByIdAndDelete(id);

  res.json({
    success: true
  });

};

module.exports = {
  getFolders,
  createFolder,
  deleteFolder
};