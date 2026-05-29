const Question = require('../models/Question');

// @desc    Get questions for a specific exam (WITHOUT correct answers — for test page)
// @route   GET /api/questions?examId=xxx
exports.getQuestions = async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ message: 'examId query parameter is required' });

    const questions = await Question.find({ examId }).select('-correctAnswer');
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get answer key for a specific exam (WITH correct answers — after submission)
// @route   GET /api/questions/answer-key?examId=xxx
exports.getAnswerKey = async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ message: 'examId query parameter is required' });

    const questions = await Question.find({ examId });

    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.section]) grouped[q.section] = [];
      grouped[q.section].push({
        questionText:  q.questionText,
        options:       q.options,
        correctAnswer: q.correctAnswer,
      });
    });

    res.status(200).json({ sections: Object.keys(grouped), questions: grouped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
