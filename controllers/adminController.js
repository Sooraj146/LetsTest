const User = require('../models/User');
const Question = require('../models/Question');
const Settings = require('../models/Settings');

// @desc  Get leaderboard (all submitted users sorted by score)
// @route GET /api/admin/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const users = await User.find({ isSubmitted: true })
      .select('name rollNumber email totalScore sectionScores createdAt')
      .sort({ totalScore: -1 });

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      rollNumber: u.rollNumber,
      email: u.email,
      totalScore: u.totalScore,
      sectionScores: Object.fromEntries(u.sectionScores),
      submittedAt: u.createdAt,
    }));

    const totalQuestions = await Question.countDocuments({});

    res.status(200).json({ leaderboard, totalQuestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get per-question analytics
// @route GET /api/admin/analytics
exports.getQuestionAnalytics = async (req, res) => {
  try {
    const questions = await Question.find({});
    const submittedUsers = await User.find({ isSubmitted: true });
    const totalStudents = submittedUsers.length;

    const analytics = questions.map((q) => {
      let correctCount = 0;
      let attemptedCount = 0;

      submittedUsers.forEach((user) => {
        const userAnswer = user.answers.get(q._id.toString());
        if (userAnswer) {
          attemptedCount++;
          if (userAnswer === q.correctAnswer) correctCount++;
        }
      });

      return {
        _id: q._id,
        section: q.section,
        questionText: q.questionText,
        correctCount,
        wrongCount: attemptedCount - correctCount,
        unattemptedCount: totalStudents - attemptedCount,
        totalStudents,
      };
    });

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get all questions WITH correct answers (admin only)
// @route GET /api/admin/questions
exports.getAdminQuestions = async (req, res) => {
  try {
    const questions = await Question.find({});
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Add a new question
// @route POST /api/admin/questions
exports.addQuestion = async (req, res) => {
  try {
    const { section, questionText, options, correctAnswer } = req.body;
    if (!section || !questionText || !options || !correctAnswer) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (options.length !== 4) {
      return res.status(400).json({ message: 'Exactly 4 options required' });
    }
    const question = await Question.create({ section, questionText, options, correctAnswer });
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

// @desc  Delete ALL user records (reset for next test)
// @route DELETE /api/admin/users
exports.clearAllUsers = async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.status(200).json({ message: `${result.deletedCount} user(s) cleared successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get test timer settings
// @route GET /api/admin/settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update test timer settings
// @route PUT /api/admin/settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    
    settings.startTime = req.body.startTime || null;
    settings.endTime = req.body.endTime || null;
    
    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
