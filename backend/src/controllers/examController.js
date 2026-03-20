'use strict';
const Exam = require('../models/Exam');

const getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find().sort({ date: 1 }).lean();
    res.json({ success: true, data: { exams } });
  } catch (err) { next(err); }
};

const createExam = async (req, res, next) => {
  try {
    const { title, subject, date, examType, regulation, branch, notes } = req.body;
    if (!title || !date) return res.status(400).json({ success: false, message: 'title and date are required' });
    const exam = await Exam.create({ title, subject, date, examType, regulation, branch, notes, createdBy: req.user._id });
    res.status(201).json({ success: true, data: { exam } });
  } catch (err) { next(err); }
};

const deleteExam = async (req, res, next) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = { getExams, createExam, deleteExam };
