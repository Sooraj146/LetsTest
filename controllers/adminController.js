const User = require('../models/User');
const Question = require('../models/Question');
const Student = require('../models/Student');

// Helper — get collegeId from admin or query (if main admin)
function getCollegeId(req) {
  if (req.admin.role === 'main') {
    return req.query.collegeId || req.body.collegeId;
  }
  return req.admin.collegeId;
}

// @desc  Get all pre-populated students
// @route GET /api/admin/students
exports.getStudents = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    if (!collegeId) return res.status(400).json({ message: 'collegeId is required for main admin' });
    const students = await Student.find({ collegeId }).sort({ rollNumber: 1 });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Add a student
// @route POST /api/admin/students
exports.addStudent = async (req, res) => {
  try {
    const { name, rollNumber } = req.body;
    const collegeId = getCollegeId(req);
    if (!name || rollNumber === undefined || !collegeId) {
      return res.status(400).json({ message: 'Name, roll number and collegeId are required' });
    }
    const student = await Student.create({ name, rollNumber, collegeId });
    res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Roll number already exists for this college' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a student
// @route DELETE /api/admin/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Bulk add students
// @route POST /api/admin/students/bulk
exports.bulkAddStudents = async (req, res) => {
  try {
    const { collegeId, students } = req.body;
    if (!collegeId || !Array.isArray(students)) {
      return res.status(400).json({ message: 'collegeId and students array are required' });
    }

    const withCollegeId = students.map(s => ({ ...s, collegeId }));
    
    // We use insertMany with ordered: false to continue even if some fail (e.g. duplicate roll numbers)
    const result = await Student.insertMany(withCollegeId, { ordered: false });
    
    res.status(201).json({
      message: `${result.length} students added successfully.`,
      count: result.length
    });
  } catch (error) {
    if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
      const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
      return res.status(201).json({
        message: `Processed with some duplicates. ${insertedCount} new students added.`,
        count: insertedCount
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// Helper — require examId query param
function requireExamId(req, res) {
  const examId = req.query.examId || req.body.examId;
  if (!examId) {
    res.status(400).json({ message: 'examId is required' });
    return null;
  }
  return examId;
}

// @desc  Get leaderboard for a specific exam
// @route GET /api/admin/leaderboard?examId=xxx
exports.getLeaderboard = async (req, res) => {
  try {
    const examId = requireExamId(req, res);
    if (!examId) return;

    const users = await User.find({ isSubmitted: true, examId })
      .select('name rollNumber email totalScore sectionScores createdAt')
      .sort({ totalScore: -1 });

    const leaderboard = users.map((u, i) => ({
      rank:          i + 1,
      name:          u.name,
      rollNumber:    u.rollNumber,
      email:         u.email,
      totalScore:    u.totalScore,
      sectionScores: Object.fromEntries(u.sectionScores),
      submittedAt:   u.createdAt,
    }));

    const totalQuestions = await Question.countDocuments({ examId });

    res.status(200).json({ leaderboard, totalQuestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get per-question analytics for a specific exam
// @route GET /api/admin/analytics?examId=xxx
exports.getQuestionAnalytics = async (req, res) => {
  try {
    const examId = requireExamId(req, res);
    if (!examId) return;

    const questions      = await Question.find({ examId });
    const submittedUsers = await User.find({ isSubmitted: true, examId });
    const totalStudents  = submittedUsers.length;

    const analytics = questions.map(q => {
      let correctCount   = 0;
      let attemptedCount = 0;
      submittedUsers.forEach(user => {
        const ans = user.answers.get(q._id.toString());
        if (ans) {
          attemptedCount++;
          if (ans === q.correctAnswer) correctCount++;
        }
      });
      return {
        _id:              q._id,
        section:          q.section,
        questionText:     q.questionText,
        correctCount,
        wrongCount:       attemptedCount - correctCount,
        unattemptedCount: totalStudents - attemptedCount,
        totalStudents,
      };
    });

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all questions WITH correct answers (admin only) for a specific exam
// @route GET /api/admin/questions?examId=xxx
exports.getAdminQuestions = async (req, res) => {
  try {
    const examId = requireExamId(req, res);
    if (!examId) return;
    const questions = await Question.find({ examId });
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Add a question to a specific exam
// @route POST /api/admin/questions
exports.addQuestion = async (req, res) => {
  try {
    const { examId, section, questionText, options, correctAnswer } = req.body;
    if (!examId || !section || !questionText || !options || !correctAnswer) {
      return res.status(400).json({ message: 'All fields are required including examId' });
    }
    if (options.length !== 4) {
      return res.status(400).json({ message: 'Exactly 4 options required' });
    }
    const question = await Question.create({ examId, section, questionText, options, correctAnswer });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a question
// @route PUT /api/admin/questions/:id
exports.updateQuestion = async (req, res) => {
  try {
    const { section, questionText, options, correctAnswer } = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { section, questionText, options, correctAnswer },
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.status(200).json(question);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a question
// @route DELETE /api/admin/questions/:id
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    res.status(200).json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Clear all users for a specific exam
// @route DELETE /api/admin/users?examId=xxx
exports.clearAllUsers = async (req, res) => {
  try {
    const examId = requireExamId(req, res);
    if (!examId) return;
    const result = await User.deleteMany({ examId });
    res.status(200).json({ message: `${result.deletedCount} user(s) cleared for this exam.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Clear all questions for a specific exam
// @route DELETE /api/admin/questions?examId=xxx
exports.clearAllQuestions = async (req, res) => {
  try {
    const examId = requireExamId(req, res);
    if (!examId) return;
    const result = await Question.deleteMany({ examId });
    res.status(200).json({ message: `${result.deletedCount} question(s) cleared.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Bulk add questions to a specific exam
// @route POST /api/admin/questions/bulk
exports.bulkAddQuestions = async (req, res) => {
  try {
    const { examId, questions } = req.body;
    if (!examId) return res.status(400).json({ message: 'examId is required' });
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid questions data' });
    }

    // Attach examId to every question
    const withExamId = questions.map(q => ({ ...q, examId }));
    await Question.insertMany(withExamId);

    // Remove duplicates based on trimmed questionText within this exam
    const duplicates = await Question.aggregate([
      { $match: { examId: require('mongoose').Types.ObjectId.createFromHexString(examId) } },
      { $project: { trimmedText: { $trim: { input: '$questionText' } }, original: '$$ROOT' } },
      { $group: { _id: '$trimmedText', ids: { $push: '$original._id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    let deletedCount = 0;
    for (const group of duplicates) {
      const idsToDelete = group.ids.slice(1);
      const r = await Question.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount += r.deletedCount;
    }

    res.status(201).json({
      message: `${questions.length} questions processed. ${deletedCount} duplicates removed.`,
      insertedCount: questions.length - deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
