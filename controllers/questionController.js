const Question = require('../models/Question');

// @desc    Get all questions (WITHOUT correct answers — for the test page)
// @route   GET /api/questions
exports.getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({}).select('-correctAnswer');
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all questions WITH correct answers (for answer key PDF after submission)
// @route   GET /api/questions/answer-key
exports.getAnswerKey = async (req, res) => {
  try {
    const questions = await Question.find({});
    // Group by section, preserving insertion order
    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.section]) grouped[q.section] = [];
      grouped[q.section].push({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
      });
    });
    res.status(200).json({ sections: Object.keys(grouped), questions: grouped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
