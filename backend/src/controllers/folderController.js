'use strict';

const Folder = require('../models/folder');

const getFolders = async (req, res) => {

  const { regulation, branch } = req.query;

  const folders = await Folder.find({ regulation, branch }).sort({ subject: 1 });

  res.json({
    success: true,
    folders
  });

};

const createFolder = async (req, res) => {

  const { regulation, branch, subject } = req.body;

  const folder = await Folder.create({
    regulation,
    branch,
    subject,
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