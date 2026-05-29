const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  // Which exam this question belongs to
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true,
  },
  section: {
    type: String,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Question', questionSchema);
