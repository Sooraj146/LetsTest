const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  rollNumber: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    default: '',
  },
  branch: {
    type: String,
    trim: true,
    default: '',
  },
  semester: {
    type: String,
    trim: true,
    default: '',
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true,
  },
  bannedExams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
  }],
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
