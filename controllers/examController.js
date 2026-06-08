const Exam = require('../models/Exam');
const College = require('../models/College');

// Helper — get collegeId from admin or body
function getCollegeId(req) {
  if (req.admin.role === 'main') {
    return req.body.collegeId || req.query.collegeId;
  }
  return req.admin.collegeId;
}

// @desc  Create a new exam (admin)
// @route POST /api/admin/exams
exports.createExam = async (req, res) => {
  try {
    const { title, startTime, endTime, collegeId } = req.body;
    
    // Determine target college
    let targetCollege = collegeId;
    if (req.admin.role !== 'main') {
      targetCollege = req.admin.collegeId;
    }

    if (!title || !targetCollege) {
      return res.status(400).json({ message: 'Title and Target Institution are required' });
    }
    
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const exam = await Exam.create({
      title,
      collegeId: targetCollege,
      startTime: startTime || null,
      endTime:   endTime   || null,
    });

    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update an exam (admin)
// @route PUT /api/admin/exams/:id
exports.updateExam = async (req, res) => {
  try {
    const { title, startTime, endTime, collegeId } = req.body;
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const updateData = {
      startTime: startTime || null,
      endTime:   endTime   || null,
    };
    if (title) updateData.title = title;
    
    // Allow Main Admin to change/add college association for a specific exam record
    if (req.admin.role === 'main' && collegeId) {
      updateData.collegeId = collegeId;
    }

    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.status(200).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete an exam (admin)
// @route DELETE /api/admin/exams/:id
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Cascading deletes for database cleanup
    const Question = require('../models/Question');
    const User = require('../models/User');
    await Promise.all([
      Question.deleteMany({ examId: req.params.id }),
      User.deleteMany({ examId: req.params.id })
    ]);

    res.status(200).json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all exams for a college (admin)
// @route GET /api/admin/exams
exports.getExams = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    if (!collegeId) {
      return res.status(400).json({ message: 'collegeId is required for main admin' });
    }
    const exams = await Exam.find({ collegeId }).sort({ startTime: -1 });
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

