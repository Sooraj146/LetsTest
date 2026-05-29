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
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true,
  },
}, { timestamps: true });

studentSchema.index({ rollNumber: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
