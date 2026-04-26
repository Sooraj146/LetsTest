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

    const userExists = await User.findOne({ rollNumber });

    if (userExists) {
      // If user exists and already submitted, they cannot retake
      if (userExists.isSubmitted) {
        return res.status(400).json({ message: 'User with this roll number has already submitted the test' });
      }
      // If user exists but hasn't submitted, allow them to resume (return success)
      return res.status(200).json({
        _id: userExists._id,
        name: userExists.name,
        rollNumber: userExists.rollNumber,
        email: userExists.email,
        isSubmitted: userExists.isSubmitted,
        message: 'Resuming test'
      });
    }

    const user = await User.create({
      name,
      rollNumber,
      email
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        email: user.email,
        isSubmitted: user.isSubmitted
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
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
    const sectionScores = {
      'Age Calculation': 0,
      'Profit & Loss': 0,
      'Analogy': 0,
      'Time & Work': 0,
      'Number Series': 0
    };

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

    const answeredCount = user.answers.size;
    const correctCount = user.totalScore;
    const wrongCount = answeredCount - correctCount;
    const unattemptedCount = 30 - answeredCount;

    res.status(200).json({
      name: user.name,
      rollNumber: user.rollNumber,
      sectionScores: Object.fromEntries(user.sectionScores),
      totalScore: user.totalScore,
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
