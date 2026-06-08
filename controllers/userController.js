const User = require('../models/User');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const College = require('../models/College');

// ─────────────────────────────────────────────────────────────────────────────
// @desc   MERGED LOGIN — Verify student identity + fetch all dashboard exams
// @route  POST /api/users/login
// Returns: { student, exams: { current, upcoming, past } }
// Each exam includes isCompleted + result so the dashboard needs 0 extra calls.
// ─────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { rollNumber, email } = req.body;
    if (!rollNumber || !email) {
      return res.status(400).json({ message: 'Roll number and email are required' });
    }

    // 1. Identify college from email domain
    const emailLower = email.toLowerCase().trim();
    const emailDomain = '@' + emailLower.split('@')[1];
    const college = await College.findOne({ domain: emailDomain });
    if (!college) {
      return res.status(404).json({ message: 'College domain not registered' });
    }

    // 2. Verify student exists in master list
    const roll = Math.abs(Number(rollNumber));
    if (isNaN(roll)) return res.status(400).json({ message: 'Invalid roll number' });

    const student = await Student.findOne({ rollNumber: roll, collegeId: college._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found in this college' });
    }

    // 3. Fetch all exams for this college
    const exams = await Exam.find({ collegeId: college._id }).sort({ startTime: -1 }).lean();
    const now = new Date();
    const examIds = exams.map(e => e._id);

    // 4. Aggregate question metadata + student submissions in parallel (2 DB calls total)
    const [aggregationData, submissionsData] = await Promise.all([
      Question.aggregate([
        { $match: { examId: { $in: examIds } } },
        { $group: { _id: '$examId', sections: { $addToSet: '$section' }, totalQuestions: { $sum: 1 } } }
      ]),
      User.find({ rollNumber: rollNumber.toString(), examId: { $in: examIds }, isSubmitted: true })
        .select('examId totalScore isSubmitted')
        .lean()
    ]);

    // Build lookup maps
    const examDataMap = {};
    aggregationData.forEach(item => {
      examDataMap[item._id.toString()] = {
        sections: item.sections,
        totalQuestions: item.totalQuestions
      };
    });

    const submissionsMap = {};
    submissionsData.forEach(sub => {
      submissionsMap[sub.examId.toString()] = {
        isCompleted: sub.isSubmitted,
        totalScore: sub.totalScore
      };
    });

    // 5. Categorise exams and embed per-student completion data
    const result = { past: [], current: [], upcoming: [] };

    exams.forEach(exam => {
      const eid = exam._id.toString();
      const qData = examDataMap[eid] || { sections: [], totalQuestions: 0 };
      const subData = submissionsMap[eid] || null;

      exam.sections       = qData.sections;
      exam.totalQuestions = qData.totalQuestions;
      exam.isCompleted    = !!subData;
      exam.result         = subData
        ? { totalScore: subData.totalScore, totalQuestions: qData.totalQuestions }
        : null;

      if (exam.endTime && now > exam.endTime) {
        result.past.push(exam);
      } else if (exam.startTime && now < exam.startTime) {
        result.upcoming.push(exam);
      } else {
        result.current.push(exam);
      }
    });

    res.status(200).json({
      student: {
        name:        student.name,
        rollNumber:  student.rollNumber,
        collegeId:   college._id,
        collegeName: college.name || 'Authorized Institution'
      },
      exams: result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   MERGED REGISTER — Register for exam + return examDetails + questions
// @route  POST /api/users/register
// Returns: { _id, name, rollNumber, email, examId, isSubmitted, examDetails, questions }
// test.html starts immediately with no additional API calls needed.
// ─────────────────────────────────────────────────────────────────────────────
exports.registerUser = async (req, res) => {
  try {
    const { rollNumber, email, examId } = req.body;

    if (!rollNumber || !email || !examId) {
      return res.status(400).json({ message: 'Please provide roll number, email and examId' });
    }

    // Load exam
    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Identify college by email domain
    const emailLower = email.toLowerCase().trim();
    const emailDomain = '@' + emailLower.split('@')[1];
    const college = await College.findOne({ domain: emailDomain });
    if (!college) {
      return res.status(400).json({ message: 'Your college is not registered on this platform.' });
    }

    if (exam.collegeId.toString() !== college._id.toString()) {
      return res.status(403).json({ message: 'This exam is not available for your college.' });
    }

    // Fetch student name
    const roll = Math.abs(Number(rollNumber));
    const student = await Student.findOne({ rollNumber: roll, collegeId: college._id });
    if (!student) {
      return res.status(404).json({ message: 'Student roll number not found for your college.' });
    }

    const rollStr = rollNumber.toString();

    // Fetch duplicate-check and questions in parallel
    const [byRoll, questions] = await Promise.all([
      User.findOne({ rollNumber: rollStr, examId }),
      Question.find({ examId }).select('-correctAnswer').lean()
    ]);

    const examDetails = {
      title:     exam.title,
      startTime: exam.startTime,
      endTime:   exam.endTime,
    };

    // If already registered, resume test
    if (byRoll) {
      if (byRoll.isSubmitted) {
        return res.status(400).json({ message: 'This roll number has already submitted this exam' });
      }
      return res.status(200).json({
        _id:        byRoll._id,
        name:       byRoll.name,
        rollNumber: byRoll.rollNumber,
        email:      byRoll.email,
        examId:     byRoll.examId,
        isSubmitted: byRoll.isSubmitted,
        message:    'Resuming test',
        examDetails,
        questions,
      });
    }

    // Check for duplicate email
    const byEmail = await User.findOne({ email: emailLower, examId });
    if (byEmail) {
      if (byEmail.isSubmitted) {
        return res.status(400).json({ message: 'This email has already submitted this exam' });
      }
      return res.status(400).json({ message: 'This email is already registered with a different roll number for this exam' });
    }

    const user = await User.create({
      name: student.name,
      rollNumber: rollStr,
      email: emailLower,
      examId,
      collegeId: college._id
    });

    res.status(201).json({
      _id:        user._id,
      name:       user.name,
      rollNumber: user.rollNumber,
      email:      user.email,
      examId:     user.examId,
      isSubmitted: user.isSubmitted,
      examDetails,
      questions,
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

    const questions = await Question.find({ examId });

    let totalScore = 0;
    const sectionScores = {};
    questions.forEach(q => {
      if (!(q.section in sectionScores)) sectionScores[q.section] = 0;
    });
    questions.forEach(q => {
      const qId = q._id.toString();
      if (answers[qId] !== undefined && String(answers[qId]) === String(q.correctAnswer)) {
        totalScore++;
        sectionScores[q.section]++;
      }
    });

    user.answers       = answers;
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

    const parsedSectionScores = user.sectionScores instanceof Map
      ? Object.fromEntries(user.sectionScores)
      : (user.sectionScores || {});

    const sectionDetails = {};
    Object.keys(sectionTotals).forEach(sec => {
      const correct  = parsedSectionScores[sec] || 0;
      const answered = sectionAnswered[sec] || 0;
      const wrong    = answered - correct;
      const skipped  = sectionTotals[sec] - answered;
      sectionDetails[sec] = { correct, wrong, skipped, total: sectionTotals[sec] };
    });

    const answeredCount    = Object.keys(answersObj).length;
    const correctCount     = user.totalScore;
    const wrongCount       = answeredCount - correctCount;
    const unattemptedCount = totalQuestions - answeredCount;

    res.status(200).json({
      name:          user.name,
      rollNumber:    user.rollNumber,
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

// @desc  Get advanced analysis for a student (User side)
// @route GET /api/users/analysis/:rollNumber?collegeId=xxx
exports.getAggregatedAnalysis = async (req, res) => {
  try {
    const { rollNumber } = req.params;
    const { collegeId } = req.query;

    if (!rollNumber || !collegeId) {
      return res.status(400).json({ message: 'Roll number and college ID required.' });
    }

    const collegeExams = await Exam.find({ collegeId }).select('_id');
    const examIds = collegeExams.map(e => e._id);

    const submissions = await User.find({
      rollNumber,
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
      if (!sub.examId) continue;
      const questions = await Question.find({ examId: sub.examId._id }).select('section');
      const examMaxScore = questions.length;
      if (examMaxScore === 0) continue;

      cumulativeScore += sub.totalScore;
      totalPossibleScore += examMaxScore;
      totalCorrectAnswers += sub.totalScore;
      totalAttemptedQuestions += sub.answers instanceof Map
        ? sub.answers.size
        : Object.keys(sub.answers || {}).length;

      const pct = Math.round((sub.totalScore / examMaxScore) * 100);
      trendData.push({ examName: sub.examId.title, date: sub.examId.startTime, scorePct: pct });

      const sectionTotals = {};
      questions.forEach(q => { sectionTotals[q.section] = (sectionTotals[q.section] || 0) + 1; });
      const parsedSectionScores = sub.sectionScores instanceof Map
        ? Object.fromEntries(sub.sectionScores)
        : (sub.sectionScores || {});

      Object.keys(sectionTotals).forEach(sec => {
        if (!sectionStats[sec]) sectionStats[sec] = { correct: 0, total: 0 };
        sectionStats[sec].correct += (parsedSectionScores[sec] || 0);
        sectionStats[sec].total   += sectionTotals[sec];
      });
    }

    const radarData = {};
    Object.keys(sectionStats).forEach(sec => {
      radarData[sec] = sectionStats[sec].total > 0
        ? Math.round((sectionStats[sec].correct / sectionStats[sec].total) * 100)
        : 0;
    });

    const gpa           = totalPossibleScore > 0 ? Math.round((cumulativeScore / totalPossibleScore) * 100) : 0;
    const participation = examsAssigned > 0 ? Math.round((submissions.length / examsAssigned) * 100) : 0;
    const precision     = totalAttemptedQuestions > 0
      ? Math.round((totalCorrectAnswers / totalAttemptedQuestions) * 100)
      : 0;

    res.status(200).json({
      metrics: { gpa, participation, precision, testsTaken: submissions.length, testsAssigned: examsAssigned },
      radarData,
      trendData: trendData.sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
