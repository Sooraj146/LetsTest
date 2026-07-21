const Exam = require('../models/Exam');
const College = require('../models/College');
const { logActivity } = require('./adminController');

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
    const { title, startTime, endTime, collegeId, isAnswerKeyPublished } = req.body;
    
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
      isAnswerKeyPublished: typeof isAnswerKeyPublished === 'boolean' ? isAnswerKeyPublished : true,
    });

    await logActivity(`Created test: ${title}`, 'info', targetCollege, req.admin?.username);

    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update an exam (admin)
// @route PUT /api/admin/exams/:id
exports.updateExam = async (req, res) => {
  try {
    const { title, startTime, endTime, collegeId, isAnswerKeyPublished } = req.body;
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const updateData = {
      startTime: startTime || null,
      endTime:   endTime   || null,
    };
    if (title) updateData.title = title;
    if (typeof isAnswerKeyPublished === 'boolean') {
      updateData.isAnswerKeyPublished = isAnswerKeyPublished;
    }
    
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

    await logActivity(`Updated test configuration: ${exam.title}`, 'info', exam.collegeId, req.admin?.username);

    res.status(200).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Toggle answer key publication for an exam (admin)
// @route POST /api/admin/exams/:id/toggle-answer-key
exports.toggleAnswerKey = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let isPublished;
    if (typeof req.body.isAnswerKeyPublished === 'boolean') {
      isPublished = req.body.isAnswerKeyPublished;
    } else {
      isPublished = !exam.isAnswerKeyPublished;
    }

    exam.isAnswerKeyPublished = isPublished;
    await exam.save();

    const statusText = isPublished ? 'Published' : 'Restricted';
    await logActivity(`${statusText} answer key download for test: ${exam.title}`, isPublished ? 'info' : 'warning', exam.collegeId, req.admin?.username);

    res.status(200).json({ isAnswerKeyPublished: exam.isAnswerKeyPublished, message: `Answer key ${statusText.toLowerCase()} successfully.` });
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

    await logActivity(`Removed exam: ${exam.title}`, 'warning', exam.collegeId, req.admin?.username);

    res.status(200).json({ message: 'Exam deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all exams (admin)
// @route GET /api/admin/exams
exports.getExams = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    // If collegeId is not provided and user is main admin, query all exams
    const query = collegeId ? { collegeId } : {};
    const exams = await Exam.find(query).sort({ startTime: -1 });
    
    const Question = require('../models/Question');
    const User = require('../models/User');

    const results = await Promise.all(exams.map(async (exam) => {
      const [studentCount, questionCount, sections] = await Promise.all([
        User.countDocuments({ examId: exam._id }),
        Question.countDocuments({ examId: exam._id }),
        Question.distinct('section', { examId: exam._id })
      ]);
      return {
        ...exam.toObject(),
        studentCount,
        questionCount,
        sections: sections.map(s => s.trim()).filter(Boolean)
      };
    }));

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

