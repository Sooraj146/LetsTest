const User = require('../models/User');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Exam = require('../models/Exam');

// Helper — get collegeId from admin or query (if main admin)
function getCollegeId(req) {
  if (req.admin.role === 'main') {
    return req.query.collegeId || req.body.collegeId;
  }
  return req.admin.collegeId;
}

// @desc  Get all pre-populated students with cumulative stats
// @route GET /api/admin/students
exports.getStudents = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    if (!collegeId) return res.status(400).json({ message: 'collegeId is required for main admin' });
    
    const students = await Student.find({ collegeId }).sort({ rollNumber: 1 });
    
    // Fetch active exam IDs to ignore deleted exams' submissions
    const activeExams = await Exam.find({ collegeId }).select('_id');
    const activeExamIds = activeExams.map(e => e._id);
    
    // Aggregate stats for each student matching only active exams
    const stats = await User.aggregate([
      { 
        $match: { 
          collegeId: require('mongoose').Types.ObjectId.createFromHexString(collegeId.toString()), 
          isSubmitted: true,
          examId: { $in: activeExamIds }
        } 
      },
      { 
        $group: { 
          _id: "$rollNumber", 
          testCount: { $sum: 1 }, 
          totalMarks: { $sum: "$totalScore" } 
        } 
      }
    ]);

    const statsMap = stats.reduce((acc, curr) => {
      acc[curr._id] = curr;
      return acc;
    }, {});

    const results = students.map(s => {
      const studentStats = statsMap[s.rollNumber.toString()] || { testCount: 0, totalMarks: 0 };
      return {
        ...s.toObject(),
        testCount: studentStats.testCount,
        totalMarks: studentStats.totalMarks
      };
    });

    res.status(200).json(results);
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

// @desc  Update a student and sync history
// @route PUT /api/admin/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const { name, rollNumber } = req.body;
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

    const oldRoll = oldStudent.rollNumber.toString();
    const newRoll = rollNumber.toString();

    // Update the student record
    oldStudent.name = name;
    oldStudent.rollNumber = rollNumber;
    await oldStudent.save();

    // If roll number changed, sync all previous test results
    if (oldRoll !== newRoll) {
      await User.updateMany(
        { rollNumber: oldRoll, collegeId: oldStudent.collegeId },
        { rollNumber: newRoll }
      );
    }

    res.status(200).json(oldStudent);
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

