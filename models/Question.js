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
    required: false,
    default: '',
  },
  questionImage: {
    type: String,
    required: false,
    default: '',
  },
  options: [{
    text: {
      type: String,
      required: false,
      default: '',
    },
    image: {
      type: String,
      required: false,
      default: '',
    }
  }],
  correctAnswer: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Question', questionSchema);
