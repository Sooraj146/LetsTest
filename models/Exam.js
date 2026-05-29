const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  // Which college email domains can see and take this exam
  // e.g. ['@gectcr.ac.in'] or ['@rit.ac.in'] or both
  targetColleges: {
    type: [String],
    default: [],
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
