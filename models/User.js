const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Which exam this registration is for
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  answers: {
    type: Map,
    of: String, // Question ID -> selected option
    default: {},
  },
  sectionScores: {
    type: Map,
    of: Number,
    default: {},
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  isSubmitted: {
    type: Boolean,
    default: false,
  },
  startTime: {
    type: Date,
    default: null,
  },
  submitTime: {
    type: Date,
    default: null,
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
  },
  submittedAt: {
    type: Date,
  },
}, { timestamps: true });

// Compound unique indexes: same student can register once per exam
// (same roll number or email can appear in DIFFERENT exams)
userSchema.index({ rollNumber: 1, examId: 1 }, { unique: true });
userSchema.index({ email: 1,      examId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
