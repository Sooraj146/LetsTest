const User = require('../models/User');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const College = require('../models/College');

// @desc    Get student name by roll number
// @route   GET /api/users/student/:rollNumber?collegeId=xxx&domain=xxx
exports.getStudentByRoll = async (req, res) => {
  try {
    let roll = Number(req.params.rollNumber);
    let collegeId = req.query.collegeId;
    const domain = req.query.domain ? req.query.domain.trim().toLowerCase() : null;

    if (isNaN(roll)) return res.status(400).json({ message: 'Invalid roll number' });

    if (!collegeId && domain) {
      const college = await College.findOne({ domain });
      if (!college) return res.status(404).json({ message: 'College domain not registered' });
      collegeId = college._id;
    }

    if (!collegeId) return res.status(400).json({ message: 'College ID or Domain is required' });

    // Negative roll number logic: absolute value represents the name
    const absRoll = Math.abs(roll);
    const student = await Student.findOne({ rollNumber: absRoll, collegeId }).populate('collegeId');

    if (!student) return res.status(404).json({ message: 'Student not found in this college' });
    
    // Return student name, ID and college name for the frontend
    res.status(200).json({
      name: student.name,
      collegeId: student.collegeId?._id || student.collegeId,
      collegeName: student.collegeId?.name || 'Authorized Institution'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all exams categorized by status
// @route   GET /api/users/exams?collegeId=xxx
exports.getExams = async (req, res) => {
  try {
    const { collegeId } = req.query;
    if (!collegeId) return res.status(400).json({ message: 'College ID is required' });

    const exams = await Exam.find({ collegeId }).sort({ startTime: -1 }).lean();
    const now = new Date();

    // Fetch unique sections and total questions for these exams
    const aggregationData = await Question.aggregate([
      { $match: { examId: { $in: exams.map(e => e._id) } } },
      { $group: { 
          _id: "$examId", 
          sections: { $addToSet: "$section" },
          totalQuestions: { $sum: 1 }
        } 
      }
    ]);

    // Create a map for quick lookup
    const examDataMap = {};
    aggregationData.forEach(item => {
      examDataMap[item._id.toString()] = {
        sections: item.sections,
        totalQuestions: item.totalQuestions
      };
    });

    const result = {
      past: [],
      current: [],
      upcoming: [],
    };

    exams.forEach(exam => {
      // Attach data
      const data = examDataMap[exam._id.toString()] || { sections: [], totalQuestions: 0 };
      exam.sections = data.sections;
      exam.totalQuestions = data.totalQuestions;

      if (exam.endTime && now > exam.endTime) {
        result.past.push(exam);
      } else if (exam.startTime && now < exam.startTime) {
        result.upcoming.push(exam);
      } else {
        result.current.push(exam);
      }
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a student for a specific exam
// @route   POST /api/users/register
exports.registerUser = async (req, res) => {
  try {
    const { rollNumber, email, examId } = req.body;

    if (!rollNumber || !email || !examId) {
      return res.status(400).json({ message: 'Please provide roll number, email and examId' });
    }

    // --- Load exam ---
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // --- Identify College by Email Domain ---
    const emailLower = email.toLowerCase().trim();
    const emailDomain = '@' + emailLower.split('@')[1];
    const college = await College.findOne({ domain: emailDomain });
    if (!college) {
      return res.status(400).json({ message: 'Your college is not registered on this platform.' });
    }

    // Check if exam belongs to this college
    if (exam.collegeId.toString() !== college._id.toString()) {
      return res.status(403).json({ message: 'This exam is not available for your college.' });
    }

    // --- Fetch name from Student master list ---
    const roll = Number(rollNumber);
    const absRoll = Math.abs(roll);
    const student = await Student.findOne({ rollNumber: absRoll, collegeId: college._id });
    if (!student) {
      return res.status(404).json({ message: 'Student roll number not found for your college.' });
    }
    const name = student.name;

    // --- Check for existing registration for THIS exam ---
    const rollStr = rollNumber.toString();
    const byRoll = await User.findOne({ rollNumber: rollStr, examId });
    if (byRoll) {
      if (byRoll.isSubmitted) {
        return res.status(400).json({ message: 'This roll number has already submitted this exam' });
      }
      // Resume in-progress test
      return res.status(200).json({
        _id: byRoll._id,
        name: byRoll.name,
        rollNumber: byRoll.rollNumber,
        email: byRoll.email,
        examId: byRoll.examId,
        isSubmitted: byRoll.isSubmitted,
        message: 'Resuming test',
      });
    }

    // --- Check for duplicate email for THIS exam ---
    const byEmail = await User.findOne({ email: emailLower, examId });
    if (byEmail) {
      if (byEmail.isSubmitted) {
        return res.status(400).json({ message: 'This email has already submitted this exam' });
      }
      return res.status(400).json({ message: 'This email is already registered with a different roll number for this exam' });
    }

    const user = await User.create({ name, rollNumber: rollStr, email: emailLower, examId, collegeId: college._id });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      rollNumber: user.rollNumber,
      email: user.email,
      examId: user.examId,
      isSubmitted: user.isSubmitted,
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        message: field === 'email'
          ? 'This email is already registered for this exam'
          : 'This roll number is already registered for this exam',
      });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit test answers
// @route   POST /api/users/submit
exports.submitTest = async (req, res) => {
  try {
    const { rollNumber, examId, answers } = req.body;

    if (!rollNumber || !examId) {
      return res.status(400).json({ message: 'rollNumber and examId are required' });
    }

    const user = await User.findOne({ rollNumber, examId });
    if (!user) return res.status(404).json({ message: 'User not found for this exam' });
    if (user.isSubmitted) return res.status(400).json({ message: 'Test already submitted' });

    // Grade answers against this exam's questions only
    const questions = await Question.find({ examId });

    let totalScore = 0;
    const sectionScores = {};
    questions.forEach(q => {
      if (!(q.section in sectionScores)) sectionScores[q.section] = 0;
    });
    questions.forEach(q => {
      const qId = q._id.toString();
      // Ensure we check for undefined, as index 0 is falsy
      if (answers[qId] !== undefined && String(answers[qId]) === String(q.correctAnswer)) {
        totalScore++;
        sectionScores[q.section]++;
      }
    });

    user.answers      = answers;
    user.sectionScores = sectionScores;
    user.totalScore    = totalScore;
    user.isSubmitted   = true;
    await user.save();

    res.status(200).json({ message: 'Test submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get result for a student for a specific exam
// @route   GET /api/users/result/:examId/:rollNumber
exports.getResult = async (req, res) => {
  try {
    const { examId, rollNumber } = req.params;

    const user = await User.findOne({ rollNumber, examId });
    if (!user) return res.status(404).json({ message: 'User not found for this exam' });
    if (!user.isSubmitted) return res.status(400).json({ message: 'Test not yet submitted' });

    const allQuestions = await Question.find({ examId }).select('section');
    const totalQuestions = allQuestions.length;

    const sectionTotals = {};
    const qSectionMap = {};
    allQuestions.forEach(q => {
      sectionTotals[q.section] = (sectionTotals[q.section] || 0) + 1;
      qSectionMap[q._id.toString()] = q.section;
    });

    const sectionAnswered = {};
    Object.keys(sectionTotals).forEach(sec => sectionAnswered[sec] = 0);
    
    const answersObj = user.answers instanceof Map ? Object.fromEntries(user.answers) : (user.answers || {});
    Object.keys(answersObj).forEach(qId => {
      const sec = qSectionMap[qId];
      if (sec) sectionAnswered[sec]++;
    });

    const parsedSectionScores = user.sectionScores instanceof Map ? Object.fromEntries(user.sectionScores) : (user.sectionScores || {});

    const sectionDetails = {};
    Object.keys(sectionTotals).forEach(sec => {
      const correct = parsedSectionScores[sec] || 0;
      const answered = sectionAnswered[sec] || 0;
      const wrong = answered - correct;
      const skipped = sectionTotals[sec] - answered;
      sectionDetails[sec] = { correct, wrong, skipped, total: sectionTotals[sec] };
    });

    const answeredCount    = Object.keys(answersObj).length;
    const correctCount     = user.totalScore;
    const wrongCount       = answeredCount - correctCount;
    const unattemptedCount = totalQuestions - answeredCount;

    res.status(200).json({
      name: user.name,
      rollNumber: user.rollNumber,
      examId,
      sectionScores:    parsedSectionScores,
      sectionDetails,
      totalScore:       user.totalScore,
      totalQuestions,
      sectionTotals,
      answeredCount,
      correctCount,
      wrongCount,
      unattemptedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check which exams a student has already submitted (for the dashboard)
// @route   POST /api/users/my-exams
exports.getMyExams = async (req, res) => {
  try {
    const { rollNumber, email } = req.body;
    if (!rollNumber && !email) {
      return res.status(400).json({ message: 'rollNumber or email required' });
    }

    const query = rollNumber
      ? { rollNumber, isSubmitted: true }
      : { email: email.toLowerCase(), isSubmitted: true };

    const records = await User.find(query).select('examId isSubmitted totalScore');

    // Fetch total questions for these exams
    const examIds = records.map(r => r.examId);
    const aggregationData = await Question.aggregate([
      { $match: { examId: { $in: examIds } } },
      { $group: { _id: "$examId", totalQuestions: { $sum: 1 } } }
    ]);
    
    const countMap = {};
    aggregationData.forEach(item => {
      countMap[item._id.toString()] = item.totalQuestions;
    });

    // Return a map of { examId -> { isSubmitted, totalScore, totalQuestions } }
    const result = {};
    records.forEach(r => {
      const eid = r.examId.toString();
      result[eid] = {
        isSubmitted: r.isSubmitted,
        totalScore:  r.totalScore,
        totalQuestions: countMap[eid] || 0
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get advanced analysis for a student (User side)
// @route GET /api/users/analysis/:rollNumber?collegeId=xxx
exports.getAggregatedAnalysis = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { collegeId } = req.query;

    if (!rollNumber || !collegeId) {
      return res.status(400).json({ message: 'Roll number and college ID required.' });
    }

    // Get all exams belonging to this specific college
    const collegeExams = await Exam.find({ collegeId }).select('_id');
    const examIds = collegeExams.map(e => e._id);

    // Fetch submissions strictly matching the roll number AND exams from their college
    const submissions = await User.find({
      rollNumber: rollNumber,
      examId: { $in: examIds },
      isSubmitted: true
    }).populate('examId', 'title startTime');

    const examsAssigned = collegeExams.length;

    if (submissions.length === 0) {
      return res.status(200).json({
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
      metrics: {
        gpa,
        participation,
        precision,
        testsTaken: submissions.length,
        testsAssigned: examsAssigned
      },
      radarData,
      trendData: trendData.sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
