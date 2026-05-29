const User = require('../models/User');
const Question = require('../models/Question');
const Exam = require('../models/Exam');

// @desc    Register a student for a specific exam
// @route   POST /api/users/register
exports.registerUser = async (req, res) => {
  try {
    const { name, rollNumber, email, examId } = req.body;

    if (!name || !rollNumber || !email || !examId) {
      return res.status(400).json({ message: 'Please provide all fields including examId' });
    }

    // --- Load exam ---
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // --- Email domain validation ---
    const emailLower = email.toLowerCase();
    const allowedDomains = ['@gectcr.ac.in', '@rit.ac.in'];
    if (!allowedDomains.some(d => emailLower.endsWith(d))) {
      return res.status(400).json({ message: 'Email must end with @gectcr.ac.in or @rit.ac.in' });
    }

    // --- Check email domain matches exam's target colleges ---
    const emailDomain = '@' + emailLower.split('@')[1];
    if (!exam.targetColleges.includes(emailDomain)) {
      return res.status(403).json({
        message: `This exam is not available for ${emailDomain} students`,
      });
    }

    // --- Roll number range validation (1–60 or -1 to -60) ---
    const roll = Number(rollNumber);
    if (!Number.isInteger(roll) || roll === 0 || Math.abs(roll) > 60) {
      return res.status(400).json({ message: 'Roll number must be between 1–60' });
    }

    // --- Check for existing registration for THIS exam ---
    const byRoll = await User.findOne({ rollNumber, examId });
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

    const user = await User.create({ name, rollNumber, email: emailLower, examId });

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
      if (answers[qId] && answers[qId] === q.correctAnswer) {
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
    allQuestions.forEach(q => {
      sectionTotals[q.section] = (sectionTotals[q.section] || 0) + 1;
    });

    const answeredCount    = user.answers.size;
    const correctCount     = user.totalScore;
    const wrongCount       = answeredCount - correctCount;
    const unattemptedCount = totalQuestions - answeredCount;

    res.status(200).json({
      name: user.name,
      rollNumber: user.rollNumber,
      examId,
      sectionScores:    Object.fromEntries(user.sectionScores),
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

    // Return a map of { examId -> { isSubmitted, totalScore } }
    const result = {};
    records.forEach(r => {
      result[r.examId.toString()] = {
        isSubmitted: r.isSubmitted,
        totalScore:  r.totalScore,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
