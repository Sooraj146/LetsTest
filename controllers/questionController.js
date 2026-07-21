const Question = require('../models/Question');
const Exam = require('../models/Exam');

// @desc    Get answer key for a specific exam (WITH correct answers — for PDF download after submission)
// @route   GET /api/questions/answer-key?examId=xxx
exports.getAnswerKey = async (req, res) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ message: 'examId query parameter is required' });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (exam.isAnswerKeyPublished === false) {
      return res.status(403).json({
        message: 'Answer key download is restricted by administrator for this exam',
        isAnswerKeyPublished: false
      });
    }

    const questions = await Question.find({ examId });

    const grouped = {};
    questions.forEach(q => {
      if (!grouped[q.section]) grouped[q.section] = [];
      grouped[q.section].push({
        questionText:  q.questionText,
        questionImage: q.questionImage,
        options:       q.options,
        correctAnswer: q.correctAnswer,
      });
    });

    res.status(200).json({ sections: Object.keys(grouped), questions: grouped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
