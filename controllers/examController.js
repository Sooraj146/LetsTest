const Exam = require('../models/Exam');

// @desc  List all exams (public)
// @route GET /api/exams
exports.listExams = async (req, res) => {
  try {
    const exams = await Exam.find({}).sort({ createdAt: -1 });
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get a single exam by ID (public — used for timer on test page)
// @route GET /api/exams/:id
exports.getExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.status(200).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a new exam (admin)
// @route POST /api/admin/exams
exports.createExam = async (req, res) => {
  try {
    const { title, targetColleges, startTime, endTime } = req.body;
    if (!title || !targetColleges || targetColleges.length === 0) {
      return res.status(400).json({ message: 'Title and at least one target college are required' });
    }
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    const exam = await Exam.create({
      title,
      targetColleges,
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
    const { title, targetColleges, startTime, endTime } = req.body;
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        title,
        targetColleges,
        startTime: startTime || null,
        endTime:   endTime   || null,
      },
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
    res.status(200).json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
