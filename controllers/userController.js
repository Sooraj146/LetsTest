const User = require('../models/User');
const Question = require('../models/Question');
const Settings = require('../models/Settings');

// @desc    Register new user
// @route   POST /api/users/register
exports.registerUser = async (req, res) => {
  try {
    const { name, rollNumber, email } = req.body;

    if (!name || !rollNumber || !email) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    // --- Email domain validation ---
    if (!email.toLowerCase().endsWith('@gectcr.ac.in')) {
      return res.status(400).json({ message: 'Email must be a valid @gectcr.ac.in address' });
    }

    // --- Check for existing roll number ---
    const byRoll = await User.findOne({ rollNumber });
    if (byRoll) {
      if (byRoll.isSubmitted) {
        return res.status(400).json({ message: 'This roll number has already submitted the test' });
      }
      // Resume an in-progress test
      return res.status(200).json({
        _id: byRoll._id,
        name: byRoll.name,
        rollNumber: byRoll.rollNumber,
        email: byRoll.email,
        isSubmitted: byRoll.isSubmitted,
        message: 'Resuming test'
      });
    }

    // --- Check for existing email ---
    const byEmail = await User.findOne({ email: email.toLowerCase() });
    if (byEmail) {
      if (byEmail.isSubmitted) {
        return res.status(400).json({ message: 'This email has already submitted the test' });
      }
      return res.status(400).json({ message: 'This email is already registered with a different roll number' });
    }

    const user = await User.create({ name, rollNumber, email: email.toLowerCase() });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      rollNumber: user.rollNumber,
      email: user.email,
      isSubmitted: user.isSubmitted
    });

  } catch (error) {
    // MongoDB duplicate-key error (race condition safety net)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        message: field === 'email'
          ? 'This email is already registered'
          : 'This roll number is already registered'
      });
    }
    res.status(500).json({ message: error.message });
  }
};


// @desc    Submit test
// @route   POST /api/users/submit
exports.submitTest = async (req, res) => {
  try {
    const { rollNumber, answers } = req.body;

    const user = await User.findOne({ rollNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isSubmitted) {
      return res.status(400).json({ message: 'Test already submitted' });
    }

    // Evaluate answers
    // answers format: { questionId: selectedOption }
    const questions = await Question.find({});
    
    let totalScore = 0;
    // Build sectionScores dynamically from whatever sections exist in the DB
    const sectionScores = {};
    questions.forEach(q => {
      if (!(q.section in sectionScores)) sectionScores[q.section] = 0;
    });

    questions.forEach((q) => {
      const qIdStr = q._id.toString();
      if (answers[qIdStr] && answers[qIdStr] === q.correctAnswer) {
        totalScore++;
        sectionScores[q.section]++;
      }
    });

    user.answers = answers;
    user.sectionScores = sectionScores;
    user.totalScore = totalScore;
    user.isSubmitted = true;

    await user.save();

    res.status(200).json({ message: 'Test submitted successfully' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get test result
// @route   GET /api/users/result/:rollNumber
exports.getResult = async (req, res) => {
  try {
    const user = await User.findOne({ rollNumber: req.params.rollNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isSubmitted) {
      return res.status(400).json({ message: 'Test not yet submitted' });
    }

    const allQuestions = await Question.find({}).select('section');
    const totalQuestions = allQuestions.length;

    // Build per-section question counts (how many questions per section)
    const sectionTotals = {};
    allQuestions.forEach(q => {
      sectionTotals[q.section] = (sectionTotals[q.section] || 0) + 1;
    });

    const answeredCount = user.answers.size;
    const correctCount = user.totalScore;
    const wrongCount = answeredCount - correctCount;
    const unattemptedCount = totalQuestions - answeredCount;

    res.status(200).json({
      name: user.name,
      rollNumber: user.rollNumber,
      sectionScores: Object.fromEntries(user.sectionScores),
      totalScore: user.totalScore,
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

// @desc    Get test timer settings (public)
// @route   GET /api/users/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = { startTime: null, endTime: null };
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