// @desc  Delete all students for a college
// @route DELETE /api/admin/students
exports.deleteAllStudents = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    if (!collegeId) return res.status(400).json({ message: 'collegeId is required' });
    
    const result = await Student.deleteMany({ collegeId });
    res.status(200).json({ message: `${result.deletedCount} students removed successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get college-wide stats
// @route GET /api/admin/college-stats
exports.getCollegeStats = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    if (!collegeId) return res.status(400).json({ message: 'collegeId is required' });

    const cid = require('mongoose').Types.ObjectId.createFromHexString(collegeId.toString());
    
    // Total tests
    const testCount = await Exam.countDocuments({ collegeId: cid });

    // Total possible marks (sum of question counts across all tests of this college)
    const exams = await Exam.find({ collegeId: cid }).select('_id');
    const examIds = exams.map(e => e._id);
    
    const totalPossibleMarks = await Question.countDocuments({ examId: { $in: examIds } });

    res.status(200).json({ testCount, totalPossibleMarks });
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
      .select('name rollNumber email totalScore sectionScores createdAt updatedAt startedAt submittedAt')
      .sort({ totalScore: -1 });

    const leaderboard = users.map((u, i) => {
      const start = u.startedAt || u.createdAt;
      const end = u.submittedAt || u.updatedAt;
      return {
        rank:          i + 1,
        name:          u.name,
        rollNumber:    u.rollNumber,
        email:         u.email,
        totalScore:    u.totalScore,
        sectionScores: Object.fromEntries(u.sectionScores),
        startedAt:     start,
        submittedAt:   end,
        durationMs:    end && start ? (new Date(end).getTime() - new Date(start).getTime()) : 0
      };
    });

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
exports.bulkAddQuestions = async (req, res) => {
  try {
    const { examId, questions } = req.body;
    if (!examId) return res.status(400).json({ message: 'examId is required' });
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Invalid questions data' });
    }

    // Get existing questions for this exam to prevent duplicates
    const existing = await Question.find({ examId }).select('questionText');
    const existingTexts = new Set(existing.map(q => q.questionText.trim()));

    // Filter out duplicates from the incoming array
    const toInsert = [];
    const uniqueIncomingTexts = new Set();

    for (const q of questions) {
      const trimmedText = q.questionText.trim();
      if (!existingTexts.has(trimmedText) && !uniqueIncomingTexts.has(trimmedText)) {
        toInsert.push({ ...q, examId });
        uniqueIncomingTexts.add(trimmedText);
      }
    }

    if (toInsert.length > 0) {
      await Question.insertMany(toInsert);
    }

    const skippedCount = questions.length - toInsert.length;
    res.status(201).json({
      message: `${toInsert.length} new questions added. ${skippedCount} duplicates skipped.`,
      insertedCount: toInsert.length,
      skippedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get advanced analysis for a single student
// @route GET /api/admin/students/:id/analysis
exports.getStudentAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = req.admin; 

    // Find specific student
    const student = await Student.findById(id).populate('collegeId', 'name');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Security check: Mini admins can only analyze their own college's students
    if (admin.role !== 'main' && student.collegeId._id.toString() !== admin.collegeId.toString()) {
      return res.status(403).json({ message: 'Forbidden. Student belongs to another institution.' });
    }

    // Get all exams belonging to this specific student's college
    const collegeExams = await Exam.find({ collegeId: student.collegeId._id }).select('_id');
    const examIds = collegeExams.map(e => e._id);

    // Fetch submissions strictly matching the roll number AND exams from their college
    const submissions = await User.find({ 
      rollNumber: student.rollNumber, 
      examId: { $in: examIds },
      isSubmitted: true 
    }).populate('examId', 'title startTime');


    const examsAssigned = collegeExams.length;

    if (submissions.length === 0) {
      return res.status(200).json({
        student: { name: student.name, rollNumber: student.rollNumber, college: student.collegeId.name },
        metrics: { gpa: 0, participation: 0, testsTaken: 0, testsAssigned: examsAssigned, precision: 0 },
        radarData: {},
        trendData: [],
      });
    }

    let cumulativeScore = 0;
    let totalPossibleScore = 0;
    let totalCorrectAnswers = 0;
    let totalAttemptedQuestions = 0;
    
    const sectionStats = {};
    const trendData = [];

    for (const sub of submissions) {
      if (!sub.examId) continue; // Exam might have been deleted

      const questions = await Question.find({ examId: sub.examId._id }).select('section');
      const examMaxScore = questions.length;
      if (examMaxScore === 0) continue;

      cumulativeScore += sub.totalScore;
      totalPossibleScore += examMaxScore;

      totalCorrectAnswers += sub.totalScore;
      totalAttemptedQuestions += sub.answers instanceof Map ? sub.answers.size : Object.keys(sub.answers || {}).length;

      const pct = Math.round((sub.totalScore / examMaxScore) * 100);
      trendData.push({
        examName: sub.examId.title,
        date: sub.examId.startTime,
        scorePct: pct
      });

      const sectionTotals = {};
      questions.forEach(q => { sectionTotals[q.section] = (sectionTotals[q.section] || 0) + 1; });
      const parsedSectionScores = sub.sectionScores instanceof Map ? Object.fromEntries(sub.sectionScores) : (sub.sectionScores || {});
      
      Object.keys(sectionTotals).forEach(sec => {
        if (!sectionStats[sec]) sectionStats[sec] = { correct: 0, total: 0 };
        sectionStats[sec].correct += (parsedSectionScores[sec] || 0);
        sectionStats[sec].total += sectionTotals[sec];
      });
    }

    const radarData = {};
    Object.keys(sectionStats).forEach(sec => {
      radarData[sec] = sectionStats[sec].total > 0 ? Math.round((sectionStats[sec].correct / sectionStats[sec].total) * 100) : 0;
    });

    const gpa = totalPossibleScore > 0 ? Math.round((cumulativeScore / totalPossibleScore) * 100) : 0;
    const participation = examsAssigned > 0 ? Math.round((submissions.length / examsAssigned) * 100) : 0;
    const precision = totalAttemptedQuestions > 0 ? Math.round((totalCorrectAnswers / totalAttemptedQuestions) * 100) : 0;

    res.status(200).json({
      student: { name: student.name, rollNumber: student.rollNumber, college: student.collegeId.name },
      metrics: { gpa, participation, testsTaken: submissions.length, testsAssigned: examsAssigned, precision },
      radarData,
      trendData: trendData.sort((a, b) => new Date(a.date) - new Date(b.date))
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
