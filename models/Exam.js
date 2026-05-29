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
    required: true,
    validate: {
      validator: v => Array.isArray(v) && v.length > 0,
      message: 'At least one target college is required',
    },
  },
  startTime: {
    type: Date,
    default: null,
  },
  endTime: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
