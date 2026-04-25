const Question = require('../models/Question');

// @desc    Get all questions
// @route   GET /api/questions
exports.getQuestions = async (req, res) => {
  try {
    // Select everything except correctAnswer to prevent cheating
    const questions = await Question.find({}).select('-correctAnswer');
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
