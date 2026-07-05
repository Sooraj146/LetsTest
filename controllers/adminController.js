const User = require('../models/User');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ActivityLog = require('../models/ActivityLog');

const logActivity = async (text, type = 'info', collegeId = null, adminUsername = null) => {
  try {
    const formattedText = adminUsername ? `${text} (by ${adminUsername})` : text;
    await ActivityLog.create({ text: formattedText, type, collegeId });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
};
exports.logActivity = logActivity;


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
    const query = collegeId ? { collegeId } : {};
    
    const students = await Student.find(query).sort({ rollNumber: 1 });
    
    // Fetch active exam IDs to ignore deleted exams' submissions
    const activeExams = await Exam.find(query).select('_id');
    const activeExamIds = activeExams.map(e => e._id);
    
    // Count questions per active exam to establish maximum possible score
    const questionCounts = await Question.aggregate([
      { $match: { examId: { $in: activeExamIds } } },
      { $group: { _id: "$examId", count: { $sum: 1 } } }
    ]);

    const examMaxScores = questionCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    // Fetch submissions matching active exams
    const submissionsQuery = {
      isSubmitted: true,
      examId: { $in: activeExamIds }
    };
    if (collegeId) {
      submissionsQuery.collegeId = require('mongoose').Types.ObjectId.createFromHexString(collegeId.toString());
    }
    const submissions = await User.find(submissionsQuery);

    const studentSubmissionsMap = {};
    submissions.forEach(sub => {
      const roll = sub.rollNumber.toString();
      if (!studentSubmissionsMap[roll]) {
        studentSubmissionsMap[roll] = [];
      }
      studentSubmissionsMap[roll].push(sub);
    });

    const results = students.map(s => {
      const subs = studentSubmissionsMap[s.rollNumber.toString()] || [];
      let totalMarks = 0;
      let totalPossible = 0;
      subs.forEach(sub => {
        const maxScore = examMaxScores[sub.examId.toString()] || 0;
        if (maxScore > 0) {
          totalMarks += sub.totalScore;
          totalPossible += maxScore;
        }
      });
      
      const avgPercentage = totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 100) : 0;
      
      return {
        ...s.toObject(),
        testCount: subs.length,
        totalMarks,
        avgPercentage
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
    const { name, rollNumber, email, branch, semester } = req.body;
    const collegeId = getCollegeId(req);
    if (!name || rollNumber === undefined || !collegeId) {
      return res.status(400).json({ message: 'Name, roll number and collegeId are required' });
    }
    const student = await Student.create({ name, rollNumber, email, branch, semester, collegeId });
    await logActivity(`Enrolled student: ${name} (${rollNumber})`, 'info', collegeId, req.admin?.username);
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
    const { name, rollNumber, email, branch, semester } = req.body;
    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

    const oldRoll = oldStudent.rollNumber.toString();
    const newRoll = rollNumber.toString();

    // Update the student record
    oldStudent.name = name;
    oldStudent.rollNumber = rollNumber;
    oldStudent.email = email || '';
    oldStudent.branch = branch || '';
    oldStudent.semester = semester || '';
    await oldStudent.save();

    // If roll number changed, sync all previous test results
    if (oldRoll !== newRoll) {
      await User.updateMany(
        { rollNumber: oldRoll, collegeId: oldStudent.collegeId },
        { rollNumber: newRoll }
      );
    }

    await logActivity(`Updated student record: ${name} (${rollNumber})`, 'info', oldStudent.collegeId, req.admin?.username);

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
    await logActivity(`Removed student record: ${student.name} (${student.rollNumber})`, 'warning', student.collegeId, req.admin?.username);
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
    await logActivity(`Purged all students roster (${result.deletedCount} students)`, 'danger', collegeId, req.admin?.username);
    res.status(200).json({ message: `${result.deletedCount} students removed successfully.` });
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
    
    await logActivity(`Bulk enrolled ${result.length} students via CSV`, 'info', collegeId, req.admin?.username);

    res.status(201).json({
      message: `${result.length} students added successfully.`,
      count: result.length
    });
  } catch (error) {
    if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
      const insertedCount = error.insertedDocs ? error.insertedDocs.length : 0;
      await logActivity(`Bulk enrolled ${insertedCount} students via CSV (some duplicates skipped)`, 'info', collegeId, req.admin?.username);
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
    const collegeExams = await Exam.find({ collegeId: student.collegeId._id }).sort({ startTime: -1 });
    const examIds = collegeExams.map(e => e._id);

    // Fetch submissions strictly matching the roll number AND exams from their college
    const submissions = await User.find({ 
      rollNumber: student.rollNumber.toString(), 
      examId: { $in: examIds },
      isSubmitted: true 
    }).populate('examId', 'title startTime');

    const examsAssigned = collegeExams.length;

    // Compile the list of exams and the student's status for each
    const examsList = [];
    for (const exam of collegeExams) {
      const questionsCount = await Question.countDocuments({ examId: exam._id });
      const sub = submissions.find(s => s.examId && s.examId._id.toString() === exam._id.toString());
      const isBanned = student.bannedExams ? student.bannedExams.some(bid => bid.toString() === exam._id.toString()) : false;
      examsList.push({
        examId: exam._id,
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        isBanned,
        questionsCount,
        submission: sub ? {
          score: sub.totalScore,
          submittedAt: sub.submittedAt || sub.updatedAt
        } : null
      });
    }

    if (submissions.length === 0) {
      return res.status(200).json({
        student: { 
          name: student.name, 
          rollNumber: student.rollNumber, 
          college: student.collegeId.name,
          email: student.email || '',
          branch: student.branch || '',
          semester: student.semester || ''
        },
        metrics: { gpa: 0, participation: 0, testsTaken: 0, testsAssigned: examsAssigned, precision: 0 },
        radarData: {},
        trendData: [],
        examsList
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
      student: { 
        name: student.name, 
        rollNumber: student.rollNumber, 
        college: student.collegeId.name,
        email: student.email || '',
        branch: student.branch || '',
        semester: student.semester || ''
      },
      metrics: { gpa, participation, testsTaken: submissions.length, testsAssigned: examsAssigned, precision },
      radarData,
      trendData: trendData.sort((a, b) => new Date(a.date) - new Date(b.date)),
      examsList
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Toggle student exam ban/restriction
// @route POST /api/admin/students/:id/ban
exports.toggleStudentBan = async (req, res) => {
  try {
    const { id } = req.params;
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ message: 'examId is required' });

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (!student.bannedExams) student.bannedExams = [];
    
    const bannedExamsStr = student.bannedExams.map(e => e.toString());
    const index = bannedExamsStr.indexOf(examId.toString());

    let isBanned = false;
    if (index === -1) {
      student.bannedExams.push(examId);
      isBanned = true;
      await logActivity(`Banned student: ${student.name} (${student.rollNumber}) from exam ${examId}`, 'danger', student.collegeId, req.admin?.username);
    } else {
      student.bannedExams.splice(index, 1);
      await logActivity(`Restored exam access for student: ${student.name} (${student.rollNumber}) for exam ${examId}`, 'info', student.collegeId, req.admin?.username);
    }

    await student.save();
    res.status(200).json({ isBanned, message: isBanned ? 'Restricted' : 'Allowed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get system logs
// @route GET /api/admin/logs
exports.getLogs = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    let query = {};
    if (collegeId) {
      query = { collegeId };
    }
    const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(50);
    
    const mapped = logs.map(l => {
      const date = new Date(l.createdAt);
      const timeStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
      return {
        id: l._id,
        text: l.text,
        type: l.type,
        time: timeStr
      };
    });
    res.status(200).json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a single log entry
// @route DELETE /api/admin/logs/:id
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = getCollegeId(req);
    const query = { _id: id };
    
    // Mini-admins can only delete logs for their own college
    if (req.admin.role !== 'main') {
      query.collegeId = collegeId;
    }
    
    const log = await ActivityLog.findOneAndDelete(query);
    if (!log) return res.status(404).json({ message: 'Log entry not found' });
    
    res.status(200).json({ message: 'Log entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Clear all log entries
// @route DELETE /api/admin/logs
exports.clearLogs = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const query = {};
    
    // Mini-admins can only clear logs for their own college
    if (req.admin.role !== 'main') {
      query.collegeId = collegeId;
    } else if (collegeId) {
      query.collegeId = collegeId;
    }
    
    const result = await ActivityLog.deleteMany(query);
    res.status(200).json({ message: `${result.deletedCount} log(s) cleared successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
